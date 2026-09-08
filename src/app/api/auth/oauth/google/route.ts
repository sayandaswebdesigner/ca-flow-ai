import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL('/login', request.nextUrl.origin);
    url.searchParams.set('error', 'Google sign-in is not configured yet — please use email or try again later.');
    return NextResponse.redirect(url);
  }
  const state = randomBytes(16).toString('hex');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/oauth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: `google:${state}`,
    prompt: 'select_account',
    access_type: 'offline',
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
