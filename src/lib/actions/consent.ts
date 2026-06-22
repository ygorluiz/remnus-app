'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { auth } from '@/auth';

/**
 * Persist the logged-in user's effective analytics-capture permission so
 * server-side funnel events with no cookie context (MCP agent calls, OAuth
 * token endpoint) can decide identified vs anonymous capture.
 *
 * Called fire-and-forget by the client ConsentProvider whenever the effective
 * permission changes. Best-effort: never throws, no-op when unauthenticated.
 */
export async function setAnalyticsConsent(granted: boolean): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return;
    await db
      .update(users)
      .set({ analyticsConsent: granted ? 'granted' : 'denied' })
      .where(eq(users.id, userId));
  } catch {
    // best-effort
  }
}
