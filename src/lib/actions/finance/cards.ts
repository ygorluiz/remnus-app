'use server';

import { db } from '@/db';
import { financeCards } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
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

const cardSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  brand: z.enum(['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other']).default('other'),
  bank: z.string().max(100).optional(),
  creditLimitCents: z.number().int().default(0),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  isVirtual: z.boolean().default(false),
  linkedAccountId: z.string().optional(),
});

const cardUpdateSchema = cardSchema.partial().omit({ workspaceId: true });

export type FinanceCardRow = {
  id: string;
  workspaceId: string;
  name: string;
  brand: string;
  bank: string | null;
  creditLimitCents: number;
  closingDay: number | null;
  dueDay: number | null;
  color: string | null;
  icon: string | null;
  isVirtual: boolean;
  linkedAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createCard(data: z.infer<typeof cardSchema>) {
  const parsed = cardSchema.parse(data);
  await assertFinanceAccess(parsed.workspaceId);

  const [card] = await db
    .insert(financeCards)
    .values({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      brand: parsed.brand,
      bank: parsed.bank ?? null,
      creditLimitCents: parsed.creditLimitCents,
      closingDay: parsed.closingDay ?? null,
      dueDay: parsed.dueDay ?? null,
      color: parsed.color ?? null,
      icon: parsed.icon ?? null,
      isVirtual: parsed.isVirtual,
      linkedAccountId: parsed.linkedAccountId ?? null,
    })
    .returning();

  revalidatePath('/finance/cards');
  return card;
}

export async function updateCard(cardId: string, data: z.infer<typeof cardUpdateSchema>) {
  const parsed = cardUpdateSchema.parse(data);

  const [existing] = await db
    .select({ workspaceId: financeCards.workspaceId })
    .from(financeCards)
    .where(eq(financeCards.id, cardId))
    .limit(1);
  if (!existing) throw new Error('Card not found');
  await assertFinanceAccess(existing.workspaceId);

  const [card] = await db
    .update(financeCards)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(financeCards.id, cardId))
    .returning();

  revalidatePath('/finance/cards');
  return card;
}

export async function deleteCard(cardId: string) {
  const [existing] = await db
    .select({ workspaceId: financeCards.workspaceId })
    .from(financeCards)
    .where(eq(financeCards.id, cardId))
    .limit(1);
  if (!existing) throw new Error('Card not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeCards).where(eq(financeCards.id, cardId));
  revalidatePath('/finance/cards');
}

export async function listCards(workspaceId: string): Promise<FinanceCardRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeCards)
    .where(eq(financeCards.workspaceId, workspaceId))
    .orderBy(asc(financeCards.name));
}

export async function getCard(cardId: string): Promise<FinanceCardRow | null> {
  const [card] = await db
    .select()
    .from(financeCards)
    .where(eq(financeCards.id, cardId))
    .limit(1);

  if (card) await assertFinanceAccess(card.workspaceId);
  return card ?? null;
}
