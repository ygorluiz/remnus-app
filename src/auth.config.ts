import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Edge-compatible auth config (no DB imports — safe for middleware)
export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isAuthRoute = path.startsWith('/login') || path.startsWith('/register');
      const isApiAuth = path.startsWith('/api/auth');
      const isPublicAsset = /\.(png|ico|svg|jpg|jpeg|webp|woff2?)$/.test(path);

      if (isApiAuth || isPublicAsset) return true;

      if (isAuthRoute) {
        // Logged-in users visiting /login are sent to home
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) return false; // triggers redirect to /login
      return true;
    },
  },
};
