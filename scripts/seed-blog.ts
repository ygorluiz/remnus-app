#!/usr/bin/env tsx
// Idempotent script: seeds docs/blog/ markdown files as public shared pages
// with custom admin slugs and in_sitemap=true.
//
// Run once after initial deployment, or again whenever blog content changes.
// Existing pages are updated in-place; missing pages are created from scratch.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, inArray } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

import * as schema from '../src/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── Blog page definitions — order matters: parents must come before children ──

type BlogPage = {
  slug: string;
  file: string;
  title: string;
  sortOrder: number;
  parentSlug: string | null;
  icon: string;
};

const BLOGS: BlogPage[] = [
  {
    slug: 'blog',
    file: 'README.md',
    title: 'Remnus Blog',
    sortOrder: 0,
    parentSlug: null,
    icon: '✍️',
  },
  {
    slug: 'blog/why-agpl-3',
    file: 'why-agpl-3.md',
    title: 'Why We Chose AGPL-3.0 for Remnus',
    sortOrder: 0,
    parentSlug: 'blog',
    icon: '⚖️',
  },
  {
    slug: 'blog/mcp-native-vs-integrated',
    file: 'mcp-native-vs-integrated.md',
    title: 'MCP-Native vs MCP-Integrated',
    sortOrder: 1,
    parentSlug: 'blog',
    icon: '🤖',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBlog(file: string): string {
  return readFileSync(join('docs', 'blog', file), 'utf8');
}

async function findAdminUser(): Promise<string | null> {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.role, ['admin', 'super_admin']))
    .limit(1);

  return user?.id ?? null;
}

async function findOrCreateBlogWorkspace(adminUserId: string): Promise<string> {
  const [existingRoot] = await db
    .select({ workspaceId: schema.sharedPages.workspaceId })
    .from(schema.sharedPages)
    .where(eq(schema.sharedPages.slug, 'blog'))
    .limit(1);

  if (existingRoot) return existingRoot.workspaceId;

  const workspaceId = crypto.randomUUID();
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: 'Remnus Blog',
    icon: '✍️',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.workspaceMembers).values({
    id: crypto.randomUUID(),
    workspaceId,
    userId: adminUserId,
    role: 'owner',
    createdAt: new Date(),
  });

  console.log(`  Created workspace: ${workspaceId}`);
  return workspaceId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding blog pages...\n');

  const adminUserId = await findAdminUser();
  if (!adminUserId) {
    console.log('No admin user found — skipping blog seed. Seed after the first admin signs in.');
    return;
  }
  console.log(`Admin user: ${adminUserId}`);

  const workspaceId = await findOrCreateBlogWorkspace(adminUserId);
  console.log(`Workspace: ${workspaceId}\n`);

  const slugToItemId = new Map<string, string>();

  for (const blog of BLOGS) {
    const content = readBlog(blog.file);

    const [existing] = await db
      .select({
        shareId: schema.sharedPages.id,
        pageId: schema.sharedPages.pageId,
      })
      .from(schema.sharedPages)
      .where(eq(schema.sharedPages.slug, blog.slug))
      .limit(1);

    if (existing) {
      await Promise.all([
        db
          .update(schema.workspaceItems)
          .set({ title: blog.title, icon: blog.icon, updatedAt: new Date() })
          .where(eq(schema.workspaceItems.id, existing.pageId)),
        db
          .update(schema.standalonePages)
          .set({ content, updatedAt: new Date() })
          .where(eq(schema.standalonePages.itemId, existing.pageId)),
        db
          .update(schema.sharedPages)
          .set({ inSitemap: true, width: 'wide' })
          .where(eq(schema.sharedPages.id, existing.shareId)),
      ]);

      slugToItemId.set(blog.slug, existing.pageId);
      console.log(`  [updated] /share/${blog.slug}`);
    } else {
      const parentItemId = blog.parentSlug ? (slugToItemId.get(blog.parentSlug) ?? null) : null;
      const itemId = crypto.randomUUID();

      await db.insert(schema.workspaceItems).values({
        id: itemId,
        workspaceId,
        type: 'page',
        title: blog.title,
        icon: blog.icon,
        parentId: parentItemId,
        sortOrder: blog.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(schema.standalonePages).values({
        id: crypto.randomUUID(),
        itemId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(schema.sharedPages).values({
        id: crypto.randomUUID(),
        slug: blog.slug,
        pageId: itemId,
        workspaceId,
        permission: 'read',
        width: 'wide',
        inSitemap: true,
        createdBy: adminUserId,
        createdAt: new Date(),
      });

      slugToItemId.set(blog.slug, itemId);
      console.log(`  [created] /share/${blog.slug}`);
    }
  }

  console.log('\nDone. Public URLs:');
  for (const blog of BLOGS) {
    console.log(`  https://remnus.com/share/${blog.slug}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
