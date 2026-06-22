import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sessions } from '@/db/schema';

// Tauri WebView navigates here after receiving the deep-link callback.
// Verifies the short-lived client token, creates a Better Auth session, and
// redirects to the app.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return Response.redirect(new URL('/login', request.url), 302);

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret, { audience: 'client-auth' });
    const userId = payload.sub;
    if (!userId) throw new Error('Invalid token payload');

    // Create a Better Auth session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      sessionToken,
      userId,
      expires: expiresAt,
    });

    // Encode a JWT for the session cookie (matching Better Auth's jwt() plugin format)
    const jwt = await new SignJWT({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieStore = await cookies();
    cookieStore.set('better-auth.session_token', jwt, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return Response.redirect(new URL('/app', request.url), 302);
  } catch {
    return Response.redirect(new URL('/login?error=token', request.url), 302);
  }
}
