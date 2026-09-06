import { getDb } from './db';
import { v4 as uuid } from 'uuid';

export interface MatchResult {
  matched: { sourceA: string; sourceB: string; confidence: number }[];
  unmatchedA: string[];
  unmatchedB: string[];
  exceptions: { type: string; description: string; sourceAId?: string; sourceBId?: string }[];
}

export function runReconciliation(reconciliationId: string): MatchResult {
  const db = getDb();
  const recon = db.prepare('SELECT * FROM reconciliations WHERE id = ?').get(reconciliationId) as any;
  if (!recon) throw new Error('Reconciliation not found');

  const sourceADocIds = JSON.parse(recon.source_a_doc_ids || '[]');
  const sourceBDocIds = JSON.parse(recon.source_b_doc_ids || '[]');

  const sourceA = db.prepare(
    `SELECT * FROM transactions WHERE source_document_id IN (${sourceADocIds.map(() => '?').join(',')})`
  ).all(...sourceADocIds) as any[];
  
  const sourceB = db.prepare(
    `SELECT * FROM transactions WHERE source_document_id IN (${sourceBDocIds.map(() => '?').join(',')})`
  ).all(...sourceBDocIds) as any[];

  const matched: MatchResult['matched'] = [];
  const unmatchedA = new Set(sourceA.map((t) => t.id));
  const unmatchedB = new Set(sourceB.map((t) => t.id));
  const exceptions: MatchResult['exceptions'] = [];

  const rules = db.prepare('SELECT * FROM matching_rules WHERE tenant_id = ? AND is_active = 1 ORDER BY priority')
    .all(recon.tenant_id) as any[];

  // Phase 1: Exact matches (amount + reference)
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01 && a.reference_number && b.reference_number && a.reference_number === b.reference_number) {
          matched.push({ sourceA: a.id, sourceB: b.id, confidence: 1.0 });
          unmatchedA.delete(a.id);
          unmatchedB.delete(b.id);
        }
      }
    }
  }

  // Phase 2: Amount + date matches (within 1 day)
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 1) {
            matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.95 });
            unmatchedA.delete(a.id);
            unmatchedB.delete(b.id);
          }
        }
      }
    }
  }

  // Phase 3: Amount + fuzzy description (within 3 days)
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 3) {
            const similarity = stringSimilarity(a.description || '', b.description || '');
            if (similarity > 0.6) {
              matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.8 + similarity * 0.15 });
              unmatchedA.delete(a.id);
              unmatchedB.delete(b.id);
            }
          }
        }
      }
    }
  }

  // Phase 4: Amount-only matches (within 7 days)
  for (const a of sourceA) {
    for (const b of sourceB) {
      if (unmatchedA.has(a.id) && unmatchedB.has(b.id)) {
        if (Math.abs(a.amount - b.amount) < 0.01) {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          const dayDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 7) {
            matched.push({ sourceA: a.id, sourceB: b.id, confidence: 0.65 });
            unmatchedA.delete(a.id);
            unmatchedB.delete(b.id);
          }
        }
      }
    }
  }

  // Create exceptions for unmatched
  for (const id of unmatchedA) {
    const tx = sourceA.find((t) => t.id === id);
    exceptions.push({
      type: 'unmatched_source_a',
      description: `No match found for: ${tx?.description || 'Unknown'} (₹${tx?.amount})`,
      sourceAId: id,
    });
  }
  for (const id of unmatchedB) {
    const tx = sourceB.find((t) => t.id === id);
    exceptions.push({
      type: 'unmatched_source_b',
      description: `No match found for: ${tx?.description || 'Unknown'} (₹${tx?.amount})`,
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

  db.prepare(`
    UPDATE reconciliations SET
      status = 'completed',
      matched_count = ?,
      unmatched_a_count = ?,
      unmatched_b_count = ?,
      exception_count = ?,
      matched_amount = ?,
      unreconciled_amount = ?,
      completed_at = datetime('now')
    WHERE id = ?
  `).run(
    matched.length,
    unmatchedA.size,
    unmatchedB.size,
    exceptions.length,
    matchedAmount,
    totalUnmatchedA + totalUnmatchedB,
    reconciliationId
  );

  // Update transaction statuses
  for (const m of matched) {
    db.prepare('UPDATE transactions SET status = ?, matched_transaction_id = ?, reconciliation_id = ? WHERE id = ?')
      .run('matched', m.sourceB, reconciliationId, m.sourceA);
    db.prepare('UPDATE transactions SET status = ?, matched_transaction_id = ?, reconciliation_id = ? WHERE id = ?')
      .run('matched', m.sourceA, reconciliationId, m.sourceB);
  }
  for (const id of unmatchedA) {
    db.prepare('UPDATE transactions SET status = ?, reconciliation_id = ? WHERE id = ?')
      .run('exception', reconciliationId, id);
  }
  for (const id of unmatchedB) {
    db.prepare('UPDATE transactions SET status = ?, reconciliation_id = ? WHERE id = ?')
      .run('exception', reconciliationId, id);
  }

  // Save exceptions
  const insertException = db.prepare(
    'INSERT INTO exceptions (id, reconciliation_id, type, description, source_a_id, source_b_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const ex of exceptions) {
    insertException.run(uuid(), reconciliationId, ex.type, ex.description, ex.sourceAId || null, ex.sourceBId || null);
  }

  return { matched, unmatchedA: Array.from(unmatchedA), unmatchedB: Array.from(unmatchedB), exceptions };
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  return intersection / Math.max(setA.size, setB.size);
}
