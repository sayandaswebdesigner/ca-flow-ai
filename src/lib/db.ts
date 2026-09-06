import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'ca-flow.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subscription_tier TEXT DEFAULT 'starter',
      gstin TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gstin TEXT,
      pan TEXT,
      email TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      storage_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'uploaded',
      document_type TEXT DEFAULT 'other',
      classification_confidence REAL DEFAULT 0,
      extracted_data TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      source_document_id TEXT,
      source_type TEXT DEFAULT 'manual',
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      category TEXT,
      counterparty TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'unmatched',
      matched_transaction_id TEXT,
      reconciliation_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS reconciliations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'bank',
      status TEXT DEFAULT 'draft',
      period_start TEXT,
      period_end TEXT,
      source_a_doc_ids TEXT,
      source_b_doc_ids TEXT,
      matched_count INTEGER DEFAULT 0,
      unmatched_a_count INTEGER DEFAULT 0,
      unmatched_b_count INTEGER DEFAULT 0,
      exception_count INTEGER DEFAULT 0,
      matched_amount REAL DEFAULT 0,
      unreconciled_amount REAL DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS matching_rules (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      conditions TEXT NOT NULL,
      action TEXT DEFAULT 'suggest',
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      id TEXT PRIMARY KEY,
      reconciliation_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      source_a_id TEXT,
      source_b_id TEXT,
      status TEXT DEFAULT 'open',
      resolved_by TEXT,
      resolved_at TEXT,
      FOREIGN KEY (reconciliation_id) REFERENCES reconciliations(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      text TEXT,
      author_name TEXT DEFAULT 'CA User',
      author_role TEXT DEFAULT 'ca',
      is_public INTEGER DEFAULT 1,
      source TEXT DEFAULT 'in_app',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );
  `);
}
