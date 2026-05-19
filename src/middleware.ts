import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Use only the edge-compatible config (no DB adapter) in middleware
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Match all paths except Next.js internals, static assets, and image files
    '/((?!_next/static|_next/image|favicon.ico|logo.*|.*\\.(?:png|ico|svg|jpg|jpeg|webp|woff2?)).*)',
  ],
};
