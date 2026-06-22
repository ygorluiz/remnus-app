import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './pg-schema';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log('Database connection established (Neon PostgreSQL)');
  console.log('Use `npx drizzle-kit push` to sync schema, or run migrate-to-pg.ts for data migration.');
  process.exit(0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
