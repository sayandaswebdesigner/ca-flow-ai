import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const tenantId = getRequestTenant(request);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM transactions WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const total = (db.prepare(countQuery).get(...params) as any).count;

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = db.prepare(query).all(...params);

    return NextResponse.json({ transactions, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { id, category, status, description } = body;
    const tenantId = getRequestTenant(request);

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updates: string[] = [];
    const params: any[] = [];

    if (category) { updates.push('category = ?'); params.push(category); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (description) { updates.push('description = ?'); params.push(description); }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    params.push(id, tenantId);

    db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
