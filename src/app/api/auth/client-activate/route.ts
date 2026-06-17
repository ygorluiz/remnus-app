import { signIn } from '@/auth';
import { NextRequest } from 'next/server';

const IS_DEV = process.env.NODE_ENV !== 'production';

// Tauri WebView navigates here after receiving the deep-link callback.
// Signs in using the short-lived client-token and redirects to the app.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    if (IS_DEV) console.log('[client-activate] no token in query');
    return Response.redirect(new URL('/login', request.url), 302);
  }

  // Dev-only diagnostic: never log token length / secret length / any function
  // of the secret material (production log sinks may be archived/indexed).
  if (IS_DEV) {
    console.log('[client-activate] start', {
      hasToken: true,
      hasAuthSecret: !!process.env.AUTH_SECRET,
    });
  }

  try {
    await signIn('client-token', { token, redirect: false });
    if (IS_DEV) console.log('[client-activate] signIn ok');
  } catch (err) {
    // Dev-only: log just the error name so we can tell verify-failed from
    // user-not-found etc. The `cause` field can carry internal details
    // (DB / JWT internals) and is intentionally omitted.
    if (IS_DEV) {
      console.log('[client-activate] signIn FAILED', { name: (err as Error)?.name });
    }
    return Response.redirect(new URL('/login?error=token', request.url), 302);
  }

  return Response.redirect(new URL('/app', request.url), 302);
}
