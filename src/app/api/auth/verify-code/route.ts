import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    const raw = String(email || '').trim().toLowerCase();
    const c = String(code || '').trim();
    if (!raw || !c) return NextResponse.json({ error: 'Email and code required' }, { status: 400 });
    const db = await getDbAsync();
    const row = (await db.prepare('SELECT code, attempts, verified, expires_at as exp FROM email_verifications WHERE email = ?').get(raw)) as any;
    if (!row) return NextResponse.json({ error: 'No code sent — request a code first' }, { status: 404 });
    if (Number(row.verified) === 1) return NextResponse.json({ verified: true });
    if (new Date(row.exp).getTime() < Date.now()) return NextResponse.json({ error: 'Code expired — request a new one' }, { status: 400 });
    if (Number(row.attempts) >= 5) return NextResponse.json({ error: 'Too many attempts — request a new code' }, { status: 429 });
    if (String(row.code) !== c) {
      await db.prepare('UPDATE email_verifications SET attempts = attempts + 1 WHERE email = ?').run(raw);
      return NextResponse.json({ error: 'Incorrect code' }, { status: 400 });
    }
    await db.prepare('UPDATE email_verifications SET verified = 1, attempts = 0 WHERE email = ?').run(raw);
    return NextResponse.json({ verified: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
