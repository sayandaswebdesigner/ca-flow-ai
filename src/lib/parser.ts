import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export interface ParsedTransaction {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  amount: number;
  reference?: string;
  counterparty?: string;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  lineItems: { description: string; amount: number; quantity: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  gstin?: string;
}

export function parseCSV(content: string): ParsedTransaction[] {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row: unknown) => {
    const r = row as Record<string, string>;
    const date = r['Date'] || r['date'] || r['Transaction Date'] || r['Txn Date'] || '';
    const desc = r['Description'] || r['Narration'] || r['Particulars'] || r['Details'] || '';
    const debit = parseFloat(r['Debit'] || r['Withdrawal'] || r['DR'] || '0') || 0;
    const credit = parseFloat(r['Credit'] || r['Deposit'] || r['CR'] || '0') || 0;
    const ref = r['Reference'] || r['Ref No'] || r['Cheque No'] || r['UTR'] || '';

    return {
      date: normalizeDate(date),
      description: desc,
      debit: debit || undefined,
      credit: credit || undefined,
      amount: credit - debit,
      reference: ref || undefined,
    };
  }).filter((t: ParsedTransaction) => t.date && t.amount !== 0);
}

export function parseExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  return data.map((row) => {
    const date = row['Date'] || row['date'] || row['Transaction Date'] || row['Txn Date'] || '';
    const desc = row['Description'] || row['Narration'] || row['Particulars'] || '';
    const debit = parseFloat(String(row['Debit'] || row['Withdrawal'] || row['DR'] || '0')) || 0;
    const credit = parseFloat(String(row['Credit'] || row['Deposit'] || row['CR'] || '0')) || 0;

    return {
      date: normalizeDate(String(date)),
      description: String(desc),
      debit: debit || undefined,
      credit: credit || undefined,
      amount: credit - debit,
      reference: String(row['Reference'] || row['Ref No'] || ''),
    };
  }).filter((t) => t.date && t.amount !== 0);
}

export function parseInvoiceText(text: string): ParsedInvoice {
  const invoiceMatch = text.match(/invoice\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9\-\/]+)/i);
  const dateMatch = text.match(/(?:date|dated)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const vendorMatch = text.match(/(?:from|vendor|supplier|billed by)\s*[:\-]?\s*(.+?)(?:\n|$)/i);
  const totalMatch = text.match(/(?:total|grand total|amount due)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i);
  const taxMatch = text.match(/(?:gst|tax|cgst\+sgst)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i);
  const gstrinMatch = text.match(/gst[io]n\s*[:\-]?\s*(\d{2}[A-Z0-9]{13})/i);

  return {
    invoiceNumber: invoiceMatch?.[1] || 'INV-' + Date.now(),
    invoiceDate: dateMatch?.[1] ? normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
    vendorName: vendorMatch?.[1]?.trim() || 'Unknown Vendor',
    lineItems: [],
    subtotal: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0,
    taxAmount: taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : 0,
    totalAmount: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0,
    gstin: gstrinMatch?.[1],
  };
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.split('T')[0];
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? '20' + y : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return cleaned;
}

export function classifyDocument(fileName: string, content: string): { type: string; confidence: number } {
  const lower = fileName.toLowerCase();
  const textSample = content.substring(0, 2000).toLowerCase();

  if (lower.includes('statement') || lower.includes('bank') || textSample.includes('opening balance') || textSample.includes('closing balance')) {
    return { type: 'bank_statement', confidence: 0.9 };
  }
  if (lower.includes('invoice') || lower.includes('bill') || textSample.includes('invoice no') || textSample.includes('gst')) {
    return { type: 'sales_invoice', confidence: 0.85 };
  }
  if (lower.includes('receipt') || textSample.includes('receipt')) {
    return { type: 'receipt', confidence: 0.8 };
  }
  if (lower.includes('ledger') || lower.includes('journal') || textSample.includes('ledger')) {
    return { type: 'ledger_export', confidence: 0.85 };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return { type: 'ledger_export', confidence: 0.7 };
  }
  return { type: 'other', confidence: 0.5 };
}
