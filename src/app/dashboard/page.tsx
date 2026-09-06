'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Puzzle,
  Bot,
  Mail,
  Table2,
  Wifi,
  CloudUpload,
  Link2,
  Send,
  UserPlus,
  PackageOpen,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

type View = 'dashboard' | 'documents' | 'transactions' | 'reconciliations' | 'clients' | 'insights' | 'reviews' | 'plugins' | 'assistant';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview' },
  { id: 'documents', label: 'Documents', icon: FileText, desc: 'Uploads' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, desc: 'Ledger entries' },
  { id: 'reconciliations', label: 'Reconciliations', icon: BarChart3, desc: 'Match & review' },
  { id: 'clients', label: 'Clients', icon: Users, desc: 'Manage' },
  { id: 'insights', label: 'Smart Insights', icon: ShieldAlert, desc: 'Anomaly radar' },
  { id: 'reviews', label: 'Reviews', icon: Sparkles, desc: 'Wall & capture' },
  { id: 'plugins', label: 'Plugins', icon: Puzzle, desc: 'Integrations' },
  { id: 'assistant', label: 'Assistant', icon: Bot, desc: 'AI chat' },
] as const;

// ---------- helpers ----------
const INR = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

function getAnonTenant(): string {
  if (typeof window === 'undefined') return '';
  let t = localStorage.getItem('ca_anon_tenant');
  if (!t) {
    t = 'anon-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem('ca_anon_tenant', t);
  }
  return t;
}

function getAnonHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const user = localStorage.getItem('ca_logged_in');
  if (user === 'true') return {};
  return { 'x-anonymous-tenant': getAnonTenant() };
}

