'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Activity, Wallet, Zap, Building2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'activities' | 'tenants'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      const d = await res.json();
      if (d.error) {
        if (res.status === 403) window.location.href = '/dashboard';
        return;
      }
      if (!d.error) setData(d);
    } catch {}
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /><p className="text-sm text-slate-500 mt-3">Loading analytics…</p></div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">No analytics yet.</div>;

  const v = data.visits || {};
  const e = data.events || {};
  const u = data.usage || {};
  const lastDays = (v.lastDays || []).map((r: any) => ({ date: String(r.d).slice(5), visits: r.c, unique: r.unique_c }));
  const hourly = (v.hourly || []).map((r: any) => ({ hour: `${r.h}:00`, visits: r.c }));
  const topViews = e.topViews || [];
  const topPlugins = e.topPlugins || [];
  const topTools = e.topTools || [];
  const COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xs">LF</div>
          <div>
            <h1 className="font-semibold text-[15px] tracking-tight leading-none">LedgerFlow • Owner Analytics</h1>
            <p className="text-[11px] text-slate-500">Private • Admin only • Separate website</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">🔒 Owner only</span>
          <a href="/dashboard" className="ml-auto px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">← Back to Dashboard</a>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-1.5">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activities', label: 'All Activities' },
            { id: 'tenants', label: 'Tenants' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={cls('px-3 py-1.5 rounded-full text-xs font-medium border', tab === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {tab === 'overview' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" /> Analytics — Who’s using LedgerFlow?</h2>
                <p className="text-sm text-slate-500">Live visits, tab popularity, plugin usage — private owner view, refreshed every 30s. Separate from the dashboard.</p>
              </div>
              <div className="ml-auto flex gap-1.5 bg-slate-100 rounded-xl p-1">
                {(['7d', '30d'] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)} className={cls('px-3 py-1.5 rounded-lg text-xs font-medium', range === r ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>{r === '7d' ? 'Last 7 days' : 'Last 30 days'}</button>
                ))}
                <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200">↻</button>
              </div>
            </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Visits', value: v.total ?? 0, sub: `${v.unique ?? 0} unique • all tenants`, icon: Activity },
            { label: 'Today', value: v.today ?? 0, sub: `${v.todayUnique ?? 0} unique today`, icon: Wallet },
            { label: 'Active Now', value: v.activeNow ?? 0, sub: `${v.activeToday ?? 0} last 24h • 15m window`, icon: Zap },
            { label: 'Your Firm', value: v.tenantVisits ?? 0, sub: `${u.tenantClients ?? 0} clients • ${u.tenantDocs ?? 0} docs`, icon: Building2 },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs"><k.icon size={14} /> {k.label}</div>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
              <p className="text-xs text-slate-500">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* WORK vs VISIT — are people actually working or just browsing? */}
        {(() => {
          const ws = data.owner?.workStats || {};
          const working = ws.workingTenants ?? 0;
          const visitor = ws.visitorOnly ?? 0;
          const totalT = ws.totalTenants ?? 0;
          const rate = ws.workRate ?? 0;
          const engagement = ws.engagementRatio ?? '0';
          const totalActs = ws.totalActivitiesAll ?? 0;
          return (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20 font-medium"><Zap size={14} className="text-yellow-300" /> Work vs Visit</p>
                    <h3 className="text-xl font-semibold mt-3">Are people actually working or just visiting?</h3>
                    <p className="text-indigo-200 text-sm mt-1 max-w-2xl">Working = created a client, uploaded a document, ran a reconciliation, or any tracked activity. Visitor = only opened the site.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{rate}%</p>
                    <p className="text-xs text-indigo-200">working firms</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4">
                    <p className="text-xs text-indigo-200">Total firms</p>
                    <p className="text-2xl font-bold mt-1">{totalT}</p>
                    <p className="text-xs text-indigo-300 mt-1">tenants seen</p>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-4">
                    <p className="text-xs text-emerald-200">Actually working</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-300">{working}</p>
                    <p className="text-xs text-emerald-200/80 mt-1">{totalActs} total activities</p>
                  </div>
                  <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4">
                    <p className="text-xs text-amber-200">Just visiting</p>
                    <p className="text-2xl font-bold mt-1 text-amber-300">{visitor}</p>
                    <p className="text-xs text-amber-200/80 mt-1">bounced without work</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4">
                    <p className="text-xs text-indigo-200">Engagement</p>
                    <p className="text-2xl font-bold mt-1">{engagement}</p>
                    <p className="text-xs text-indigo-300 mt-1">activities per visit</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-400 h-2" style={{ width: `${rate}%` }} />
                  <div className="bg-amber-400/60 h-2" style={{ width: `${100 - rate}%` }} />
                </div>
                <p className="text-[11px] text-indigo-300 mt-2">{working} working • {visitor} visitor-only • {totalActs} activities across {ws.totalVisitsAll ?? v.total ?? 0} visits</p>
              </div>
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-semibold text-sm">Visits — {range === '7d' ? 'Last 7 days' : 'Last 30 days'}</h4>
            <p className="text-xs text-slate-500">Visits vs unique visitors</p>
            <div className="h-[180px] mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lastDays}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                  <Area type="monotone" dataKey="visits" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                  <Area type="monotone" dataKey="unique" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-semibold text-sm">Today — Hourly</h4>
            <p className="text-xs text-slate-500">When are people most active?</p>
            <div className="h-[180px] mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly.length ? hourly : [{ hour: '—', visits: 0 }]}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                  <Bar dataKey="visits" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-semibold text-sm">Most Used Tabs</h4>
            <p className="text-xs text-slate-500">Which views do people open?</p>
            {topViews.length === 0 ? <p className="text-xs text-slate-400 mt-3">No tab events yet — navigate the dashboard.</p> : (
              <div className="mt-3 space-y-2">
                {topViews.slice(0, 6).map((r: any) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-28 truncate">{r.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-2 bg-indigo-600" style={{ width: `${(r.count / (topViews[0]?.count || 1)) * 100}%` }} /></div>
                    <span className="text-xs text-slate-600">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-semibold text-sm">Most Used Plugins</h4>
            <p className="text-xs text-slate-500">Which plugins are called in chat?</p>
            {topPlugins.length === 0 ? <p className="text-xs text-slate-400 mt-3">No plugin calls yet — try “verify gst …” in chat.</p> : (
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topPlugins} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }: any) => `${name} ${value}`}>
                      {topPlugins.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-semibold text-sm">Top Tools / Actions</h4>
            <p className="text-xs text-slate-500">Exports, verifications, sends</p>
            {topTools.length === 0 ? <p className="text-xs text-slate-400 mt-3">No tool usage yet.</p> : (
              <div className="mt-3 space-y-2">
                {topTools.slice(0, 6).map((r: any) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-32 truncate">{r.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-2 bg-emerald-500" style={{ width: `${(r.count / (topTools[0]?.count || 1)) * 100}%` }} /></div>
                    <span className="text-xs text-slate-600">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">Recent Visits (global)</div>
            <div className="divide-y divide-slate-100 max-h-[260px] overflow-auto">
              {(v.recentVisits || []).slice(0, 10).map((r: any) => (
                <div key={r.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono truncate">{r.ip}</span>
                  <span className="truncate flex-1">{r.path}</span>
                  <span className="text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {(v.recentVisits || []).length === 0 && <p className="px-4 py-6 text-xs text-slate-400 text-center">No visits yet.</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">Recent Plugin / Tab Events (your firm)</div>
            <div className="divide-y divide-slate-100 max-h-[260px] overflow-auto">
              {(e.recentEvents || []).slice(0, 10).map((r: any) => (
                <div key={r.id} className="px-4 py-2 flex items-center gap-2 text-xs">
                  <span className={cls('px-1.5 py-0.5 rounded-full border text-[10px] font-medium', r.event_type === 'view' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-violet-50 border-violet-200 text-violet-700')}>{r.event_type}</span>
                  <span className="font-medium truncate">{r.event_name}</span>
                  <span className="text-slate-400 truncate flex-1">{r.path}</span>
                  <span className="text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              {(e.recentEvents || []).length === 0 && <p className="px-4 py-6 text-xs text-slate-400 text-center">No events yet — switch tabs or call a plugin in chat.</p>}
            </div>
          </div>
        </div>
          </>
        )}

        {tab === 'activities' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-sm">Activity breakdown (all tenants)</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.owner?.globalActivityStats || []).map((r: any) => (
                  <span key={r.name} className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium">
                    {r.name} <span className="opacity-70">{r.count}</span>
                  </span>
                ))}
                {(!data.owner?.globalActivityStats || data.owner.globalActivityStats.length === 0) && <p className="text-xs text-slate-500">No activities yet.</p>}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm">All Activities — live feed (owner)</h3>
                <button onClick={load} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs">↻ Refresh</button>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-auto">
                {(data.owner?.globalActivities || []).slice(0, 100).map((a: any) => (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-xs hover:bg-slate-50">
                    <span className="px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-medium">{a.action}</span>
                    <span className="font-mono text-slate-500 truncate">{a.tenant_id.slice(0, 8)}…</span>
                    <span className="flex-1 truncate">{a.entity_name || a.entity_id || '—'} <span className="text-slate-400">{a.details ? String(a.details).slice(0, 60) : ''}</span></span>
                    <span className="text-slate-400 whitespace-nowrap">{new Date(a.created_at).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {(!data.owner?.globalActivities || data.owner.globalActivities.length === 0) && <p className="px-4 py-10 text-center text-xs text-slate-500">No activities yet — users’ uploads, reconciliations and verifications will appear here.</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'tenants' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500">Working firms</p>
                <p className="text-xl font-bold text-emerald-600">{data.owner?.workStats?.workingTenants ?? 0}</p>
                <p className="text-[11px] text-slate-400">have real work</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500">Just visiting</p>
                <p className="text-xl font-bold text-amber-600">{data.owner?.workStats?.visitorOnly ?? 0}</p>
                <p className="text-[11px] text-slate-400">no activity yet</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500">Total activities</p>
                <p className="text-xl font-bold">{data.owner?.workStats?.totalActivitiesAll ?? 0}</p>
                <p className="text-[11px] text-slate-400">{data.owner?.workStats?.engagementRatio ?? 0} per visit</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Tenants — firms on LedgerFlow <span className="font-normal text-slate-500">• working vs visitor</span></h3>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white">{(data.owner?.tenants || []).length} firms</span>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Firm</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Clients</th>
                      <th className="px-3 py-2 text-center">Docs</th>
                      <th className="px-3 py-2 text-center">Tx</th>
                      <th className="px-3 py-2 text-center">Recons</th>
                      <th className="px-3 py-2 text-center">Activities</th>
                      <th className="px-3 py-2 text-center">Visits</th>
                      <th className="px-3 py-2 text-left">Last work</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.owner?.tenants || []).map((t: any) => {
                      const isWorking = Number(t.clients) > 0 || Number(t.docs) > 0 || Number(t.tx) > 0 || Number(t.recons) > 0 || Number(t.activities) > 0;
                      return (
                        <tr key={t.id} className={cls('hover:bg-slate-50', !isWorking && 'bg-amber-50/40')}>
                          <td className="px-3 py-2 font-medium truncate max-w-[140px]" title={t.name}>{t.name}<span className="block font-mono text-[11px] text-slate-400">{t.id.slice(0, 8)}…</span></td>
                          <td className="px-3 py-2 text-center">
                            <span className={cls('px-2 py-1 rounded-full text-[11px] font-semibold border', isWorking ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700')}>
                              {isWorking ? 'Working' : 'Visitor'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">{t.clients}</td>
                          <td className="px-3 py-2 text-center">{t.docs}</td>
                          <td className="px-3 py-2 text-center">{t.tx ?? 0}</td>
                          <td className="px-3 py-2 text-center">{t.recons ?? 0}</td>
                          <td className="px-3 py-2 text-center font-medium">{t.activities ?? 0}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{t.visits ?? 0}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{t.last_work_at ? new Date(t.last_work_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(!data.owner?.tenants || data.owner.tenants.length === 0) && <p className="px-4 py-6 text-center text-xs text-slate-500">No tenants yet.</p>}
              </div>
              <p className="px-5 py-3 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">Working = any client / document / transaction / reconciliation / activity. Visitor = only visits, no real work yet.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
