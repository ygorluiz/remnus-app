'use server';

import { db } from '@/db';
import { financeInvestments, financeInvestmentTransactions } from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
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

export type FinanceInvestmentRow = {
  id: string;
  workspaceId: string;
  symbol: string;
  name: string;
  type: 'stock' | 'fii' | 'treasury' | 'cdb' | 'etf' | 'crypto' | 'funds';
  brokerage: string | null;
  quantity: string;
  averagePrice: string;
  currentPrice: string | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceInvestmentTransactionRow = {
  id: string;
  workspaceId: string;
  investmentId: string;
  type: 'buy' | 'sell' | 'dividend' | 'tax' | 'fee';
  quantity: string;
  price: string;
  totalAmount: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export interface InvestmentWithValue extends FinanceInvestmentRow {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export async function listInvestments(workspaceId: string): Promise<FinanceInvestmentRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeInvestments)
    .where(eq(financeInvestments.workspaceId, workspaceId))
    .orderBy(asc(financeInvestments.symbol));
}

export async function getInvestmentsWithValue(workspaceId: string): Promise<InvestmentWithValue[]> {
  await assertFinanceAccess(workspaceId);

  const investments = await db
    .select()
    .from(financeInvestments)
    .where(eq(financeInvestments.workspaceId, workspaceId));

  return investments.map(inv => {
    const qty = parseFloat(inv.quantity);
    const avgPrice = parseFloat(inv.averagePrice);
    const curPrice = inv.currentPrice ? parseFloat(inv.currentPrice) : avgPrice;
    const totalInvested = qty * avgPrice;
    const currentValue = qty * curPrice;

    return {
      ...inv,
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      profitLoss: Math.round((currentValue - totalInvested) * 100) / 100,
      profitLossPercent: totalInvested > 0
        ? Math.round(((currentValue - totalInvested) / totalInvested) * 10000) / 100
        : 0,
    };
  });
}

export async function createInvestment(data: {
  workspaceId: string;
  symbol: string;
  name: string;
  type: 'stock' | 'fii' | 'treasury' | 'cdb' | 'etf' | 'crypto' | 'funds';
  brokerage?: string;
  quantity?: number | string;
  averagePrice?: number | string;
  currentPrice?: number | string;
  currency?: string;
}) {
  await assertFinanceAccess(data.workspaceId);

  const [inv] = await db
    .insert(financeInvestments)
    .values({
      workspaceId: data.workspaceId,
      symbol: data.symbol,
      name: data.name,
      type: data.type,
      brokerage: data.brokerage ?? null,
      quantity: String(data.quantity ?? 0),
      averagePrice: String(data.averagePrice ?? 0),
      currentPrice: data.currentPrice != null ? String(data.currentPrice) : null,
      currency: data.currency ?? 'BRL',
    })
    .returning();

  revalidatePath('/finance/investments');
  return inv;
}

export async function updateInvestment(investmentId: string, data: {
  symbol?: string;
  name?: string;
  type?: 'stock' | 'fii' | 'treasury' | 'cdb' | 'etf' | 'crypto' | 'funds';
  brokerage?: string | null;
  quantity?: number | string;
  averagePrice?: number | string;
  currentPrice?: number | string | null;
  currency?: string;
}) {
  const [existing] = await db
    .select({ workspaceId: financeInvestments.workspaceId })
    .from(financeInvestments)
    .where(eq(financeInvestments.id, investmentId))
    .limit(1);
  if (!existing) throw new Error('Investment not found');
  await assertFinanceAccess(existing.workspaceId);

  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.quantity !== undefined) updateData.quantity = String(data.quantity);
  if (data.averagePrice !== undefined) updateData.averagePrice = String(data.averagePrice);
  if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice != null ? String(data.currentPrice) : null;

  const [inv] = await db
    .update(financeInvestments)
    .set(updateData)
    .where(eq(financeInvestments.id, investmentId))
    .returning();

  revalidatePath('/finance/investments');
  return inv;
}

export async function deleteInvestment(investmentId: string) {
  const [existing] = await db
    .select({ workspaceId: financeInvestments.workspaceId })
    .from(financeInvestments)
    .where(eq(financeInvestments.id, investmentId))
    .limit(1);
  if (!existing) throw new Error('Investment not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeInvestments).where(eq(financeInvestments.id, investmentId));
  revalidatePath('/finance/investments');
}

export async function listInvestmentTransactions(investmentId: string): Promise<FinanceInvestmentTransactionRow[]> {
  const [inv] = await db
    .select({ workspaceId: financeInvestments.workspaceId })
    .from(financeInvestments)
    .where(eq(financeInvestments.id, investmentId))
    .limit(1);
  if (!inv) throw new Error('Investment not found');
  await assertFinanceAccess(inv.workspaceId);

  return db
    .select()
    .from(financeInvestmentTransactions)
    .where(eq(financeInvestmentTransactions.investmentId, investmentId))
    .orderBy(desc(financeInvestmentTransactions.transactionDate));
}

export async function createInvestmentTransaction(data: {
  workspaceId: string;
  investmentId: string;
  type: 'buy' | 'sell' | 'dividend' | 'tax' | 'fee';
  quantity: number | string;
  price: number | string;
  totalAmount: number | string;
  transactionDate: Date;
}) {
  await assertFinanceAccess(data.workspaceId);

  const [tx] = await db
    .insert(financeInvestmentTransactions)
    .values({
      workspaceId: data.workspaceId,
      investmentId: data.investmentId,
      type: data.type,
      quantity: String(data.quantity),
      price: String(data.price),
      totalAmount: String(data.totalAmount),
      transactionDate: data.transactionDate,
    })
    .returning();

  revalidatePath('/finance/investments');
  return tx;
}

export async function getPortfolioSummary(workspaceId: string) {
  await assertFinanceAccess(workspaceId);

  const investments = await db
    .select()
    .from(financeInvestments)
    .where(eq(financeInvestments.workspaceId, workspaceId));

  let totalInvested = 0;
  let totalCurrent = 0;
  let totalProfitLoss = 0;
  const byType: Record<string, { invested: number; current: number }> = {};

  for (const inv of investments) {
    const qty = parseFloat(inv.quantity);
    const avgPrice = parseFloat(inv.averagePrice);
    const curPrice = inv.currentPrice ? parseFloat(inv.currentPrice) : avgPrice;
    const invested = qty * avgPrice;
    const current = qty * curPrice;

    totalInvested += invested;
    totalCurrent += current;

    if (!byType[inv.type]) byType[inv.type] = { invested: 0, current: 0 };
    byType[inv.type].invested += invested;
    byType[inv.type].current += current;
  }

  totalProfitLoss = totalCurrent - totalInvested;

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalCurrent: Math.round(totalCurrent * 100) / 100,
    totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
    totalProfitLossPercent: totalInvested > 0
      ? Math.round((totalProfitLoss / totalInvested) * 10000) / 100
      : 0,
    investmentCount: investments.length,
    byType: Object.entries(byType).reduce((acc, [key, val]) => {
      acc[key] = {
        invested: Math.round(val.invested * 100) / 100,
        current: Math.round(val.current * 100) / 100,
      };
      return acc;
    }, {} as Record<string, { invested: number; current: number }>),
  };
}