function UserMenu() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          localStorage.setItem('ca_logged_in', 'true');
        } else {
          localStorage.setItem('ca_logged_in', 'false');
        }
      })
      .catch(() => localStorage.setItem('ca_logged_in', 'false'));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.setItem('ca_logged_in', 'false');
    window.location.href = '/login';
  }

  const initials = user ? user.name.slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-medium hover:bg-slate-700"
        title={user ? `${user.name} (${user.email})` : 'Sign in to save progress'}
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-40 overflow-hidden animate-fadeIn">
            {user ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button onClick={logout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium">
                  Log out
                </button>
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold">Guest user</p>
                  <p className="text-xs text-slate-500">Data is stored locally</p>
                </div>
                <a href="/signup" className="block px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">
                  Sign up — save permanently
                </a>
                <a href="/login" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                  Log in
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== PLUGINS VIEW ====================
function PluginsView() {
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('ca_plugins') || '{}'); } catch { return {}; }
  });

  function togglePlugin(id: string) {
    const next = { ...installed, [id]: !installed[id] };
    setInstalled(next);
    localStorage.setItem('ca_plugins', JSON.stringify(next));
  }

  const plugins = [
    {
      id: 'excel',
      name: 'Excel Import',
      desc: 'Import bank statements, ledgers, and reports from .xlsx/.xls files directly.',
      icon: Table2,
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      status: 'Built-in',
    },
    {
      id: 'tally',
      name: 'Tally Export',
      desc: 'Export reconciled transactions to Tally ERP XML format for direct import.',
      icon: FileSpreadsheet,
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      status: 'Built-in',
    },
    {
      id: 'gmail',
      name: 'Gmail Sync',
      desc: 'Connect Gmail to auto-import bank statements and invoices from email attachments.',
      icon: Mail,
      color: 'from-red-500 to-rose-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      status: 'Connect',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      desc: 'Send reconciliation reminders and payment chase messages to clients via WhatsApp.',
      icon: MessageCircle,
      color: 'from-green-500 to-emerald-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      status: 'Built-in',
    },
    {
      id: 'gst',
      name: 'GST Portal',
      desc: 'Auto-fetch GSTR-1/GSTR-3B data and match with your books for GST reconciliation.',
      icon: Building2,
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      status: 'Coming Soon',
    },
    {
      id: 'cloud',
      name: 'Cloud Storage',
      desc: 'Sync documents with Google Drive, Dropbox, or OneDrive for automatic backup.',
      icon: CloudUpload,
      color: 'from-cyan-500 to-blue-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl mesh-hero p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20 font-medium">
            <Puzzle size={14} /> Plugin Marketplace
          </p>
          <h3 className="text-2xl font-semibold mt-3">Extend CA-Flow</h3>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">Connect your existing tools — Gmail, Tally, WhatsApp, and more. One-click integrations.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm card-hover flex flex-col">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center flex-shrink-0`}>
                <p.icon size={20} className="text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{p.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {p.status === 'Built-in' ? (
                <button
                  onClick={() => togglePlugin(p.id)}
                  className={cls(
                    'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                    installed[p.id]
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                  )}
                >
                  {installed[p.id] ? '✓ Installed' : 'Install'}
                </button>
              ) : p.status === 'Connect' ? (
                <button className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all">
                  <Link2 size={14} className="inline mr-1" /> Connect
                </button>
              ) : (
                <span className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-400 text-center">
                  Coming Soon
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== CHATBOT VIEW ====================
function ChatbotView({ messages, input, setInput, onSend, loading, chatEndRef }: {
  messages: { role: 'user' | 'bot'; text: string }[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const suggestions = [
    'Show transactions',
    'Create client',
    'Upload documents',
    'Export excel',
    'Show insights',
    'Help',
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl mesh-hero p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20 font-medium">
            <Bot size={14} /> AI Assistant
          </p>
          <h3 className="text-2xl font-semibold mt-3">CA-Flow Assistant</h3>
          <p className="text-indigo-100 text-sm mt-1 max-w-xl">Ask me to navigate views, create clients, upload documents, or export data.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '500px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
                <Bot size={28} className="text-indigo-600" />
              </div>
              <p className="font-semibold mt-4">How can I help?</p>
              <p className="text-sm text-slate-500 mt-1">Try one of these commands:</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cls('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cls(
                'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line',
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-800 rounded-bl-md'
              )}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Type a command… (e.g. show transactions)"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200"
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [visits, setVisits] = useState<{ total: number; unique: number; today: number; last7: any[]; recent: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showReconModal, setShowReconModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<{ open: boolean; rating: number; text: string; draft: string }>({ open: false, rating: 5, text: '', draft: '' });
  const [headerRating, setHeaderRating] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignupWarning, setShowSignupWarning] = useState(false);
  const [signupWarningDismissed, setSignupWarningDismissed] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const h = getAnonHeaders();
      const [statsRes, docsRes, txRes, reconsRes, clientsRes, insightsRes, reviewsRes, visitsRes] = await Promise.all([
        fetch('/api/reports', { headers: h }),
        fetch('/api/documents', { headers: h }),
        fetch('/api/transactions?limit=200', { headers: h }),
        fetch('/api/reconciliations', { headers: h }),
        fetch('/api/clients', { headers: h }),
        fetch('/api/insights', { headers: h }),
        fetch('/api/reviews?limit=50', { headers: h }),
        fetch('/api/visits', { headers: h }),
      ]);
      const [statsData, docsData, txData, reconsData, clientsData, insightsData, reviewsData, visitsData] = await Promise.all([
        statsRes.json(),
        docsRes.json(),
        txRes.json(),
        reconsRes.json(),
        clientsRes.json(),
        insightsRes.json(),
        reviewsRes.json(),
        visitsRes.json(),
      ]);
      setStats(statsData.stats);
      setDocuments(docsData.documents || []);
      setTransactions(txData.transactions || []);
      setReconciliations(reconsData.reconciliations || []);
      setClients(clientsData.clients || []);
      setInsights(insightsData.error ? null : insightsData);
      setReviews(reviewsData.error ? null : reviewsData);
      setVisits(visitsData.error ? null : visitsData);
    } catch (e) {
      console.error(e);
      notify('Failed to load data');
    }
    setLoading(false);
  }

  // auto-log visit once per mount + detect login state
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const loggedIn = !!d.user;
      setIsLoggedIn(loggedIn);
      localStorage.setItem('ca_logged_in', loggedIn ? 'true' : 'false');
    }).catch(() => {});

    const h = getAnonHeaders();
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ path: typeof window !== 'undefined' ? window.location.pathname : '/dashboard' }),
    }).catch(() => {});

    // Check if signup warning was dismissed
    const dismissed = localStorage.getItem('ca_signup_warning_dismissed');
    if (dismissed === 'true') setSignupWarningDismissed(true);
  }, []);

  // Tab-close warning for anonymous users
  useEffect(() => {
    if (isLoggedIn || signupWarningDismissed) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isLoggedIn, signupWarningDismissed]);

  // Show signup warning banner after 10s for anonymous users
  useEffect(() => {
    if (isLoggedIn || signupWarningDismissed) return;
    const timer = setTimeout(() => setShowSignupWarning(true), 10000);
    return () => clearTimeout(timer);
  }, [isLoggedIn, signupWarningDismissed]);

  async function submitReview(rating: number, text: string, source = 'in_app') {
    const h = getAnonHeaders();
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
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
    const h = getAnonHeaders();
    const res = await fetch('/api/documents', { method: 'POST', headers: h, body: fd });
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
    const h = getAnonHeaders();
    const res = await fetch(`/api/reconciliations/${reconId}`, { method: 'POST', headers: h });
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

  // Chatbot command handler
  const handleChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setChatLoading(true);

    const lower = msg.toLowerCase();
    let response = '';

    try {
      if (lower.includes('show') && lower.includes('transaction')) {
        setView('transactions');
        response = `Switched to Transactions view. ${transactions.length} transactions loaded.`;
      } else if (lower.includes('show') && lower.includes('client')) {
        setView('clients');
        response = `Switched to Clients view. ${clients.length} clients found.`;
      } else if (lower.includes('show') && lower.includes('document')) {
        setView('documents');
        response = `Switched to Documents view. ${documents.length} documents uploaded.`;
      } else if (lower.includes('show') && lower.includes('reconcil')) {
        setView('reconciliations');
        response = `Switched to Reconciliations view. ${reconciliations.length} reconciliations.`;
      } else if (lower.includes('show') && lower.includes('insight')) {
        setView('insights');
        response = 'Switched to Smart Insights view.';
      } else if (lower.includes('show') && lower.includes('review')) {
        setView('reviews');
        response = 'Switched to Reviews view.';
      } else if (lower.includes('show') && lower.includes('plugin')) {
        setView('plugins');
        response = 'Switched to Plugins view.';
      } else if (lower.includes('create') && lower.includes('client')) {
        setShowClientModal(true);
        response = 'Opened the client creation form. Fill in the details and save.';
      } else if (lower.includes('upload') || lower.includes('document')) {
        setView('documents');
        response = 'Switched to Documents. Click "Upload" to add files.';
      } else if (lower.includes('reconcil') && lower.includes('run')) {
        setView('reconciliations');
        response = 'Switched to Reconciliations. Select a reconciliation and click Run.';
      } else if (lower.includes('export') && lower.includes('excel')) {
        response = 'Download your Excel export here: /api/export?format=excel';
      } else if (lower.includes('export') && lower.includes('tally')) {
        response = 'Download your Tally XML export here: /api/export?format=tally';
      } else if (lower.includes('help') || lower.includes('what can you do')) {
        response = `I can help you with:\n• "show transactions/clients/documents" — navigate views\n• "create client" — open client form\n• "upload documents" — go to upload\n• "run reconciliation" — go to reconciliations\n• "export excel/tally" — get export links\n• "show insights" — view Smart Insights\n• "show plugins" — view integrations\n• "stats" — show dashboard stats`;
      } else if (lower.includes('stat') || lower.includes('overview')) {
        setView('dashboard');
        response = `Dashboard overview:\n• ${clients.length} clients\n• ${documents.length} documents\n• ${transactions.length} transactions\n• ${reconciliations.length} reconciliations\n• ${stats?.totalExceptions || 0} exceptions`;
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        response = 'Hello! I\'m your CA-Flow assistant. Ask me to show views, create clients, upload documents, or export data.';
      } else {
        response = `I didn't understand "${msg}". Try:\n• "show transactions"\n• "create client"\n• "upload documents"\n• "export excel"\n• "help"`;
      }
    } catch (err) {
      response = 'Something went wrong. Please try again.';
    }

    setChatMessages((prev) => [...prev, { role: 'bot', text: response }]);
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatInput, transactions, clients, documents, reconciliations, stats]);

  return (
    <div className="min-h-screen text-slate-900 flex">
      {/* Signup Warning Banner — anonymous users */}
      {showSignupWarning && !isLoggedIn && !signupWarningDismissed && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Your progress is not saved</p>
                <p className="text-xs text-amber-700">Sign up to keep your data permanently. If you close this tab, everything will be lost.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href="/signup" className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors">
                  Sign up free
                </a>
                <button
                  onClick={() => {
                    setShowSignupWarning(false);
                    setSignupWarningDismissed(true);
                    localStorage.setItem('ca_signup_warning_dismissed', 'true');
                  }}
                  className="px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-100 text-xs font-medium text-amber-700 transition-colors"
                >
                  I don't need it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {/* visits live */}
              <div className="hidden md:flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">{visits?.total ?? 0} visits</span>
                <span className="text-slate-400">• {visits?.unique ?? 0} unique</span>
                <span className="text-slate-400">• today {visits?.today ?? 0}</span>
              </div>
              {/* Genuine micro-review: header stars — no pulse, honest */}
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
                    onClick={() => {
                      setHeaderRating(n);
                      openReviewModalWithDraft();
                      // pre-set rating in modal
                      setTimeout(() => setShowReviewModal((s) => ({ ...s, rating: n })), 50);
                    }}
                    className="leading-none"
                    aria-label={`Rate ${n} stars`}
                    title="Write genuine review — 20 chars required"
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
              <UserMenu />
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
              {view === 'reviews' && <ReviewsView reviews={reviews} visits={visits} onSubmit={submitReview} onRefresh={loadAll} />}
              {view === 'plugins' && <PluginsView />}
              {view === 'assistant' && <ChatbotView messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={handleChat} loading={chatLoading} chatEndRef={chatEndRef} />}
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
            <div className="bg-white p-6 border-b border-slate-100 relative">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-sm">✓</span>
                <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Genuine reviews only</p>
              </div>
              <h4 className="text-xl font-semibold mt-3 tracking-tight">Share your honest experience</h4>
              <p className="text-sm text-slate-500 mt-1">Verified usage only. We show both good and critical feedback — it helps everyone.</p>
              <button onClick={() => setShowReviewModal({ ...showReviewModal, open: false })} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={`${n}-${showReviewModal.rating >= n}`}
                    onClick={() => setShowReviewModal({ ...showReviewModal, rating: n })}
                    className="text-4xl transition-transform hover:scale-110 active:scale-95"
                  >
                    <span className={n <= showReviewModal.rating ? 'text-amber-400 inline-block' : 'text-slate-200 hover:text-amber-200 inline-block'}>★</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500">{showReviewModal.rating === 5 ? 'Excellent — thank you' : showReviewModal.rating >= 4 ? 'Great — thanks' : showReviewModal.rating >= 3 ? 'Appreciate your honesty' : 'Thanks for the honest feedback'}</p>
              <textarea
                value={showReviewModal.text}
                onChange={(e) => setShowReviewModal({ ...showReviewModal, text: e.target.value })}
                rows={4}
                placeholder="What did you actually use? e.g. Uploaded HDFC + Tally, matched 28 tx, Smart Insights flagged… (min 20 chars for genuine)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200"
              />
              <p className="text-[11px] text-slate-400">{showReviewModal.text.trim().length}/20 chars — genuine reviews require detail</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReviewModal({ ...showReviewModal, open: false })} className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (showReviewModal.text.trim().length < 20) {
                      alert('Genuine review needs at least 20 characters — tell us what you actually did.');
                      return;
                    }
                    const ok = await submitReview(showReviewModal.rating, showReviewModal.text, 'modal');
                    if (ok) setShowReviewModal({ ...showReviewModal, open: false });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md disabled:opacity-50"
                  disabled={showReviewModal.text.trim().length < 20}
                >
                  Post {showReviewModal.rating}★ — genuine
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-400">Verified • We publish 1-5★ as-is • No incentive for rating value</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating review FAB — genuine, subtle */}
      <button onClick={() => openReviewModalWithDraft()} className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-700 shadow-lg hover:shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
        <Sparkles size={18} className="text-indigo-600" />
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

function ConfettiBurst({ pieces = 36 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        delay: `${((i * 37) % 600) / 1000}s`,
        size: 6 + ((i * 13) % 8),
        color: ['#f59e0b', '#4f46e5', '#10b981', '#ef4444', '#7c3aed', '#fbbf24'][(i * 7) % 6],
        round: i % 3 === 0,
      })),
    [pieces]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {items.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.round ? '999px' : '2px',
          }}
        />
      ))}
    </div>
  );
}

