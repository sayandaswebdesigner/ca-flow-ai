import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getDb } from './db';
import { v4 as uuid } from 'uuid';

export const SESSION_COOKIE = 'ca_session';
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password too long';
  return null;
}

export function createSession(userId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export function destroySession(token: string) {
  try {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } catch {}
}

export function getSessionUser(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT u.id, u.tenant_id as tenantId, u.name, u.email, s.expires_at as expiresAt
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
      )
      .get(token) as any;
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }
    return { id: row.id, tenantId: row.tenantId, name: row.name, email: row.email };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value || null;
}

/** Tenant for data APIs: session tenant if logged in, else anonymous tenant from header. */
export function getRequestTenant(request: NextRequest): string {
  const user = getSessionUser(getTokenFromRequest(request));
  if (user) return user.tenantId;
  // Anonymous tenant from header (set by frontend localStorage)
  const anonTenant = request.headers.get('x-anonymous-tenant');
  if (anonTenant) return anonTenant;
  return request.nextUrl.searchParams.get('tenantId') || 'default-tenant';
}

/** Strict: require login, throws Response on failure. */
export function requireUser(request: NextRequest): SessionUser {
  const user = getSessionUser(getTokenFromRequest(request));
  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized — please log in' }), { status: 401 });
  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}

export function ensureTenant(db: any, tenantId: string, name = 'My Firm') {
  const t = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
  if (!t) db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, name, 'professional');
}

export function createUserWithTenant(name: string, email: string, passwordHash: string): SessionUser {
  const db = getDb();
  const tenantId = uuid();
  db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, `${name}'s Firm`, 'professional');
  const id = uuid();
  db.prepare('INSERT INTO users (id, tenant_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)').run(
    id,
    tenantId,
    name.trim(),
    email.trim().toLowerCase(),
    passwordHash
  );
  return { id, tenantId, name: name.trim(), email: email.trim().toLowerCase() };
}
