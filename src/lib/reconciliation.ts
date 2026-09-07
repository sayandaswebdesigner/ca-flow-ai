import { getDbAsync } from './db';
import { v4 as uuid } from 'uuid';

export interface MatchResult {
  matched: { sourceA: string; sourceB: string; confidence: number; reason: string }[];
  unmatchedA: string[];
  unmatchedB: string[];
  exceptions: { type: string; description: string; sourceAId?: string; sourceBId?: string }[];
  stats: { utrMatches: number; amountDateMatches: number; fuzzyMatches: number; autoRate: number };
}

function normalizeRef(s: string | null | undefined): string {
  if (!s) return '';
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = Array.from({ length: al + 1 }, (_, i) => i);
  for (let j = 1; j <= bl; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= al; i++) {
      const temp = dp[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[al];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  // Jaccard on words
  const wordsA = la.split(/\s+/).filter(Boolean);
  const wordsB = lb.split(/\s+/).filter(Boolean);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const jaccard = intersection / Math.max(setA.size, setB.size);
  // Levenshtein normalized
  const lev = levenshtein(la.slice(0, 80), lb.slice(0, 80));
  const maxLen = Math.max(la.length, lb.length) || 1;
  const levSim = 1 - lev / maxLen;
  // Weighted blend: Jaccard dominates for narration words, Levenshtein for typo tolerance
  return jaccard * 0.7 + levSim * 0.3;
}

export async function runReconciliation(reconciliationId: string): Promise<MatchResult> {
  const db = await getDbAsync();
  const recon = await db.prepare('SELECT * FROM reconciliations WHERE id = ?').get(reconciliationId) as any;
  if (!recon) throw new Error('Reconciliation not found');

  const sourceADocIds = JSON.parse(recon.source_a_doc_ids || '[]');
  const sourceBDocIds = JSON.parse(recon.source_b_doc_ids || '[]');

  if (!sourceADocIds.length || !sourceBDocIds.length) {
    return { matched: [], unmatchedA: [], unmatchedB: [], exceptions: [{ type: 'no_data', description: 'One side has no documents' }], stats: { utrMatches: 0, amountDateMatches: 0, fuzzyMatches: 0, autoRate: 0 } };
  }

  const sourceA = await db.prepare(
    `SELECT * FROM transactions WHERE source_document_id IN (${sourceADocIds.map((_: any, i: number) => `$${i + 1}`).join(',')})`
  ).all(...sourceADocIds) as any[];
  
  const sourceB = await db.prepare(
    `SELECT * FROM transactions WHERE source_document_id IN (${sourceBDocIds.map((_: any, i: number) => `$${i + 1}`).join(',')})`
  ).all(...sourceBDocIds) as any[];

  const matched: MatchResult['matched'] = [];
  const unmatchedA = new Set(sourceA.map((t) => t.id));
  const unmatchedB = new Set(sourceB.map((t) => t.id));
  const exceptions: MatchResult['exceptions'] = [];

  let utrMatches = 0;
  let amountDateMatches = 0;
  let fuzzyMatches = 0;

  // Phase 0 — UTR exact (strongest signal, 88% vs 51% per Terra Insight). Covers HDFC / ICICI / SBI despite narration variance.
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (!unmatchedA.has(a.id) || !unmatchedB.has(b.id)) continue;
      const ra = normalizeRef(a.reference_number);
      const rb = normalizeRef(b.reference_number);
      // Require both non-empty, length >=10, and equal after normalization (handles truncated vs full)
      if (ra && rb && ra.length >= 10 && rb.length >= 10) {
        // Allow truncated ERP match: one is substring of other when ERP field is 18-char limited
        const isMatch = ra === rb || (ra.length >= 12 && rb.length >= 12 && (ra.includes(rb) || rb.includes(ra)));
        if (isMatch && Math.abs(a.amount - b.amount) < 0.01) {
          matched.push({ sourceA: a.id, sourceB: b.id, confidence: 1.0, reason: 'UTR' });
          unmatchedA.delete(a.id);
          unmatchedB.delete(b.id);
          utrMatches++;
        }
      }
    }
  }

  // Phase 1: Exact amount + reference (when UTR not caught due to shorter refs like Cheque No 6-digit)
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01 && a.reference_number && b.reference_number && normalizeRef(a.reference_number) === normalizeRef(b.reference_number)) {
          matched.push({ sourceA: a.id, sourceB: b.id, confidence: 1.0, reason: 'REF_EXACT' });
          unmatchedA.delete(a.id);
          unmatchedB.delete(b.id);
          utrMatches++;
        }
      }
    }
  }

  // Phase 2: Amount + date (within 1 day) — timing difference
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA) || isNaN(dateB)) continue;
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 1) {
            matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.95, reason: dayDiff === 0 ? 'AMT_DATE' : 'AMT_DATE±1' });
            unmatchedA.delete(a.id);
            unmatchedB.delete(b.id);
            amountDateMatches++;
          }
        }
      }
    }
  }

  // Phase 3: Amount + fuzzy description (within 3 days) — narration varies by bank format
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA) || isNaN(dateB)) continue;
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 3) {
            const similarity = stringSimilarity(a.description || '', b.description || '');
            if (similarity > 0.55) {
              matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.8 + similarity * 0.15, reason: `FUZZY(${(similarity*100).toFixed(0)}%)` });
              unmatchedA.delete(a.id);
              unmatchedB.delete(b.id);
              fuzzyMatches++;
            }
          }
        }
      }
    }
  }

  // Phase 4: Amount-only (within 7 days) — last resort, lowest confidence
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA) || isNaN(dateB)) continue;
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 7) {
            matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.65, reason: 'AMT_ONLY' });
            unmatchedA.delete(a.id);
            unmatchedB.delete(b.id);
            fuzzyMatches++;
          }
        }
      }
    }
  }

  // Create exceptions for unmatched — now with variance classification for audit evidence (TERRA Insight: CARO 2020 needs codes)
  for (const id of unmatchedA) {
    const tx = sourceA.find((t) => t.id === id);
    const hasCounterpartAmount = sourceB.some((b) => Math.abs(b.amount - tx.amount) < 0.01);
    const code = hasCounterpartAmount ? 'TIMING_OR_NARRATION_DIFF' : 'MISSING_IN_BOOKS';
    exceptions.push({
      type: 'unmatched_source_a',
      description: `[${code}] No match for: ${tx?.description || 'Unknown'} (₹${tx?.amount}) — ${hasCounterpartAmount ? 'amount exists on other side but date/ref differ' : 'probably missing in books / cheque-in-transit'}`,
      sourceAId: id,
    });
  }
  for (const id of unmatchedB) {
    const tx = sourceB.find((t) => t.id === id);
    const hasCounterpartAmount = sourceA.some((a) => Math.abs(a.amount - tx.amount) < 0.01);
    const code = hasCounterpartAmount ? 'TIMING_OR_NARRATION_DIFF' : 'MISSING_IN_BANK';
    exceptions.push({
      type: 'unmatched_source_b',
      description: `[${code}] No match for: ${tx?.description || 'Unknown'} (₹${tx?.amount})`,
      sourceBId: id,
    });
  }

  // Update reconciliation
  const matchedAmount = matched.reduce((sum, m) => {
    const tx = sourceA.find((t) => t.id === m.sourceA);
    return sum + (tx?.amount || 0);
  }, 0);

  const totalUnmatchedA = sourceA.filter((t) => unmatchedA.has(t.id)).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalUnmatchedB = sourceB.filter((t) => unmatchedB.has(t.id)).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const autoRate = sourceA.length + sourceB.length > 0 ? Math.round((matched.length * 2 / (sourceA.length + sourceB.length)) * 100) : 0;

  await db.prepare(`
    UPDATE reconciliations SET
      status = 'completed',
      matched_count = $1,
      unmatched_a_count = $2,
      unmatched_b_count = $3,
      exception_count = $4,
      matched_amount = $5,
      unreconciled_amount = $6,
      completed_at = NOW()
    WHERE id = $7
  `).run(
    matched.length,
    unmatchedA.size,
    unmatchedB.size,
    exceptions.length,
    matchedAmount,
    totalUnmatchedA + totalUnmatchedB,
    reconciliationId
  );

  // Update transaction statuses with confidence traceability
  for (const m of matched) {
    await db.prepare('UPDATE transactions SET status = $1, matched_transaction_id = $2, reconciliation_id = $3 WHERE id = $4')
      .run('matched', m.sourceB, reconciliationId, m.sourceA);
    await db.prepare('UPDATE transactions SET status = $1, matched_transaction_id = $2, reconciliation_id = $3 WHERE id = $4')
      .run('matched', m.sourceA, reconciliationId, m.sourceB);
  }
  for (const id of unmatchedA) {
    await db.prepare('UPDATE transactions SET status = $1, reconciliation_id = $2 WHERE id = $3')
      .run('exception', reconciliationId, id);
  }
  for (const id of unmatchedB) {
    await db.prepare('UPDATE transactions SET status = $1, reconciliation_id = $2 WHERE id = $3')
      .run('exception', reconciliationId, id);
  }

  // Save exceptions
  for (const ex of exceptions) {
    await db.prepare(
      'INSERT INTO exceptions (id, reconciliation_id, type, description, source_a_id, source_b_id) VALUES ($1, $2, $3, $4, $5, $6)'
    ).run(uuid(), reconciliationId, ex.type, ex.description, ex.sourceAId || null, ex.sourceBId || null);
  }

  return { matched, unmatchedA: Array.from(unmatchedA), unmatchedB: Array.from(unmatchedB), exceptions, stats: { utrMatches, amountDateMatches, fuzzyMatches, autoRate } };
}
