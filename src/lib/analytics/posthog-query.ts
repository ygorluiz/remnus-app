/**
 * Server-side PostHog Query API (HogQL) reader.
 *
 * The activation funnel captures events INTO PostHog (see ./server.ts). This
 * module reads aggregate data BACK OUT for the admin dashboard — e.g. "where did
 * landing visitors come from", which lives only in PostHog (`$pageview` +
 * `$referring_domain`), not in our DB.
 *
 * Auth reuses the source-map upload creds (see next.config.ts): a PostHog
 * Personal API key (`POSTHOG_API_KEY`) + numeric `POSTHOG_PROJECT_ID`. Missing
 * either => `runHogQL` returns null and callers degrade gracefully (the card
 * shows an "unavailable" state), so local dev / forks work untouched.
 *
 * Host gotcha: the Query API lives on the APP host (eu.posthog.com /
 * us.posthog.com), NOT the INGEST host in NEXT_PUBLIC_POSTHOG_HOST
 * (eu.i.posthog.com). We derive the region from that ingest host.
 */
import 'server-only';

const API_KEY = process.env.POSTHOG_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

const INGEST_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
// eu.i.posthog.com -> eu.posthog.com ; anything else -> us.posthog.com
const API_HOST = INGEST_HOST.includes('eu.') ? 'https://eu.posthog.com' : 'https://us.posthog.com';

/** True when the PostHog read creds are configured (Personal API key + project id). */
export function hasPosthogQueryCreds(): boolean {
  return !!API_KEY && !!PROJECT_ID;
}

/**
 * Run a HogQL query and return its `results` rows (each row is a tuple matching
 * the SELECT order). Returns null on missing creds or any failure — best-effort,
 * never throws.
 */
export async function runHogQL<Row = unknown[]>(query: string): Promise<Row[] | null> {
  if (!API_KEY || !PROJECT_ID) return null;
  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Row[] };
    return json.results ?? null;
  } catch {
    return null;
  }
}
