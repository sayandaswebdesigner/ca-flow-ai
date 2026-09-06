import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword, createSession, createUserWithTenant, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !name.trim() || name.trim().length < 2) return NextResponse.json({ error: 'Name required (min 2 chars)' }, { status: 400 });
    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    const pwErr = validatePassword(password || '');
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return NextResponse.json({ error: 'Email already registered — please log in' }, { status: 409 });

    const hash = await hashPassword(password);
    const user = createUserWithTenant(name, email, hash);
    const token = createSession(user.id);

    const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
