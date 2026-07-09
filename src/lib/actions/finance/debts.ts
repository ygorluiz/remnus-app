'use server';

import { db } from '@/db';
import { financeDebts } from '@/db/schema';
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

export type FinanceDebtRow = {
  id: string;
  workspaceId: string;
  name: string;
  creditor: string | null;
  totalAmountCents: number;
  remainingAmountCents: number;
  interestRate: string | null;
  amortizationType: 'sac' | 'price' | 'bullet' | 'other' | null;
  dueDate: Date | null;
  paymentSchedule: any[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listDebts(workspaceId: string): Promise<FinanceDebtRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeDebts)
    .where(eq(financeDebts.workspaceId, workspaceId))
    .orderBy(asc(financeDebts.dueDate));
}

export async function createDebt(data: {
  workspaceId: string;
  name: string;
  creditor?: string;
  totalAmountCents: number;
  remainingAmountCents: number;
  interestRate?: number | string;
  amortizationType?: 'sac' | 'price' | 'bullet' | 'other';
  dueDate?: Date;
  paymentSchedule?: any[];
}) {
  await assertFinanceAccess(data.workspaceId);

  const [debt] = await db
    .insert(financeDebts)
    .values({
      workspaceId: data.workspaceId,
      name: data.name,
      creditor: data.creditor ?? null,
      totalAmountCents: data.totalAmountCents,
      remainingAmountCents: data.remainingAmountCents,
      interestRate: data.interestRate != null ? String(data.interestRate) : null,
      amortizationType: data.amortizationType ?? null,
      dueDate: data.dueDate ?? null,
      paymentSchedule: data.paymentSchedule ?? null,
    })
    .returning();

  revalidatePath('/finance/debts');
  return debt;
}

export async function updateDebt(debtId: string, data: {
  name?: string;
  creditor?: string | null;
  totalAmountCents?: number;
  remainingAmountCents?: number;
  interestRate?: number | string | null;
  amortizationType?: 'sac' | 'price' | 'bullet' | 'other' | null;
  dueDate?: Date | null;
  paymentSchedule?: any[] | null;
}) {
  const [existing] = await db
    .select({ workspaceId: financeDebts.workspaceId })
    .from(financeDebts)
    .where(eq(financeDebts.id, debtId))
    .limit(1);
  if (!existing) throw new Error('Debt not found');
  await assertFinanceAccess(existing.workspaceId);

  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.interestRate !== undefined) {
    updateData.interestRate = data.interestRate != null ? String(data.interestRate) : null;
  }

  const [debt] = await db
    .update(financeDebts)
    .set(updateData)
    .where(eq(financeDebts.id, debtId))
    .returning();

  revalidatePath('/finance/debts');
  return debt;
}

export async function deleteDebt(debtId: string) {
  const [existing] = await db
    .select({ workspaceId: financeDebts.workspaceId })
    .from(financeDebts)
    .where(eq(financeDebts.id, debtId))
    .limit(1);
  if (!existing) throw new Error('Debt not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeDebts).where(eq(financeDebts.id, debtId));
  revalidatePath('/finance/debts');
}
