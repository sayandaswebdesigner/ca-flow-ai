import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { detectAnomalies, explainTransaction, computeHealthScores } from '@/lib/insights';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default-tenant';

    const transactions = db
      .prepare('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY date DESC LIMIT 500')
      .all(tenantId) as any[];
    const clients = db
      .prepare('SELECT id, name, phone FROM clients WHERE tenant_id = ?')
      .all(tenantId) as any[];
    const documents = db
      .prepare('SELECT client_id, document_type FROM documents WHERE tenant_id = ?')
      .all(tenantId) as any[];

    const anomalies = detectAnomalies(transactions);
    const open = transactions.filter((t) => t.status === 'unmatched' || t.status === 'exception');
    const explanations = open.slice(0, 50).map((t) => explainTransaction(t, transactions));
    const health = computeHealthScores(clients, documents, transactions, anomalies);
    const completeness = health; // keep key for backward compat, now enriched with score+waLink
    // WA links for explanations if client has phone
    const phoneByClient = new Map<string, string | null>(clients.map((c: any) => [c.id, c.phone || null]));
    const explanationsWithWa = explanations.map((e) => {
      const tx = transactions.find((t: any) => t.id === e.transactionId);
      const phone = tx ? phoneByClient.get(tx.client_id) || null : null;
      const digits = phone ? phone.replace(/\D/g, '') : '';
      const normalized = digits.length === 10 ? `91${digits}` : digits;
      const waLink = phone && normalized.length >= 10 ? `https://wa.me/${normalized}?text=${encodeURIComponent(e.clientMessage)}` : null;
      return { ...e, waLink, clientPhone: phone };
    });

    return NextResponse.json({ anomalies, explanations: explanationsWithWa, completeness, health });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
