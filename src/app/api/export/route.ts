import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';
import * as XLSX from 'xlsx';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toTallyXml(transactions: any[], clientName: string): string {
  const dateToTally = (d: string) => {
    // Tally expects YYYYMMDD
    const clean = (d || '').split('T')[0].replace(/-/g, '');
    return clean.length === 8 ? clean : '20241001';
  };
  const vouchers = transactions
    .map((t) => {
      const isCredit = t.amount >= 0;
      const amt = Math.abs(t.amount).toFixed(2);
      const desc = escapeXml((t.description || 'Transaction').slice(0, 80));
      const ref = escapeXml(t.reference_number || t.id.slice(0, 10));
      const date = dateToTally(t.date);
      // Minimal valid Tally voucher: Receipt if credit, Payment if debit, Journal otherwise could be used
      const vchType = isCredit ? 'Receipt' : 'Payment';
      const ledger = isCredit ? escapeXml(clientName || 'Bank') : 'Expenses';
      const bankLedger = 'Bank';
      return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${vchType}" ACTION="Create">
        <DATE>${date}</DATE>
        <NARRATION>${desc} Ref:${ref}</NARRATION>
        <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${isCredit ? bankLedger : ledger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isCredit ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${isCredit ? '' : '-'}${amt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${isCredit ? ledger : bankLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isCredit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${isCredit ? '-' : ''}${amt}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join('\n');

  return `<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    // Accept tenantId from query param (for <a> tag links that can't send headers)
    const queryTenant = searchParams.get('tenantId');
    const sessionTenant = await getRequestTenant(request);
    const tenantId = (queryTenant && queryTenant.trim()) || sessionTenant;
    const clientId = searchParams.get('clientId');
    const format = (searchParams.get('format') || 'excel').toLowerCase(); // excel | tally
    const reconId = searchParams.get('reconciliationId');

    let transactions: any[];
    let clientName = 'All Clients';

    if (reconId) {
      const recon = await db.prepare('SELECT * FROM reconciliations WHERE id = ? AND tenant_id = ?').get(reconId, tenantId) as any;
      if (!recon) return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
      const ids = [...JSON.parse(recon.source_a_doc_ids || '[]'), ...JSON.parse(recon.source_b_doc_ids || '[]')];
      if (ids.length === 0) transactions = [];
      else
        transactions = await db
          .prepare(`SELECT * FROM transactions WHERE tenant_id = ? AND source_document_id IN (${ids.map(() => '?').join(',')}) ORDER BY date`)
          .all(tenantId, ...ids) as any[];
      const clientResult = await db.prepare('SELECT name FROM clients WHERE id = ?').get(recon.client_id) as any;
      clientName = clientResult ? clientResult.name : clientName;
    } else if (clientId) {
      const c = await db.prepare('SELECT name FROM clients WHERE id = ? AND tenant_id = ?').get(clientId, tenantId) as any;
      if (!c) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      clientName = c.name;
      transactions = await db.prepare('SELECT * FROM transactions WHERE tenant_id = ? AND client_id = ? ORDER BY date').all(tenantId, clientId) as any[];
    } else {
      transactions = await db.prepare('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY date').all(tenantId) as any[];
    }

    if (format === 'tally' || format === 'xml') {
      const xml = toTallyXml(transactions, clientName);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${clientName.replace(/\s+/g, '_')}_tally_${new Date().toISOString().slice(0, 10)}.xml"`,
        },
      });
    }

    // Default: Excel (XLSX) — with Working Paper & Bank Intelligence sheets
    const rows = transactions.map((t) => ({
      Date: t.date,
      Description: t.description,
      Amount: t.amount,
      'Debit/Credit': t.amount >= 0 ? 'Credit' : 'Debit',
      Reference: t.reference_number || '',
      UTR_Valid: t.reference_number && String(t.reference_number).length >= 10 ? 'Yes' : 'No',
      Source: t.source_type,
      Status: t.status,
      Matched_With: t.matched_transaction_id ? t.matched_transaction_id.slice(0, 8) : '',
      Counterparty: t.counterparty || '',
      Client: clientName,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No transactions found' }]);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // Bank Intelligence sheet — UTR coverage per bank
    const utrCovered = transactions.filter((t) => t.reference_number && String(t.reference_number).length >= 10).length;
    let docs: any[] = [];
    try {
      if (clientId) docs = await db.prepare('SELECT file_name, document_type, metadata FROM documents WHERE tenant_id = ? AND client_id = ? LIMIT 20').all(tenantId, clientId) as any[];
      else docs = await db.prepare('SELECT file_name, document_type, metadata FROM documents WHERE tenant_id = ? LIMIT 20').all(tenantId) as any[];
    } catch { docs = []; }
    const bankInfo = docs.map((d: any) => {
      try { const m = JSON.parse(d.metadata || '{}'); return { file: d.file_name, bank: m.bankLabel || 'Unknown', utr: m.utrExtracted ?? '—' }; } catch { return { file: d.file_name, bank: '—', utr: '—' }; }
    });
    const coverageRows = [
      { Metric: 'UTR Coverage', Value: `${utrCovered}/${transactions.length} (${transactions.length ? Math.round(utrCovered/transactions.length*100) : 0}%)` },
      { Metric: 'Banks Detected', Value: [...new Set(bankInfo.map(b=>b.bank))].join(', ') || '—' },
      ...bankInfo.map(b => ({ Metric: `Doc: ${b.file.slice(0,30)}`, Value: `${b.bank} — UTRs: ${b.utr}` })),
    ];
    const wsBank = XLSX.utils.json_to_sheet(coverageRows);
    wsBank['!cols'] = [{ wch: 36 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsBank, 'Bank Intelligence');

    // Exceptions — Why & Action (working-paper grade)
    const unmatched = transactions.filter((t) => t.status === 'exception' || t.status === 'unmatched');
    const exceptionRows = unmatched.slice(0, 200).map((t) => {
      const hasRef = t.reference_number && String(t.reference_number).length >= 10;
      let why = '';
      let action = '';
      if (!hasRef) { why = 'Missing UTR/Reference — UTR could not be extracted from narration'; action = 'Ask client for UTR / voucher'; }
      else if (transactions.some((o) => o.id !== t.id && Math.abs(o.amount - t.amount) < 0.01 && o.source_type !== t.source_type)) { why = 'Amount exists on other side but date/narration differ (timing diff)'; action = 'Manually verify & match if same underlying txn'; }
      else { why = t.source_type === 'bank' ? 'No matching entry in books (client not recorded)' : 'No matching credit in bank (cheque in transit / next month)'; action = t.source_type === 'bank' ? 'Request missing bill/voucher' : 'Check uncleared cheque'; }
      return { Date: t.date, Description: t.description, Amount: t.amount, Reference: t.reference_number || '—', Source: t.source_type, Why: why, Action: action };
    });
    const wsExc = XLSX.utils.json_to_sheet(exceptionRows.length ? exceptionRows : [{ Note: 'No exceptions — clean reconcile' }]);
    wsExc['!cols'] = [{ wch: 12 }, { wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 48 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, wsExc, 'Exceptions - Why & Action');

    // Summary sheet — enhanced with intelligence
    const matchedCount = transactions.filter((t) => t.status === 'matched').length;
    const summary = [
      { Metric: 'Client', Value: clientName },
      { Metric: 'Generated', Value: new Date().toISOString().slice(0,19).replace('T',' ') + ' IST' },
      { Metric: 'Total Transactions', Value: transactions.length },
      { Metric: 'Matched', Value: matchedCount },
      { Metric: 'Unmatched', Value: transactions.filter((t) => t.status === 'unmatched').length },
      { Metric: 'Exception', Value: transactions.filter((t) => t.status === 'exception').length },
      { Metric: 'UTR-Covered', Value: `${utrCovered} (${transactions.length ? Math.round(utrCovered/transactions.length*100) : 0}%)` },
      { Metric: 'Auto-Match Rate', Value: transactions.length ? `${Math.round(matchedCount/transactions.length*100)}%` : '—' },
      { Metric: 'Total Amount', Value: transactions.reduce((s, t) => s + t.amount, 0) },
      { Metric: 'Audit Note', Value: 'UTR-first matching applied; see Bank Intelligence & Exceptions sheets for evidence' },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summary);
    ws2['!cols'] = [{ wch: 22 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    const buf: Buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as any);

    return new NextResponse(buf as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${clientName.replace(/\s+/g, '_')}_export_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
