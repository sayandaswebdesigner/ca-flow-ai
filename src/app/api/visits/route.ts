import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant, getSessionUser, getTokenFromRequest, isAdminEmail } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const viewer = await getSessionUser(getTokenFromRequest(request));
    if (!viewer || !isAdminEmail(viewer.email)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    const db = await getDbAsync();
    // Global visits — all tenants (so Safari & Chrome show same)
    const total = (await db.prepare('SELECT COUNT(*) as c FROM visits').get() as any).c as number;
    const unique = (await db.prepare('SELECT COUNT(DISTINCT ip) as c FROM visits').get() as any).c as number;
    const today = (await db.prepare("SELECT COUNT(*) as c FROM visits WHERE date(created_at) = date('now')").get() as any).c as number;
    const last7 = await db
      .prepare(
        "SELECT date(created_at) as d, COUNT(*) as c FROM visits WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY d"
      )
      .all() as any[];
    const recent = await db.prepare('SELECT * FROM visits ORDER BY created_at DESC LIMIT 20').all() as any[];

    return NextResponse.json({ total, unique, today, last7, recent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const body = await request.json().catch(() => ({}));
    const tenantId = await getRequestTenant(request);
    const path = (body.path || request.nextUrl.pathname).slice(0, 200);

    const hdr = request.headers;
    const ip = hdr.get('cf-connecting-ip') || hdr.get('x-forwarded-for')?.split(',')[0]?.trim() || hdr.get('x-real-ip') || '127.0.0.1';
    const ua = (hdr.get('user-agent') || '').slice(0, 300);
    const country = hdr.get('cf-ipcountry') || hdr.get('x-vercel-ip-country') || null;
    const city = hdr.get('cf-ipcity') || hdr.get('x-vercel-ip-city') || null;

    // dedup: same ip + path within 5 min = ignore
    const recent = await db
      .prepare("SELECT id FROM visits WHERE ip = ? AND path = ? AND created_at >= datetime('now', '-5 minutes') LIMIT 1")
      .get(ip, path) as any;
    if (recent) return NextResponse.json({ deduped: true });

    const t = await db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId) as any;
    if (!t) await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, 'My Firm', 'professional');

    await db.prepare('INSERT INTO visits (id, tenant_id, ip, user_agent, path, country, city) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      uuid(),
      tenantId,
      ip,
      ua,
      path,
      country,
      city
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
