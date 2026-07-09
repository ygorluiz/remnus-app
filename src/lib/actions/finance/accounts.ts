'use server';

import { db } from '@/db';
import { financeAccounts } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { accountSchema, accountUpdateSchema } from '@/lib/services/finance/validation';
import { reconcileAccountBalance } from '@/lib/services/finance/ledger';

async function assertFinanceAccess(workspaceId: string): Promise<string> {
  const user = await getCurrentUser();
  if (isAdminRole(user.role)) return user.id;

  const { workspaceMembers } = await import('@/db/schema');
  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (!member) {
    const t = await getTranslations('Errors');
    throw new Error(t('unauthorized'));
  }
  return user.id;
}

export type FinanceAccountRow = {
  id: string;
  workspaceId: string;
  name: string;
  bank: string | null;
  type: string;
  color: string | null;
  icon: string | null;
  initialBalanceCents: number;
  currentBalanceCents: number;
  currency: string;
  includeInTotal: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function createAccount(data: {
  workspaceId: string;
  name: string;
  bank?: string;
  type?: string;
  color?: string;
  icon?: string;
  initialBalanceCents?: number;
  currency?: string;
  includeInTotal?: boolean;
}) {
  const parsed = accountSchema.parse(data);
  await assertFinanceAccess(parsed.workspaceId);

  const [account] = await db
    .insert(financeAccounts)
    .values({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      bank: parsed.bank ?? null,
      type: parsed.type,
      color: parsed.color ?? null,
      icon: parsed.icon ?? null,
      initialBalanceCents: parsed.initialBalanceCents,
      currentBalanceCents: parsed.initialBalanceCents,
      currency: parsed.currency,
      includeInTotal: parsed.includeInTotal,
    })
    .returning();

  revalidatePath(`/finance/accounts`);
  return account;
}

export async function updateAccount(
  accountId: string,
  data: {
    name?: string;
    bank?: string;
    type?: string;
    color?: string;
    icon?: string;
    initialBalanceCents?: number;
    currency?: string;
    includeInTotal?: boolean;
    isArchived?: boolean;
    sortOrder?: number;
  },
) {
  const parsed = accountUpdateSchema.parse(data);

  const [existing] = await db
    .select({ workspaceId: financeAccounts.workspaceId })
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);
  if (!existing) throw new Error('Account not found');
  await assertFinanceAccess(existing.workspaceId);

  const [account] = await db
    .update(financeAccounts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(financeAccounts.id, accountId))
    .returning();

  revalidatePath(`/finance/accounts`);
  return account;
}

export async function archiveAccount(accountId: string, archived: boolean) {
  const [existing] = await db
    .select({ workspaceId: financeAccounts.workspaceId })
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);
  if (!existing) throw new Error('Account not found');
  await assertFinanceAccess(existing.workspaceId);

  const [account] = await db
    .update(financeAccounts)
    .set({ isArchived: archived, updatedAt: new Date() })
    .where(eq(financeAccounts.id, accountId))
    .returning();

  revalidatePath(`/finance/accounts`);
  return account;
}

export async function deleteAccount(accountId: string) {
  const [existing] = await db
    .select({ workspaceId: financeAccounts.workspaceId })
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);
  if (!existing) throw new Error('Account not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeAccounts).where(eq(financeAccounts.id, accountId));
  revalidatePath(`/finance/accounts`);
}

export async function listAccounts(workspaceId: string): Promise<FinanceAccountRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeAccounts)
    .where(
      and(
        eq(financeAccounts.workspaceId, workspaceId),
        eq(financeAccounts.isArchived, false),
      ),
    )
    .orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.name));
}

export async function getAccount(accountId: string): Promise<FinanceAccountRow | null> {
  const [account] = await db
    .select()
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);

  if (account) {
    await assertFinanceAccess(account.workspaceId);
  }
  return account ?? null;
}

export async function reconcileAccount(accountId: string) {
  const [existing] = await db
    .select({ workspaceId: financeAccounts.workspaceId })
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);
  if (!existing) throw new Error('Account not found');
  await assertFinanceAccess(existing.workspaceId);

  const balance = await reconcileAccountBalance(accountId);
  return { currentBalanceCents: balance };
}
