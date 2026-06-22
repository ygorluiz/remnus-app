import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const intlMiddleware = createMiddleware(routing);

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = [
  '/login',
  '/client-login',
  '/tauri-app',
  '/api/auth',
  '/api/mcp',
  '/.well-known',
  '/api/webhooks',
  '/invite',
  '/share',
  '/',
  '/pricing',
  '/contact',
  '/download',
  '/privacy',
  '/security',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes and well-known routes bypass intl middleware
  if (pathname.startsWith('/api/') || pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = getSessionCookie(req);
  const isLoggedIn = !!sessionCookie;

  // Redirect logged-in users away from login pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/client-login')) {
    const deviceParam = req.nextUrl.searchParams.get('device_id');
    if (pathname === '/client-login' && deviceParam) {
      // Desktop flow: redirect to bridge with device_id
      return NextResponse.redirect(new URL(`/api/auth/client-bridge?device_id=${deviceParam}`, req.url));
    }
    return NextResponse.redirect(new URL('/app', req.url));
  }

  // Allow public routes without auth
  if (isPublicRoute(pathname)) {
    const response = intlMiddleware(req);
    if (response instanceof NextResponse) {
      response.headers.set('x-pathname', pathname);
    }
    return response;
  }

  // Protected routes: require auth
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated: run intl middleware
  const response = intlMiddleware(req);
  if (response instanceof NextResponse) {
    response.headers.set('x-pathname', pathname);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|logo.*|.*\\.(?:png|ico|svg|jpg|jpeg|webp|woff2?)).*)',
  ],
};
