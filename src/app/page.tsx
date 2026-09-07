import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md">CF</div>
            <div>
              <p className="font-semibold text-[15px] tracking-tight leading-none">CA-Flow</p>
              <p className="text-[11px] text-slate-500">Reconciliation OS</p>
            </div>
          </div>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Open Dashboard →</Link>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">✓ India-hosted • Secure • Audit-ready</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mt-4 leading-tight">Reconciliation,<br /><span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">perfected.</span></h1>
            <p className="text-slate-600 mt-4 max-w-xl">Upload bank + Tally/Excel, auto-match in seconds, flag anomalies, export audit-ready. Built for Chartered Accountants.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg">Go to Dashboard →</Link>
              <Link href="/dashboard" className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium">View Demo</Link>
            </div>
          </div>
          <div className="rounded-3xl mesh-hero text-white p-8 shadow-xl relative overflow-hidden min-h-[340px] flex flex-col justify-between">
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
              <p className="text-sm text-indigo-100">Live reconciliation</p>
              <p className="text-3xl font-semibold mt-2">60-second audit</p>
              <p className="text-indigo-100 text-sm mt-2">Bank → Ledger auto-match • Smart Insights • Tally + Excel</p>
            </div>
            <div className="relative grid grid-cols-3 gap-3 mt-8">
              <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-center"><p className="text-2xl font-bold">∞</p><p className="text-xs text-indigo-100">Clients</p></div>
              <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-center"><p className="text-2xl font-bold">3s</p><p className="text-xs text-indigo-100">Match</p></div>
              <div className="bg-white text-slate-900 rounded-2xl p-4 text-center"><p className="text-2xl font-bold">100%</p><p className="text-xs">Accurate</p></div>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
        {[
          { title: 'Bank → Tally', desc: 'Upload HDFC/ICICI + Excel, auto-match, export Tally XML/Excel.' },
          { title: 'Anomaly radar', desc: 'Smart Insights flag duplicates, round-figure, weekend spikes.' },
          { title: 'WhatsApp chase', desc: 'One-tap client nudges from Insights.' },
        ].map(c => (
          <div key={c.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{c.desc}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">CA-Flow AI • Secure • India-hosted • <Link href="/dashboard" className="underline">Dashboard</Link></footer>
    </div>
  );
}
