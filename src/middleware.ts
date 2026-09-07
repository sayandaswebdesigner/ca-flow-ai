import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ca_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root -> dashboard redirect (fix RSC blank)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url), 307);
  }

  // Public routes — always accessible
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Dashboard — private if ADMIN_PASSWORD set (only you)
  if (pathname.startsWith('/dashboard')) {
    if (process.env.ADMIN_PASSWORD) {
      const ok = request.cookies.get('admin_auth')?.value === '1';
      if (!ok) return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // Data APIs — allow anonymous with x-anonymous-tenant header (visits is global public)
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/visits')) return NextResponse.next();
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const anonTenant = request.headers.get('x-anonymous-tenant');
    if (!token && !anonTenant) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/signup', '/admin/:path*', '/api/:path*'],
};
