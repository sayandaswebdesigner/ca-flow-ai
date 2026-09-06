import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { runReconciliation } from '@/lib/reconciliation';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const tenantId = searchParams.get('tenantId') || 'default-tenant';

    let query = 'SELECT * FROM reconciliations WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }

    query += ' ORDER BY created_at DESC';
    const recons = db.prepare(query).all(...params);

    return NextResponse.json({ reconciliations: recons });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, clientId, type, sourceADocIds, sourceBDocIds, tenantId = 'default-tenant' } = body;

    if (!name || !clientId || !sourceADocIds?.length || !sourceBDocIds?.length) {
      return NextResponse.json({ error: 'Name, clientId, and both source document IDs required' }, { status: 400 });
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO reconciliations (id, tenant_id, client_id, name, type, status, source_a_doc_ids, source_b_doc_ids, created_by)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, 'system')
    `).run(id, tenantId, clientId, name, type || 'bank', JSON.stringify(sourceADocIds), JSON.stringify(sourceBDocIds));

    return NextResponse.json({ reconciliationId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
