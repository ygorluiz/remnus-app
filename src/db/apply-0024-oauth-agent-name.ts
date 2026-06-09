/**
 * Migration 0024 — add `agent_name` to oauth_access_tokens
 *
 * User-set canonical agent id (AGENT_MARKS id) so OAuth-connected agents can show the
 * right brand icon (otherwise inferred best-effort from the client_name).
 *
 * Idempotent (skips if the column already exists). Apply to both local and Turso:
 *   npx tsx src/db/apply-0024-oauth-agent-name.ts                              (Turso)
 *   DATABASE_URL="file:local.db" npx tsx src/db/apply-0024-oauth-agent-name.ts (local)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith('file:') ? { url } : { url, authToken });

async function main() {
  const info = await client.execute(`PRAGMA table_info(oauth_access_tokens)`);
  const hasColumn = info.rows.some(r => (r as Record<string, unknown>).name === 'agent_name');

  if (hasColumn) {
    console.log('Column oauth_access_tokens.agent_name already exists — nothing to do.');
    return;
  }

  await client.execute(`ALTER TABLE oauth_access_tokens ADD COLUMN agent_name TEXT`);
  console.log('Added column oauth_access_tokens.agent_name.');
  console.log('\nMigration 0024 applied successfully.');
}

main().catch(console.error);
