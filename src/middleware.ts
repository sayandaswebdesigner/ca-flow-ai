import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ca_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    // Logged-in user visiting login/signup → send to dashboard
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
      // Can't verify session in edge without DB — let page decide; allow through
    }
    return NextResponse.next();
  }

  // Protect app + data APIs
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/api/:path*'],
};
