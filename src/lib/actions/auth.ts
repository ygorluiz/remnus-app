'use server';
import { signOut, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, workspaceMembers, workspaces, accounts } from '@/db/schema';
import { eq, and, sql, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSeedWorkspace } from '@/lib/seed';

export async function logout() {
  await signOut({ redirectTo: '/login' });
}

export async function registerUser(_prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) return { error: 'Email and password are required' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) return { error: 'An account with this email already exists' };

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  await db.insert(users).values({ id, name: name || null, email, passwordHash, createdAt: new Date() });

  // Seed default workspace with tasks database and welcome page
  await createSeedWorkspace(id, name || email.split('@')[0]);

  // Promote to admin and claim orphaned workspaces if this is the first real (non-demo) user
  const allRealUsers = await db.select({ id: users.id }).from(users).where(ne(users.role, 'demo'));
  if (allRealUsers.length === 1) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, id));
    const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);
    for (const ws of allWorkspaces) {
      const existing = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, ws.id));
      if (existing.length === 0) {
        await db.insert(workspaceMembers).values({ workspaceId: ws.id, userId: id, role: 'owner', createdAt: new Date() });
      }
    }
  }

  // Sign in immediately after registration
  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Registration succeeded but sign-in failed. Please log in.' };
    throw error;
  }
}

export async function loginWithCredentials(_prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Invalid email or password' };
    throw error;
  }
}

export async function inviteToWorkspace(
  workspaceId: string,
  email: string,
  role: 'member' | 'viewer' = 'member',
) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Only owners and admins can invite
  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership[0] || membership[0].role !== 'owner') {
      return { error: 'Only workspace owners can invite members' };
    }
  }

  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!targetUser) {
    return { error: 'No user found with that email address' };
  }

  const existing = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUser.id),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { error: 'User is already a member of this workspace' };
  }

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId: targetUser.id,
    role,
    createdAt: new Date(),
  });

  revalidatePath('/');
  return { success: true };
}

export async function removeFromWorkspace(workspaceId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership[0] || membership[0].role !== 'owner') {
      return { error: 'Only workspace owners can remove members' };
    }
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    );

  revalidatePath('/');
  return { success: true };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function getAllUsers() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Admin access required' };
  }

  const userRows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    image: users.image,
    role: users.role,
    createdAt: users.createdAt,
    hasPassword: sql<number>`case when ${users.passwordHash} is not null then 1 else 0 end`,
  }).from(users);

  const accountRows = await db.select({ userId: accounts.userId, provider: accounts.provider }).from(accounts);
  const providerMap = new Map<string, string[]>();
  for (const acc of accountRows) {
    if (!providerMap.has(acc.userId)) providerMap.set(acc.userId, []);
    providerMap.get(acc.userId)!.push(acc.provider);
  }

  return userRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: u.createdAt,
    authType: providerMap.get(u.id)?.includes('google')
      ? ('google' as const)
      : u.hasPassword
        ? ('email' as const)
        : ('unknown' as const),
  }));
}

export async function adminDeleteUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Admin access required' };
  }
  if (session.user.id === userId) {
    return { error: 'You cannot delete your own account' };
  }
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath('/');
  return { success: true };
}

export async function setUserRole(userId: string, role: 'user' | 'admin') {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Admin access required' };
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath('/');
  return { success: true };
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: 'member' | 'viewer',
) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership[0] || membership[0].role !== 'owner') {
      return { error: 'Only workspace owners can update member roles' };
    }
  }

  // Ensure target user is a member of the workspace
  const [targetMember] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!targetMember) {
    return { error: 'Target user is not a member of this workspace' };
  }

  if (targetMember.role === 'owner') {
    return { error: 'Cannot change the role of the workspace owner. Transfer ownership first.' };
  }

  await db
    .update(workspaceMembers)
    .set({ role })
    .where(eq(workspaceMembers.id, targetMember.id));

  revalidatePath('/');
  return { success: true };
}

export async function transferWorkspaceOwnership(
  workspaceId: string,
  newOwnerUserId: string,
) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isAdmin = session.user.role === 'admin';
  if (!isAdmin) {
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership[0] || membership[0].role !== 'owner') {
      return { error: 'Only workspace owners can transfer ownership' };
    }
  }

  // Ensure target user is a member of the workspace
  const [targetMember] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, newOwnerUserId),
      ),
    )
    .limit(1);

  if (!targetMember) {
    return { error: 'Target user is not a member of this workspace' };
  }

  if (targetMember.role === 'owner') {
    return { error: 'User is already the owner of this workspace' };
  }

  // Find all current owners of this workspace
  const currentOwners = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, 'owner'),
      ),
    );

  // Downgrade current owners to 'member'
  for (const owner of currentOwners) {
    await db
      .update(workspaceMembers)
      .set({ role: 'member' })
      .where(eq(workspaceMembers.id, owner.id));
  }

  // Upgrade target user to 'owner'
  await db
    .update(workspaceMembers)
    .set({ role: 'owner' })
    .where(eq(workspaceMembers.id, targetMember.id));

  revalidatePath('/');
  return { success: true };
}

