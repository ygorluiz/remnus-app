'use server';

import { db } from '@/db';
import { financeSubscriptions } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';

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

export type FinanceSubscriptionRow = {
  id: string;
  workspaceId: string;
  name: string;
  amountCents: number;
  billingCycle: 'weekly' | 'monthly' | 'yearly' | 'quarterly';
  nextRenewalDate: Date;
  categoryId: string | null;
  accountId: string | null;
  cardId: string | null;
  cancelUrl: string | null;
  notifyBeforeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function listSubscriptions(workspaceId: string): Promise<FinanceSubscriptionRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeSubscriptions)
    .where(eq(financeSubscriptions.workspaceId, workspaceId))
    .orderBy(asc(financeSubscriptions.nextRenewalDate));
}

export async function createSubscription(data: {
  workspaceId: string;
  name: string;
  amountCents: number;
  billingCycle?: 'weekly' | 'monthly' | 'yearly' | 'quarterly';
  nextRenewalDate: Date;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  cancelUrl?: string;
  notifyBeforeDays?: number;
  isActive?: boolean;
}) {
  await assertFinanceAccess(data.workspaceId);

  const [sub] = await db
    .insert(financeSubscriptions)
    .values({
      workspaceId: data.workspaceId,
      name: data.name,
      amountCents: data.amountCents,
      billingCycle: data.billingCycle ?? 'monthly',
      nextRenewalDate: data.nextRenewalDate,
      categoryId: data.categoryId ?? null,
      accountId: data.accountId ?? null,
      cardId: data.cardId ?? null,
      cancelUrl: data.cancelUrl ?? null,
      notifyBeforeDays: data.notifyBeforeDays ?? 7,
      isActive: data.isActive ?? true,
    })
    .returning();

  revalidatePath('/finance/subscriptions');
  return sub;
}

export async function updateSubscription(id: string, data: {
  name?: string;
  amountCents?: number;
  billingCycle?: 'weekly' | 'monthly' | 'yearly' | 'quarterly';
  nextRenewalDate?: Date;
  categoryId?: string | null;
  accountId?: string | null;
  cardId?: string | null;
  cancelUrl?: string | null;
  notifyBeforeDays?: number;
  isActive?: boolean;
}) {
  const [existing] = await db
    .select({ workspaceId: financeSubscriptions.workspaceId })
    .from(financeSubscriptions)
    .where(eq(financeSubscriptions.id, id))
    .limit(1);
  if (!existing) throw new Error('Subscription not found');
  await assertFinanceAccess(existing.workspaceId);

  const [sub] = await db
    .update(financeSubscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(financeSubscriptions.id, id))
    .returning();

  revalidatePath('/finance/subscriptions');
  return sub;
}

export async function toggleSubscription(id: string) {
  const [existing] = await db
    .select({ workspaceId: financeSubscriptions.workspaceId, isActive: financeSubscriptions.isActive })
    .from(financeSubscriptions)
    .where(eq(financeSubscriptions.id, id))
    .limit(1);
  if (!existing) throw new Error('Subscription not found');
  await assertFinanceAccess(existing.workspaceId);

  const [sub] = await db
    .update(financeSubscriptions)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(financeSubscriptions.id, id))
    .returning();

  revalidatePath('/finance/subscriptions');
  return sub;
}

export async function deleteSubscription(id: string) {
  const [existing] = await db
    .select({ workspaceId: financeSubscriptions.workspaceId })
    .from(financeSubscriptions)
    .where(eq(financeSubscriptions.id, id))
    .limit(1);
  if (!existing) throw new Error('Subscription not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeSubscriptions).where(eq(financeSubscriptions.id, id));
  revalidatePath('/finance/subscriptions');
}
