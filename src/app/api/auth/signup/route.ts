import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword, createSession, createUserWithTenant, SESSION_COOKIE } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !name.trim() || name.trim().length < 2) return NextResponse.json({ error: 'Name required (min 2 chars)' }, { status: 400 });
    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    const pwErr = validatePassword(password || '');
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    const db = await getDbAsync();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) return NextResponse.json({ error: 'Email already registered — please log in' }, { status: 409 });

    // Require email verification — free: code must be verified via /api/auth/verify-code
    if (process.env.EMAIL_VERIFICATION_REQUIRED !== 'false') {
      const v = (await db.prepare('SELECT verified, expires_at as exp FROM email_verifications WHERE email = ?').get(email.trim().toLowerCase())) as any;
      if (!v || Number(v.verified) !== 1) return NextResponse.json({ error: 'Verify your email first — send code and enter it' }, { status: 403 });
      if (new Date(v.exp).getTime() < Date.now()) return NextResponse.json({ error: 'Verification expired — send a new code' }, { status: 403 });
    }

    const hash = await hashPassword(password);
    const user = await createUserWithTenant(name, email, hash);
    // consume verification
    try { await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email.trim().toLowerCase()); } catch {}
    const token = await createSession(user.id);
    try {
      const db2 = await getDbAsync();
      await db2.prepare(`INSERT INTO activities (id, tenant_id, user_id, action, entity_type, entity_id, entity_name, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        uuid(), user.tenantId, user.id, 'user.signup', 'user', user.id, user.email,
        request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        request.headers.get('user-agent') || null
      );
    } catch {}
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
