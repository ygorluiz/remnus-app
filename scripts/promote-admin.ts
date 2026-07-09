import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: npx tsx scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const [user] = await db
    .update(users)
    .set({ role: 'super_admin' })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (user) {
    console.log(`✅ ${user.email} promoted to ${user.role}`);
  } else {
    console.log(`❌ No user found with email "${email}"`);
  }
}
main();
