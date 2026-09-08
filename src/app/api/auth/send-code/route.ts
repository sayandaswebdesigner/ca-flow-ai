import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const raw = String(email || '').trim().toLowerCase();
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });

    // rate limit: one per 45s
    const db = await getDbAsync();
    const existing = (await db.prepare('SELECT created_at as c FROM email_verifications WHERE email = ?').get(raw)) as any;
    if (existing) {
      const ageMs = Date.now() - new Date(existing.c).getTime();
      if (ageMs < 45000) return NextResponse.json({ error: 'Wait 45s before resending code' }, { status: 429 });
    }

    const code = genCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    // upsert
    try {
      await db.prepare('INSERT INTO email_verifications (email, code, attempts, verified, expires_at) VALUES (?, ?, 0, 0, ?) ON CONFLICT(email) DO UPDATE SET code = excluded.code, attempts = 0, verified = 0, expires_at = excluded.expires_at, created_at = datetime(\'now\')').run(raw, code, expires);
    } catch {
      // fallback for older PG without ON CONFLICT syntax compatibility
      await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(raw);
      await db.prepare('INSERT INTO email_verifications (email, code, attempts, verified, expires_at) VALUES (?, ?, 0, 0, ?)').run(raw, code, expires);
    }

    const result = await sendVerificationEmail(raw, code);
    if (!result.sent) return NextResponse.json({ error: result.error || 'Failed to send email — check inbox provider or try again' }, { status: 500 });

    // Professional: NEVER leak code in same-tab response — code must be read from email inbox (Gmail/Apple Mail)
    // Mocked in dev still requires reading server logs, not client response
    return NextResponse.json({ sent: true, mocked: result.mocked });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
