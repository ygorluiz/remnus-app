import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    // Check if column 'token' exists and rename to 'value'
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'verification' AND table_schema = 'public'"
    );
    console.log('Current columns:', cols.rows.map((r: Record<string, unknown>) => (r as Record<string, unknown>).column_name).join(', '));

    const hasToken = cols.rows.some((r: Record<string, unknown>) => (r as Record<string, unknown>).column_name === 'token');
    const hasValue = cols.rows.some((r: Record<string, unknown>) => (r as Record<string, unknown>).column_name === 'value');

    if (hasToken && !hasValue) {
      await client.query('ALTER TABLE "verification" RENAME COLUMN "token" TO "value"');
      console.log('Renamed token → value');
    } else if (hasValue) {
      console.log('Column "value" already exists');
    } else {
      console.log('Neither token nor value found — table may need recreation');
    }

    // Verify final state
    const final = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'verification' AND table_schema = 'public'"
    );
    console.log('Final columns:', final.rows.map(r => r.column_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
