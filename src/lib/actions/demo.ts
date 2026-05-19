'use server';
import { signIn } from '@/auth';
import { db } from '@/db';
import { users, workspaces, workspaceMembers } from '@/db/schema';
import { eq, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createDemoSeedData } from '@/lib/seed';

const DEMO_EMAIL = 'demo@remna.app';
const DEMO_PASSWORD = 'remna-demo-2024';

export async function loginAsDemo(_prevState: unknown, _formData: FormData): Promise<{ error: string } | null> {
  // Require at least one real (non-demo) user to exist before enabling demo mode
  const realUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(ne(users.role, 'demo'));

  if (realUsers.length === 0) {
    return { error: 'Demo mode is not available yet. Please create an account first.' };
  }

  // Find or create the demo user
  let [demoUser] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  if (!demoUser) {
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await db.insert(users).values({
      id,
      name: 'Demo User',
      email: DEMO_EMAIL,
      passwordHash,
      role: 'demo',
      createdAt: new Date(),
    });
    demoUser = { id, name: 'Demo User' };
  }

  // Reset: delete all workspaces belonging to the demo user (cascades items/pages)
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, demoUser.id));

  for (const { workspaceId } of memberships) {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }

  // Recreate fresh demo data (1 workspace + pages + databases)
  await createDemoSeedData(demoUser.id, demoUser.name);

  // Sign in — throws a NEXT_REDIRECT which must not be caught
  await signIn('credentials', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    redirectTo: '/',
  });
  return null;
}
