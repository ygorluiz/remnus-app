'use server';

import { db } from '@/db';
import { financeTransactions } from '@/db/schema';
import { eq, and, desc, asc, gte, lte, inArray, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { transactionSchema, transactionUpdateSchema } from '@/lib/services/finance/validation';
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

export type FinanceTransactionRow = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  amountCents: number;
  type: string;
  categoryId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  cardId: string | null;
  transactionDate: Date;
  status: string;
  currency: string;
  isRecurring: boolean;
  recurringRuleId: string | null;
  isInstallment: boolean;
  installmentGroupId: string | null;
  currentInstallment: number | null;
  totalInstallments: number | null;
  tags: string[];
  notes: string | null;
  location: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export async function createTransaction(data: {
  workspaceId: string;
  title: string;
  description?: string;
  amountCents: number;
  type: 'income' | 'expense' | 'transfer' | 'refund';
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string;
  cardId?: string;
  transactionDate: string | Date;
  status?: string;
  currency?: string;
  isInstallment?: boolean;
  currentInstallment?: number;
  totalInstallments?: number;
  tags?: string[];
  notes?: string;
  location?: string;
}) {
  const parsed = transactionSchema.parse({
    ...data,
    transactionDate: data.transactionDate,
  });
  await assertFinanceAccess(parsed.workspaceId);

  const [txn] = await db
    .insert(financeTransactions)
    .values({
      workspaceId: parsed.workspaceId,
      title: parsed.title,
      description: parsed.description ?? null,
      amountCents: parsed.amountCents,
      type: parsed.type,
      categoryId: parsed.categoryId ?? null,
      accountId: parsed.accountId,
      destinationAccountId: parsed.destinationAccountId ?? null,
      cardId: parsed.cardId ?? null,
      transactionDate: parsed.transactionDate,
      status: parsed.status,
      currency: parsed.currency,
      isInstallment: parsed.isInstallment,
      currentInstallment: parsed.currentInstallment ?? null,
      totalInstallments: parsed.totalInstallments ?? null,
      tags: parsed.tags,
      notes: parsed.notes ?? null,
      location: parsed.location ?? null,
    })
    .returning();

  await reconcileAccountBalance(parsed.accountId);

  if (parsed.type === 'transfer' && parsed.destinationAccountId) {
    await reconcileAccountBalance(parsed.destinationAccountId);
  }

  revalidatePath(`/finance/transactions`);
  return txn;
}

export async function updateTransaction(
  transactionId: string,
  data: Partial<{
    title: string;
    description: string;
    amountCents: number;
    type: 'income' | 'expense' | 'transfer' | 'refund';
    categoryId: string;
    accountId: string;
    destinationAccountId: string;
    cardId: string;
    transactionDate: string | Date;
    status: string;
    tags: string[];
    notes: string;
    location: string;
  }>,
) {
  const [existing] = await db
    .select({ workspaceId: financeTransactions.workspaceId, accountId: financeTransactions.accountId })
    .from(financeTransactions)
    .where(eq(financeTransactions.id, transactionId))
    .limit(1);
  if (!existing) throw new Error('Transaction not found');
  await assertFinanceAccess(existing.workspaceId);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amountCents !== undefined) updateData.amountCents = data.amountCents;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
  if (data.accountId !== undefined) updateData.accountId = data.accountId;
  if (data.destinationAccountId !== undefined) updateData.destinationAccountId = data.destinationAccountId || null;
  if (data.cardId !== undefined) updateData.cardId = data.cardId || null;
  if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.location !== undefined) updateData.location = data.location || null;

  const [txn] = await db
    .update(financeTransactions)
    .set(updateData)
    .where(eq(financeTransactions.id, transactionId))
    .returning();

  await reconcileAccountBalance(existing.accountId);
  if (data.destinationAccountId) {
    await reconcileAccountBalance(data.destinationAccountId);
  }

  revalidatePath(`/finance/transactions`);
  return txn;
}

export async function deleteTransaction(transactionId: string) {
  const [existing] = await db
    .select({ workspaceId: financeTransactions.workspaceId, accountId: financeTransactions.accountId })
    .from(financeTransactions)
    .where(eq(financeTransactions.id, transactionId))
    .limit(1);
  if (!existing) throw new Error('Transaction not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeTransactions).where(eq(financeTransactions.id, transactionId));
  await reconcileAccountBalance(existing.accountId);

  revalidatePath(`/finance/transactions`);
}

export async function listTransactions(
  workspaceId: string,
  filters?: TransactionFilters,
  limit = 50,
  offset = 0,
): Promise<{ transactions: FinanceTransactionRow[]; total: number }> {
  await assertFinanceAccess(workspaceId);

  const conditions: ReturnType<typeof eq>[] = [
    eq(financeTransactions.workspaceId, workspaceId),
  ];

  if (filters?.accountId) conditions.push(eq(financeTransactions.accountId, filters.accountId));
  if (filters?.categoryId) conditions.push(eq(financeTransactions.categoryId, filters.categoryId));
  if (filters?.status) conditions.push(eq(financeTransactions.status, filters.status as 'pending' | 'cleared' | 'reconciled'));
  if (filters?.type) conditions.push(eq(financeTransactions.type, filters.type as 'income' | 'expense' | 'transfer' | 'refund'));
  if (filters?.startDate) conditions.push(gte(financeTransactions.transactionDate, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(financeTransactions.transactionDate, new Date(filters.endDate)));

  const where = and(...conditions);

  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(financeTransactions)
    .where(where);

  const transactions = await db
    .select()
    .from(financeTransactions)
    .where(where)
    .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    transactions: transactions as unknown as FinanceTransactionRow[],
    total: Number(totalResult?.count ?? 0),
  };
}

export async function getTransaction(transactionId: string): Promise<FinanceTransactionRow | null> {
  const [txn] = await db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.id, transactionId))
    .limit(1);

  if (txn) {
    await assertFinanceAccess(txn.workspaceId);
  }
  return (txn ?? null) as unknown as FinanceTransactionRow | null;
}