function ReviewsView({ reviews, visits, onSubmit, onRefresh }: any) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('CA User');
  const [celebrate, setCelebrate] = useState(false);
  const count = reviews?.stats?.count || 0;
  const avg = reviews?.stats?.avg || 0;
  const dist = reviews?.stats?.dist || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxDist = Math.max(1, ...Object.values(dist).map(Number));
  const FOUNDING_CAP = 50;
  const foundingLeft = Math.max(0, FOUNDING_CAP - count);
  const foundingPct = Math.min(100, (count / FOUNDING_CAP) * 100);
  const tier = rating === 5 && text.trim().length >= 3 ? 'Gold Founder' : rating >= 4 ? 'Silver Founder' : 'Bronze Founder';

  async function handleSubmit() {
    if (text.trim().length < 20) {
      alert('Genuine review needs at least 20 characters — tell us what you actually did.');
      return;
    }
    const ok = await onSubmit(rating, text, 'reviews_tab');
    if (ok) {
      setText('');
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2000);
    }
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
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20 font-medium">✓ Genuine reviews — verified only</p>
            <h3 className="text-2xl font-semibold mt-3">Reviews — Wall of Trust</h3>
            <p className="text-indigo-100 text-sm mt-1 max-w-xl">Honest, verified feedback from CAs who actually used CA-Flow. We publish 1-5★ as-is — no incentive for rating value.</p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              {visits ? `${visits.total} visits • ${visits.unique} unique • ${visits.today} today` : 'loading visits…'} • <a href={typeof window !== 'undefined' ? window.location.href : '#'} target="_blank" className="underline">public link</a>
            </div>
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
                <p className="text-xs text-slate-500">{count} genuine reviews • avg {avg ? avg.toFixed(1) : '—'}★</p>
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

      {/* Genuine capture — verified, no desperate nudging */}
      <div className="relative bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-sm card-hover overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">✓</span>
          <h4 className="font-semibold">Share genuine experience</h4>
          {celebrate && <span className="ml-auto text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-white font-semibold badge-unlock">Thank you — genuine</span>}
        </div>
        <p className="text-xs text-slate-500 mt-1">Verified only — tell us what you actually did (min 20 chars). We publish all ratings honestly.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={`${n}-${rating >= n}`} onClick={() => setRating(n)} className="text-4xl hover:scale-110 active:scale-95 transition-transform">
              <span className={n <= rating ? 'text-amber-400 inline-block' : 'text-slate-200 hover:text-amber-200 inline-block'}>★</span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-2">{rating === 5 ? 'Excellent — share detail' : rating >= 4 ? 'Great — thanks' : rating >= 3 ? 'Appreciate honesty' : 'Thanks for feedback'}</p>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name (CA User)" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What did you actually use? Uploaded HDFC + Tally, matched… (min 20 chars for genuine)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        <p className="text-[11px] text-slate-400">{text.trim().length}/20 chars — genuine needs detail</p>
        <button
          onClick={handleSubmit}
          disabled={text.trim().length < 20}
          className="mt-3 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md disabled:opacity-50"
        >
          Post {rating}★ — genuine
        </button>
        <p className="text-[11px] text-center text-slate-400 mt-2">Verified • We publish 1-5★ as-is • No incentive for rating value</p>
      </div>

      {/* Live ticker — social proof craving */}
      {count > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold text-slate-600">LIVE — CAs are rating right now</p>
          </div>
          <div className="overflow-hidden py-2">
            <div className="ticker-track flex gap-3 whitespace-nowrap w-max px-2">
              {[...(reviews?.reviews || []).slice(0, 8), ...(reviews?.reviews || []).slice(0, 8)].map((r: any, i: number) => (
                <span key={`${r.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                  <span className="text-amber-500">★{r.rating}</span> {r.author_name} just reviewed
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wall */}
      <div>
        <h4 className="font-semibold flex items-center gap-2">Wall ({count})</h4>
        {count === 0 ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="inline-flex text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">✓ Genuine only</p>
            <p className="font-semibold mt-3">Be the first — share honest feedback</p>
            <p className="text-sm text-slate-500">Verified users only — helps other CAs decide</p>
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
