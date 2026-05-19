'use server';
import { db } from '@/db';
import { workspaces, workspaceItems, standalonePages, databases, pages, workspaceMembers, users } from '@/db/schema';
import { eq, isNull, asc, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import type { SchemaColumn } from '@/lib/templates';
import type { DatabaseView } from '@/lib/types/views';

export interface CreateDatabaseOptions {
  schema?: SchemaColumn[];
  views?: DatabaseView[];
  icon?: string | null;
  iconColor?: string | null;
}

export type WorkspaceItemRow = {
  id: string;
  workspaceId: string;
  type: 'page' | 'database';
  title: string;
  parentId: string | null;
  sortOrder: number;
  icon: string | null;
  iconColor: string | null;
  createdAt: Date;
  updatedAt: Date;
  databaseId: string | null;
};

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user as { id: string; role: string; name?: string | null; email?: string | null; image?: string | null };
}

async function assertWorkspaceAccess(workspaceId: string): Promise<string> {
  const user = await getCurrentUser();
  if (user.role === 'admin') return user.id;

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

  if (!member) throw new Error('Unauthorized: no access to this workspace');
  return user.id;
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export async function getActiveWorkspaceId(): Promise<string | null> {
  const user = await getCurrentUser();

  const cookieStore = await cookies();
  let workspaceId = cookieStore.get('remna_workspace_id')?.value;

  if (workspaceId) {
    // Verify user still has access to the stored workspace
    const isAdmin = user.role === 'admin';
    if (isAdmin) {
      const ws = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
      if (ws[0]) return workspaceId;
    } else {
      const [member] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .limit(1);
      if (member) return workspaceId;
    }
  }

  // Fall back to first accessible workspace
  const accessible = await getWorkspaces();
  if (accessible[0]) {
    cookieStore.set('remna_workspace_id', accessible[0].id, { path: '/' });
    return accessible[0].id;
  }

  return null;
}

export async function getWorkspaces() {
  const user = await getCurrentUser();

  if (user.role === 'admin') {
    return db.select().from(workspaces).orderBy(asc(workspaces.createdAt));
  }

  // Regular user: only workspaces they're a member of
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));

  if (memberships.length === 0) return [];

  const ids = memberships.map((m) => m.workspaceId);
  return db
    .select()
    .from(workspaces)
    .where(inArray(workspaces.id, ids))
    .orderBy(asc(workspaces.createdAt));
}

export async function createWorkspace(name: string) {
  const user = await getCurrentUser();
  const id = crypto.randomUUID();

  await db.insert(workspaces).values({
    id,
    name: name.trim() || 'Untitled Workspace',
  });

  // Creator becomes owner
  await db.insert(workspaceMembers).values({
    workspaceId: id,
    userId: user.id,
    role: 'owner',
  });

  const cookieStore = await cookies();
  cookieStore.set('remna_workspace_id', id, { path: '/' });
  revalidatePath('/');
  return { id };
}

