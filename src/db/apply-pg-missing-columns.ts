import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}`;
  return rows.length > 0;
}

async function main() {
  // user.email_unsubscribed_at
  if (!(await columnExists('user', 'email_unsubscribed_at'))) {
    await sql`ALTER TABLE "user" ADD COLUMN email_unsubscribed_at timestamp`;
    console.log('Added user.email_unsubscribed_at');
  } else {
    console.log('user.email_unsubscribed_at already exists — skipping');
  }

  // user.email_suppressed
  if (!(await columnExists('user', 'email_suppressed'))) {
    await sql`ALTER TABLE "user" ADD COLUMN email_suppressed boolean DEFAULT false`;
    console.log('Added user.email_suppressed');
  } else {
    console.log('user.email_suppressed already exists — skipping');
  }

  // user_sessions.platform
  if (!(await columnExists('user_sessions', 'platform'))) {
    await sql`ALTER TABLE user_sessions ADD COLUMN platform text`;
    console.log('Added user_sessions.platform');
  } else {
    console.log('user_sessions.platform already exists — skipping');
  }

  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
