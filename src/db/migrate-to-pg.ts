/**
 * One-shot data migration: SQLite (local.db) → Neon PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx src/db/migrate-to-pg.ts
 *
 * Reads all rows from the local SQLite database, converts types, and
 * batch-inserts into the Neon PostgreSQL database.
 */

import { createClient } from '@libsql/client';
import { Pool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as pgSchema from './pg-schema';

const SQLITE_URL = process.env.SQLITE_URL || 'file:local.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

// SQLite client (read source)
const sqliteClient = createClient({ url: SQLITE_URL });

// PostgreSQL client (write target)
const pgPool = new Pool({ connectionString: PG_URL });
const db = drizzlePg(pgPool, { schema: pgSchema });

// Table definitions for migration order (respecting FK dependencies)
const TABLES = [
  { name: 'workspaces',               pgTable: pgSchema.workspaces },
  { name: 'workspace_items',           pgTable: pgSchema.workspaceItems },
  { name: 'standalone_pages',          pgTable: pgSchema.standalonePages },
  { name: 'databases',                 pgTable: pgSchema.databases },
  { name: 'pages',                     pgTable: pgSchema.pages },
  { name: 'user',                      pgTable: pgSchema.users },
  { name: 'account',                   pgTable: pgSchema.accounts },
  { name: 'session',                   pgTable: pgSchema.sessions },
  { name: 'verification',              pgTable: pgSchema.verification },
  { name: 'workspace_members',         pgTable: pgSchema.workspaceMembers },
  { name: 'workspace_invites',         pgTable: pgSchema.workspaceInvites },
  { name: 'agent_tokens',              pgTable: pgSchema.agentTokens },
  { name: 'client_auth_tokens',        pgTable: pgSchema.clientAuthTokens },
  { name: 'user_sessions',             pgTable: pgSchema.userSessions },
  { name: 'uploaded_assets',           pgTable: pgSchema.uploadedAssets },
  { name: 'shared_pages',              pgTable: pgSchema.sharedPages },
  { name: 'oauth_clients',             pgTable: pgSchema.oauthClients },
  { name: 'oauth_auth_codes',          pgTable: pgSchema.oauthAuthCodes },
  { name: 'oauth_access_tokens',       pgTable: pgSchema.oauthAccessTokens },
  { name: 'agent_activity',            pgTable: pgSchema.agentActivity },
  { name: 'subscriptions',             pgTable: pgSchema.subscriptions },
];

// Columns that store Unix timestamps as integers in SQLite → Date objects for PG
const TIMESTAMP_COLS: Record<string, Set<string>> = {
  workspaces:            new Set(['created_at', 'updated_at']),
  workspace_items:       new Set(['created_at', 'updated_at']),
  standalone_pages:      new Set(['created_at', 'updated_at']),
  databases:             new Set(['created_at', 'updated_at']),
  pages:                 new Set(['created_at', 'updated_at', 'agent_edited_at']),
  user:                  new Set(['created_at', 'emailVerified']),
  session:               new Set(['expires']),
  verificationToken:     new Set(['expires']),
  workspace_members:     new Set(['created_at']),
  workspace_invites:     new Set(['created_at', 'expires_at', 'accepted_at']),
  agent_tokens:          new Set(['created_at', 'expires_at', 'last_used_at', 'revoked_at']),
  client_auth_tokens:    new Set(['created_at', 'expires_at']),
  user_sessions:         new Set(['started_at', 'last_seen_at']),
  uploaded_assets:       new Set(['created_at']),
  shared_pages:          new Set(['created_at']),
  oauth_clients:         new Set(['created_at']),
  oauth_auth_codes:      new Set(['expires_at', 'used_at']),
  oauth_access_tokens:   new Set(['expires_at', 'revoked_at', 'created_at']),
  agent_activity:        new Set(['created_at']),
  subscriptions:         new Set(['current_period_end', 'created_at', 'updated_at']),
};

// Columns that store booleans as 0/1 integers in SQLite
const BOOLEAN_COLS: Record<string, Set<string>> = {
  workspace_members: new Set(['hidden']),
  shared_pages:      new Set(['in_sitemap']),
};

// Columns that store JSON as text in SQLite
const JSON_COLS: Record<string, Set<string>> = {
  databases:       new Set(['schema', 'views']),
  pages:           new Set(['properties']),
  oauth_clients:   new Set(['redirect_uris', 'grant_types', 'response_types']),
};

function convertValue(value: unknown, tableName: string, colName: string): unknown {
  if (value === null || value === undefined) return null;

  // Integer timestamp → Date
  if (TIMESTAMP_COLS[tableName]?.has(colName) && typeof value === 'number') {
    // Detect if stored as seconds or milliseconds
    // Timestamps > 1e12 are milliseconds, otherwise seconds
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms);
  }

  // Integer boolean → boolean
  if (BOOLEAN_COLS[tableName]?.has(colName)) {
    return Boolean(value);
  }

  // JSON text → parsed object
  if (JSON_COLS[tableName]?.has(colName) && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function convertRow(row: Record<string, unknown>, tableName: string): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    converted[key] = convertValue(value, tableName, key);
  }
  return converted;
}

async function migrateTable(tableName: string): Promise<number> {
  const result = await sqliteClient.execute(`SELECT * FROM "${tableName}"`);
  const rows = result.rows;

  if (rows.length === 0) {
    console.log(`  ${tableName}: 0 rows (skipped)`);
    return 0;
  }

  // Convert all rows
  const convertedRows = rows.map((row) => convertRow(row as Record<string, unknown>, tableName));

  // Batch insert (500 rows at a time)
  const BATCH_SIZE = 500;
  for (let i = 0; i < convertedRows.length; i += BATCH_SIZE) {
    const batch = convertedRows.slice(i, i + BATCH_SIZE);
    // Use raw pg client for batch inserts (Drizzle doesn't have a bulk insert for arbitrary data)
    const client = await pgPool.connect();
    try {
      for (const row of batch) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const colNames = columns.map((c) => `"${c}"`).join(', ');
        const sql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders.join(', ')}) ON CONFLICT DO NOTHING`;
        await client.query(sql, values);
      }
    } finally {
      client.release();
    }
  }

  console.log(`  ${tableName}: ${rows.length} rows migrated`);
  return rows.length;
}

async function verifyCounts(): Promise<boolean> {
  console.log('\nVerifying row counts...');
  let allMatch = true;

  for (const table of TABLES) {
    const sqliteResult = await sqliteClient.execute(`SELECT COUNT(*) as count FROM "${table.name}"`);
    const pgResult = await pgPool.query(`SELECT COUNT(*) as count FROM "${table.name}"`);
    const sqliteCount = Number(sqliteResult.rows[0].count);
    const pgCount = Number(pgResult.rows[0].count);
    const match = sqliteCount === pgCount;

    if (!match) {
      console.log(`  MISMATCH ${table.name}: SQLite=${sqliteCount}, PG=${pgCount}`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log('  All row counts match!');
  }
  return allMatch;
}

async function main() {
  console.log('Starting data migration: SQLite → PostgreSQL\n');
  console.log(`Source: ${SQLITE_URL}`);
  console.log(`Target: ${PG_URL}\n`);

  for (const table of TABLES) {
    await migrateTable(table.name);
  }

  await verifyCounts();

  console.log('\nMigration complete!');
  await pgPool.end();
  sqliteClient.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
