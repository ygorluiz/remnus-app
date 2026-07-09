/**
 * Migration 0038 — account_deletion_tokens
 *
 * Short-lived, single-use, DB-backed confirmation token for GDPR self-service
 * account deletion (src/lib/actions/account.ts). Unlike the stateless-HMAC
 * unsubscribe token, this needs a real expiry + a way to mark it consumed
 * since it gates an irreversible action: requestAccountDeletion() mints one
 * (30 min TTL) and emails a confirm link; confirmAccountDeletion() re-checks
 * unused + unexpired + the live session matches user_id before deleting.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS). Apply to BOTH local and Turso:
 *   npx tsx src/db/apply-0038-account-deletion-tokens.ts                              (Turso)
 *   DATABASE_URL="file:local.db" npx tsx src/db/apply-0038-account-deletion-tokens.ts (local)
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient(url.startsWith('file:') ? { url } : { url, authToken });

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS account_deletion_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used_at    INTEGER,
      created_at INTEGER NOT NULL
    )
  `);
  await client.execute(
    `CREATE INDEX IF NOT EXISTS account_deletion_tokens_user_id_idx ON account_deletion_tokens (user_id)`,
  );
  console.log('Migration 0038 applied successfully.');
}

main().catch(console.error);
