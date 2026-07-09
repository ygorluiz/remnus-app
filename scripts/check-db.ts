import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  const r = await db.execute(sql`SELECT 1 AS ok`);
  console.log('DB ok:', r.rows?.[0]?.ok);

  const tables = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  const names = tables.rows?.map((t: any) => t.table_name) ?? [];
  console.log('Tables:', names.join(', '));
  console.log('Has jwks:', names.includes('jwks'));
}
main().catch(e => console.error('Error:', e.message));
