'use server';
import { db } from '@/db';
import { users, workspaces, workspaceMembers, sessions } from '@/db/schema';
import { eq, ne, and, lt } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createDemoSeedData } from '@/lib/seed';

// Each "Try the demo" click provisions its OWN throwaway demo account
// (`demo+<uuid>@remnus.com`, role 'demo') with a freshly seeded workspace.
// Visitors never share data, so concurrent demos can't reset or overwrite each
// other. Stale demo accounts are reaped opportunistically on later logins.
const DEMO_EMAIL_DOMAIN = 'remnus.com';

// How long a demo account lives before it's eligible for cleanup.
const DEMO_USER_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
// Cap the work done per login so a flood of demos can't make one request slow.
const DEMO_CLEANUP_LIMIT = 25;

// Delete a demo user and everything they own. Workspaces have no FK to the user
// (ownership lives in workspace_members), so they must be removed explicitly via
// the membership rows; the user delete then cascades sessions/accounts/members.
async function purgeDemoUser(userId: string) {
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));

  for (const { workspaceId } of memberships) {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }
  await db.delete(users).where(eq(users.id, userId));
}

// Best-effort reaper for expired demo accounts. Runs inline on demo login so we
// don't need any cron/background infra. Bounded + per-user guarded so one bad
// row never blocks a new visitor from starting their demo.
async function cleanupStaleDemoUsers(exceptUserId?: string) {
  const cutoff = new Date(Date.now() - DEMO_USER_TTL_MS);
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'demo'), lt(users.createdAt, cutoff)))
    .limit(DEMO_CLEANUP_LIMIT);

  for (const { id } of stale) {
    if (id === exceptUserId) continue;
    try {
      await purgeDemoUser(id);
    } catch {
      // ignore — a single failed cleanup must not block the demo login
    }
  }
}

export async function loginAsDemo(_prevState: unknown, _formData: FormData): Promise<{ error: string } | null> {
  // If the visitor already holds a live demo session with a workspace, just send
  // them back into it — don't mint a new account or reseed on every click/refresh.
  // (Raw auth() instead of getCurrentUser() so an absent session doesn't redirect.)
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id && session.user.role === 'demo') {
    const existing = await db
      .select({ id: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, session.user.id))
      .limit(1);
    if (existing.length > 0) redirect('/app');
  }

  // Require at least one real (non-demo) user to exist before enabling demo mode
  const realUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(ne(users.role, 'demo'))
    .limit(1);

  if (realUsers.length === 0) {
    return { error: 'Demo mode is not available yet. Please create an account first.' };
  }

  // Reap expired demo accounts so the table doesn't grow unbounded.
  await cleanupStaleDemoUsers(session?.user?.id);

  // Provision a fresh, isolated demo account for this visitor.
  const demoUserId = crypto.randomUUID();
  const demoName = 'Demo User';
  await db.insert(users).values({
    id: demoUserId,
    name: demoName,
    email: `demo+${demoUserId}@${DEMO_EMAIL_DOMAIN}`,
    role: 'demo',
    createdAt: new Date(),
  });

  // Seed this visitor's own workspace (pages + databases).
  await createDemoSeedData(demoUserId, demoName);

  // Create a Better Auth session — encode a JWT and store the session in the DB.
  const isProd = process.env.NODE_ENV === 'production';
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Store session record in DB (matching the existing Auth.js-compatible schema)
  await db.insert(sessions).values({
    sessionToken,
    userId: demoUserId,
    expires: expiresAt,
  });

  // Encode a JWT for the session cookie (matching Better Auth's jwt() plugin format)
  const jwt = await new SignJWT({
    sub: demoUserId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set('better-auth.session_token', jwt, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect('/app');
}
