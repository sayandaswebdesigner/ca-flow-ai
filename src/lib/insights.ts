// Smart Insights: anomaly radar + plain-English exception explainer + client chaser drafts.
// Differentiator: competitors match transactions; none tell the CA WHY + what to ask the client.

export interface Anomaly {
  id: string;
  severity: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  detail: string;
  transactionIds: string[];
  amount?: number;
}

export interface Explanation {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  reason: string;
  action: string;
  clientMessage: string;
}

interface Tx {
  id: string;
  client_id: string;
  date: string;
  description: string;
  amount: number;
  reference_number: string | null;
  source_type: string;
  status: string;
  counterparty?: string | null;
}

const INR = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
}

function isRoundFigure(n: number): boolean {
  const a = Math.abs(n);
  return a >= 10000 && a % 10000 === 0;
}

export function detectAnomalies(transactions: Tx[]): Anomaly[] {
  const out: Anomaly[] = [];
  if (transactions.length === 0) return out;

  // 1. Possible duplicates: same amount + same date WITHIN the same source.
  // (Bank-vs-ledger mirrors are legitimate — those are what reconciliation matches.)
  const keyMap = new Map<string, Tx[]>();
  for (const t of transactions) {
    const k = `${t.source_type}|${t.date}|${t.amount}`;
    if (!keyMap.has(k)) keyMap.set(k, []);
    keyMap.get(k)!.push(t);
  }
  for (const [k, group] of keyMap) {
    if (group.length > 1) {
      out.push({
        id: `dup-${k}`,
        severity: 'high',
        type: 'possible_duplicate',
        title: `Possible duplicate entry (${group.length}x ${INR(group[0].amount)})`,
        detail: `${group.length} transactions on ${group[0].date} for identical amount. Check: ${group.map((g) => g.description).join(' / ').slice(0, 120)}`,
        transactionIds: group.map((g) => g.id),
        amount: group[0].amount,
      });
    }
  }

  // 2. Round-figure large transfers (possible adjustment / cash-like)
  for (const t of transactions) {
    if (isRoundFigure(t.amount) && Math.abs(t.amount) >= 100000) {
      out.push({
        id: `round-${t.id}`,
        severity: 'medium',
        type: 'round_figure',
        title: `Round-figure transfer ${INR(t.amount)}`,
        detail: `${t.description || 'No narration'} on ${t.date}. Round lakhs often = loan, capital infusion, or manual adjustment — confirm source.`,
        transactionIds: [t.id],
        amount: t.amount,
      });
    }
  }

  // 3. Weekend large credits (unusual for B2B receipts)
  for (const t of transactions) {
    if (t.amount > 0 && Math.abs(t.amount) >= 50000 && isWeekend(t.date)) {
      out.push({
        id: `wknd-${t.id}`,
        severity: 'low',
        type: 'weekend_credit',
        title: `Weekend credit ${INR(t.amount)}`,
        detail: `${t.description || 'Receipt'} on ${t.date} (${new Date(t.date).toLocaleDateString('en-IN', { weekday: 'long' })}). Verify payer — weekend B2B receipts are uncommon.`,
        transactionIds: [t.id],
        amount: t.amount,
      });
    }
  }

  // 4. Outliers: single txn > 3x median absolute amount
  const absVals = transactions.map((t) => Math.abs(t.amount)).sort((a, b) => a - b);
  const median = absVals[Math.floor(absVals.length / 2)] || 0;
  if (median > 0) {
    for (const t of transactions) {
      if (Math.abs(t.amount) > median * 3 && Math.abs(t.amount) >= 100000) {
        out.push({
          id: `outlier-${t.id}`,
          severity: 'medium',
          type: 'outlier',
          title: `Outlier ${INR(t.amount)} (${(Math.abs(t.amount) / median).toFixed(1)}x median)`,
          detail: `${t.description || 'Transaction'} on ${t.date}. Median txn is ${INR(median)} — confirm this large entry is genuine, not a data-entry error.`,
          transactionIds: [t.id],
          amount: t.amount,
        });
      }
    }
  }

  // 5. Large entries with no reference number (hard to audit)
  for (const t of transactions) {
    if (Math.abs(t.amount) >= 50000 && !t.reference_number) {
      out.push({
        id: `noref-${t.id}`,
        severity: 'low',
        type: 'missing_reference',
        title: `Large entry without reference ${INR(t.amount)}`,
        detail: `${t.description || 'Transaction'} on ${t.date} has no UTR/Ref. Ask client for voucher or bank UTR for audit trail.`,
        transactionIds: [t.id],
        amount: t.amount,
      });
    }
  }

  // Sort: high first
  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function explainTransaction(t: Tx, allTx: Tx[]): Explanation {
  const amt = t.amount;
  const sameAmt = allTx.filter((x) => x.id !== t.id && Math.abs(x.amount - amt) < 0.01);

  let reason: string;
  let action: string;

  if (t.status === 'matched') {
    reason = 'Already matched with the opposite ledger — no action needed.';
    action = 'None. It will appear in the reconciled report.';
  } else if (!t.reference_number && sameAmt.length > 0) {
    reason = `No UTR/reference, but ${sameAmt.length} entr${sameAmt.length === 1 ? 'y' : 'ies'} of same amount ${INR(amt)} exist on the other side — likely a manual match needing confirmation.`;
    action = 'Confirm with client which narration is correct, then manually match.';
  } else if (!t.reference_number) {
    reason = `Missing UTR/reference — the matching engine could not link ${INR(amt)} confidently.`;
    action = 'Ask the client for the bank UTR or voucher number.';
  } else if (sameAmt.length === 0) {
    reason = `No entry of ${INR(amt)} found on the opposite side — probably missing in ${t.source_type === 'bank' ? 'books (client has not recorded it)' : 'bank (cheque in transit / timing difference)'}.`;
    action = t.source_type === 'bank'
      ? 'Ask the client for the missing bill/voucher for this receipt or payment.'
      : 'Check if cheque is uncleared or entry belongs to next month.';
  } else {
    const dates = sameAmt.map((x) => x.date).join(', ');
    reason = `Amount matches (${INR(amt)}) but date/reference differ. Candidates on other side dated: ${dates}. Likely a timing or narration difference.`;
    action = 'Review side-by-side and manually match if it is the same underlying transaction.';
  }

  const clientMessage =
    `Namaste, for reconciliation of ${t.date} entry "${t.description || 'transaction'}" of ${INR(amt)}: ${action} Please share supporting document at the earliest. — Your CA`;

  return {
    transactionId: t.id,
    description: t.description || '(no narration)',
    amount: t.amount,
    date: t.date,
    reason,
    action,
    clientMessage,
  };
}

export interface HealthScore {
  clientId: string;
  clientName: string;
  score: number; // 0-100
  docsScore: number; // 0-40
  matchScore: number; // 0-30
  anomalyScore: number; // 0-20
  refScore: number; // 0-10
  docCount: number;
  hasBank: boolean;
  hasLedger: boolean;
  complete: boolean;
  missing: string[];
  totalTx: number;
  matchedTx: number;
  exceptionTx: number;
  anomalyCount: number;
  chaseMessage: string;
  waLink: string | null;
}

function waLinkFor(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  if (normalized.length < 10) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function clientCompleteness(
  clients: { id: string; name: string; phone?: string | null }[],
  documents: { client_id: string; document_type: string }[],
) {
  return clients.map((c) => {
    const docs = documents.filter((d) => d.client_id === c.id);
    const hasBank = docs.some((d) => d.document_type === 'bank_statement');
    const hasLedger = docs.some((d) => d.document_type === 'ledger_export');
    const missing: string[] = [];
    if (!hasBank) missing.push('bank statement');
    if (!hasLedger) missing.push('ledger export');
    const msg = missing.length
      ? `Namaste ${c.name}, pending for this month: ${missing.join(' + ')}. Please upload/photo-share at the earliest so we can close your books. — Your CA`
      : '';
    return {
      clientId: c.id,
      clientName: c.name,
      phone: c.phone || null,
      docCount: docs.length,
      hasBank,
      hasLedger,
      complete: missing.length === 0,
      missing,
      chaseMessage: msg,
      waLink: msg ? waLinkFor(c.phone, msg) : null,
    };
  });
}

export function computeHealthScores(
  clients: { id: string; name: string; phone?: string | null }[],
  documents: { client_id: string; document_type: string }[],
  transactions: Tx[],
  anomalies: Anomaly[],
): HealthScore[] {
  const base = clientCompleteness(clients, documents);
  return base
    .map((c) => {
      const txs = transactions.filter((t) => t.client_id === c.clientId);
      const totalTx = txs.length;
      const matchedTx = txs.filter((t) => t.status === 'matched').length;
      const exceptionTx = txs.filter((t) => t.status === 'exception').length;
      const withRef = txs.filter((t) => !!t.reference_number).length;

      // 40 pts: docs (20+20)
      const docsScore = (c.hasBank ? 20 : 0) + (c.hasLedger ? 20 : 0);

      // 30 pts: match rate
      const matchScore = totalTx === 0 ? 0 : Math.round((matchedTx / totalTx) * 30);

      // 10 pts: reference coverage
      const refScore = totalTx === 0 ? 0 : Math.round((withRef / totalTx) * 10);

      // 20 pts: anomaly-free (deduct)
      const clientAnomalies = anomalies.filter((a) => a.transactionIds.some((id) => txs.some((t) => t.id === id)));
      const penalty = clientAnomalies.reduce((s, a) => s + (a.severity === 'high' ? 10 : a.severity === 'medium' ? 5 : 2), 0);
      const anomalyScore = Math.max(0, 20 - Math.min(20, penalty));

      const score = Math.max(0, Math.min(100, docsScore + matchScore + refScore + anomalyScore));

      const chaseMessage = c.chaseMessage;
      return {
        ...c,
        score,
        docsScore,
        matchScore,
        anomalyScore,
        refScore,
        totalTx,
        matchedTx,
        exceptionTx,
        anomalyCount: clientAnomalies.length,
        chaseMessage,
        waLink: chaseMessage ? waLinkFor(c.phone, chaseMessage) : waLinkFor(c.phone, `Namaste ${c.clientName}, we need your docs to close books — ${c.missing.join(', ') || 'pending items'}. Please share. — Your CA`),
      } as HealthScore;
    })
    .sort((a, b) => a.score - b.score); // priority queue: lowest first
}

export function waLinkForTx(phone: string | null | undefined, explanation: Explanation): string | null {
  return waLinkFor(phone, explanation.clientMessage);
}
