// Manual DDL apply for migration 0019 (uploaded_assets).
// libsql's batch() — used by drizzle migrate() — silently skips DDL statements,
// so this table is applied directly via client.execute(). Idempotent; safe to
// re-run against local SQLite or Turso. Run: npx tsx src/db/apply-0019-uploaded-assets.ts
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log('Applying 0019_uploaded_assets...');
  await client.execute(`CREATE TABLE IF NOT EXISTS uploaded_assets (
    id text PRIMARY KEY NOT NULL,
    public_id text NOT NULL,
    resource_type text NOT NULL,
    kind text NOT NULL,
    bytes integer NOT NULL DEFAULT 0,
    url text NOT NULL,
    user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    workspace_id text REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at integer NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS uploaded_assets_public_id_unique ON uploaded_assets (public_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS uploaded_assets_user_id_idx ON uploaded_assets (user_id)');
  await client.execute('CREATE INDEX IF NOT EXISTS uploaded_assets_workspace_id_idx ON uploaded_assets (workspace_id)');

  const check = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_assets'");
  console.log('uploaded_assets present:', check.rows.length === 1);
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
