import { auth } from '@/auth';
import { SignJWT } from 'jose';
import { redirect } from 'next/navigation';
import { setPendingClientToken } from '@/lib/client-auth-store';

// Called after browser-side login (via callbackUrl).
// Creates a short-lived JWT keyed by device_id so the desktop client can poll for it.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');
  if (!deviceId) redirect('/login');

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ sub: session.user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('client-auth')
    .setExpirationTime('5m')
    .sign(secret);

  setPendingClientToken(deviceId, token);

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remnus – Signed in</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1d1f23; color: #cccccc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { text-align: center; padding: 2rem; max-width: 320px; }
    .check { width: 56px; height: 56px; background: rgba(127,195,109,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
    .check svg { width: 28px; height: 28px; color: #7fc36d; }
    h1 { font-size: 1.125rem; font-weight: 600; color: #ffffff; margin: 0 0 0.5rem; }
    p { color: #888; font-size: 0.875rem; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h1>Signed in successfully</h1>
    <p>You can close this tab and return to Remnus.</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
