import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getDbAsync } from './db';
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

export async function createSession(userId: string): Promise<string> {
  const db = await getDbAsync();
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export async function destroySession(token: string) {
  try {
    const db = await getDbAsync();
    await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } catch {}
}

export async function getSessionUser(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const db = await getDbAsync();
    const row = await db
      .prepare(
        `SELECT u.id, u.tenant_id as tenantId, u.name, u.email, s.expires_at as expiresAt
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
      )
      .get(token) as any;
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
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
export async function getRequestTenant(request: NextRequest): Promise<string> {
  const user = await getSessionUser(getTokenFromRequest(request));
  if (user) return user.tenantId;
  const anonTenant = request.headers.get('x-anonymous-tenant');
  if (anonTenant) return anonTenant;
  return request.nextUrl.searchParams.get('tenantId') || 'default-tenant';
}

/** Strict: require login, throws Response on failure. */
export async function requireUser(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(getTokenFromRequest(request));
  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized — please log in' }), { status: 401 });
  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').trim();
  if (!raw) return false;
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function requireAdmin(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(getTokenFromRequest(request));
  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized — please log in' }), { status: 401 });
  if (!isAdminEmail(user.email)) throw new Response(JSON.stringify({ error: 'Forbidden — admin only' }), { status: 403 });
  return user;
}

export async function ensureTenant(db: any, tenantId: string, name = 'My Firm') {
  const t = await db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
  if (!t) await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, name, 'professional');
}

export async function createUserWithTenant(name: string, email: string, passwordHash: string): Promise<SessionUser> {
  const db = await getDbAsync();
  const tenantId = uuid();
  await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, `${name}'s Firm`, 'professional');
  const id = uuid();
  await db.prepare('INSERT INTO users (id, tenant_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)').run(
    id,
    tenantId,
    name.trim(),
    email.trim().toLowerCase(),
    passwordHash
  );
  return { id, tenantId, name: name.trim(), email: email.trim().toLowerCase() };
}
