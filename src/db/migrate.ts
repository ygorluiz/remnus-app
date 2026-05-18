import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migration complete');
  process.exit(0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
