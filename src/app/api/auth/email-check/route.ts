import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';

// Free: syntax + disposable list + MX lookup — no paid API
const DISPOSABLE = new Set([
  'tempmail.com','10minutemail.com','guerrillamail.com','mailinator.com','yopmail.com',
  'temp-mail.org','throwaway.email','getnada.com','maildrop.cc','dispostable.com',
  'trashmail.com','fakeinbox.com','sharklasers.com','mintemail.com','tempail.com',
]);

function syntaxOk(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const raw = String(email || '').trim().toLowerCase();
    if (!raw) return NextResponse.json({ genuine: false, reason: 'Empty' });
    if (!syntaxOk(raw)) return NextResponse.json({ genuine: false, reason: 'Invalid format' });
    const domain = raw.split('@')[1];
    if (!domain || !domain.includes('.')) return NextResponse.json({ genuine: false, reason: 'Invalid domain' });
    if (DISPOSABLE.has(domain)) return NextResponse.json({ genuine: false, reason: 'Disposable email not allowed' });
    // MX check — free via DNS
    try {
      const mxs = await dns.resolveMx(domain);
      if (!mxs || mxs.length === 0) return NextResponse.json({ genuine: false, reason: 'No mail server (MX) for domain' });
      return NextResponse.json({ genuine: true, reason: 'MX found', mx: mxs[0]?.exchange });
    } catch {
      // No MX is a strong signal it's not genuine; but some domains use A record fallback — try A
      try {
        const a = await dns.resolve(domain);
        if (a && a.length) return NextResponse.json({ genuine: true, reason: 'Domain has A record (accepting mail)', note: 'No MX but A exists' });
      } catch {}
      return NextResponse.json({ genuine: false, reason: 'Domain has no mail server' });
    }
  } catch (e: any) {
    return NextResponse.json({ genuine: false, reason: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || '';
  return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } }));
}
