'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [envSet, setEnvSet] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/login').then(r => r.json()).then(d => {
      setEnvSet(d.envSet);
      if (d.authenticated) router.replace('/dashboard');
    }).catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) { setError('Password required'); return; }
    setLoading(true);
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Wrong password'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">CF</div>
          <div>
            <h1 className="font-semibold">CA-Flow Admin</h1>
            <p className="text-xs text-slate-500">Private — only you</p>
          </div>
          <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">OWNER</span>
        </div>
        {envSet === false && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">ADMIN_PASSWORD not set — set it in Vercel Env (or add to .env.local) and redeploy.</p>}
        <h2 className="text-xl font-semibold tracking-tight">Enter owner password</h2>
        <p className="text-sm text-slate-500 mt-1">Dashboard is now private. Activities notices only for you.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" autoFocus className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300" />
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg disabled:opacity-50">{loading ? 'Checking…' : 'Unlock dashboard →'}</button>
        </form>
        <p className="text-[11px] text-slate-400 mt-4 text-center">Set env: Vercel → Settings → Env → ADMIN_PASSWORD • 30-day cookie</p>
      </div>
    </div>
  );
}
