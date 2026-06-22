/**
 * Sets up the database by pushing the schema.
 *
 * Usage:
 *   npm run db:setup
 *   DATABASE_URL="postgresql://..." npm run db:setup
 */
import { spawnSync } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

console.log(`\nSetting up database: ${dbUrl.replace(/:.*@/, ':***@')}\n`);

// Push schema to database
console.log('▶ Pushing schema...');
const result = spawnSync('npx', ['drizzle-kit', 'push'], {
  env: { ...process.env, DATABASE_URL: dbUrl },
  cwd: process.cwd(),
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);

console.log('\n✓ Database setup complete.\n');
