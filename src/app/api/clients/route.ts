import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    const tenantId = await getRequestTenant(request);

    const clients = await db.prepare('SELECT * FROM clients WHERE tenant_id = ? ORDER BY name').all(tenantId);
    return NextResponse.json({ clients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const body = await request.json();
    const { name, gstin, pan, email, phone, tenantId: _bodyTenantId = 'default-tenant' } = body;
    const tenantId = await getRequestTenant(request);

    if (!name || !name.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (name.trim().length < 2) return NextResponse.json({ error: 'Name too short' }, { status: 400 });
    if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/i.test(gstin.trim()) && gstin.trim().length > 0) {
      return NextResponse.json({ error: 'Invalid GSTIN format' }, { status: 400 });
    }
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]{1}$/i.test(pan.trim()) && pan.trim().length > 0) {
      return NextResponse.json({ error: 'Invalid PAN format' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length > 0) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    // Ensure tenant exists
    const t = await db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
    if (!t) await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, 'My Firm', 'professional');

    const id = uuid();
    await db.prepare(`
      INSERT INTO clients (id, tenant_id, name, gstin, pan, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, tenantId, name.trim(), gstin?.trim() || null, pan?.trim().toUpperCase() || null, email?.trim() || null, phone?.trim() || null);

    await logActivity(request, 'client.created', { entity_type: 'client', entity_id: id, entity_name: name.trim(), details: { gstin, pan } });
    return NextResponse.json({ clientId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = await getRequestTenant(request);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const hasDocs = await db.prepare('SELECT id FROM documents WHERE client_id = ? LIMIT 1').get(id);
    if (hasDocs) return NextResponse.json({ error: 'Cannot delete: client has documents. Delete documents first.' }, { status: 400 });
    await db.prepare('DELETE FROM clients WHERE id = ? AND tenant_id = ?').run(id, tenantId);
    await logActivity(request, 'client.deleted', { entity_type: 'client', entity_id: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
