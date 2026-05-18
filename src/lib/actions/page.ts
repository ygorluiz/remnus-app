'use server';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createPage(databaseId: string, title: string) {
  const id = crypto.randomUUID();
  // Find the highest sort order to put the new page at the bottom
  const existing = await db.select({ sortOrder: pages.sortOrder }).from(pages).where(eq(pages.databaseId, databaseId));
  const maxSort = existing.reduce((max, p) => p.sortOrder > max ? p.sortOrder : max, 0);

  await db.insert(pages).values({
    id,
    databaseId,
    title,
    content: '# ' + title,
    properties: { title: title, status: 'To Do' },
    sortOrder: maxSort + 1,
  });
  revalidatePath(`/db/${databaseId}`);
  return id;
}

export async function getPages(databaseId: string) {
  return db
    .select()
    .from(pages)
    .where(eq(pages.databaseId, databaseId))
    .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
}

export async function updatePageProperties(id: string, properties: any) {
  const page = await db.select().from(pages).where(eq(pages.id, id));
  if (!page[0]) return;
  await db.update(pages).set({ properties, updatedAt: new Date() }).where(eq(pages.id, id));
  // Path revalidation is context dependent, we can optionally revalidate the db page
}

export async function getPage(id: string) {
  const result = await db.select().from(pages).where(eq(pages.id, id));
  return result[0];
}

export async function updatePageContent(id: string, content: string) {
  await db.update(pages).set({ content, updatedAt: new Date() }).where(eq(pages.id, id));
}

export async function deletePage(id: string, databaseId: string) {
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath(`/db/${databaseId}`);
}

export async function reorderPages(databaseId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(pages)
        .set({ sortOrder: i })
        .where(eq(pages.id, orderedIds[i]));
    }
  });
  revalidatePath(`/db/${databaseId}`);
}
