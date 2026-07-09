/**
 * Cleanup — remove planted seed agent records from REAL (non-demo) users.
 *
 * Historically `createSeedWorkspace` (real signups) and `createDemoSeedData`
 * shared the same rich-workspace builder, so every new user got a planted
 * "Claude AI Agent" token (token_prefix = 'rmns-demo'), a fake audit-log
 * history, and per-row "agent edited" badges. New signups no longer get these
 * (see src/lib/seed.ts), but already-seeded accounts still carry them.
 *
 * This script deletes those seed records from non-demo users only:
 *   1. Clears the per-row agent stamps (pages.agent_token_id / agent_edited_at).
 *   2. Deletes the seed tokens (which CASCADE-deletes their agent_activity rows).
 *
 * Demo accounts (user.role = 'demo') keep their seed records untouched — the
 * demo is meant to tell the full AI-agent story out of the box.
 *
 * Idempotent (a second run finds nothing to delete). Apply to BOTH databases:
 *   npx tsx src/db/cleanup-seed-agent-records.ts                              (Turso)
 *   DATABASE_URL="file:local.db" npx tsx src/db/cleanup-seed-agent-records.ts (local)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith('file:') ? { url } : { url, authToken });

// Seed tokens owned by a real (non-demo) user, or orphaned (owner deleted).
// Demo users (role = 'demo') are explicitly preserved.
const SEED_TOKENS_TO_REMOVE = `
  SELECT t.id FROM agent_tokens t
  LEFT JOIN user u ON t.created_by = u.id
  WHERE t.token_prefix = 'rmns-demo'
    AND (u.role IS NULL OR u.role != 'demo')
`;

async function main() {
  const targets = await client.execute(SEED_TOKENS_TO_REMOVE);
  const tokenIds = targets.rows.map((r) => (r as Record<string, unknown>).id as string);

  if (tokenIds.length === 0) {
    console.log('Nothing to clean — no seed agent tokens on non-demo users.');
    return;
  }

  console.log(`Found ${tokenIds.length} seed token(s) on non-demo users. Cleaning…`);

  // 1. Clear per-row agent badges that point at these tokens (pages.agent_token_id
  //    has no FK, so deleting the token would otherwise leave a dangling stamp).
  const clearStamps = await client.execute({
    sql: `UPDATE pages SET agent_token_id = NULL, agent_edited_at = NULL
          WHERE agent_token_id IN (${SEED_TOKENS_TO_REMOVE})`,
  });
  console.log(`  Cleared ${clearStamps.rowsAffected} row badge(s).`);

  // 2. Delete the tokens — agent_activity cascades via FK (onDelete: 'cascade').
  const delTokens = await client.execute({
    sql: `DELETE FROM agent_tokens WHERE id IN (${SEED_TOKENS_TO_REMOVE})`,
  });
  console.log(`  Deleted ${delTokens.rowsAffected} seed token(s) (+ their activity).`);

  console.log('Cleanup complete.');
}

main().catch(console.error);
