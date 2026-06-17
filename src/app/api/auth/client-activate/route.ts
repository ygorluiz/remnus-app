import { signIn } from '@/auth';
import { NextRequest } from 'next/server';

// Tauri WebView navigates here after receiving the deep-link callback.
// Signs in using the short-lived client-token and redirects to the app.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return Response.redirect(new URL('/login', request.url), 302);

  try {
    await signIn('client-token', { token, redirect: false });
  } catch {
    return Response.redirect(new URL('/login?error=token', request.url), 302);
  }

  return Response.redirect(new URL('/app', request.url), 302);
}
