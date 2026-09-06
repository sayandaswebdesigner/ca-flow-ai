import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default-tenant';

    // Dashboard stats
    const totalClients = (db.prepare('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalDocuments = (db.prepare('SELECT COUNT(*) as count FROM documents WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalTransactions = (db.prepare('SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalReconciliations = (db.prepare('SELECT COUNT(*) as count FROM reconciliations WHERE tenant_id = ?').get(tenantId) as any).count;
    const completedReconciliations = (db.prepare("SELECT COUNT(*) as count FROM reconciliations WHERE tenant_id = ? AND status = 'completed'").get(tenantId) as any).count;
    const totalMatched = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ? AND status = 'matched'").get(tenantId) as any).count;
    const totalExceptions = (db.prepare("SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ? AND status = 'exception'").get(tenantId) as any).count;
    const unmatchedAmount = (db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE tenant_id = ? AND status = 'unmatched'").get(tenantId) as any).total;

    // Recent activity
    const recentDocs = db.prepare('SELECT * FROM documents WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5').all(tenantId);
    const recentRecons = db.prepare('SELECT * FROM reconciliations WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5').all(tenantId);

    // Document type breakdown
    const docTypes = db.prepare('SELECT document_type, COUNT(*) as count FROM documents WHERE tenant_id = ? GROUP BY document_type').all(tenantId);

    // Transaction status breakdown
    const txStatuses = db.prepare('SELECT status, COUNT(*) as count FROM transactions WHERE tenant_id = ? GROUP BY status').all(tenantId);

    return NextResponse.json({
      stats: {
        totalClients,
        totalDocuments,
        totalTransactions,
        totalReconciliations,
        completedReconciliations,
        totalMatched,
        totalExceptions,
        unmatchedAmount,
        matchRate: totalTransactions > 0 ? ((totalMatched / totalTransactions) * 100).toFixed(1) : '0',
      },
      recentDocs,
      recentRecons,
      docTypes,
      txStatuses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
