import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { verifyPassword, validateEmail, createSession, SESSION_COOKIE } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !validateEmail(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

    const db = await getDbAsync();
    const user = await db.prepare('SELECT id, tenant_id as tenantId, name, email, password_hash as passwordHash FROM users WHERE email = ?').get(
      email.trim().toLowerCase()
    ) as any;
    // Generic message to avoid user enumeration
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const token = await createSession(user.id);
    const fakeReq = { headers: request.headers, cookies: request.cookies, nextUrl: request.nextUrl, url: request.url } as any;
    // log against user's tenant even before cookie is set on response
    try {
      const db2 = await getDbAsync();
      await db2.prepare(`INSERT INTO activities (id, tenant_id, user_id, action, entity_type, entity_id, entity_name, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        (await import('uuid')).v4(), user.tenantId, user.id, 'user.login', 'user', user.id, user.email,
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
