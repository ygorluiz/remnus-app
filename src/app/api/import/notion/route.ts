import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import JSZip from 'jszip';
import { db } from '@/db';
import { workspaces, workspaceMembers, databases } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import {
  parseNotionExport,
  NotionTreeItem,
  normalizeNotionDate,
  stripImagePlaceholders,
  applyImageMap,
  type NotionImageEntry,
} from '@/lib/import/notion-parser';
import { createPageInWorkspace, createDatabaseInWorkspace } from '@/lib/services/workspace';
import { recordAsset } from '@/lib/services/assets';
import { SELECT_COLOR_ORDER, type SelectOptionColor } from '@/lib/types/properties';

const PALETTE = SELECT_COLOR_ORDER.filter(c => c !== 'default') as SelectOptionColor[];
function assignColors(options: string[]): { value: string; color: SelectOptionColor }[] {
  return options.map((value, i) => ({ value, color: PALETTE[i % PALETTE.length] }));
}

const ICON_PALETTE = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'] as const;
function randomIconColor(): string {
  return ICON_PALETTE[Math.floor(Math.random() * ICON_PALETTE.length)];
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024;

// ── Workspace creation ─────────────────────────────────────────────────────────

async function createWorkspaceForUser(userId: string, name: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(workspaces).values({ id, name: name.trim() || 'Untitled', createdAt: new Date() });
  await db.insert(workspaceMembers).values({ workspaceId: id, userId, role: 'owner', createdAt: new Date() });
  return id;
}

// ── Image upload ───────────────────────────────────────────────────────────────

async function uploadImageFromZip(
  zip: JSZip,
  zipPath: string,
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  try {
    const file = zip.files[zipPath];
    if (!file) return null;
    const buffer = await file.async('nodebuffer');

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'remnus/images',
          resource_type: 'image',
          transformation: [{ width: 1600, crop: 'limit' }],
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(buffer);
    });

    await recordAsset({
      publicId: result.public_id,
      resourceType: result.resource_type,
      kind: 'image',
      bytes: result.bytes,
      url: result.secure_url,
      userId,
      workspaceId,
    });

    return result.secure_url as string;
  } catch {
    return null; // best-effort: skip failed image
  }
}

/**
 * Upload all images for a space and return zipPath → cloudinaryUrl map.
 * Failed uploads are silently skipped (image ref will be stripped from content).
 */
async function buildImageMap(
  zip: JSZip,
  images: NotionImageEntry[],
  userId: string,
  workspaceId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // Upload concurrently in batches of 4 to avoid rate limits
  const BATCH = 4;
  for (let i = 0; i < images.length; i += BATCH) {
    const batch = images.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ({ zipPath }) => {
        const url = await uploadImageFromZip(zip, zipPath, userId, workspaceId);
        return { zipPath, url };
      }),
    );
    for (const { zipPath, url } of results) {
      if (url) map.set(zipPath, url);
    }
  }
  return map;
}

// ── Recursive import ───────────────────────────────────────────────────────────

async function importItems(
  items: NotionTreeItem[],
  workspaceId: string,
  parentId: string | undefined,
  counters: { pages: number; databases: number; rows: number; images: number },
  imageMap: Map<string, string>,
) {
  for (const item of items) {
    const content = imageMap.size > 0
      ? applyImageMap(item.content, imageMap)
      : stripImagePlaceholders(item.content);

    if (item.type === 'page') {
      const result = await createPageInWorkspace(workspaceId, {
        title: item.title || 'Untitled',
        content,
        parentId,
        iconColor: randomIconColor(),
      });
      counters.pages++;
      if (item.children.length > 0) {
        await importItems(item.children, workspaceId, result.id, counters, imageMap);
      }
    } else {
      const { id: _itemId, databaseId } = await createDatabaseInWorkspace(workspaceId, {
        name: item.title || 'Untitled',
        parentId,
        iconColor: randomIconColor(),
        schema: item.columns.length > 0
          ? item.columns.map(col => ({
              name: col.name,
              type: col.type,
              ...(col.options ? { options: assignColors(col.options) } : {}),
            }))
          : undefined,
      });
      counters.databases++;

      // Fetch schema to get generated column IDs
      const [dbRecord] = await db
        .select({ schema: databases.schema })
        .from(databases)
        .where(eq(databases.id, databaseId))
        .limit(1);
      const nameToId = new Map<string, string>();
      const idToType = new Map<string, string>();
      for (const col of (dbRecord?.schema ?? []) as { id: string; name: string; type: string }[]) {
        nameToId.set(col.name, col.id);
        idToType.set(col.id, col.type);
      }

      const firstColName = item.columns[0]?.name ?? 'Title';
      for (const row of item.rows) {
        const properties: Record<string, string | string[]> = {};
        for (const [k, v] of Object.entries(row.properties)) {
          if (k === firstColName || !v) continue;
          const colId = nameToId.get(k);
          if (!colId) continue;
          const colType = idToType.get(colId);
          if (colType === 'multi_select') {
            properties[colId] = v.split(',').map(s => s.trim()).filter(Boolean);
          } else if (colType === 'checkbox') {
            properties[colId] = /^(yes|true|☑|✓|checked)$/i.test(v) ? 'true' : 'false';
          } else if (colType === 'date' || colType === 'datetime') {
            properties[colId] = normalizeNotionDate(v);
          } else {
            properties[colId] = v;
          }
        }

        const rowContent = imageMap.size > 0
          ? applyImageMap(row.content, imageMap)
          : stripImagePlaceholders(row.content);

        await createPageInWorkspace(workspaceId, {
          databaseId,
          title: row.title || 'Untitled',
          content: rowContent,
          properties: Object.keys(properties).length > 0 ? properties : undefined,
        });
        counters.rows++;
      }
    }
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();

    const url = new URL(req.url);
    const isPreview = url.searchParams.get('preview') === '1';

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100 MB)' }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseNotionExport(buffer);

    if (isPreview) {
      return NextResponse.json({
        spaces: parsed.spaces.map(s => ({
          name: s.name,
          stats: s.stats,
        })),
      });
    }

    // Full import
    const user = await getCurrentUser();
    const selectedRaw  = formData.get('selectedSpaces');
    const importImages = formData.get('importImages') === '1';
    const selectedSpaces: string[] = selectedRaw
      ? JSON.parse(selectedRaw as string)
      : parsed.spaces.map(s => s.name);

    const results: {
      name: string;
      workspaceId: string;
      imported: { pages: number; databases: number; rows: number; images: number };
    }[] = [];

    for (const space of parsed.spaces) {
      if (!selectedSpaces.includes(space.name)) continue;
      const workspaceId = await createWorkspaceForUser(user.id, space.name);

      let imageMap = new Map<string, string>();
      if (importImages && space.images.length > 0) {
        imageMap = await buildImageMap(parsed.zip, space.images, user.id, workspaceId);
      }

      const counters = { pages: 0, databases: 0, rows: 0, images: imageMap.size };
      await importItems(space.items, workspaceId, undefined, counters, imageMap);
      results.push({ name: space.name, workspaceId, imported: counters });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    console.error('[import/notion]', err);
    return NextResponse.json({ error: err?.message ?? 'Import failed' }, { status: 500 });
  }
}
