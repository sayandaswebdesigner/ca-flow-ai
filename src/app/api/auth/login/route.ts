import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, validateEmail, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

    const db = getDb();
    const user = db.prepare('SELECT id, tenant_id as tenantId, name, email, password_hash as passwordHash FROM users WHERE email = ?').get(
      email.trim().toLowerCase()
    ) as any;
    // Generic message to avoid user enumeration
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

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
