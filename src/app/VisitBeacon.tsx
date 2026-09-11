'use client';
import { useEffect } from 'react';

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

export default function VisitBeacon() {
  useEffect(() => {
    const h = getAnonHeaders() as Record<string, string>;
    // Log visit once per page load — covers landing, login, dashboard, etc.
    // 5-min dedup on server (ip+path) prevents double-count on reloads.
    const path = window.location.pathname + window.location.search;
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {});
  }, []);
  return null;
}
