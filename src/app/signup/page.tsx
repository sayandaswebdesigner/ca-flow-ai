'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    if (e) setError(decodeURIComponent(e));
  }, []);
  // Email genuine + code flow — 100% free (DNS MX + Resend free tier fallback)
  const [emailCheck, setEmailCheck] = useState<null | { genuine: boolean; reason: string }>(null);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Live email check — domain MX + gibberish detection (mailbox ownership still requires inbox code)
  useEffect(() => {
    const e = email.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setEmailCheck(null); return; }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/auth/email-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }) });
        const d = await r.json();
        setEmailCheck({ genuine: !!d.genuine, reason: d.reason || '' });
      } catch { setEmailCheck(null); }
      setChecking(false);
    }, 700);
    return () => clearTimeout(t);
  }, [email]);

  async function sendCode() {
    setError(null);
    if (!emailCheck?.genuine) { setError('Fix email first — must be genuine (has mail server)'); return; }
    setSendingCode(true);
    try {
      const r = await fetch('/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to send code — check email or try different provider'); return; }
      setCodeSent(true);
    } finally { setSendingCode(false); }
  }

  async function verify() {
    setError(null);
    if (!code.trim()) { setError('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      const r = await fetch('/api/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code: code.trim() }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Verification failed'); return; }
      setVerified(true);
    } finally { setVerifying(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Signup failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex w-[46%] mesh-hero text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-16 bottom-10 w-80 h-80 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold text-sm shadow-md">LF</div>
            <div>
              <p className="font-semibold text-lg tracking-tight">LedgerFlow</p>
              <p className="text-xs text-indigo-100 tracking-wide uppercase font-medium">Reconciliation OS</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <p className="inline-flex text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20">★ Free • 60-second setup</p>
          <h1 className="text-4xl font-semibold tracking-tight mt-4 leading-tight">Close books<br />10 days faster.</h1>
          <p className="text-indigo-100 text-sm mt-3 max-w-md leading-relaxed">
            Your private firm workspace: clients, documents, auto-matching, anomaly radar, WhatsApp chase, Tally export.
          </p>
          <div className="mt-6 space-y-2 text-xs text-indigo-100">
            <p>✓ Private per-firm data — isolated tenant</p>
            <p>✓ bcrypt-hashed passwords, httpOnly sessions</p>
            <p>✓ No demo data — your real books only</p>
          </div>
        </div>
        <p className="relative text-xs text-indigo-200">LedgerFlow • Secure • India-hosted</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md animate-fadeIn">
          <h2 className="text-2xl font-semibold tracking-tight">Create your firm account</h2>
          <p className="text-sm text-slate-500 mt-1">Free • Private workspace • No card</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Full name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Work email *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setVerified(false); setCodeSent(false); }}
                placeholder="you@firm.in"
                autoComplete="email"
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-4 ${emailCheck ? (emailCheck.genuine ? 'border-emerald-200 focus:ring-emerald-50 focus:border-emerald-300' : 'border-red-200 focus:ring-red-50 focus:border-red-300') : 'border-slate-200 focus:ring-indigo-50 focus:border-indigo-300'}`}
              />
              <div className="min-h-[18px]">
                {checking && <p className="text-xs text-slate-500">Checking… (domain MX + inbox name)</p>}
                {!checking && emailCheck && (
                  <p className={`text-xs ${emailCheck.genuine ? 'text-emerald-600' : 'text-red-600'}`}>
                    {emailCheck.genuine ? `✓ ${emailCheck.reason}` : `✗ ${emailCheck.reason}`}
                  </p>
                )}
                {!checking && !emailCheck && email.includes('@') && <p className="text-xs text-slate-400">We check domain + inbox name — not just @gmail.com</p>}
              </div>
              {/* Free code verification — only if no-cost */}
              {emailCheck?.genuine && !verified && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={sendCode} disabled={sendingCode} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-50">
                    {sendingCode ? 'Sending…' : codeSent ? 'Resend code' : 'Send verification code'}
                  </button>
                  {codeSent && <span className="text-xs text-slate-500 self-center">Code sent • expires in 10m</span>}
                </div>
              )}
              {codeSent && !verified && (
                <>
                  <div className="mt-2 flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit code from email" maxLength={6} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300" />
                    <button type="button" onClick={verify} disabled={verifying} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
                      {verifying ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Check your inbox (Gmail / Apple Mail) — code expires in 10 min. Don’t see it? Check Spam.</p>
                </>
              )}
              {verified && <p className="text-xs text-emerald-600 mt-1.5">✓ Email verified — you can now create your account</p>}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Password *</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Confirm *</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300"
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>}
            <button
              type="submit"
              disabled={loading || !verified}
              title={!verified ? 'Verify email code first' : undefined}
              className={`w-full py-3 rounded-xl font-semibold text-sm shadow-lg disabled:opacity-50 ${verified ? 'cta-shine text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {loading ? 'Creating workspace…' : verified ? 'Create account →' : 'Verify email to continue'}
            </button>
            {!verified && <p className="text-xs text-slate-500 text-center -mt-2">Free verification • No paid service • Resend free tier or dev mock</p>}
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-500 tracking-wide">or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => (window.location.href = '/api/auth/oauth/google')}
              className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium shadow-sm transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/api/auth/oauth/apple')}
              className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-medium shadow-sm transition-colors"
            >
              <svg width="16" height="18" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
                <path d="M13.4 8.2c0-1.9 1.5-2.8 1.6-2.9a4.2 4.2 0 0 0-3.3-1.7c-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8A4.5 4.5 0 0 0 1.6 6c-1.5 2.6-.4 6.4 1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.1 0 1.9-1 2.6-2.1.7-1 1-2 1-2.1 0 0-2-.8-2-3.2zM11.5 2.9a3.85 3.85 0 0 1 .9-2.9A4 4 0 0 0 9.9.3a3.7 3.7 0 0 0-.9 2.9 3.4 3.4 0 0 0 2.5 1.7z" />
              </svg>
              Apple
            </button>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3">Secure OAuth • 60-second setup • No card</p>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
