'use server';
import { db } from '@/db';
import { databases, workspaceItems, workspaceMembers, pages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { createWorkspaceDatabase, getActiveWorkspaceId } from './workspace';
import { publish } from '@/lib/realtime/publish';

// Verify user has access to the workspace that owns this database.
// Returns { userId, workspaceId } so callers can emit realtime events.
async function assertDatabaseAccess(databaseId: string): Promise<{ userId: string; workspaceId: string }> {
  const user = await getCurrentUser();

  const [row] = await db
    .select({ workspaceId: workspaceItems.workspaceId })
    .from(databases)
    .innerJoin(workspaceItems, eq(databases.itemId, workspaceItems.id))
    .where(eq(databases.id, databaseId))
    .limit(1);

  if (!row) throw new Error('Database not found');

  if (user.role !== 'admin') {
    const [member] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, row.workspaceId),
          eq(workspaceMembers.userId, user.id),
        ),
      )
      .limit(1);

    if (!member) throw new Error('Unauthorized: no access to this database');
  }

  return { userId: user.id, workspaceId: row.workspaceId };
}

export async function createDatabase(name: string) {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace');
  const { dbId } = await createWorkspaceDatabase(workspaceId, name);
  revalidatePath('/', 'layout');
  return dbId;
}

export async function getDatabases() {
  return db.select().from(databases);
}

export async function getDatabase(id: string) {
  await assertDatabaseAccess(id);

  const result = await db
    .select({
      id: databases.id,
      name: databases.name,
      itemId: databases.itemId,
      schema: databases.schema,
      views: databases.views,
      createdAt: databases.createdAt,
      updatedAt: databases.updatedAt,
      icon: workspaceItems.icon,
      iconColor: workspaceItems.iconColor,
      workspaceId: workspaceItems.workspaceId,
      parentId: workspaceItems.parentId,
    })
    .from(databases)
    .leftJoin(workspaceItems, eq(databases.itemId, workspaceItems.id))
    .where(eq(databases.id, id));
  return result[0];
}

export async function updateDatabaseSchema(id: string, newSchema: any[]) {
  const { userId, workspaceId } = await assertDatabaseAccess(id);

  // 1. Fetch current database schema to compare
  const [dbRow] = await db
    .select({ schema: databases.schema })
    .from(databases)
    .where(eq(databases.id, id))
    .limit(1);

  const oldSchema = dbRow?.schema ?? [];

  // 2. Identify select/multi_select option renames
  const renames: { colId: string; type: string; oldVal: string; newVal: string }[] = [];
  for (const newCol of newSchema) {
    if (newCol.type !== 'select' && newCol.type !== 'multi_select' && newCol.type !== 'status') continue;
    const oldCol = oldSchema.find((c: any) => c.id === newCol.id);
    if (!oldCol) continue;

    const oldOpts = oldCol.options ?? [];
    const newOpts = newCol.options ?? [];
    const minLen = Math.min(oldOpts.length, newOpts.length);

    for (let i = 0; i < minLen; i++) {
      const oldOpt = oldOpts[i];
      const newOpt = newOpts[i];
      if (!oldOpt || !newOpt) continue;

      const oldVal = typeof oldOpt === 'string' ? oldOpt : oldOpt.value;
      const newVal = typeof newOpt === 'string' ? newOpt : newOpt.value;

      if (oldVal && newVal && oldVal !== newVal) {
        renames.push({ colId: newCol.id, type: newCol.type, oldVal, newVal });
      }
    }
  }

  // 3. Update the database schema first
  await db.update(databases).set({ schema: newSchema, updatedAt: new Date() }).where(eq(databases.id, id));

  // 4. If renames were detected, update all database rows (pages) properties in SQLite
  if (renames.length > 0) {
    const dbPages = await db
      .select({ id: pages.id, properties: pages.properties })
      .from(pages)
      .where(eq(pages.databaseId, id));

    for (const pageRow of dbPages) {
      const properties = pageRow.properties ?? {};
      let changed = false;

      for (const rename of renames) {
        const currentVal = properties[rename.colId];
        if (rename.type === 'select' || rename.type === 'status') {
          if (currentVal === rename.oldVal) {
            properties[rename.colId] = rename.newVal;
            changed = true;
          }
        } else if (rename.type === 'multi_select' && Array.isArray(currentVal)) {
          const updatedList = currentVal.map((v: string) => v === rename.oldVal ? rename.newVal : v);
          if (JSON.stringify(updatedList) !== JSON.stringify(currentVal)) {
            properties[rename.colId] = updatedList;
            changed = true;
          }
        }
      }

      if (changed) {
        await db
          .update(pages)
          .set({ properties, updatedAt: new Date() })
          .where(eq(pages.id, pageRow.id));
      }
    }
  }

  revalidatePath(`/db/${id}`);
  publish({ scope: 'database', workspaceId, resourceId: id, actorId: userId });
}

export async function updateDatabaseViews(id: string, views: any[]) {
  const { userId, workspaceId } = await assertDatabaseAccess(id);
  await db.update(databases).set({ views, updatedAt: new Date() }).where(eq(databases.id, id));
  publish({ scope: 'database', workspaceId, resourceId: id, actorId: userId });
}
