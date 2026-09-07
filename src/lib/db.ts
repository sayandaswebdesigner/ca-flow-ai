import { randomBytes, randomUUID } from 'crypto';

// ---------- PostgreSQL adapter (production) ----------

let pgPool: any = null;

async function getPool() {
  if (!pgPool) {
    const { Pool } = await import('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pgPool;
}

class PgPrepared {
  constructor(private sql: string) {}
  get(...params: any[]) { return queryOne(this.sql, params); }
  all(...params: any[]) { return queryAll(this.sql, params); }
  run(...params: any[]) { return queryRun(this.sql, params); }
}

async function queryOne(sql: string, params: any[] = []): Promise<any> {
  const pool = await getPool();
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return result.rows[0] || null;
}

async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const pool = await getPool();
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return result.rows;
}

async function queryRun(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  const pool = await getPool();
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return { changes: result.rowCount || 0, lastInsertRowid: 0 };
}

async function execSql(sql: string): Promise<void> {
  const pool = await getPool();
  // Split by semicolons but not inside strings
  const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of stmts) {
    const converted = convertPlaceholders(stmt);
    await pool.query(converted);
  }
}

/** Convert SQLite ? placeholders to pg $1,$2... and datetime()/date() to Postgres */
function convertPlaceholders(sql: string): string {
  let i = 0;
  let result = sql.replace(/\?/g, () => `$${++i}`);
  // datetime('now', '-N minutes'/'-N days') -> NOW() - INTERVAL 'N ...'
  result = result.replace(/datetime\('now',\s*'-(\d+)\s*minutes?'\)/gi, "NOW() - INTERVAL '$1 minutes'");
  result = result.replace(/datetime\('now',\s*'-(\d+)\s*days?'\)/gi, "NOW() - INTERVAL '$1 days'");
  result = result.replace(/datetime\('now',\s*'-(\d+)\s*hours?'\)/gi, "NOW() - INTERVAL '$1 hours'");
  result = result.replace(/datetime\('now'\)/gi, 'NOW()');
  // date('now') -> CURRENT_DATE, date(col) -> DATE(col)
  result = result.replace(/date\('now'\)/gi, 'CURRENT_DATE');
  result = result.replace(/\bdate\s*\(\s*created_at\s*\)/gi, 'DATE(created_at)');
  result = result.replace(/AUTOINCREMENT/g, '');
  return result;
}

// ---------- PostgreSQL schema ----------

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'starter',
  gstin TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  gstin TEXT,
  pan TEXT,
  email TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  status TEXT DEFAULT 'uploaded',
  document_type TEXT DEFAULT 'other',
  classification_confidence REAL DEFAULT 0,
  extracted_data TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT NOW(),
  updated_at TEXT DEFAULT NOW(),
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
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
  created_at TEXT DEFAULT NOW(),
  updated_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
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
  created_at TEXT DEFAULT NOW(),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS matching_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  conditions TEXT NOT NULL,
  action TEXT DEFAULT 'suggest',
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS exceptions (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL REFERENCES reconciliations(id),
  type TEXT NOT NULL,
  description TEXT,
  source_a_id TEXT,
  source_b_id TEXT,
  status TEXT DEFAULT 'open',
  resolved_by TEXT,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id TEXT,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  text TEXT,
  author_name TEXT DEFAULT 'CA User',
  author_role TEXT DEFAULT 'ca',
  is_public INTEGER DEFAULT 1,
  source TEXT DEFAULT 'in_app',
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  country TEXT,
  city TEXT,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT NOW()
);
`;

// ---------- SQLite (local dev) ----------

const SQLITE_SCHEMA = `
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
  gstin TEXT, pan TEXT, email TEXT, phone TEXT,
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
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  country TEXT,
  city TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

// ---------- Unified interface ----------

export interface DbAdapter {
  prepare(sql: string): {
    get(...params: any[]): any;
    all(...params: any[]): any;
    run(...params: any[]): any;
  };
  exec(sql: string): any;
}

let dbInstance: DbAdapter | null = null;

async function initPg(): Promise<DbAdapter> {
  const pool = await getPool();
  await execSql(PG_SCHEMA);
  return {
    prepare(sql: string) {
      return {
        get(...params: any[]) { return queryOne(sql, params) as any; },
        all(...params: any[]) { return queryAll(sql, params) as any; },
        run(...params: any[]) { return queryRun(sql, params) as any; },
      };
    },
    exec(sql: string) { execSql(sql) as any; },
  };
}

function initSqlite(): DbAdapter {
  // Dynamic import to avoid loading better-sqlite3 in production (pg-only)
  const Database = require('better-sqlite3');
  const path = require('path');
  const DB_PATH = path.join(process.cwd(), 'ca-flow.db');
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(SQLITE_SCHEMA);
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        get(...params: any[]) { return stmt.get(...params); },
        all(...params: any[]) { return stmt.all(...params); },
        run(...params: any[]) { return stmt.run(...params); },
      };
    },
    exec(sql: string) { sqlite.exec(sql); },
  };
}

export async function getDbAsync(): Promise<DbAdapter> {
  if (!dbInstance) {
    if (process.env.DATABASE_URL) {
      console.log('📦 Using PostgreSQL');
      dbInstance = await initPg();
    } else {
      console.log('📦 Using SQLite (local)');
      dbInstance = initSqlite();
    }
  }
  return dbInstance;
}

/** Synchronous getter — works for SQLite only. For PG, use getDbAsync() */
export function getDb(): any {
  if (process.env.DATABASE_URL) {
    throw new Error('PostgreSQL requires async getDbAsync() — cannot use sync getDb()');
  }
  if (!dbInstance) {
    dbInstance = initSqlite();
  }
  return dbInstance;
}
