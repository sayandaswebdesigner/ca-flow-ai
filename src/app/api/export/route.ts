import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tenantId = getRequestTenant(request);
    const clientId = searchParams.get('clientId');
    const format = (searchParams.get('format') || 'excel').toLowerCase(); // excel | tally
    const reconId = searchParams.get('reconciliationId');

    let transactions: any[];
    let clientName = 'All Clients';

    if (reconId) {
      const recon = db.prepare('SELECT * FROM reconciliations WHERE id = ? AND tenant_id = ?').get(reconId, tenantId) as any;
      if (!recon) return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
      const ids = [...JSON.parse(recon.source_a_doc_ids || '[]'), ...JSON.parse(recon.source_b_doc_ids || '[]')];
      if (ids.length === 0) transactions = [];
      else
        transactions = db
          .prepare(`SELECT * FROM transactions WHERE tenant_id = ? AND source_document_id IN (${ids.map(() => '?').join(',')}) ORDER BY date`)
          .all(tenantId, ...ids) as any[];
      clientName = db.prepare('SELECT name FROM clients WHERE id = ?').get(recon.client_id) as any ? (db.prepare('SELECT name FROM clients WHERE id = ?').get(recon.client_id) as any).name : clientName;
    } else if (clientId) {
      const c = db.prepare('SELECT name FROM clients WHERE id = ? AND tenant_id = ?').get(clientId, tenantId) as any;
      if (!c) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      clientName = c.name;
      transactions = db.prepare('SELECT * FROM transactions WHERE tenant_id = ? AND client_id = ? ORDER BY date').all(tenantId, clientId) as any[];
    } else {
      transactions = db.prepare('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY date').all(tenantId) as any[];
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

    // Default: Excel (XLSX) — uses existing xlsx dep
    const rows = transactions.map((t) => ({
      Date: t.date,
      Description: t.description,
      Amount: t.amount,
      'Debit/Credit': t.amount >= 0 ? 'Credit' : 'Debit',
      Reference: t.reference_number || '',
      Source: t.source_type,
      Status: t.status,
      Counterparty: t.counterparty || '',
      Client: clientName,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No transactions found' }]);
    // autofit cols
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    // Summary sheet
    const summary = [
      { Metric: 'Client', Value: clientName },
      { Metric: 'Total Transactions', Value: transactions.length },
      { Metric: 'Matched', Value: transactions.filter((t) => t.status === 'matched').length },
      { Metric: 'Unmatched', Value: transactions.filter((t) => t.status === 'unmatched').length },
      { Metric: 'Exception', Value: transactions.filter((t) => t.status === 'exception').length },
      { Metric: 'Total Amount', Value: transactions.reduce((s, t) => s + t.amount, 0) },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summary);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }];
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