export async function deleteWorkspace(id: string) {
  await assertWorkspaceAccess(id);

  const accessible = await getWorkspaces();
  if (accessible.length <= 1) {
    return { error: 'Cannot delete your only workspace' };
  }

  await db.delete(workspaces).where(eq(workspaces.id, id));

  const cookieStore = await cookies();
  if (cookieStore.get('remna_workspace_id')?.value === id) {
    const remaining = accessible.find((w) => w.id !== id);
    if (remaining) {
      cookieStore.set('remna_workspace_id', remaining.id, { path: '/' });
    } else {
      cookieStore.delete('remna_workspace_id');
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function renameWorkspace(id: string, name: string) {
  await assertWorkspaceAccess(id);
  await db.update(workspaces)
    .set({ name: name.trim() || 'Untitled Workspace', updatedAt: new Date() })
    .where(eq(workspaces.id, id));

  revalidatePath('/');
  return { success: true };
}

export async function switchWorkspace(workspaceId: string) {
  await assertWorkspaceAccess(workspaceId);
  const cookieStore = await cookies();
  cookieStore.set('remna_workspace_id', workspaceId, { path: '/' });
  revalidatePath('/');
  return { success: true };
}

// ── Workspace items ───────────────────────────────────────────────────────────

export async function getWorkspaceItems(workspaceId: string): Promise<WorkspaceItemRow[]> {
  await assertWorkspaceAccess(workspaceId);

  const items = await db.select().from(workspaceItems)
    .where(and(eq(workspaceItems.workspaceId, workspaceId), isNull(workspaceItems.parentId)))
    .orderBy(asc(workspaceItems.sortOrder), asc(workspaceItems.createdAt));

  const dbRows = await db.select({ itemId: databases.itemId, dbId: databases.id }).from(databases);
  const dbMap = new Map(dbRows.filter((r) => r.itemId).map((r) => [r.itemId!, r.dbId]));

  return items.map((item) => ({
    ...item,
    databaseId: item.type === 'database' ? (dbMap.get(item.id) ?? null) : null,
  }));
}

export async function getAllWorkspaceItems(): Promise<WorkspaceItemRow[]> {
  const user = await getCurrentUser();

  let accessibleWorkspaceIds: string[];

  if (user.role === 'admin') {
    const all = await db.select({ id: workspaces.id }).from(workspaces);
    accessibleWorkspaceIds = all.map((w) => w.id);
  } else {
    const memberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id));
    accessibleWorkspaceIds = memberships.map((m) => m.workspaceId);
  }

  if (accessibleWorkspaceIds.length === 0) return [];

  const items = await db.select().from(workspaceItems)
    .where(and(
      inArray(workspaceItems.workspaceId, accessibleWorkspaceIds),
      isNull(workspaceItems.parentId),
    ))
    .orderBy(asc(workspaceItems.sortOrder), asc(workspaceItems.createdAt));

  const dbRows = await db.select({ itemId: databases.itemId, dbId: databases.id }).from(databases);
  const dbMap = new Map(dbRows.filter((r) => r.itemId).map((r) => [r.itemId!, r.dbId]));

  return items.map((item) => ({
    ...item,
    databaseId: item.type === 'database' ? (dbMap.get(item.id) ?? null) : null,
  }));
}

export async function createStandalonePage(
  workspaceId: string,
  title: string,
  parentId?: string,
  options?: { initialContent?: string; icon?: string | null; iconColor?: string | null },
) {
  await assertWorkspaceAccess(workspaceId);

  const itemId = crypto.randomUUID();
  const pageId = crypto.randomUUID();

  await db.insert(workspaceItems).values({
    id: itemId,
    workspaceId,
    type: 'page',
    title: title || 'Untitled',
    parentId: parentId ?? null,
    sortOrder: 0,
    icon: options?.icon ?? null,
    iconColor: options?.iconColor ?? null,
  });

  await db.insert(standalonePages).values({
    id: pageId,
    itemId,
    content: options?.initialContent ?? '',
  });

  revalidatePath('/');
  return { itemId, pageId };
}

export async function createWorkspaceDatabase(
  workspaceId: string,
  name: string,
  options?: CreateDatabaseOptions,
) {
  await assertWorkspaceAccess(workspaceId);

  const itemId = crypto.randomUUID();
  const dbId = crypto.randomUUID();

  await db.insert(workspaceItems).values({
    id: itemId,
    workspaceId,
    type: 'database',
    title: name,
    sortOrder: 0,
    icon: options?.icon ?? null,
    iconColor: options?.iconColor ?? null,
  });

  await db.insert(databases).values({
    id: dbId,
    name,
    itemId,
    schema: options?.schema ?? [
      { id: 'title', name: 'Title', type: 'text' },
      { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
    ],
    views: options?.views ?? null,
  });

  revalidatePath('/');
  return { itemId, dbId };
}

export async function getStandalonePageByItemId(itemId: string) {
  const item = await db.select().from(workspaceItems).where(eq(workspaceItems.id, itemId));
  if (!item[0] || item[0].type !== 'page') return null;

  await assertWorkspaceAccess(item[0].workspaceId);

  const page = await db.select().from(standalonePages).where(eq(standalonePages.itemId, itemId));
  return { item: item[0], page: page[0] ?? null };
}

export async function updateStandalonePageContent(itemId: string, content: string) {
  const item = await db.select({ workspaceId: workspaceItems.workspaceId }).from(workspaceItems).where(eq(workspaceItems.id, itemId)).limit(1);
  if (item[0]) await assertWorkspaceAccess(item[0].workspaceId);

  await db.update(standalonePages)
    .set({ content, updatedAt: new Date() })
    .where(eq(standalonePages.itemId, itemId));
}

export async function updateWorkspaceItemTitle(itemId: string, title: string) {
  const item = await db.select({ workspaceId: workspaceItems.workspaceId }).from(workspaceItems).where(eq(workspaceItems.id, itemId)).limit(1);
  if (item[0]) await assertWorkspaceAccess(item[0].workspaceId);

  await db.update(workspaceItems)
    .set({ title, updatedAt: new Date() })
    .where(eq(workspaceItems.id, itemId));

  await db.update(databases)
    .set({ name: title, updatedAt: new Date() })
    .where(eq(databases.itemId, itemId));

  revalidatePath('/');
}

export async function getDatabaseByItemId(itemId: string) {
  const item = await db.select({ workspaceId: workspaceItems.workspaceId }).from(workspaceItems).where(eq(workspaceItems.id, itemId)).limit(1);
  if (item[0]) await assertWorkspaceAccess(item[0].workspaceId);

  const result = await db.select().from(databases).where(eq(databases.itemId, itemId));
  return result[0] ?? null;
}

export async function updateWorkspaceItemIcon(itemId: string, icon: string | null, iconColor: string | null) {
  const item = await db.select({ workspaceId: workspaceItems.workspaceId }).from(workspaceItems).where(eq(workspaceItems.id, itemId)).limit(1);
  if (item[0]) await assertWorkspaceAccess(item[0].workspaceId);

  await db.update(workspaceItems)
    .set({ icon, iconColor, updatedAt: new Date() })
    .where(eq(workspaceItems.id, itemId));

  revalidatePath('/');
}

export async function deleteWorkspaceItem(itemId: string) {
  const item = await db.select().from(workspaceItems).where(eq(workspaceItems.id, itemId));
  if (!item[0]) return;

  await assertWorkspaceAccess(item[0].workspaceId);

  if (item[0].type === 'database') {
    await db.delete(databases).where(eq(databases.itemId, itemId));
  }

  await db.delete(workspaceItems).where(eq(workspaceItems.id, itemId));
  revalidatePath('/');
}

export async function duplicateWorkspaceItem(itemId: string) {
  const item = await db.select().from(workspaceItems).where(eq(workspaceItems.id, itemId));
  if (!item[0]) return null;

  await assertWorkspaceAccess(item[0].workspaceId);

  const newItemId = crypto.randomUUID();
  await db.insert(workspaceItems).values({
    id: newItemId,
    workspaceId: item[0].workspaceId,
    type: item[0].type,
    title: `${item[0].title} (Copy)`,
    parentId: item[0].parentId,
    sortOrder: item[0].sortOrder + 1,
    icon: item[0].icon,
    iconColor: item[0].iconColor,
  });

  if (item[0].type === 'page') {
    const sp = await db.select().from(standalonePages).where(eq(standalonePages.itemId, itemId));
    await db.insert(standalonePages).values({
      id: crypto.randomUUID(),
      itemId: newItemId,
      content: sp[0]?.content ?? '',
    });
    revalidatePath('/');
    return { type: 'page' as const, itemId: newItemId };
  } else {
    const dbRow = await db.select().from(databases).where(eq(databases.itemId, itemId));
    if (!dbRow[0]) { revalidatePath('/'); return null; }

    const newDbId = crypto.randomUUID();
    await db.insert(databases).values({
      id: newDbId,
      name: `${dbRow[0].name} (Copy)`,
      itemId: newItemId,
      schema: dbRow[0].schema,
      views: dbRow[0].views,
    });

    const existingPages = await db.select().from(pages).where(eq(pages.databaseId, dbRow[0].id));
    for (const p of existingPages) {
      await db.insert(pages).values({
        id: crypto.randomUUID(),
        databaseId: newDbId,
        title: p.title,
        content: p.content,
        properties: p.properties,
        sortOrder: p.sortOrder,
        icon: p.icon,
        iconColor: p.iconColor,
      });
    }

    revalidatePath('/');
    return { type: 'database' as const, dbId: newDbId };
  }
}
