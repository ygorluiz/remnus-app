/**
 * Migration 0029 — per-user analytics consent
 *
 * Adds nullable `analytics_consent` to `user` ('granted' | 'denied' | null).
 * The client ConsentProvider persists each logged-in user's effective capture
 * permission here so server-side funnel events with no cookie context (MCP
 * bearer-token agent calls, the OAuth token endpoint) can decide identified vs
 * anonymous capture.
 *
 * Idempotent (PRAGMA column check). Apply to BOTH local and Turso:
 *   npx tsx src/db/apply-0029-user-consent.ts                              (Turso)
 *   DATABASE_URL="file:local.db" npx tsx src/db/apply-0029-user-consent.ts (local)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith('file:') ? { url } : { url, authToken });

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => (r as Record<string, unknown>).name === column);
}

async function main() {
  if (await columnExists('user', 'analytics_consent')) {
    console.log('Migration 0029 already applied (analytics_consent exists).');
    return;
  }
  await client.execute(`ALTER TABLE user ADD COLUMN analytics_consent TEXT`);
  console.log('Migration 0029 applied successfully.');
}

main().catch(console.error);
