import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    const tenantId = await getRequestTenant(request);

    // Dashboard stats
    const totalClients = (await db.prepare('SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalDocuments = (await db.prepare('SELECT COUNT(*) as count FROM documents WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalTransactions = (await db.prepare('SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ?').get(tenantId) as any).count;
    const totalReconciliations = (await db.prepare('SELECT COUNT(*) as count FROM reconciliations WHERE tenant_id = ?').get(tenantId) as any).count;
    const completedReconciliations = (await db.prepare("SELECT COUNT(*) as count FROM reconciliations WHERE tenant_id = ? AND status = 'completed'").get(tenantId) as any).count;
    const totalMatched = (await db.prepare("SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ? AND status = 'matched'").get(tenantId) as any).count;
    const totalExceptions = (await db.prepare("SELECT COUNT(*) as count FROM transactions WHERE tenant_id = ? AND status = 'exception'").get(tenantId) as any).count;
    const unmatchedAmount = (await db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE tenant_id = ? AND status = 'unmatched'").get(tenantId) as any).total;

    // Recent activity
    const recentDocs = await db.prepare('SELECT * FROM documents WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5').all(tenantId);
    const recentRecons = await db.prepare('SELECT * FROM reconciliations WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5').all(tenantId);

    // Document type breakdown
    const docTypes = await db.prepare('SELECT document_type, COUNT(*) as count FROM documents WHERE tenant_id = ? GROUP BY document_type').all(tenantId);

    // Transaction status breakdown
    const txStatuses = await db.prepare('SELECT status, COUNT(*) as count FROM transactions WHERE tenant_id = ? GROUP BY status').all(tenantId);

    // Per-tenant 7-day productivity series — every user sees their OWN graph,
    // even when all zeros (new users). Bucketed in JS to stay PG/SQLite compatible.
    const docDates = (await db.prepare('SELECT created_at as d FROM documents WHERE tenant_id = ?').all(tenantId) as any[]) || [];
    const txRows = (await db.prepare('SELECT date as d, status, created_at as c FROM transactions WHERE tenant_id = ?').all(tenantId) as any[]) || [];
    const reconDates = (await db.prepare('SELECT created_at as d, status FROM reconciliations WHERE tenant_id = ?').all(tenantId) as any[]) || [];
    const clientDates = (await db.prepare('SELECT created_at as d FROM clients WHERE tenant_id = ?').all(tenantId) as any[]) || [];
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const days: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: dayKey(d), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) });
    }
    const countOn = (rows: any[], getDate: (r: any) => string, day: string) =>
      rows.filter((r) => String(getDate(r) || '').slice(0, 10) === day).length;
    const productivity = days.map((day) => ({
      date: day.date,
      label: day.label,
      documents: countOn(docDates, (r) => r.d, day.date),
      transactions: countOn(txRows, (r) => r.d || r.c, day.date),
      matched: txRows.filter((r) => r.status === 'matched' && String(r.d || r.c || '').slice(0, 10) === day.date).length,
      exceptions: txRows.filter((r) => r.status === 'exception' && String(r.d || r.c || '').slice(0, 10) === day.date).length,
      reconciliations: countOn(reconDates, (r) => r.d, day.date),
      clients: countOn(clientDates, (r) => r.d, day.date),
    }));

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
      productivity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
