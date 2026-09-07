export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <p>Redirecting to dashboard…</p>
      <a href="/dashboard" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Click here if not redirected</a>
      <meta httpEquiv="refresh" content="0;url=/dashboard" />
      <script dangerouslySetInnerHTML={{ __html: "window.location.replace('/dashboard')" }} />
    </div>
  );
}
