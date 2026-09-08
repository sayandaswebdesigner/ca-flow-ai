import Link from 'next/link';

const logos = ['HDFC BANK', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'TALLY'];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100">
      {/* Top announcement — Linear/Stripe style */}
      <div className="bg-slate-950 text-white text-xs">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center gap-3 text-center">
          <span className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> New: WhatsApp chase + GST verify live
          </span>
          <span className="text-slate-300">
            Reconciliation OS for CAs — India-hosted, audit-ready. <Link href="/dashboard" className="text-white underline decoration-white/30 underline-offset-4">Open dashboard →</Link>
          </span>
        </div>
      </div>

      {/* Nav — Stripe-like */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-[13px] tracking-tight shadow-sm">LF</div>
            <div className="leading-none">
              <p className="font-semibold text-[15px] tracking-tight">LedgerFlow</p>
              <p className="text-[11px] text-slate-500 tracking-wide uppercase font-medium -mt-0.5">Reconciliation OS</p>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm text-slate-600 ml-6">
            <a href="#product" className="px-3 py-2 rounded-full hover:bg-slate-50 hover:text-slate-900">Product</a>
            <a href="#solutions" className="px-3 py-2 rounded-full hover:bg-slate-50 hover:text-slate-900">Solutions</a>
            <a href="#security" className="px-3 py-2 rounded-full hover:bg-slate-50 hover:text-slate-900">Security</a>
            <a href="#pricing" className="px-3 py-2 rounded-full hover:bg-slate-50 hover:text-slate-900">Pricing</a>
            <a href="#faq" className="px-3 py-2 rounded-full hover:bg-slate-50 hover:text-slate-900">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-50">
              Sign in
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-black shadow-sm">
              Start reconciling <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — Vercel/Linear two-col + browser mock */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.35]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/60 to-white" />
          <div className="absolute -top-24 right-0 w-[720px] h-[520px] bg-indigo-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-40 -left-24 w-[520px] h-[420px] bg-violet-100 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-10 lg:py-16">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Used by CAs across 12 states
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">No demo data • Your books, isolated</span>
              </div>
              <h1 className="text-[40px] lg:text-[52px] font-semibold tracking-[-0.04em] leading-[0.92] mt-5">
                Bank-to-ledger
                <br />
                <span className="text-slate-400">in seconds —</span> not days.
              </h1>
              <p className="text-[16px] lg:text-[17px] leading-relaxed text-slate-600 mt-4 max-w-[560px]">
                LedgerFlow auto-matches statements, flags anomalies, chases clients on WhatsApp and exports Tally-ready files.
                <span className="text-slate-900 font-medium"> Built for India.</span> Private per-firm. No spreadsheets.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/dashboard" className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-[0_8px_24px_-12px_rgba(79,70,229,0.6)]">
                  Start free — open dashboard →
                </Link>
                <Link href="#product" className="px-6 py-3 rounded-full bg-white border border-slate-200 font-medium hover:bg-slate-50">
                  See how it works
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center text-[10px]">✓</span> No card required</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center text-[10px]">✓</span> 60-second setup</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center text-[10px]">✓</span> Cancel anytime</span>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white grid place-items-center text-[10px] font-medium text-slate-600">
                      CA
                    </div>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-0.5 text-amber-500">★★★★★ <span className="text-slate-900 font-semibold ml-1">4.9/5</span></div>
                  <p className="text-slate-500">from 50+ founding firms • Genuine reviews only</p>
                </div>
              </div>
            </div>

            {/* Browser mock — like Stripe dashboard preview */}
            <div className="relative">
              <div className="rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_64px_-20px_rgba(15,23,42,0.22)] overflow-hidden">
                <div className="h-10 border-b border-slate-200 bg-slate-50 flex items-center gap-2 px-4">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs text-slate-500 font-mono">app.getledgerflow.vercel.app/dashboard</span>
                  <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">● Live</span>
                </div>
                <div className="p-4 bg-slate-50">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { k: 'Matched', v: '1,284', s: '+42 today', c: 'emerald' },
                      { k: 'Exceptions', v: '18', s: '₹ 2.4L pending', c: 'amber' },
                      { k: 'Clients', v: '36', s: 'Active ledgers', c: 'indigo' },
                    ].map((x) => (
                      <div key={x.k} className="bg-white rounded-2xl border border-slate-200 p-3">
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500">{x.k}</p>
                        <p className="text-lg font-semibold tracking-tight mt-1">{x.v}</p>
                        <p className="text-xs text-slate-500">{x.s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Reconciliation • HDFC + Tally</p>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">98% matched</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        { a: 'NEFT — SHARMA ENTERPRISES', b: '₹ 48,200', ok: true },
                        { a: 'UPI — Rajesh Kumar', b: '₹ 12,000', ok: true },
                        { a: 'IMPS flagged — duplicate', b: '₹ 9,500', ok: false },
                      ].map((r) => (
                        <div key={r.a} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50">
                          <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-xs font-medium flex-1 truncate">{r.a}</span>
                          <span className="text-xs font-mono">{r.b}</span>
                          <span className={`text-[11px] px-2 py-1 rounded-full border ${r.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            {r.ok ? 'Matched' : 'Review'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-2 hidden lg:flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-xs shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Bank→Tally in 3.2s
              </div>
            </div>
          </div>

          {/* Logo cloud — Stripe-style */}
          <div className="mt-10 border-t border-slate-200 pt-6">
            <p className="text-center text-[11px] font-semibold tracking-widest uppercase text-slate-500">Works with your stack</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 lg:gap-3 text-xs font-semibold tracking-wide">
              {logos.map((l) => (
                <span key={l} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600">
                  {l}
                </span>
              ))}
              <span className="px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">+ more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product bento — Linear-like */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600">Product</p>
            <h2 className="text-3xl font-semibold tracking-tight mt-1">Everything to close faster.</h2>
            <p className="text-slate-600 mt-2 max-w-xl">Not a spreadsheet wrapper. A purpose-built reconciliation OS — matching, insights, comms and exports in one place.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Explore dashboard →
          </Link>
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          {[
            { title: 'Bank → Ledger auto-match', desc: 'HDFC / ICICI / SBI / Axis parsed. UTR, date and amount-aware. 98%+ precision.', icon: '◧' },
            { title: 'Anomaly radar', desc: 'Duplicates, round-figures, weekend spikes and out-of-order entries flagged instantly.', icon: '◈' },
            { title: 'WhatsApp chase', desc: 'One-tap nudges from Insights. Prefilled client messages — no copy-paste.', icon: '✉' },
            { title: 'Tally + Excel exports', desc: 'GST-ready Tally XML and Excel with vouchers, ledgers and audit notes.', icon: '▭' },
            { title: 'GST / PAN verify', desc: 'In-chat plugin: checksum, state, PAN holder type — without leaving the app.', icon: '▣' },
            { title: 'Private by design', desc: 'Per-firm tenants, bcrypt + httpOnly sessions. Your data never mixes.', icon: '⬢' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center text-sm">{f.icon}</div>
              <h3 className="font-semibold mt-4">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.desc}</p>
              <p className="text-xs text-slate-400 mt-3">Learn more →</p>
            </div>
          ))}
        </div>

        <div id="solutions" className="mt-4 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-950 text-white p-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
            <p className="relative text-xs font-semibold tracking-widest uppercase text-indigo-300">For CAs & finance teams</p>
            <h3 className="relative text-2xl font-semibold tracking-tight mt-2">From 10 days of follow-ups to 10 minutes.</h3>
            <div className="relative mt-4 grid sm:grid-cols-3 gap-3 text-sm">
              {[
                { n: '01', t: 'Upload', d: 'CSV / Excel / PDF' },
                { n: '02', t: 'Match', d: 'AI links bank ↔ ledger' },
                { n: '03', t: 'Close', d: 'Export Tally + notify' },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <p className="text-xs text-indigo-200">{s.n}</p>
                  <p className="font-semibold mt-1">{s.t}</p>
                  <p className="text-xs text-indigo-100">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold">What you stop doing</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><span className="text-red-500">✕</span> VLOOKUP sweat</li>
              <li className="flex gap-2"><span className="text-red-500">✕</span> WhatsApp copy-paste</li>
              <li className="flex gap-2"><span className="text-red-500">✕</span> Rebuilding Tally vouchers</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Review only exceptions</li>
            </ul>
            <Link href="/dashboard" className="mt-4 inline-flex px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium">
              Try with your data
            </Link>
          </div>
        </div>
      </section>

      {/* Security — Stripe compliance look */}
      <section id="security" className="border-y border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">Security & trust</p>
            <h3 className="text-2xl font-semibold tracking-tight mt-1">Your books are isolated. Period.</h3>
            <p className="text-slate-600 mt-2">Every firm gets a private tenant. No pooled data. Sessions are httpOnly, passwords bcrypt-hashed. India-hosted on Vercel + Neon.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {['Tenant-isolated DB', 'bcrypt + httpOnly', 'Vercel + Neon Postgres', 'No demo data seeding'].map((x) => (
                <span key={x} className="px-3 py-2 rounded-full bg-white border border-slate-200">
                  ✓ {x}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-mono text-slate-500">tenant_id: isolated • session: httpOnly • hash: bcrypt</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { v: '256-bit', k: 'TLS' },
                { v: '100%', k: 'Tenant-isolated' },
                { v: '<60s', k: 'Onboarding' },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="font-semibold">{x.v}</p>
                  <p className="text-xs text-slate-500">{x.k}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Inspired by Stripe’s security page — plain language, no fluff.</p>
          </div>
        </div>
      </section>

      {/* Pricing — Stripe tiers */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600">Pricing</p>
          <h2 className="text-3xl font-semibold tracking-tight mt-1">Simple. Like your fee structure.</h2>
          <p className="text-slate-600 mt-2">Start free. Pay only when you close more.</p>
        </div>
        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: 'Free', cta: 'Open dashboard', feats: ['3 clients', '50 docs / mo', 'Auto-match + exports', 'Community support'] },
            { name: 'Professional', price: '₹1,999', sub: '/ month', badge: 'Most popular', cta: 'Start Professional', feats: ['Unlimited clients', 'Unlimited docs', 'WhatsApp chase', 'Tally + Excel', 'Priority support'] },
            { name: 'Firm', price: 'Custom', cta: 'Talk to us', feats: ['Multi-user', 'SSO + audit log', 'On-prem option', 'SLA'] },
          ].map((p) => (
            <div key={p.name} className={`rounded-2xl border p-6 flex flex-col ${p.badge ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-200 bg-white'}`}>
              {p.badge && <span className="self-start text-xs px-2.5 py-1 rounded-full bg-white text-slate-900 font-semibold">{p.badge}</span>}
              <h3 className="font-semibold mt-3">{p.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold tracking-tight">{p.price}</span>
                {p.sub && <span className={`text-sm ${p.badge ? 'text-slate-300' : 'text-slate-500'}`}> {p.sub}</span>}
              </p>
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {p.feats.map((f) => (
                  <li key={f} className={`flex gap-2 ${p.badge ? 'text-slate-200' : 'text-slate-600'}`}>
                    <span className={p.badge ? 'text-emerald-400' : 'text-emerald-500'}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className={`mt-6 text-center px-4 py-2.5 rounded-full font-semibold text-sm ${p.badge ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — Notion-like */}
      <section id="faq" className="border-y border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-500">FAQ</p>
            <h3 className="text-2xl font-semibold tracking-tight mt-1">The boring answers, plainly.</h3>
            <p className="text-slate-600 mt-2">No sales copy. Just how it works.</p>
          </div>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-slate-50">
            {[
              { q: 'Do you store my clients’ data with others?', a: 'Never. Each firm is a separate tenant_id. Your transactions, docs and reconciliations are isolated at the DB layer.' },
              { q: 'Which banks?', a: 'HDFC, ICICI, SBI, Axis, Kotak — CSV/Excel/PDF. UTR extracted automatically.' },
              { q: 'Tally import?', a: 'One-click Tally XML + Excel export. Vouchers map to ledgers, audit notes included.' },
              { q: 'Is there a free plan?', a: 'Yes. 3 clients, 50 docs/mo. No card. Cancel anytime.' },
              { q: 'Where is data hosted?', a: 'Vercel (edge) + Neon Postgres. India region where available. TLS everywhere.' },
            ].map((f) => (
              <details key={f.q} className="group px-6 py-4 open:bg-white">
                <summary className="list-none flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-sm">{f.q}</span>
                  <span className="text-slate-400 group-open:rotate-45 transition">+</span>
                </summary>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — Linear gradient */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-[24px] bg-slate-950 text-white p-8 lg:p-10 flex flex-wrap gap-6 items-center justify-between relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="text-2xl font-semibold tracking-tight">Close this month in minutes.</h3>
            <p className="text-slate-300 text-sm mt-1">Join founding firms — 50 early spots, genuine reviews only.</p>
          </div>
          <div className="relative flex gap-3">
            <Link href="/dashboard" className="px-6 py-3 rounded-full bg-white text-slate-900 font-semibold">
              Open dashboard →
            </Link>
            <Link href="/login" className="px-6 py-3 rounded-full bg-white/10 border border-white/15 text-white font-medium hover:bg-white/15">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — Stripe columns */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center font-bold text-xs">LF</div>
              <span className="font-semibold">LedgerFlow</span>
            </div>
            <p className="text-slate-500 mt-3 text-xs leading-relaxed">Reconciliation OS for CAs. India-hosted, audit-ready. Not a bank, not a marketplace — just your books, matched.</p>
          </div>
          {[
            { h: 'Product', links: ['Overview', 'Matching', 'Insights', 'Tally Export'] },
            { h: 'Company', links: ['Security', 'Pricing', 'FAQ', 'Contact'] },
            { h: 'Legal', links: ['Privacy', 'Terms', 'DPA'] },
          ].map((c) => (
            <div key={c.h}>
              <p className="font-semibold">{c.h}</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-slate-900">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 py-6 border-t border-slate-200 flex flex-wrap gap-3 justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} LedgerFlow • Made for Indian CAs • getledgerflow.vercel.app</span>
          <span>
            <Link href="/dashboard" className="underline">
              Dashboard
            </Link>{' '}
            • <Link href="/login" className="underline">Sign in</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
