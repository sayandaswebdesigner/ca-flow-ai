import { NextRequest, NextResponse } from 'next/server';
import { runReconciliation } from '@/lib/reconciliation';
import { getRequestTenant } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = getRequestTenant(request);
    const { getDb } = await import('@/lib/db');
    const owner = getDb().prepare('SELECT id FROM reconciliations WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any;
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const result = runReconciliation(id);

    return NextResponse.json({
      matchedCount: result.matched.length,
      unmatchedACount: result.unmatchedA.length,
      unmatchedBCount: result.unmatchedB.length,
      exceptionCount: result.exceptions.length,
      matched: result.matched,
      exceptions: result.exceptions,
    });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    const { id } = await params;
    const tenantId = getRequestTenant(request);

    const recon = db.prepare('SELECT * FROM reconciliations WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any;
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const exceptions = db.prepare('SELECT * FROM exceptions WHERE reconciliation_id = ?').all(id);

    const sourceADocIds = JSON.parse(recon.source_a_doc_ids || '[]');
    const sourceBDocIds = JSON.parse(recon.source_b_doc_ids || '[]');

    let sourceATransactions: any[] = [];
    let sourceBTransactions: any[] = [];

    if (sourceADocIds.length > 0) {
      sourceATransactions = db.prepare(
        `SELECT * FROM transactions WHERE source_document_id IN (${sourceADocIds.map(() => '?').join(',')})`
      ).all(...sourceADocIds);
    }
    if (sourceBDocIds.length > 0) {
      sourceBTransactions = db.prepare(
        `SELECT * FROM transactions WHERE source_document_id IN (${sourceBDocIds.map(() => '?').join(',')})`
      ).all(...sourceBDocIds);
    }

    return NextResponse.json({
      reconciliation: recon,
      sourceATransactions,
      sourceBTransactions,
      exceptions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
