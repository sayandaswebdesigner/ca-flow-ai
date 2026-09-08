import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL('/login', request.nextUrl.origin);
    url.searchParams.set('error', 'Apple sign-in is not configured yet — please use Google or email.');
    return NextResponse.redirect(url);
  }
  const state = randomBytes(16).toString('hex');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/oauth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'name email',
    state: `apple:${state}`,
    response_mode: 'form_post',
  });
  const res = NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
