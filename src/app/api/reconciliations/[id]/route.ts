import { NextRequest, NextResponse } from 'next/server';
import { runReconciliation } from '@/lib/reconciliation';
import { getRequestTenant } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getRequestTenant(request);
    const { getDbAsync } = await import('@/lib/db');
    const owner = (await getDbAsync()).prepare('SELECT id FROM reconciliations WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any;
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const result = await runReconciliation(id);
    await logActivity(request, 'reconciliation.run', { entity_type: 'reconciliation', entity_id: id, details: { matched: result.matched.length, exceptions: result.exceptions.length, stats: result.stats } });

    return NextResponse.json({
      matchedCount: result.matched.length,
      unmatchedACount: result.unmatchedA.length,
      unmatchedBCount: result.unmatchedB.length,
      exceptionCount: result.exceptions.length,
      matched: result.matched,
      exceptions: result.exceptions,
      stats: result.stats,
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
    const { getDbAsync } = await import('@/lib/db');
    const db = await getDbAsync();
    const { id } = await params;
    const tenantId = await getRequestTenant(request);

    const recon = await db.prepare('SELECT * FROM reconciliations WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any;
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const exceptions = await db.prepare('SELECT * FROM exceptions WHERE reconciliation_id = ?').all(id);

    const sourceADocIds = JSON.parse(recon.source_a_doc_ids || '[]');
    const sourceBDocIds = JSON.parse(recon.source_b_doc_ids || '[]');

    let sourceATransactions: any[] = [];
    let sourceBTransactions: any[] = [];

    if (sourceADocIds.length > 0) {
      sourceATransactions = await db.prepare(
        `SELECT * FROM transactions WHERE source_document_id IN (${sourceADocIds.map((_: any, i: number) => `$${i + 1}`).join(',')})`
      ).all(...sourceADocIds);
    }
    if (sourceBDocIds.length > 0) {
      sourceBTransactions = await db.prepare(
        `SELECT * FROM transactions WHERE source_document_id IN (${sourceBDocIds.map((_: any, i: number) => `$${i + 1}`).join(',')})`
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
