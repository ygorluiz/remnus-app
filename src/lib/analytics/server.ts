/**
 * Server-side PostHog capture for the activation funnel.
 *
 * The funnel's middle steps (signup, MCP token creation, first agent call) all
 * happen on the server with no browser context, so `posthog-js` can't see them.
 * This module captures them via `posthog-node`.
 *
 * Consent model (mirrors the client `ConsentProvider`):
 *   - `allowed === true`  → identified capture keyed on `userId` (+ person props).
 *   - `allowed === false` → anonymous capture (random distinctId, no PII, no
 *     person profile via `$process_person_profile: false`). Aggregate funnel
 *     counts still work; nothing personal is stored. Used for EU/EEA/UK visitors
 *     who haven't accepted.
 *
 * Admins and demo users are never captured (mirrors `PostHogIdentify`).
 */
import 'server-only';
import { PostHog } from 'posthog-node';
import { randomUUID } from 'crypto';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CONSENT_COOKIE, isConsentRequired, parseConsent } from '@/lib/consent';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// posthog-node is a long-lived client; reuse one instance across hot-reloads and
// serverless warm invocations. `flushAt: 1` + `flushInterval: 0` => each event is
// sent on the next `flush()`, which we always await — serverless functions freeze
// between invocations, so we can't rely on a background flush timer.
declare global {
  var __remnusPosthog: PostHog | null | undefined;
}

function client(): PostHog | null {
  if (!KEY) return null;
  if (globalThis.__remnusPosthog === undefined) {
    globalThis.__remnusPosthog = new PostHog(KEY, {
      host: HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return globalThis.__remnusPosthog ?? null;
}

export type FunnelEvent = 'signup' | 'mcp_token_created' | 'agent_call';

const PII_KEYS = new Set(['email', 'name', 'image']);

function stripPii(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!PII_KEYS.has(k)) out[k] = v;
  }
  return out;
}

/**
 * Capture a funnel event server-side. Best-effort — never throws, always flushes.
 *
 * @param allowed  Whether this user may be tracked with identity. Callers resolve
 *                 this from request consent (`isCaptureAllowedFromRequest`) or from
 *                 the user's stored decision (`isCaptureAllowedForUser`).
 */
export async function captureServer(opts: {
  event: FunnelEvent;
  userId: string;
  allowed: boolean;
  /** Role for admin/demo skip. Omit only if already known to be a normal user. */
  role?: string | null;
  properties?: Record<string, unknown>;
  /** First-touch person properties (set once, identified path only). */
  setOnce?: Record<string, unknown>;
}): Promise<void> {
  const ph = client();
  if (!ph) return;
  if (opts.role === 'admin' || opts.role === 'super_admin' || opts.role === 'demo') return;

  try {
    if (opts.allowed) {
      ph.capture({
        distinctId: opts.userId,
        event: opts.event,
        properties: {
          ...(opts.properties ?? {}),
          ...(opts.setOnce ? { $set_once: opts.setOnce } : {}),
        },
      });
    } else {
      // Anonymous: random distinctId not linked to the user, no person profile.
      ph.capture({
        distinctId: randomUUID(),
        event: opts.event,
        properties: {
          ...stripPii(opts.properties),
          $process_person_profile: false,
        },
      });
    }
    await ph.flush();
  } catch {
    // best-effort: analytics must never break a product action
  }
}

/**
 * Resolve capture permission from the current request (consent cookie + geo).
 * Use inside server actions / route handlers that run in a request scope
 * (signup event, token mint) where `next/headers` is available.
 */
export async function isCaptureAllowedFromRequest(): Promise<boolean> {
  try {
    const [h, c] = await Promise.all([headers(), cookies()]);
    const required = isConsentRequired(h.get('x-vercel-ip-country'));
    if (!required) return true;
    return parseConsent(c.get(CONSENT_COOKIE)?.value) === 'accepted';
  } catch {
    return false;
  }
}

/**
 * Resolve capture permission + role from a user's persisted decision. Use in
 * request scopes with no consent cookie (MCP bearer-token calls, OAuth token
 * endpoint). Falls back to anonymous (`allowed: false`) when unknown.
 *
 * `analytics_consent` is persisted by the client `ConsentProvider` as the user's
 * effective capture permission ('granted' for non-EU or EU-accepted, 'denied'
 * otherwise).
 */
export async function isCaptureAllowedForUser(
  userId: string,
): Promise<{ allowed: boolean; role: string | null }> {
  try {
    const [u] = await db
      .select({ role: users.role, consent: users.analyticsConsent })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return { allowed: false, role: null };
    return { allowed: u.consent === 'granted', role: u.role };
  } catch {
    return { allowed: false, role: null };
  }
}

/**
 * Fire-and-forget `agent_call` capture for the MCP hot path. Resolves the
 * owner's consent + role, then captures. Never awaited by callers.
 */
export async function captureAgentCall(
  ownerUserId: string,
  tool: string,
  workspaceId: string,
): Promise<void> {
  const { allowed, role } = await isCaptureAllowedForUser(ownerUserId);
  await captureServer({
    event: 'agent_call',
    userId: ownerUserId,
    allowed,
    role,
    properties: { tool, workspaceId },
  });
}
