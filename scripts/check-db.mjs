import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
console.log('connecting...');
const r = await sql`SELECT 1 AS ok`;
console.log('DB ok:', r[0]?.ok);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log('Tables:', tables.map(t => t.table_name).join(', '));
await sql.end();
