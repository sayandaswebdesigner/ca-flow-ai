import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_auth';
const ADMIN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: 'ADMIN_PASSWORD not set on server' }, { status: 500 });
  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Wrong admin password' }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_auth', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const ok = request.cookies.get('admin_auth')?.value === '1';
  return NextResponse.json({ authenticated: ok, envSet: !!process.env.ADMIN_PASSWORD });
}
