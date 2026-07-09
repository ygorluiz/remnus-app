'use server';

import { db } from '@/db';
import { financeGoals } from '@/db/schema';
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

export type FinanceGoalRow = {
  id: string;
  workspaceId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: Date | null;
  priority: 'low' | 'medium' | 'high';
  categoryId: string | null;
  imageUrl: string | null;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
};

export async function listGoals(workspaceId: string): Promise<FinanceGoalRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeGoals)
    .where(eq(financeGoals.workspaceId, workspaceId))
    .orderBy(asc(financeGoals.createdAt));
}

export async function createGoal(data: {
  workspaceId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents?: number;
  targetDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string;
  imageUrl?: string;
  status?: 'active' | 'completed' | 'paused';
}) {
  await assertFinanceAccess(data.workspaceId);

  const [goal] = await db
    .insert(financeGoals)
    .values({
      workspaceId: data.workspaceId,
      name: data.name,
      targetAmountCents: data.targetAmountCents,
      currentAmountCents: data.currentAmountCents ?? 0,
      targetDate: data.targetDate ?? null,
      priority: data.priority ?? 'medium',
      categoryId: data.categoryId ?? null,
      imageUrl: data.imageUrl ?? null,
      status: data.status ?? 'active',
    })
    .returning();

  revalidatePath('/finance/goals');
  return goal;
}

export async function updateGoal(goalId: string, data: {
  name?: string;
  targetAmountCents?: number;
  currentAmountCents?: number;
  targetDate?: Date | null;
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string | null;
  imageUrl?: string | null;
  status?: 'active' | 'completed' | 'paused';
}) {
  const [existing] = await db
    .select({ workspaceId: financeGoals.workspaceId })
    .from(financeGoals)
    .where(eq(financeGoals.id, goalId))
    .limit(1);
  if (!existing) throw new Error('Goal not found');
  await assertFinanceAccess(existing.workspaceId);

  const [goal] = await db
    .update(financeGoals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(financeGoals.id, goalId))
    .returning();

  revalidatePath('/finance/goals');
  return goal;
}

export async function deleteGoal(goalId: string) {
  const [existing] = await db
    .select({ workspaceId: financeGoals.workspaceId })
    .from(financeGoals)
    .where(eq(financeGoals.id, goalId))
    .limit(1);
  if (!existing) throw new Error('Goal not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeGoals).where(eq(financeGoals.id, goalId));
  revalidatePath('/finance/goals');
}
