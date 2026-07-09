'use server';

import { db } from '@/db';
import { financeCategories } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { categorySchema, categoryUpdateSchema } from '@/lib/services/finance/validation';

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

export type FinanceCategoryRow = {
  id: string;
  workspaceId: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  emoji: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createCategory(data: {
  workspaceId: string;
  name: string;
  parentId?: string;
  icon?: string;
  emoji?: string;
  color?: string;
}) {
  const parsed = categorySchema.parse(data);
  await assertFinanceAccess(parsed.workspaceId);

  const [category] = await db
    .insert(financeCategories)
    .values({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      parentId: parsed.parentId ?? null,
      icon: parsed.icon ?? null,
      emoji: parsed.emoji ?? null,
      color: parsed.color ?? null,
    })
    .returning();

  revalidatePath(`/finance/categories`);
  return category;
}

export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    parentId?: string;
    icon?: string;
    emoji?: string;
    color?: string;
  },
) {
  const parsed = categoryUpdateSchema.parse(data);

  const [existing] = await db
    .select({ workspaceId: financeCategories.workspaceId })
    .from(financeCategories)
    .where(eq(financeCategories.id, categoryId))
    .limit(1);
  if (!existing) throw new Error('Category not found');
  await assertFinanceAccess(existing.workspaceId);

  const [category] = await db
    .update(financeCategories)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(financeCategories.id, categoryId))
    .returning();

  revalidatePath(`/finance/categories`);
  return category;
}

export async function deleteCategory(categoryId: string) {
  const [existing] = await db
    .select({ workspaceId: financeCategories.workspaceId })
    .from(financeCategories)
    .where(eq(financeCategories.id, categoryId))
    .limit(1);
  if (!existing) throw new Error('Category not found');
  await assertFinanceAccess(existing.workspaceId);

  await db.delete(financeCategories).where(eq(financeCategories.id, categoryId));
  revalidatePath(`/finance/categories`);
}

export async function listCategories(workspaceId: string): Promise<FinanceCategoryRow[]> {
  await assertFinanceAccess(workspaceId);

  return db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.workspaceId, workspaceId))
    .orderBy(asc(financeCategories.name));
}

export async function getCategory(categoryId: string): Promise<FinanceCategoryRow | null> {
  const [category] = await db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.id, categoryId))
    .limit(1);

  if (category) {
    await assertFinanceAccess(category.workspaceId);
  }
  return category ?? null;
}
