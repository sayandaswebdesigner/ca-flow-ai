import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tenantId = getRequestTenant(request);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));

    const reviews = db
      .prepare('SELECT * FROM reviews WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(tenantId, limit) as any[];

    const agg = db.prepare('SELECT COUNT(*) as count, AVG(rating) as avg FROM reviews WHERE tenant_id = ?').get(tenantId) as any;
    const distRows = db.prepare('SELECT rating, COUNT(*) as c FROM reviews WHERE tenant_id = ? GROUP BY rating').all(tenantId) as any[];
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of distRows) dist[r.rating] = r.c;

    return NextResponse.json({
      reviews,
      stats: {
        count: agg.count || 0,
        avg: agg.avg ? Number(Number(agg.avg).toFixed(2)) : 0,
        dist,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { rating, text, author_name, author_role, clientId, source = 'in_app' } = body;
    const tenantId = getRequestTenant(request);

    const r = Number(rating);
    if (!r || r < 1 || r > 5) return NextResponse.json({ error: 'Rating 1-5 required' }, { status: 400 });
    const cleanText = (text || '').toString().slice(0, 1000).trim();
    // Genuine mode: require 20 chars for wall (micro header still allows rating-only but marked unverified)
    const isWall = source === 'reviews_tab' || source === 'modal';
    if (isWall && cleanText.length < 20) return NextResponse.json({ error: 'Genuine review needs at least 20 characters' }, { status: 400 });
    if (cleanText && cleanText.length < 3) return NextResponse.json({ error: 'Text too short' }, { status: 400 });

    // Ensure tenant
    const t = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
    if (!t) db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, 'My Firm', 'professional');

    const id = uuid();
    db.prepare(
      `INSERT INTO reviews (id, tenant_id, client_id, rating, text, author_name, author_role, is_public, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(id, tenantId, clientId || null, r, cleanText || null, (author_name || 'CA User').slice(0, 80), (author_role || 'ca').slice(0, 20), source);

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
