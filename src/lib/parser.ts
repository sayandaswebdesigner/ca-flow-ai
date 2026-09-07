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
  detectedBank?: string;
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

export type BankId = 'hdfc' | 'icici' | 'sbi' | 'axis' | 'kotak' | 'yes' | 'indusind' | 'bob' | 'pnb' | 'federal' | 'other';

const BANK_KEYWORDS: Record<BankId, string[]> = {
  hdfc: ['hdfc', 'hdfc bank'],
  icici: ['icici', 'icici bank'],
  sbi: ['state bank', ' sbi ', 'sbi bank'],
  axis: ['axis bank', 'axis'],
  kotak: ['kotak', 'kotak mahindra'],
  yes: ['yes bank'],
  indusind: ['indusind'],
  bob: ['bank of baroda', ' bob ', 'baroda'],
  pnb: ['punjab national', ' pnb '],
  federal: ['federal bank'],
  other: [],
};

const BANK_LABELS: Record<BankId, string> = {
  hdfc: 'HDFC Bank',
  icici: 'ICICI Bank',
  sbi: 'State Bank of India',
  axis: 'Axis Bank',
  kotak: 'Kotak Mahindra',
  yes: 'YES Bank',
  indusind: 'IndusInd Bank',
  bob: 'Bank of Baroda',
  pnb: 'PNB',
  federal: 'Federal Bank',
  other: 'Other',
};

export function getBankLabel(bank: BankId | string): string {
  return BANK_LABELS[bank as BankId] || bank;
}

export function detectBank(fileName: string, contentSample: string, headers: string[] = []): BankId {
  const hay = `${fileName} ${contentSample} ${headers.join(' ')}`.toLowerCase();
  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS) as [BankId, string[]][]) {
    if (bank === 'other') continue;
    if (keywords.some((k) => hay.includes(k.trim().toLowerCase()))) return bank;
  }
  // Header heuristics
  const h = headers.join(' ').toLowerCase();
  if (h.includes('chq./ref.no') && h.includes('withdrawal amt')) return 'hdfc';
  if (h.includes('tran date') && h.includes('cheque no')) return 'icici';
  if (h.includes('txn date') && h.includes('ref no')) return 'sbi';
  return 'other';
}

// Extract UTR / reference from Indian bank narration — covers HDFC (/), ICICI (-), SBI (TRANSFER FROM), Axis (spaces)
// UTR forms: 16-digit numeric (NEFT), 22-char alphanumeric (RTGS), UPI ref 12-digit, NEFT/RTGS/IMPS/UPI prefixes, standalone long alphanum
export function extractUTR(text: string): string | undefined {
  if (!text) return undefined;
  const t = text.toUpperCase().trim();
  // Ordered by specificity — most reliable first
  const patterns: RegExp[] = [
    // Explicit UTR label: UTR: N123..., UTR No. 123..., Ref No: 123...
    /(?:UTR|REF\s*NO|REFERENCE|TXN\s*ID|TRANSACTION\s*ID)[\s:\-#]*([A-Z0-9]{10,24})/,
    // NEFT/RTGS/IMPS/UPI prefix with code: NEFT-IN-123..., IMPS/P2A/123..., UPI/123...
    /(?:NEFT|RTGS|IMPS|UPI|NACH)[\-\/:_\s]*([A-Z0-9]{10,22})/,
    // HDFC style: N123456789012345, Chq No style
    /\bN\d{8,20}\b/,
    // ICICI hyphenated: ICICIN123..., etc
    /\b[A-Z]{2,6}\d{8,18}\b/,
    // Pure long numeric UTR: 16 or 22 digits (NEFT=16, RTGS may be alphanumeric but fallback)
    /\b\d{16}\b/,
    /\b\d{22}\b/,
    /\b\d{12}\b/,
    // Generic long alphanum candidate (16-22 chars) surrounded by non-alphanum
    /\b[A-Z0-9]{16,22}\b/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const candidate = (m[1] || m[0]).replace(/[\/\-]/g, '').trim();
      // Validate: must contain at least 6 digits and be 10-22 chars after stripping separators
      if (candidate.length >= 10 && candidate.length <= 24 && /\d{4,}/.test(candidate)) {
        return candidate.slice(0, 22);
      }
    }
  }
  return undefined;
}

export function normalizeNarration(text: string): string {
  if (!text) return text;
  // HDFC uses / as separator, ICICI uses -, SBI uses multiple spaces — collapse to single space
  return text
    .replace(/[\/]+/g, ' / ')
    .replace(/\-+/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*\-\s*/g, ' - ')
    .trim()
    .slice(0, 220);
}

