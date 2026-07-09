'use server';

import { db } from '@/db';
import { financeBudgets } from '@/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

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

export type FinanceBudgetRow = {
  id: string;
  workspaceId: string;
  categoryId: string;
  amountCents: number;
  month: string;
  alertThreshold: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface BudgetWithSpent extends FinanceBudgetRow {
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
}

export async function listBudgets(workspaceId: string): Promise<FinanceBudgetRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeBudgets)
    .where(eq(financeBudgets.workspaceId, workspaceId))
    .orderBy(asc(financeBudgets.month), asc(financeBudgets.categoryId));
}

export async function getBudgetsWithSpent(
  workspaceId: string,
  month?: string,
): Promise<BudgetWithSpent[]> {
  await assertFinanceAccess(workspaceId);

  const targetMonth = month ?? new Date().toISOString().slice(0, 7);

  const { financeTransactions } = await import('@/db/schema');

  const budgets = await db
    .select({
      id: financeBudgets.id,
      workspaceId: financeBudgets.workspaceId,
      categoryId: financeBudgets.categoryId,
      amountCents: financeBudgets.amountCents,
      month: financeBudgets.month,
      alertThreshold: financeBudgets.alertThreshold,
      createdAt: financeBudgets.createdAt,
      updatedAt: financeBudgets.updatedAt,
      spentCents: sql<number>`
        COALESCE((
          SELECT SUM(t.amount_cents)
          FROM ${financeTransactions} t
          WHERE t.category_id = ${financeBudgets.categoryId}
            AND t.type IN ('expense', 'refund')
            AND t.workspace_id = ${workspaceId}
            AND to_char(t.transaction_date, 'YYYY-MM') = ${targetMonth}
        ), 0)
      `,
    })
    .from(financeBudgets)
    .where(
      and(
        eq(financeBudgets.workspaceId, workspaceId),
        eq(financeBudgets.month, targetMonth),
      ),
    );

  return (budgets as unknown as FinanceBudgetRow[]).map(b => {
    const bAny = b as any;
    const spent = Number(bAny.spentCents ?? 0);
    const budgetAmt = b.amountCents;
    return {
      ...b,
      spentCents: spent,
      remainingCents: budgetAmt - spent,
      percentUsed: budgetAmt > 0 ? Math.min(100, Math.round((spent / budgetAmt) * 100)) : 0,
    };
  });
}

export async function upsertBudget(data: {
  workspaceId: string;
  categoryId: string;
  amountCents: number;
  month: string;
  alertThreshold?: string;
}) {
  await assertFinanceAccess(data.workspaceId);

  const [existing] = await db
    .select({ id: financeBudgets.id })
    .from(financeBudgets)
    .where(
      and(
        eq(financeBudgets.workspaceId, data.workspaceId),
        eq(financeBudgets.categoryId, data.categoryId),
        eq(financeBudgets.month, data.month),
      ),
    )
    .limit(1);

  if (existing) {
    const [budget] = await db
      .update(financeBudgets)
      .set({
        amountCents: data.amountCents,
        alertThreshold: data.alertThreshold ?? '0.8',
        updatedAt: new Date(),
      })
      .where(eq(financeBudgets.id, existing.id))
      .returning();
    revalidatePath('/finance/budgets');
    return budget;
  }

  const [budget] = await db
    .insert(financeBudgets)
    .values({
      workspaceId: data.workspaceId,
      categoryId: data.categoryId,
      amountCents: data.amountCents,
      month: data.month,
      alertThreshold: data.alertThreshold ?? '0.8',
    })
    .returning();

  revalidatePath('/finance/budgets');
  return budget;
}

export async function deleteBudget(budgetId: string) {
  const [existing] = await db
    .select({ workspaceId: financeBudgets.workspaceId })
    .from(financeBudgets)
    .where(eq(financeBudgets.id, budgetId))
    .limit(1);
  if (!existing) throw new Error('Budget not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeBudgets).where(eq(financeBudgets.id, budgetId));
  revalidatePath('/finance/budgets');
}
