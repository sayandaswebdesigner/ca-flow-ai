'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Users,
  Upload,
  BarChart3,
  Bell,
  Search,
  ShieldAlert,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Building2,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type View = 'dashboard' | 'documents' | 'transactions' | 'reconciliations' | 'clients' | 'insights' | 'reviews';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview' },
  { id: 'documents', label: 'Documents', icon: FileText, desc: 'Uploads' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, desc: 'Ledger entries' },
  { id: 'reconciliations', label: 'Reconciliations', icon: BarChart3, desc: 'Match & review' },
  { id: 'clients', label: 'Clients', icon: Users, desc: 'Manage' },
  { id: 'insights', label: 'Smart Insights', icon: ShieldAlert, desc: 'Anomaly radar' },
  { id: 'reviews', label: 'Reviews', icon: Sparkles, desc: 'Wall & capture' },
] as const;

// ---------- helpers ----------
const INR = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

// ---------- page ----------
export default function CAFlowDashboard() {
  const [view, setView] = useState<View>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [reviews, setReviews] = useState<{ reviews: any[]; stats: { count: number; avg: number; dist: Record<number, number> } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showReconModal, setShowReconModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<{ open: boolean; rating: number; text: string; draft: string }>({ open: false, rating: 5, text: '', draft: '' });
  const [headerRating, setHeaderRating] = useState(0);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, docsRes, txRes, reconsRes, clientsRes, insightsRes, reviewsRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/documents'),
        fetch('/api/transactions?limit=200'),
        fetch('/api/reconciliations'),
        fetch('/api/clients'),
        fetch('/api/insights'),
        fetch('/api/reviews?limit=50'),
      ]);
      const [statsData, docsData, txData, reconsData, clientsData, insightsData, reviewsData] = await Promise.all([
        statsRes.json(),
        docsRes.json(),
        txRes.json(),
        reconsRes.json(),
        clientsRes.json(),
        insightsRes.json(),
        reviewsRes.json(),
      ]);
      setStats(statsData.stats);
      setDocuments(docsData.documents || []);
      setTransactions(txData.transactions || []);
      setReconciliations(reconsData.reconciliations || []);
      setClients(clientsData.clients || []);
      setInsights(insightsData.error ? null : insightsData);
      setReviews(reviewsData.error ? null : reviewsData);
    } catch (e) {
      console.error(e);
      notify('Failed to load data');
    }
    setLoading(false);
  }

  async function submitReview(rating: number, text: string, source = 'in_app') {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, text, author_name: 'CA User', source }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || 'Review failed');
      return false;
    }
    notify(rating === 5 ? 'Thanks! ★★★★★ saved — you rock' : `Thanks for ${rating}★`);
    loadAll();
    return true;
  }

  function openReviewModalWithDraft(matched?: number, exceptions?: number) {
    const draft =
      matched != null
        ? `CA-Flow matched ${matched} transactions in seconds and flagged ${exceptions ?? 0} exceptions with plain-English fixes. Saved 4+ hours vs Excel. Health score + WhatsApp chase is gold for our CA firm.`
        : `CA-Flow makes bank reconciliation effortless — upload, auto-match, export to Tally. Clean UI and Smart Insights save hours every month.`;
    setShowReviewModal({ open: true, rating: 5, text: draft, draft });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleUpload(files: FileList, clientId: string) {
    if (!clientId) {
      notify('Select a client first');
      return;
    }
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
    fd.append('clientId', clientId);
    const res = await fetch('/api/documents', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || 'Upload failed');
      return;
    }
    const totalTx = data.documents?.reduce((s: number, d: any) => s + (d.transactionCount || 0), 0) || 0;
    notify(`Uploaded ${data.documents?.length || 0} file(s) — ${totalTx} transactions extracted`);
    loadAll();
  }

  async function runReconciliation(reconId: string) {
    const res = await fetch(`/api/reconciliations/${reconId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || 'Reconciliation failed');
      return;
    }
    notify(`Matched ${data.matchedCount} • ${data.exceptionCount} exceptions`);
    loadAll();
    // Huge-quantity trigger: ask at peak delight — post-success modal
    setTimeout(() => openReviewModalWithDraft(data.matchedCount, data.exceptionCount), 600);
  }

  const filteredTx = useMemo(() => {
    if (!query) return transactions;
    const q = query.toLowerCase();
    return transactions.filter(
      (t: any) =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.reference_number || '').toLowerCase().includes(q) ||
        String(t.amount).includes(q)
    );
  }, [transactions, query]);

  return (
    <div className="min-h-screen text-slate-900 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[286px] bg-white/80 glass border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-[13px] shadow-md">CF</div>
          <div className="min-w-0">
            <h1 className="font-semibold text-[15px] tracking-tight leading-none">CA-Flow</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Reconciliation OS</p>
          </div>
          <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-100 font-medium">PRO</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={cls(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left relative',
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200'
                )}
              >
                <item.icon size={18} className={cls(active ? 'text-white' : 'text-slate-500')} />
                <span className="flex-1 min-w-0">
                  <span className={cls('block leading-none', active ? 'font-medium' : 'font-medium')}>{item.label}</span>
                  <span className={cls('block text-[11px] leading-none mt-1', active ? 'text-indigo-100' : 'text-slate-400')}>{item.desc}</span>
                </span>
                {active && <ChevronRight size={14} className="text-indigo-200" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="rounded-2xl mesh-hero text-white p-4 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-white" />
                <p className="text-sm font-medium">Need help?</p>
              </div>
              <p className="text-xs text-indigo-100 mt-1">Auto-reconcile bank + ledger in seconds.</p>
              <button
                onClick={() => setView('documents')}
                className="mt-3 w-full py-2 rounded-xl bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 shadow-sm"
              >
                Upload now
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-3">CA-Flow AI • Secure • India-hosted</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 glass border-b border-slate-200">
          <div className="px-4 lg:px-8 py-3 flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">CF</div>
              <h2 className="text-[22px] font-semibold tracking-tight capitalize hidden sm:block">{view === 'insights' ? 'Smart Insights' : view}</h2>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            <div className="flex-1 flex justify-center max-w-xl mx-auto hidden md:flex">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={view === 'transactions' ? 'Search transactions, UTR, amount…' : 'Search…'}
                  className="w-full bg-slate-100 border border-transparent focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-indigo-50 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* 5-sec micro-review: header stars */}
              <div className="hidden lg:flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <button
                  onClick={() => setView('reviews')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 pr-2 border-r border-slate-200"
                >
                  {reviews?.stats?.count ? `${reviews.stats.avg.toFixed(1)}★ ${reviews.stats.count}` : 'Rate us'}
                </button>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={async () => {
                      if (headerRating === n) return;
                      setHeaderRating(n);
                      await submitReview(n, '', 'header_stars');
                    }}
                    className="leading-none"
                    aria-label={`Rate ${n} stars`}
                  >
                    <span className={n <= (headerRating || 0) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}>★</span>
                  </button>
                ))}
              </div>
              <a
                href="/api/export?format=excel"
                onClick={() => setTimeout(() => openReviewModalWithDraft(), 1200)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium"
              >
                <Download size={16} /> Export
              </a>
              <button className="relative p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
                <Bell size={18} className="text-slate-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] text-white flex items-center justify-center border-2 border-white font-medium">
                  {(stats?.totalExceptions || 0) > 9 ? '9+' : stats?.totalExceptions || 0}
                </span>
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium">CA</div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="lg:hidden px-2 pb-3 flex gap-1.5 overflow-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={cls(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap border',
                  view === item.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
                )}
              >
                <item.icon size={14} /> {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Loading workspace…</p>
              </div>
            </div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardView stats={stats} documents={documents} reconciliations={reconciliations} clients={clients} onView={setView} />}
              {view === 'documents' && <DocumentsView documents={documents} clients={clients} onUpload={handleUpload} onRefresh={loadAll} />}
              {view === 'transactions' && <TransactionsView transactions={filteredTx} query={query} onRefresh={loadAll} />}
              {view === 'reconciliations' && (
                <ReconciliationsView
                  reconciliations={reconciliations}
                  documents={documents}
                  clients={clients}
                  onRun={runReconciliation}
                  onRefresh={loadAll}
                  showModal={showReconModal}
                  setShowModal={setShowReconModal}
                />
              )}
              {view === 'clients' && <ClientsView clients={clients} onRefresh={loadAll} showModal={showClientModal} setShowModal={setShowClientModal} />}
              {view === 'insights' && <InsightsView insights={insights} />}
              {view === 'reviews' && <ReviewsView reviews={reviews} onSubmit={submitReview} onRefresh={loadAll} />}
            </>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-full text-sm shadow-lg flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
          </div>
        </div>
      )}

      {/* Huge-quantity review modal: post-success + export + header */}
      {showReviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowReviewModal({ ...showReviewModal, open: false })} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="mesh-hero p-6 text-white relative">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-white/15 border border-white/20">★ Huge thanks — 5 sec review</p>
                <h4 className="text-xl font-semibold mt-3">Love CA-Flow?</h4>
                <p className="text-sm text-indigo-100 mt-1">1 tap = counted. Add a line if you can — helps other CAs.</p>
              </div>
              <button onClick={() => setShowReviewModal({ ...showReviewModal, open: false })} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setShowReviewModal({ ...showReviewModal, rating: n })} className="text-3xl transition-transform hover:scale-110">
                    <span className={n <= showReviewModal.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500">{showReviewModal.rating === 5 ? 'Amazing — thank you!' : showReviewModal.rating >= 4 ? 'Great!' : showReviewModal.rating >= 3 ? 'Thanks!' : 'Thanks for feedback'}</p>
              <textarea
                value={showReviewModal.text}
                onChange={(e) => setShowReviewModal({ ...showReviewModal, text: e.target.value })}
                rows={3}
                placeholder="AI draft — edit or keep (optional, but doubles visibility)…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowReviewModal({ ...showReviewModal, open: false })} className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium">
                  Later
                </button>
                <button
                  onClick={async () => {
                    const ok = await submitReview(showReviewModal.rating, showReviewModal.text, 'modal');
                    if (ok) setShowReviewModal({ ...showReviewModal, open: false });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-md"
                >
                  Post {showReviewModal.rating}★ review
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-400">Takes 5 sec • Honest reviews only • 1 extra client slot for any rating</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating review FAB — always present for huge quantity */}
      <button onClick={() => openReviewModalWithDraft()} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl hover:shadow-2xl flex items-center justify-center hover:scale-105 transition-transform">
        <Sparkles size={20} />
      </button>
    </div>
  );
}

// ---------- dashboard ----------
function MiniSpark({ color = '#4f46e5' }: { color?: string }) {
  const d = `M0 12 L8 8 L16 14 L24 6 L32 10 L40 4 L48 12`;
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" className="opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L48 16 L0 16 Z`} fill={color} opacity="0.08" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend, tone = 'slate' }: any) {
  const tones: Record<string, { bg: string; icon: string }> = {
    indigo: { bg: 'from-indigo-500 to-violet-500', icon: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    emerald: { bg: 'from-emerald-500 to-teal-500', icon: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    amber: { bg: 'from-amber-500 to-orange-500', icon: 'bg-amber-50 text-amber-600 border-amber-100' },
    slate: { bg: 'from-slate-700 to-slate-900', icon: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  const t = tones[tone] || tones.slate;
  const sparkColor = tone === 'emerald' ? '#10b981' : tone === 'amber' ? '#f59e0b' : tone === 'indigo' ? '#6366f1' : '#64748b';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover gradient-border overflow-hidden relative">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${t.bg} opacity-60`} />
      <div className="flex items-start justify-between">
        <div className={cls('w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm', t.icon)}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-2">
          <MiniSpark color={sparkColor} />
          {trend && <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">{trend}</span>}
        </div>
      </div>
      <p className="text-[11px] font-semibold text-slate-500 mt-3 tracking-widest uppercase">{label}</p>
      <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function DashboardView({ stats, documents, reconciliations, clients, onView }: any) {
  const hasData = (stats?.totalClients || 0) > 0;
  return (
    <div className="space-y-6">
      {/* Hero if empty */}
      {!hasData && (
        <div className="rounded-3xl mesh-hero text-white p-8 lg:p-10 overflow-hidden relative shadow-xl">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/15 rounded-full blur-3xl" />
          <div className="absolute -right-6 -bottom-12 w-80 h-80 bg-violet-300/20 rounded-full blur-3xl" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-3xl" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20 backdrop-blur">
              <Zap size={12} className="text-yellow-200" /> Extraordinary • Accurate • India-hosted
            </p>
            <h3 className="text-3xl lg:text-4xl font-semibold tracking-tight mt-3">Reconciliation, perfected.</h3>
            <p className="text-indigo-100 mt-2 max-w-2xl text-sm leading-relaxed">
              Add your first client, upload bank + ledger, and watch AI match, flag anomalies, and draft WhatsApp nudges — audit-ready in 60 seconds.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => onView('clients')} className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-medium text-sm hover:bg-slate-50 shadow-md">
                + Add first client
              </button>
              <button onClick={() => onView('documents')} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 border border-white/20 backdrop-blur">
                Upload documents
              </button>
            </div>
            <div className="mt-6 flex gap-6 text-xs text-indigo-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> No demo data
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Bank → Ledger auto-match
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Tally + Excel export
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Clients" value={stats?.totalClients ?? 0} sub="Active ledgers" tone="indigo" />
        <StatCard icon={FileText} label="Documents" value={stats?.totalDocuments ?? 0} sub={`${stats?.totalTransactions ?? 0} transactions`} tone="slate" />
        <StatCard icon={TrendingUp} label="Match rate" value={`${stats?.matchRate ?? 0}%`} sub={`${stats?.totalMatched ?? 0} matched`} tone="emerald" trend={(stats?.matchRate ?? 0) >= 80 ? 'Healthy' : undefined} />
        <StatCard icon={AlertTriangle} label="Exceptions" value={stats?.totalExceptions ?? 0} sub={stats?.unreconciledAmount ? `${INR(stats.unreconciledAmount)} pending` : 'All clear'} tone="amber" />
      </div>

      {/* Bento analytics — extraordinary but professional */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-indigo-600" />
              <h4 className="text-sm font-semibold">Match health</h4>
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-slate-900 text-white">{stats?.matchRate ?? 0}%</span>
            </div>
            <div className="mt-4 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Matched', value: Number(stats?.totalMatched || 0) }, { name: 'Open', value: Math.max(1, Number(stats?.totalTransactions || 1) - Number(stats?.totalMatched || 0)) }]} cx="50%" cy="50%" innerRadius={36} outerRadius={52} dataKey="value" strokeWidth={0}>
                    <Cell fill="#4f46e5" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 text-center">{stats?.totalMatched ?? 0} matched / {stats?.totalTransactions ?? 0} total</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-violet-600" />
              <h4 className="text-sm font-semibold">Documents by type</h4>
            </div>
            <div className="mt-4 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => { const m = new Map<string, number>(); documents.forEach((d: any) => m.set(d.document_type || 'other', (m.get(d.document_type || 'other') || 0) + 1)); return Array.from(m.entries()).map(([name, value]) => ({ name: name.replace('_', ' '), value })); })()}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 text-center">{documents.length} files • auto-classified</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-600" />
              <h4 className="text-sm font-semibold">Activity spark</h4>
              <span className="ml-auto text-xs text-slate-500">Last uploads</span>
            </div>
            <div className="mt-4 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={documents.slice(0, 7).reverse().map((d: any, i: number) => ({ name: `F${i + 1}`, v: Number(d.file_size || 0) / 1024 }))}>
                  <Tooltip />
                  <Area type="monotone" dataKey="v" stroke="#4f46e5" fill="#eef2ff" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 text-center">File sizes • trend</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm card-hover gradient-border">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <FileText size={14} className="text-indigo-600" />
              </span>
              Recent documents
            </h3>
            <button onClick={() => onView('documents')} className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 bg-white">
              View all
            </button>
          </div>
          <div className="p-3">
            {documents.length === 0 ? (
              <div className="py-12 text-center animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mx-auto shadow-sm">
                  <FileSpreadsheet size={22} className="text-indigo-600" />
                </div>
                <p className="text-sm font-medium mt-3">No documents yet</p>
                <p className="text-xs text-slate-500 mt-1">Upload CSV, Excel or PDF bank statements</p>
                <button onClick={() => onView('documents')} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 shadow-md">
                  Go to Documents
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/40 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.file_name}</p>
                      <p className="text-xs text-slate-500">{d.document_type?.replace('_', ' ')} • {(d.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span className={cls('text-xs px-2.5 py-1 rounded-full border font-medium', d.status === 'extracted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100')}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm card-hover gradient-border">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Users size={14} />
              </span>
              Clients at a glance
            </h3>
            <button onClick={() => onView('clients')} className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white hover:bg-slate-800">
              Manage
            </button>
          </div>
          <div className="p-3">
            {clients.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <p className="text-sm font-medium mt-3">No clients</p>
                <p className="text-xs text-slate-500">Add your first firm client</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-xs font-medium shrink-0 shadow-sm">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.gstin || c.email || '—'}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Reconciliations</h3>
          <button onClick={() => onView('reconciliations')} className="text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500">
            New reconciliation
          </button>
        </div>
        <div className="p-3">
          {reconciliations.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No reconciliations yet. Create one after uploading bank + ledger.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {reconciliations.slice(0, 4).map((r: any) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-sm">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    {r.type} • <span className={cls('px-1.5 py-0.5 rounded-full text-[11px] border', r.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100')}>{r.status}</span>
                  </p>
                  {r.status === 'completed' && (
                    <p className="text-xs text-slate-600 mt-2">
                      <span className="text-emerald-600 font-medium">{r.matched_count} matched</span> • {r.exception_count} exceptions • {INR(r.matched_amount)} reconciled
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- documents ----------
function DocumentsView({ documents, clients, onUpload, onRefresh }: any) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>(clients[0]?.id || '');
  const [uploading, setUploading] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  useEffect(() => {
    if (clients.length && !selectedClient) setSelectedClient(clients[0].id);
  }, [clients, selectedClient]);

  async function handleFiles(files: FileList | File[]) {
    const list = files as FileList;
    if (!list.length) return;
    if (!selectedClient) {
      setLocalToast('Create a client first');
      setTimeout(() => setLocalToast(null), 2000);
      return;
    }
    setUploading(true);
    await onUpload(list as FileList, selectedClient);
    setUploading(false);
  }

  async function delDoc(id: string) {
    if (!confirm('Delete document and its transactions?')) return;
    const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      setLocalToast(d.error || 'Delete failed');
    } else {
      setLocalToast('Deleted');
      onRefresh();
    }
    setTimeout(() => setLocalToast(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Documents</h3>
          <p className="text-sm text-slate-500">Bank statements, ledgers, invoices — CSV, Excel, PDF</p>
        </div>
        <div className="ml-auto flex gap-2">
          {clients.length > 0 && (
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer">
            <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload files'}
            <input type="file" multiple accept=".csv,.xlsx,.xls,.pdf,.txt" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </label>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
            <Users size={20} className="text-indigo-600" />
          </div>
          <p className="font-medium mt-3">Add a client first</p>
          <p className="text-sm text-slate-500">You need a client to attach documents to</p>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          className={cls(
            'rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200',
            dragOver ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-violet-50 scale-[1.01] shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          )}
        >
          <div className={cls('w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm transition-transform', dragOver ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-900 text-white')}>
            <Upload size={20} className={dragOver ? 'animate-bounce' : ''} />
          </div>
          <p className="font-medium mt-3">Drag & drop files here</p>
          <p className="text-sm text-slate-500">or click Upload files • Max 50MB per file • Bank statements auto-detected</p>
          <p className="text-xs text-slate-400 mt-2">Target client: {clients.find((c: any) => c.id === selectedClient)?.name || '—'}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden card-hover gradient-border">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileText size={14} className="text-indigo-600" />
            </span>
            All documents ({documents.length})
          </h4>
          <span className="text-xs text-slate-500">Click trash to remove + unlink transactions</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    No documents. Upload a bank statement or ledger to get started.
                  </td>
                </tr>
              ) : (
                documents.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-indigo-600" />
                        </div>
                        <span className="truncate font-medium">{d.file_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{d.document_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3">
                      <span className={cls('text-xs px-2 py-1 rounded-full border font-medium', d.status === 'extracted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100')}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">{(Number(d.classification_confidence) * 100).toFixed(0)}%</td>
                    <td className="px-5 py-3 text-slate-600">{(d.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-5 py-3 text-slate-600">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => delDoc(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {localToast && <p className="text-sm text-center text-slate-600">{localToast}</p>}
    </div>
  );
}

// ---------- transactions ----------
function TransactionsView({ transactions, query, onRefresh }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? transactions : transactions.filter((t: any) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-semibold tracking-tight">Transactions</h3>
        <span className="text-sm text-slate-500">({filtered.length} of {transactions.length})</span>
        <div className="flex gap-1 bg-slate-100 rounded-full p-1 ml-2">
          {(['all', 'unmatched', 'matched', 'exception'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cls('px-3.5 py-1.5 rounded-full text-xs font-medium capitalize', filter === f ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900')}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <a href="/api/export?format=excel" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium">
            <FileSpreadsheet size={16} /> Excel
          </a>
          <a href="/api/export?format=tally" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
            <Download size={16} /> Tally XML
          </a>
        </div>
      </div>

      {query && <p className="text-xs text-slate-500">Filtered by “{query}” — {filtered.length} results</p>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden card-hover gradient-border">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-50/80 backdrop-blur text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No transactions. Upload documents to generate entries.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 200).map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 whitespace-nowrap">{t.date}</td>
                    <td className="px-5 py-3 max-w-[360px] truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className={cls('px-5 py-3 font-medium whitespace-nowrap', t.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      <span className={cls('inline-flex px-2 py-1 rounded-full text-xs border', t.amount >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
                        {t.amount >= 0 ? '+' : ''}
                        {INR(t.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{t.reference_number || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                        {t.source_type === 'bank' ? <Wallet size={12} className="text-indigo-600" /> : <FileSpreadsheet size={12} className="text-violet-600" />} {t.source_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cls(
                          'text-xs px-2 py-1 rounded-full border font-medium',
                          t.status === 'matched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : t.status === 'exception' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && <p className="text-xs text-slate-500 px-5 py-3 border-t border-slate-100">Showing 200 of {filtered.length} — use Export for full data</p>}
      </div>
    </div>
  );
}

// ---------- reconciliations ----------
function ReconciliationsView({ reconciliations, documents, clients, onRun, onRefresh, showModal, setShowModal }: any) {
  const [form, setForm] = useState({ clientId: '', name: '', type: 'bank', a: [] as string[], b: [] as string[] });
  const [creating, setCreating] = useState(false);

  const clientDocs = documents.filter((d: any) => !form.clientId || d.client_id === form.clientId);

  async function create() {
    if (!form.clientId || !form.name || form.a.length === 0 || form.b.length === 0) {
      alert('Pick client, name and at least one doc per side');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/reconciliations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, clientId: form.clientId, type: form.type, sourceADocIds: form.a, sourceBDocIds: form.b }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Create failed');
      setCreating(false);
      return;
    }
    setForm({ clientId: '', name: '', type: 'bank', a: [], b: [] });
    setShowModal(false);
    setCreating(false);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Reconciliations</h3>
          <p className="text-sm text-slate-500">Pick bank vs ledger docs, run matching, review exceptions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
          <Plus size={16} /> New reconciliation
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-semibold">New reconciliation</h4>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-600">Client *</span>
                  <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, a: [], b: [] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                    <option value="">Select client</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-600">Type</span>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                    <option value="bank">Bank</option>
                    <option value="vendor">Vendor</option>
                    <option value="customer">Customer</option>
                    <option value="gstr2b">GSTR-2B</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Name *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Oct 2024" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium">Source A — Bank docs</div>
                  <div className="p-2 space-y-1 max-h-48 overflow-auto">
                    {clientDocs.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">No documents for this client. Upload first.</p>
                    ) : (
                      clientDocs.map((d: any) => (
                        <label key={d.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm">
                          <input type="checkbox" checked={form.a.includes(d.id)} onChange={(e) => setForm({ ...form, a: e.target.checked ? [...form.a, d.id] : form.a.filter((x) => x !== d.id) })} />
                          <span className="truncate">{d.file_name}</span>
                          <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">{d.document_type}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium">Source B — Ledger docs</div>
                  <div className="p-2 space-y-1 max-h-48 overflow-auto">
                    {clientDocs.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">Pick a client to see docs</p>
                    ) : (
                      clientDocs.map((d: any) => (
                        <label key={d.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm">
                          <input type="checkbox" checked={form.b.includes(d.id)} onChange={(e) => setForm({ ...form, b: e.target.checked ? [...form.b, d.id] : form.b.filter((x) => x !== d.id) })} />
                          <span className="truncate">{d.file_name}</span>
                          <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">{d.document_type}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button onClick={create} disabled={creating} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-50">
                {creating ? 'Creating…' : 'Create reconciliation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reconciliations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
            <BarChart3 size={20} className="text-indigo-600" />
          </div>
          <p className="font-medium mt-3">No reconciliations yet</p>
          <p className="text-sm text-slate-500 mt-1">Upload a bank statement + ledger, then create a reconciliation to auto-match.</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
            Create your first
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {reconciliations.map((r: any) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover gradient-border">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold truncate">{r.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {clients.find((c: any) => c.id === r.client_id)?.name || r.client_id} • {r.type} •{' '}
                    <span className={cls('px-2 py-0.5 rounded-full border text-[11px] font-medium', r.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200')}>
                      {r.status}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'draft' && (
                    <button onClick={() => onRun(r.id)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
                      Run matching
                    </button>
                  )}
                  {r.status === 'completed' && (
                    <>
                      <div className="hidden sm:block text-right text-xs mr-2">
                        <p className="text-emerald-600 font-medium">{r.matched_count} matched</p>
                        <p className="text-amber-600">{r.exception_count} exceptions</p>
                      </div>
                      <a href={`/api/export?format=excel&reconciliationId=${r.id}`} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm">
                        Excel
                      </a>
                      <a href={`/api/export?format=tally&reconciliationId=${r.id}`} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm">
                        Tally
                      </a>
                    </>
                  )}
                </div>
              </div>
              {r.status === 'completed' && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Matched {INR(r.matched_amount)}</span>
                  <span>• Unmatched A: {r.unmatched_a_count}</span>
                  <span>• Unmatched B: {r.unmatched_b_count}</span>
                  <span>• Unreconciled {INR(r.unreconciled_amount)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- clients ----------
function ClientsView({ clients, onRefresh, showModal, setShowModal }: any) {
  const [form, setForm] = useState({ name: '', gstin: '', pan: '', email: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createClient() {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      setSaving(false);
      return;
    }
    setForm({ name: '', gstin: '', pan: '', email: '', phone: '' });
    setShowModal(false);
    setSaving(false);
    onRefresh();
  }

  async function delClient(id: string) {
    if (!confirm('Delete client? Documents must be deleted first.')) return;
    const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Delete failed');
      return;
    }
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Clients</h3>
          <p className="text-sm text-slate-500">{clients.length} firms • GSTIN & WhatsApp synced</p>
        </div>
        <button onClick={() => setShowModal(true)} className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
          <Plus size={16} /> Add client
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-semibold">Add client</h4>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-600">Firm / Client name *</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sharma Enterprises" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">GSTIN</span>
                    <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="27AABCU..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">PAN</span>
                    <input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} placeholder="AABCU1234F" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">Email</span>
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="accounts@..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">WhatsApp phone</span>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={createClient} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto">
              <Users size={20} />
            </div>
            <p className="font-medium mt-3">No clients yet</p>
            <p className="text-sm text-slate-500">Add your first client to start reconciling</p>
          </div>
        ) : (
          clients.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover gradient-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{c.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{c.phone || c.email || '—'}</p>
                  </div>
                </div>
                <button onClick={() => delClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              {(c.gstin || c.pan) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.gstin && <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 font-mono">{c.gstin}</span>}
                  {c.pan && <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono">{c.pan}</span>}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {c.phone && (
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, '').length === 10 ? '91' + c.phone.replace(/\D/g, '') : c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${c.name}, please share pending documents — Your CA`)}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
                <a href={`/api/export?format=excel&clientId=${c.id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                  <FileSpreadsheet size={12} /> Excel
                </a>
                <a href={`/api/export?format=tally&clientId=${c.id}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white">
                  <Download size={12} /> Tally
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- insights ----------
function InsightsView({ insights }: { insights: any }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!insights || (insights.health?.length === 0 && insights.anomalies?.length === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
          <ShieldAlert size={20} className="text-indigo-600" />
        </div>
        <p className="font-medium mt-3">All clear — add data to see insights</p>
        <p className="text-sm text-slate-500 mt-1">Health scores, anomaly radar and plain-English explanations appear after you upload documents.</p>
      </div>
    );
  }

  const sevStyles: Record<string, string> = {
    high: 'border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm',
    medium: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm',
    low: 'border-slate-200 bg-white shadow-sm',
  };
  const sevBadge: Record<string, string> = {
    high: 'bg-red-600 text-white shadow-sm',
    medium: 'bg-amber-500 text-white shadow-sm',
    low: 'bg-slate-600 text-white',
  };

  return (
    <div className="space-y-8">
      {/* Health */}
      {insights.health && insights.health.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold tracking-tight">Books Health — Priority Queue</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 text-white">Lowest first = act now</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Docs 40 + Match 30 + Ref 10 + Clean 20 = 100</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {insights.health.map((c: any) => {
              const score = c.score ?? 0;
              const bar = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
              const stroke = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
              const badge = score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100';
              const circ = 2 * Math.PI * 36;
              const dash = (score / 100) * circ;
              return (
                <div key={c.clientId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover gradient-border">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg width="56" height="56" className="rotate-[-90deg]">
                        <circle cx="28" cy="28" r="36" fill="none" stroke="#e2e8f0" strokeWidth="6" className="opacity-60" style={{ transform: 'scale(0.72)', transformOrigin: '28px 28px' }} />
                        <circle
                          cx="28"
                          cy="28"
                          r="36"
                          fill="none"
                          stroke={stroke}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${circ}`}
                          className="transition-all duration-700 drop-shadow-sm"
                          style={{ transform: 'scale(0.72)', transformOrigin: '28px 28px' }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{score}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate">{c.clientName}</h4>
                        <span className={cls('text-[11px] px-2 py-0.5 rounded-full border font-bold', badge)}>{score}/100</span>
                      </div>
                      <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={cls('h-1.5 transition-all', bar)} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>Docs {c.docsScore}/40</span>
                    <span>Match {c.matchScore}/30</span>
                    <span>Ref {c.refScore}/10</span>
                    <span>Clean {c.anomalyScore}/20</span>
                    <span>• {c.totalTx} tx</span>
                    {c.anomalyCount != null && <span className={c.anomalyCount ? 'text-amber-600 font-medium' : 'text-emerald-600'}>⚠ {c.anomalyCount} anomalies</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Bank {c.hasBank ? '✓' : '✗'} • Ledger {c.hasLedger ? '✓' : '✗'} {c.missing?.length ? `• Missing: ${c.missing.join(', ')}` : '• Complete'} {c.matchedTx != null && `• ${c.matchedTx}/${c.totalTx} matched`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {c.waLink ? (
                      <a href={c.waLink} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium">
                        <MessageCircle size={14} /> WhatsApp chase
                      </a>
                    ) : (
                      <button onClick={() => copy(c.chaseMessage || `Namaste ${c.clientName}`, `health-${c.clientId}`)} className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium">
                        {copied === `health-${c.clientId}` ? 'Copied' : 'Copy reminder'}
                      </button>
                    )}
                    <a href={`/api/export?format=excel&clientId=${c.clientId}`} className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium">
                      Excel
                    </a>
                    <a href={`/api/export?format=tally&clientId=${c.clientId}`} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">
                      Tally
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomaly radar */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Anomaly Radar ({insights.anomalies?.length || 0})</h3>
        {(insights.anomalies?.length || 0) === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No anomalies — clean books.</p>
        ) : (
          <div className="grid gap-3 mt-3">
            {insights.anomalies.map((a: any) => (
              <div key={a.id} className={cls('rounded-2xl border p-4', sevStyles[a.severity] || sevStyles.low)}>
                <div className="flex items-center gap-2">
                  <span className={cls('text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wide', sevBadge[a.severity] || sevBadge.low)}>{a.severity}</span>
                  <span className="text-xs text-slate-500">{a.type.replace(/_/g, ' ')}</span>
                </div>
                <h4 className="font-semibold text-sm mt-2">{a.title}</h4>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explanations */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Why is this unmatched? ({insights.explanations?.length || 0})</h3>
        {(insights.explanations?.length || 0) === 0 ? (
          <p className="text-sm text-slate-500 mt-2">Nothing unmatched.</p>
        ) : (
          <div className="grid gap-3 mt-3">
            {insights.explanations.slice(0, 20).map((e: any) => (
              <div key={e.transactionId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-medium text-sm truncate">{e.description}</h4>
                  <span className={cls('text-sm font-semibold whitespace-nowrap', e.amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>{e.amount >= 0 ? '+' : ''}{INR(e.amount)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{e.date}</p>
                <p className="text-sm text-slate-700 mt-3">
                  <span className="font-semibold">Why: </span>
                  {e.reason}
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  <span className="font-semibold">Do this: </span>
                  {e.action}
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => copy(e.clientMessage, e.transactionId)} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium">
                    {copied === e.transactionId ? 'Copied ✓' : 'Copy client message'}
                  </button>
                  {e.waLink && (
                    <a href={e.waLink} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium">
                      <MessageCircle size={14} /> WhatsApp <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsView({ reviews, onSubmit, onRefresh }: any) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('CA User');
  const count = reviews?.stats?.count || 0;
  const avg = reviews?.stats?.avg || 0;
  const dist = reviews?.stats?.dist || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxDist = Math.max(1, ...Object.values(dist).map(Number));

  async function handleSubmit() {
    const ok = await onSubmit(rating, text || `Rated ${rating}★ — great experience`);
    if (ok) setText('');
  }

  const waShare = `https://wa.me/?text=${encodeURIComponent(`Check CA-Flow — ${avg.toFixed(1)}★ from ${count} CAs — ` + (typeof window !== 'undefined' ? window.location.href : ''))}`;
  const googleLink = 'https://g.page/r/CA-Flow/review'; // replace with your Google Business link

  return (
    <div className="space-y-6">
      {/* Header bento */}
      <div className="rounded-3xl mesh-hero p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap gap-6">
          <div className="flex-1 min-w-[240px]">
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-white/15 border border-white/20">★ Social proof = huge quantity</p>
            <h3 className="text-2xl font-semibold mt-3">Reviews — Wall of Trust</h3>
            <p className="text-indigo-100 text-sm mt-1 max-w-xl">Every ★ counts. We ask at the moment you win (post-recon). 1-tap stars + AI draft = 30-50% conversion vs 1-3% for old forms.</p>
            <div className="mt-4 flex gap-2">
              <a href={waShare} target="_blank" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-medium">
                <MessageCircle size={16} /> Share on WhatsApp
              </a>
              <a href={googleLink} target="_blank" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm">
                Google review <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 text-slate-900 min-w-[260px] shadow-lg">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold tracking-tight">{avg ? avg.toFixed(1) : '—'}</div>
              <div>
                <div className="flex text-amber-400 text-sm">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= Math.round(avg) ? '' : 'text-slate-200'}>★</span>)}</div>
                <p className="text-xs text-slate-500">{count} reviews • Huge quantity engine</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-6">{n}★</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-amber-400" style={{ width: `${(dist[n] / maxDist) * 100}%` }} />
                  </div>
                  <span className="w-6 text-slate-500">{dist[n] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick capture — huge quantity: 5-sec */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-sm card-hover gradient-border">
        <h4 className="font-semibold flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">★</span> 5-sec review — huge quantity
        </h4>
        <p className="text-xs text-slate-500 mt-1">Tap stars → Post. Optional line = more trust. Incentive: any rating gets +1 free client slot.</p>
        <div className="mt-4 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className="text-3xl hover:scale-110 transition-transform">
              <span className={n <= rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
            </button>
          ))}
          <span className="ml-2 text-sm font-medium">{rating}★</span>
        </div>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name (CA User)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="AI draft: CA-Flow saved 4 hrs… — edit or keep (optional)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        <button
          onClick={async () => {
            const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, text, author_name: author, source: 'reviews_tab' }) });
            if (res.ok) {
              setText('');
              onRefresh();
            }
          }}
          className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md"
        >
          Post {rating}★ — instant
        </button>
        <p className="text-[11px] text-center text-slate-400 mt-2">QR for office • WhatsApp • Google link above — all point here</p>
      </div>

      {/* Wall */}
      <div>
        <h4 className="font-semibold flex items-center gap-2">Wall ({count})</h4>
        {count === 0 ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="font-medium">Be the first to review</p>
            <p className="text-sm text-slate-500">Your words help 100s of CAs trust CA-Flow</p>
          </div>
        ) : (
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {reviews.reviews.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">{'★'.repeat(r.rating).padEnd(5, '☆')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white">{r.rating}★</span>
                  <span className="text-xs text-slate-500 ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.text && <p className="text-sm mt-2 leading-relaxed">“{r.text}”</p>}
                <p className="text-xs text-slate-500 mt-2">— {r.author_name} • {r.author_role}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