export function parseCSV(content: string, fileName = 'statement.csv'): ParsedTransaction[] {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!records.length) return [];
  const headers = Object.keys(records[0] as Record<string, string>);
  const bank = detectBank(fileName, content.slice(0, 3000), headers);

  return records.map((row: unknown) => {
    const r = row as Record<string, string>;
    const date = r['Date'] || r['date'] || r['Transaction Date'] || r['Txn Date'] || r['Tran Date'] || r['Value Date'] || r['Posting Date'] || '';
    const descRaw = r['Description'] || r['Narration'] || r['Particulars'] || r['Details'] || r['Remarks'] || '';
    const desc = normalizeNarration(descRaw);
    // HDFC: Withdrawal Amt / Deposit Amt ; Generic: Debit/Credit
    const debit = parseFloat(r['Debit'] || r['Withdrawal'] || r['Withdrawal Amt'] || r['DR'] || r['Amount Dr'] || '0') || 0;
    const credit = parseFloat(r['Credit'] || r['Deposit'] || r['Deposit Amt'] || r['CR'] || r['Amount Cr'] || '0') || 0;
    // Amount column fallback (single column with +/-)
    const amountRaw = r['Amount'] || r['AMOUNT'] || '';
    let amount = credit - debit;
    if (amount === 0 && amountRaw) {
      const v = parseFloat(String(amountRaw).replace(/,/g, '').trim());
      if (!isNaN(v) && v !== 0) amount = v;
      // If narration indicates withdrawal/debit, ensure negative
      if (/debit|withdrawal|dr\b/i.test(descRaw) && amount > 0) amount = -amount;
    }
    let ref = r['Reference'] || r['Ref No'] || r['Ref No.'] || r['Cheque No'] || r['Cheque No.'] || r['Chq./Ref.No.'] || r['UTR'] || r['UTR No'] || '';
    // Bank-native UTR extraction from narration when ref is missing or truncated (ERP 18-char limit)
    if (!ref || ref.length < 8) {
      const extracted = extractUTR(`${descRaw} ${ref}`);
      if (extracted) ref = extracted;
    }

    return {
      date: normalizeDate(date),
      description: desc,
      debit: debit || undefined,
      credit: credit || undefined,
      amount: amount,
      reference: ref ? String(ref).slice(0, 32).trim() : undefined,
      detectedBank: bank,
    };
  }).filter((t) => t.date && t.amount !== 0);
}

export function parseExcel(buffer: Buffer, fileName = 'statement.xlsx'): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  if (!data.length) return [];
  const headers = Object.keys(data[0] as Record<string, string>);
  const bank = detectBank(fileName, JSON.stringify(data.slice(0,3)).slice(0,2000), headers);

  return data.map((row) => {
    const date = row['Date'] || row['date'] || row['Transaction Date'] || row['Txn Date'] || row['Tran Date'] || row['Value Date'] || row['Posting Date'] || '';
    const descRaw = String(row['Description'] || row['Narration'] || row['Particulars'] || row['Remarks'] || '');
    const desc = normalizeNarration(descRaw);
    const debit = parseFloat(String(row['Debit'] || row['Withdrawal'] || row['Withdrawal Amt'] || row['DR'] || row['Amount Dr'] || '0').replace(/,/g,'')) || 0;
    const credit = parseFloat(String(row['Credit'] || row['Deposit'] || row['Deposit Amt'] || row['CR'] || row['Amount Cr'] || '0').replace(/,/g,'')) || 0;
    const amountRaw = row['Amount'] || row['AMOUNT'] || '';
    let amount = credit - debit;
    if (amount === 0 && amountRaw) {
      const v = parseFloat(String(amountRaw).replace(/,/g,'').trim());
      if (!isNaN(v) && v !== 0) amount = v;
      if (/debit|withdrawal|dr\b/i.test(descRaw) && amount > 0) amount = -amount;
    }
    let ref = String(row['Reference'] || row['Ref No'] || row['Ref No.'] || row['Cheque No'] || row['Chq./Ref.No.'] || row['UTR'] || '');
    if ((!ref || ref.length < 8) && ref !== 'undefined') {
      const extracted = extractUTR(`${descRaw} ${ref}`);
      if (extracted) ref = extracted;
    }

    return {
      date: normalizeDate(String(date)),
      description: desc,
      debit: debit || undefined,
      credit: credit || undefined,
      amount: credit - debit || amount,
      reference: ref && ref !== 'undefined' && ref.trim() ? String(ref).slice(0,32).trim() : undefined,
      detectedBank: bank,
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
  
  // Excel serial date (e.g., 45231)
  if (/^\d{5}$/.test(cleaned)) {
    const serial = parseInt(cleaned, 10);
    if (serial > 30000 && serial < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + serial * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.split('T')[0];
  
  // DD/MM/YYYY or DD-MM-YYYY (also handles DD/MM/YY)
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? '20' + y : y;
    // If month >12, likely MM/DD/YY confusion — swap
    const mm = parseInt(m, 10);
    const dd = parseInt(d, 10);
    if (mm > 12 && dd <= 12) return `${year}-${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}`;
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

export function classifyDocument(fileName: string, content: string): { type: string; confidence: number; detectedBank?: BankId } {
  const lower = fileName.toLowerCase();
  const textSample = content.substring(0, 2000).toLowerCase();
  const bank = detectBank(fileName, content.slice(0, 3000), []);

  if (lower.includes('statement') || lower.includes('bank') || textSample.includes('opening balance') || textSample.includes('closing balance') || textSample.includes('withdrawal amt') || textSample.includes('deposit amt')) {
    return { type: 'bank_statement', confidence: 0.9, detectedBank: bank };
  }
  if (lower.includes('invoice') || lower.includes('bill') || textSample.includes('invoice no') || textSample.includes('gst')) {
    return { type: 'sales_invoice', confidence: 0.85, detectedBank: bank };
  }
  if (lower.includes('receipt') || textSample.includes('receipt')) {
    return { type: 'receipt', confidence: 0.8, detectedBank: bank };
  }
  if (lower.includes('ledger') || lower.includes('journal') || textSample.includes('ledger')) {
    return { type: 'ledger_export', confidence: 0.85, detectedBank: bank };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return { type: 'ledger_export', confidence: 0.7, detectedBank: bank };
  }
  return { type: 'other', confidence: 0.5, detectedBank: bank };
}
