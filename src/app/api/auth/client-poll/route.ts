import { consumeClientToken } from '@/lib/client-auth-store';

// Polled by the desktop client every 2 s after opening the browser login page.
// Returns { ready: true, token } once the user completes login, then clears the entry.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');
  if (!deviceId) return Response.json({ ready: false });

  const token = consumeClientToken(deviceId);
  if (!token) return Response.json({ ready: false });

  return Response.json({ ready: true, token });
}
