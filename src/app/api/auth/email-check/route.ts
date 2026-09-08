import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';

// Free: syntax + disposable + MX + gibberish detection — never claims mailbox exists from domain alone
const DISPOSABLE = new Set([
  'tempmail.com','10minutemail.com','guerrillamail.com','mailinator.com','yopmail.com',
  'temp-mail.org','throwaway.email','getnada.com','maildrop.cc','dispostable.com',
  'trashmail.com','fakeinbox.com','sharklasers.com','mintemail.com','tempail.com',
]);

const FREE_PROVIDERS = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.co.in','outlook.com','hotmail.com','icloud.com','apple.com','aol.com','protonmail.com','zoho.com']);

function syntaxOk(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function isGibberish(local: string): boolean {
  const l = local.toLowerCase();
  if (l.length >= 7) {
    const vowels = (l.match(/[aeiou]/g) || []).length;
    const consonantRun = /(?:[bcdfghjklmnpqrstvwxyz]{5,})/.test(l);
    const noVowel = vowels === 0;
    const randomPattern = /^([a-z])\1{2,}/.test(l) || /^[a-z]{7,}$/.test(l) && vowels / l.length < 0.15;
    if (noVowel || consonantRun || randomPattern) return true;
    // entropy: alternating consonants like hfhjgdhjd
    if (l.length >= 8 && /^[bcdfghjklmnpqrstvwxz]{2,}[aeiou]?[bcdfghjklmnpqrstvwxz]{4,}/.test(l) && vowels <= 1) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const raw = String(email || '').trim().toLowerCase();
    if (!raw) return NextResponse.json({ genuine: false, reason: 'Empty' });
    if (!syntaxOk(raw)) return NextResponse.json({ genuine: false, reason: 'Invalid format' });
    const [local, domain] = raw.split('@');
    if (!domain || !domain.includes('.')) return NextResponse.json({ genuine: false, reason: 'Invalid domain' });
    if (!local || local.length < 2) return NextResponse.json({ genuine: false, reason: 'Local part too short' });
    if (DISPOSABLE.has(domain)) return NextResponse.json({ genuine: false, reason: 'Disposable email not allowed — use work email' });
    if (isGibberish(local)) return NextResponse.json({ genuine: false, reason: 'Looks like random letters — use your real inbox name' });
    // role / typo heuristics
    if (/^(admin|test|asdf|qwerty|abc|xyz|noreply|no-reply)$/.test(local)) return NextResponse.json({ genuine: false, reason: 'Use your real name inbox, not a test address' });
    // MX check — only proves domain can receive mail, NOT that this specific mailbox exists
    try {
      const mxs = await dns.resolveMx(domain);
      if (!mxs || mxs.length === 0) return NextResponse.json({ genuine: false, reason: 'No mail server (MX) for domain' });
      // For free providers, domain valid ≠ mailbox exists — must prove via inbox code
      const isFree = FREE_PROVIDERS.has(domain);
      return NextResponse.json({
        genuine: true,
        domainValid: true,
        mailboxUnverified: isFree,
        reason: isFree ? 'Domain ok — code will verify you own this inbox' : 'Domain has mail server — code will verify inbox',
        mx: mxs[0]?.exchange,
        note: 'MX only proves domain can receive — ownership proven by 6-digit code in inbox'
      });
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
