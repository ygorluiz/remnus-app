/**
 * Apply missing tables to Neon PostgreSQL.
 * Idempotent — uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 *
 * Usage:
 *   npx tsx scripts/apply-missing-tables.ts
 */
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function tableExists(name: string): Promise<boolean> {
  const rows = await sql`SELECT to_regclass(${name}) AS t`;
  return rows[0]?.t !== null;
}

async function main() {
  console.log('Applying missing tables to Neon PostgreSQL...\n');

  // ── page_links ──────────────────────────────────────────────────────────
  if (!(await tableExists('page_links'))) {
    await sql`
      CREATE TABLE page_links (
        id              text PRIMARY KEY NOT NULL,
        source_page_id  text NOT NULL,
        target_page_id  text NOT NULL,
        workspace_id    text NOT NULL,
        strength        integer NOT NULL,
        created_at      timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX page_links_source_idx ON page_links USING btree (source_page_id)`;
    await sql`CREATE INDEX page_links_target_idx ON page_links USING btree (target_page_id)`;
    console.log('✓ Created table: page_links');
  } else {
    console.log('· page_links already exists — skipping');
  }

  // ── account_deletion_tokens ─────────────────────────────────────────────
  if (!(await tableExists('account_deletion_tokens'))) {
    await sql`
      CREATE TABLE account_deletion_tokens (
        id          text PRIMARY KEY NOT NULL,
        user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        token       text NOT NULL,
        expires_at  timestamp NOT NULL,
        created_at  timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX account_deletion_tokens_user_id_idx ON account_deletion_tokens USING btree (user_id)`;
    console.log('✓ Created table: account_deletion_tokens');
  } else {
    console.log('· account_deletion_tokens already exists — skipping');
  }

  // ── deleted_items ───────────────────────────────────────────────────────
  if (!(await tableExists('deleted_items'))) {
    await sql`
      CREATE TABLE deleted_items (
        id            text PRIMARY KEY NOT NULL,
        workspace_id  text NOT NULL,
        item_type     text NOT NULL,
        item_id       text NOT NULL,
        deleted_at    timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX deleted_items_workspace_deleted_idx ON deleted_items USING btree (workspace_id, deleted_at)`;
    console.log('✓ Created table: deleted_items');
  } else {
    console.log('· deleted_items already exists — skipping');
  }

  // ── demo_feedback ───────────────────────────────────────────────────────
  if (!(await tableExists('demo_feedback'))) {
    await sql`
      CREATE TABLE demo_feedback (
        id          text PRIMARY KEY NOT NULL,
        user_id     text REFERENCES "user"(id) ON DELETE SET NULL,
        sentiment   text NOT NULL,
        comment     text,
        created_at  timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX demo_feedback_created_at_idx ON demo_feedback USING btree (created_at)`;
    console.log('✓ Created table: demo_feedback');
  } else {
    console.log('· demo_feedback already exists — skipping');
  }

  // ── email_campaigns ─────────────────────────────────────────────────────
  if (!(await tableExists('email_campaigns'))) {
    await sql`
      CREATE TABLE email_campaigns (
        id            text PRIMARY KEY NOT NULL,
        workspace_id  text,
        created_by    text REFERENCES "user"(id) ON DELETE SET NULL,
        subject       text NOT NULL,
        preheader     text,
        body          text NOT NULL,
        status        text DEFAULT 'draft' NOT NULL,
        sent_at       timestamp,
        created_at    timestamp NOT NULL
      )
    `;
    console.log('✓ Created table: email_campaigns');
  } else {
    console.log('· email_campaigns already exists — skipping');
  }

  // ── email_log ───────────────────────────────────────────────────────────
  if (!(await tableExists('email_log'))) {
    await sql`
      CREATE TABLE email_log (
        id            text PRIMARY KEY NOT NULL,
        campaign_id   text REFERENCES email_campaigns(id) ON DELETE SET NULL,
        user_id       text REFERENCES "user"(id) ON DELETE SET NULL,
        kind          text NOT NULL,
        subject       text,
        status        text NOT NULL,
        error         text,
        created_at    timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX email_log_user_kind_idx ON email_log USING btree (user_id, kind)`;
    await sql`CREATE INDEX email_log_created_at_idx ON email_log USING btree (created_at)`;
    await sql`CREATE INDEX email_log_campaign_id_idx ON email_log USING btree (campaign_id)`;
    console.log('✓ Created table: email_log');
  } else {
    console.log('· email_log already exists — skipping');
  }

  // ── ALTER columns on existing tables (idempotent) ───────────────────────
  async function columnExists(table: string, column: string): Promise<boolean> {
    const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}`;
    return rows.length > 0;
  }

  // agent_activity — new columns
  if (!(await columnExists('agent_activity', 'oauth_token_id'))) {
    await sql`ALTER TABLE agent_activity ALTER COLUMN token_id DROP NOT NULL`;
    await sql`ALTER TABLE agent_activity ADD COLUMN oauth_token_id text REFERENCES oauth_access_tokens(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE agent_activity ADD COLUMN owner_user_id text REFERENCES "user"(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE agent_activity ADD COLUMN response_bytes integer`;
    await sql`CREATE INDEX IF NOT EXISTS agent_activity_owner_created_idx ON agent_activity USING btree (owner_user_id, created_at)`;
    console.log('✓ Added columns to agent_activity: oauth_token_id, owner_user_id, response_bytes');
  } else {
    console.log('· agent_activity extra columns already exist — skipping');
  }

  // user — new columns
  if (!(await columnExists('user', 'email_unsubscribed_at'))) {
    await sql`ALTER TABLE "user" ADD COLUMN email_unsubscribed_at timestamp`;
    console.log('✓ Added user.email_unsubscribed_at');
  }
  if (!(await columnExists('user', 'email_suppressed'))) {
    await sql`ALTER TABLE "user" ADD COLUMN email_suppressed boolean DEFAULT false`;
    console.log('✓ Added user.email_suppressed');
  }

  // user_sessions — platform column
  if (!(await columnExists('user_sessions', 'platform'))) {
    await sql`ALTER TABLE user_sessions ADD COLUMN platform text`;
    console.log('✓ Added user_sessions.platform');
  }

  console.log('\n✓ All missing tables and columns applied successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
