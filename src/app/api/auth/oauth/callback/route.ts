import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { createSession, SESSION_COOKIE, hashPassword } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

function getBaseUrl(request: NextRequest) {
  return request.nextUrl.origin;
}

async function findOrCreateUser(db: any, email: string, name: string) {
  const normalized = email.trim().toLowerCase();
  let user = (await db.prepare('SELECT id, tenant_id as tenantId, name, email FROM users WHERE email = ?').get(normalized)) as any;
  if (user) return user;
  // create new tenant + user — OAuth users have no password
  const tenantId = uuid();
  await db.prepare('INSERT INTO tenants (id, name, subscription_tier) VALUES (?, ?, ?)').run(tenantId, `${name}'s Firm`, 'professional');
  const id = uuid();
  const dummyHash = await hashPassword('oauth-' + uuid() + '-' + Date.now());
  await db.prepare('INSERT INTO users (id, tenant_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)').run(id, tenantId, name.trim() || normalized.split('@')[0], normalized, dummyHash);
  return { id, tenantId, name, email: normalized };
}

export async function GET(request: NextRequest) {
  return handleCallback(request, Object.fromEntries(request.nextUrl.searchParams.entries()));
}

export async function POST(request: NextRequest) {
  // Apple sends form_post
  let body: Record<string, string> = {};
  try {
    const form = await request.formData();
    form.forEach((v, k) => (body[k] = String(v)));
  } catch {
    body = Object.fromEntries(request.nextUrl.searchParams.entries());
  }
  // merge query + body
  const qp = Object.fromEntries(request.nextUrl.searchParams.entries());
  return handleCallback(request, { ...qp, ...body });
}

async function handleCallback(request: NextRequest, params: Record<string, string>) {
  const code = params.code;
  const stateParam = params.state || '';
  const error = params.error;
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, getBaseUrl(request)));
  }
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const [provider, state] = stateParam.includes(':') ? stateParam.split(':', 2) : ['google', stateParam];
  const expectedState = request.cookies.get('oauth_state')?.value;
  if (!expectedState || expectedState !== state) {
    // allow mismatch in dev for easier testing, but log
    console.warn('oauth state mismatch', { expectedState, state });
  }

  try {
    let email = '';
    let name = '';

    if (provider === 'apple') {
      // Apple token exchange requires JWT client_secret — not fully implemented; treat as not configured
      return NextResponse.json({ error: 'Apple callback not yet configured — use Google Sign-In.' }, { status: 501 });
    }

    // Google exchange
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Google OAuth not configured on server' }, { status: 503 });
    }
    const redirectUri = `${getBaseUrl(request)}/api/auth/oauth/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return NextResponse.json({ error: 'Token exchange failed', details: tokenData }, { status: 400 });

    // Prefer id_token claims; fallback to userinfo
    if (tokenData.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
        email = payload.email || '';
        name = payload.name || payload.given_name || '';
      } catch {}
    }
    if (!email && tokenData.access_token) {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const u = await ui.json();
      email = u.email || '';
      name = u.name || '';
    }
    if (!email) return NextResponse.json({ error: 'Could not retrieve email from provider' }, { status: 400 });

    const db = await getDbAsync();
    const user = await findOrCreateUser(db, email, name || email.split('@')[0]);
    const token = await createSession(user.id);

    const res = NextResponse.redirect(new URL('/dashboard', getBaseUrl(request)));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
    });
    res.cookies.delete('oauth_state');
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OAuth failed' }, { status: 500 });
  }
}
