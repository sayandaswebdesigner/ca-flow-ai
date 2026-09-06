'use client';

import { useState, Suspense } from 'react';
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
            <div className="w-10 h-10 rounded-xl bg-white text-indigo-700 flex items-center justify-center font-bold text-sm shadow-md">CF</div>
            <div>
              <p className="font-semibold text-lg tracking-tight">CA-Flow</p>
              <p className="text-xs text-indigo-100">Reconciliation OS</p>
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
        <p className="relative text-xs text-indigo-200">CA-Flow AI • Secure • India-hosted</p>
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
                placeholder="e.g. Sayan Das"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Work email *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.in"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300"
              />
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
              disabled={loading}
              className="w-full py-3 rounded-xl cta-shine text-white font-semibold text-sm shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating workspace…' : 'Create account →'}
            </button>
          </form>
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
