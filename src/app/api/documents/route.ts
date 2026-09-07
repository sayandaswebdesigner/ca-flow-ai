import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getRequestTenant } from '@/lib/auth';
import { v4 as uuid } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parseCSV, parseExcel, classifyDocument, parseInvoiceText, extractUTR, getBankLabel } from '@/lib/parser';
import { logActivity } from '@/lib/activity';

async function ensureTenant(db: any, tenantId: string) {
  const t = await db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
  if (!t) await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, 'My Firm', 'professional');
}

function parseTransactionsFromPdfText(text: string): { date: string; description: string; amount: number; reference?: string }[] {
  const out: any[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Match: 01/10/2024 ... 150000 or 01-10-2024 ... -45000
    const m = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}).*?(-?[\d,]+\.\d{2}|-?[\d,]+)/);
    if (!m) continue;
    const dateRaw = m[1];
    const amtRaw = m[2].replace(/,/g, '');
    const amt = parseFloat(amtRaw);
    if (isNaN(amt) || Math.abs(amt) < 1) continue;
    const dmy = dateRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    let date = dateRaw;
    if (dmy) {
      const [, d, mo, y] = dmy;
      const yy = y.length === 2 ? '20' + y : y;
      date = `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const desc = line.replace(m[0], '').replace(/\s{2,}/g, ' ').trim().slice(0, 200) || 'Transaction';
    if (/balance|opening|closing|statement/i.test(desc) && Math.abs(amt) < 1000) continue;
    const isDebit = /debit|withdrawal|dr\b|payment to/i.test(line);
    const amount = amt > 0 && isDebit && amt < 1000000 ? -Math.abs(amt) : amt;
    const utr = extractUTR(line);
    out.push({ date, description: desc, amount, reference: utr });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const clientId = formData.get('clientId') as string;
    const tenantId = await getRequestTenant(request);

    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    if (!clientId) return NextResponse.json({ error: 'Select a client first' }, { status: 400 });

    const db = await getDbAsync();
    ensureTenant(db, tenantId);

    const client = await db.prepare('SELECT id FROM clients WHERE id = ? AND tenant_id = ?').get(clientId, tenantId);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const results: any[] = [];

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: `${file.name} exceeds 50MB limit` }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const docId = uuid();
      const storagePath = join(uploadDir, `${docId}.${ext}`);
      await writeFile(storagePath, buffer);

      let textContent = '';
      let transactions: any[] = [];
      let extractedData: any = null;

      try {
        if (ext === 'csv') {
          textContent = buffer.toString('utf-8');
          transactions = parseCSV(textContent, file.name);
        } else if (ext === 'xlsx' || ext === 'xls') {
          transactions = parseExcel(buffer, file.name);
          textContent = JSON.stringify(transactions).slice(0, 2000);
        } else if (ext === 'pdf') {
          try {
            const pdfParseMod: any = await import('pdf-parse');
            const pdfParse = pdfParseMod.default || pdfParseMod;
            const pdf = await pdfParse(buffer);
            textContent = pdf.text || '';
            // Try table extraction, fallback to invoice text
            const pdfTx = parseTransactionsFromPdfText(textContent);
            if (pdfTx.length >= 3) transactions = pdfTx;
            else extractedData = parseInvoiceText(textContent);
          } catch {
            textContent = `PDF ${file.name} (${buffer.length} bytes)`;
            extractedData = { raw: 'PDF parse failed — stored for manual review' };
          }
        } else if (ext === 'txt') {
          textContent = buffer.toString('utf-8');
          transactions = parseCSV(textContent, file.name);
          if (!transactions.length) extractedData = parseInvoiceText(textContent);
        } else {
          textContent = buffer.toString('utf-8').slice(0, 4000);
        }
      } catch (e: any) {
        console.error('Parse error', e);
      }

      const classification = classifyDocument(file.name, textContent);
      const detectedBank = (classification as any).detectedBank || transactions[0]?.detectedBank || 'other';
      const bankLabel = getBankLabel(detectedBank);
      const utrExtracted = transactions.filter((t: any) => t.reference && String(t.reference).length >= 10).length;

      // Override classification if we actually parsed bank-like tx
      let docType = classification.type;
      let sourceType: 'bank' | 'ledger' = 'ledger';
      if (transactions.length >= 3) {
        sourceType = docType === 'bank_statement' ? 'bank' : 'ledger';
        if (docType === 'other' && transactions.length > 0) docType = 'bank_statement';
      }

      const meta = JSON.stringify({ detectedBank, bankLabel, utrExtracted, totalTx: transactions.length });
      await db.prepare(
        `INSERT INTO documents (id, tenant_id, client_id, file_name, mime_type, storage_path, file_size, status, document_type, classification_confidence, extracted_data, metadata, processed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        docId,
        tenantId,
        clientId,
        file.name,
        file.type || 'application/octet-stream',
        storagePath,
        buffer.length,
        transactions.length > 0 || extractedData ? 'extracted' : 'uploaded',
        docType,
        classification.confidence,
        extractedData ? JSON.stringify(extractedData) : null,
        meta
      );

      const insertTx = db.prepare(
        `INSERT INTO transactions (id, tenant_id, client_id, source_document_id, source_type, date, description, amount, reference_number, counterparty, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched')`
      );

      for (const tx of transactions) {
        // Validate date and amount
        if (!tx.date || isNaN(Date.parse(tx.date)) || !tx.amount || isNaN(tx.amount)) continue;
        await insertTx.run(uuid(), tenantId, clientId, docId, sourceType, tx.date, (tx.description || 'Transaction').slice(0, 200), tx.amount, tx.reference || null, tx.counterparty || null);
      }

      results.push({
        documentId: docId,
        fileName: file.name,
        type: docType,
        sourceType: transactions.length ? sourceType : null,
        confidence: classification.confidence,
        transactionCount: transactions.length,
        status: transactions.length > 0 || extractedData ? 'extracted' : 'uploaded',
        detectedBank,
        bankLabel,
        utrExtracted,
      });
    }

    for (const r of results) {
      await logActivity(request, 'document.uploaded', { entity_type: 'document', entity_id: r.documentId, entity_name: r.fileName, details: { type: r.type, bank: r.bankLabel, transactions: r.transactionCount } });
    }
    return NextResponse.json({ documents: results });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const tenantId = await getRequestTenant(request);

    let query = 'SELECT * FROM documents WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }
    query += ' ORDER BY created_at DESC';
    const docs = await db.prepare(query).all(...params);
    return NextResponse.json({ documents: docs });
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
    const doc = await db.prepare('SELECT * FROM documents WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any;
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await db.prepare('DELETE FROM transactions WHERE source_document_id = ?').run(id);
    await db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    if (doc.storage_path) await unlink(doc.storage_path).catch(() => {});
    await logActivity(request, 'document.deleted', { entity_type: 'document', entity_id: id, entity_name: doc.file_name });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
