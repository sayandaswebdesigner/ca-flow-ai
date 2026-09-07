import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant, getSessionUser, getTokenFromRequest } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const tenantId = await getRequestTenant(request);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 7d, 30d, all

    // Visits — global (all tenants) + tenant-specific
    const total = (await db.prepare('SELECT COUNT(*) as c FROM visits').get() as any).c as number;
    const unique = (await db.prepare('SELECT COUNT(DISTINCT ip) as c FROM visits').get() as any).c as number;
    const today = (await db.prepare("SELECT COUNT(*) as c FROM visits WHERE date(created_at) = date('now')").get() as any).c as number;
    const todayUnique = (await db.prepare("SELECT COUNT(DISTINCT ip) as c FROM visits WHERE date(created_at) = date('now')").get() as any).c as number;
    const activeNow = (await db.prepare("SELECT COUNT(DISTINCT ip) as c FROM visits WHERE created_at >= datetime('now', '-15 minutes')").get() as any).c as number;
    const activeToday = (await db.prepare("SELECT COUNT(DISTINCT ip) as c FROM visits WHERE created_at >= datetime('now', '-1 day')").get() as any).c as number;

    // Last 7 / 30 days visits
    const days = range === '30d' ? 30 : 7;
    const lastDays = await db
      .prepare(
        `SELECT date(created_at) as d, COUNT(*) as c, COUNT(DISTINCT ip) as unique_c FROM visits WHERE created_at >= datetime('now', '-${days} days') GROUP BY date(created_at) ORDER BY d`
      )
      .all() as any[];

    // Hourly today — PG vs SQLite (strftime only exists on SQLite)
    const isPG = !!process.env.DATABASE_URL;
    const hourly = isPG
      ? await db
          .prepare(
            `SELECT EXTRACT(HOUR FROM created_at::timestamptz)::text as h, COUNT(*) as c FROM visits WHERE DATE(created_at::timestamptz) = CURRENT_DATE GROUP BY h ORDER BY h`
          )
          .all() as any[]
      : await db
          .prepare(
            `SELECT strftime('%H', created_at) as h, COUNT(*) as c FROM visits WHERE date(created_at) = date('now') GROUP BY h ORDER BY h`
          )
          .all() as any[];

    // Top paths
    const topPaths = await db
      .prepare(`SELECT path, COUNT(*) as c FROM visits GROUP BY path ORDER BY c DESC LIMIT 10`)
      .all() as any[];

    // Recent visits
    const recentVisits = await db.prepare('SELECT * FROM visits ORDER BY created_at DESC LIMIT 20').all() as any[];

    // Analytics events (tenant-specific for tabs/tools, plus global fallback for anon)
    let topViews: any[] = [];
    let topPlugins: any[] = [];
    let topTools: any[] = [];
    let recentEvents: any[] = [];
    let totalEvents = 0;
    let uniqueEventUsers = 0;
    try {
      totalEvents = (await db.prepare('SELECT COUNT(*) as c FROM analytics_events WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
      uniqueEventUsers = (await db.prepare('SELECT COUNT(DISTINCT COALESCE(user_id, ip)) as c FROM analytics_events WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
      topViews = (await db
        .prepare(
          `SELECT event_name as name, COUNT(*) as count FROM analytics_events WHERE tenant_id = ? AND event_type = 'view' GROUP BY event_name ORDER BY count DESC LIMIT 10`
        )
        .all(tenantId) as any[]) || [];
      topPlugins = (await db
        .prepare(
          `SELECT event_name as name, COUNT(*) as count FROM analytics_events WHERE tenant_id = ? AND event_type = 'plugin' GROUP BY event_name ORDER BY count DESC LIMIT 10`
        )
        .all(tenantId) as any[]) || [];
      topTools = (await db
        .prepare(
          `SELECT event_name as name, COUNT(*) as count FROM analytics_events WHERE tenant_id = ? AND event_type IN ('tool','action','plugin') GROUP BY event_name ORDER BY count DESC LIMIT 10`
        )
        .all(tenantId) as any[]) || [];
      recentEvents = (await db
        .prepare(`SELECT * FROM analytics_events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30`)
        .all(tenantId) as any[]) || [];
    } catch {
      topViews = []; topPlugins = []; topTools = []; recentEvents = [];
    }

    // Fallback: if no analytics_events yet, derive tab usage from activities
    if (topViews.length === 0) {
      try {
        const acts = await db.prepare(`SELECT action as name, COUNT(*) as count FROM activities WHERE tenant_id = ? GROUP BY action ORDER BY count DESC LIMIT 10`).all(tenantId) as any[];
        // map actions to views: client.created -> clients tab etc.
        topViews = acts.slice(0, 6) as any;
      } catch {}
    }

    // Tenant stats (for this tenant)
    const tenantVisits = (await db.prepare('SELECT COUNT(*) as c FROM visits WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const tenantClients = (await db.prepare('SELECT COUNT(*) as c FROM clients WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const tenantDocs = (await db.prepare('SELECT COUNT(*) as c FROM documents WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const tenantTx = (await db.prepare('SELECT COUNT(*) as c FROM transactions WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;

    // Activities summary for this tenant
    const totalActivities = (await db.prepare('SELECT COUNT(*) as c FROM activities WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;

    return NextResponse.json({
      visits: { total, unique, today, todayUnique, activeNow, activeToday, lastDays, hourly, topPaths, recentVisits, tenantVisits },
      events: { totalEvents, uniqueEventUsers, topViews, topPlugins, topTools, recentEvents },
      usage: { tenantClients, tenantDocs, tenantTx, totalActivities },
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const body = await request.json().catch(() => ({}));
    const { event_type, event_name, metadata, path } = body;
    if (!event_type || !event_name) return NextResponse.json({ error: 'event_type and event_name required' }, { status: 400 });
    if (!['view', 'plugin', 'tool', 'action', 'export', 'search'].includes(event_type)) {
      // allow any, but warn
    }
    const tenantId = await getRequestTenant(request);
    const token = getTokenFromRequest(request);
    const user = await getSessionUser(token);
    const hdr = request.headers;
    const ip = hdr.get('cf-connecting-ip') || hdr.get('x-forwarded-for')?.split(',')[0]?.trim() || hdr.get('x-real-ip') || '127.0.0.1';
    const ua = (hdr.get('user-agent') || '').slice(0, 300);
    const t = await db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId) as any;
    if (!t) await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, 'My Firm', 'professional');

    await db
      .prepare(
        `INSERT INTO analytics_events (id, tenant_id, user_id, event_type, event_name, metadata, path, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        uuid(),
        tenantId,
        user?.id || null,
        String(event_type).slice(0, 30),
        String(event_name).slice(0, 80),
        metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
        (path || request.nextUrl.pathname).slice(0, 200),
        ip,
        ua
      );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
