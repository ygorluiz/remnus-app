import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // Rename old table
    await client.query('ALTER TABLE IF EXISTS "verificationToken" RENAME TO "verification"');
    console.log('Table renamed to verification');

    // Verify
    const r = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification'"
    );
    console.log('verification table exists:', r.rows.length > 0);

    // Check if we need to rename columns
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'verification' AND table_schema = 'public'"
    );
    console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
