import JSZip from 'jszip';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NotionColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'url' | 'email' | 'phone';
  options?: string[];
}

export interface NotionImageEntry {
  zipPath: string;
  sizeBytes: number;
}

export interface NotionDbRow {
  title: string;
  properties: Record<string, string>;
  content: string;
  imageRefs: string[];  // ZIP paths of images referenced in this row's content
}

export interface NotionTreeItem {
  type: 'page' | 'database';
  title: string;
  content: string;
  children: NotionTreeItem[];
  // database only
  columns: NotionColumn[];
  rows: NotionDbRow[];
  imageRefs: string[];  // ZIP paths of images referenced in this item's content
}

export interface NotionSpaceStats {
  pages: number;
  databases: number;
  rows: number;
  imageCount: number;
  imageBytes: number;
}

export interface NotionSpace {
  name: string;
  items: NotionTreeItem[];
  images: NotionImageEntry[];  // all unique images in this space
  stats: NotionSpaceStats;
}

export interface NotionParseResult {
  spaces: NotionSpace[];
  stats: { pages: number; databases: number; rows: number };
  zip: JSZip;  // raw zip for image reads during import
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOTION_ID_RE  = /\s+[0-9a-f]{8,32}(?:-[0-9a-f]{4})?$/i;
const UUID_FOLDER_RE = /^[0-9a-f]{32}$/i;

function extractTitle(basename: string): string {
  return basename.replace(NOTION_ID_RE, '').trim() || basename;
}

function isUuidFolder(name: string): boolean {
  return UUID_FOLDER_RE.test(name);
}

function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function getZipFileSize(zip: JSZip, path: string): number {
  const file = zip.files[path];
  if (!file) return 0;
  // JSZip stores uncompressed size in the central directory
  return (file as any)._data?.uncompressedSize ?? (file as any)._data?.compressedSize ?? 0;
}

// Minimal RFC-4180 CSV parser
function parseCSV(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  const text = stripBOM(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[][] = [];
  let cur = '';
  let inQuote = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = false; }
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); cur = ''; records.push(row); row = []; }
      else { cur += ch; }
    }
  }
  if (cur || row.length) { row.push(cur); records.push(row); }

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < records.length; i++) {
    if (records[i].every(c => !c.trim())) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => { obj[h] = (records[i][j] ?? '').trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}

const DATE_NAME_RE     = /\b(date|tarih|zaman|time|due|created|modified|düzenlenme|oluşturulma|deadline|bitiş|başlangıç|start|end)\b/i;
const NUM_NAME_RE      = /\b(price|fiyat|amount|miktar|adet|count|sayı|number|qty|total|toplam|puan|score|size|boyut|bytes|yaş|age|rating|oran)\b/i;
const EMAIL_NAME_RE    = /\b(e?mail|e-posta|email)\b/i;
const PHONE_NAME_RE    = /\b(phone|tel(?:efon)?|mobile|gsm|cep)\b/i;
const URL_NAME_RE      = /\b(url|link|website|web|site)\b/i;
const CHECKBOX_NAME_RE = /\b(done|tamamlandı|completed|tamamlama|aktif|active|enabled|onaylı|approved|check|onay)\b/i;
const DATE_VAL_RE      = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}|^[A-Z][a-z]+ \d{1,2},\s*\d{4}/;
const DATE_RANGE_VAL_RE = /^[A-Z][a-z]+ \d{1,2},\s*\d{4}\s*→/;
const EMAIL_VAL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_VAL_RE     = /^[\+\(\)\d\s\-]{7,20}$/;
const URL_VAL_RE       = /^https?:\/\//;
const CHECKBOX_VAL_RE  = /^(yes|no|true|false|☑|☐|✓|✗|checked|unchecked)$/i;

function inferColumnType(name: string, values: string[]): Pick<NotionColumn, 'type' | 'options'> {
  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length === 0) return { type: 'text' };

  if (EMAIL_NAME_RE.test(name) || nonEmpty.every(v => EMAIL_VAL_RE.test(v))) return { type: 'email' };
  if (PHONE_NAME_RE.test(name) || nonEmpty.every(v => PHONE_VAL_RE.test(v))) return { type: 'phone' };
  if (URL_NAME_RE.test(name) || nonEmpty.every(v => URL_VAL_RE.test(v))) return { type: 'url' };
  if (CHECKBOX_NAME_RE.test(name) || nonEmpty.every(v => CHECKBOX_VAL_RE.test(v))) return { type: 'checkbox' };
  if (DATE_NAME_RE.test(name)) return { type: 'date' };
  if (NUM_NAME_RE.test(name)) return { type: 'number' };

  const numericCount = nonEmpty.filter(v => /^-?\d+(\.\d+)?$/.test(v)).length;
  if (numericCount / nonEmpty.length > 0.8) return { type: 'number' };

  const dateRangeCount = nonEmpty.filter(v => DATE_RANGE_VAL_RE.test(v)).length;
  if (dateRangeCount / nonEmpty.length > 0.5) return { type: 'date' };

  const dateCount = nonEmpty.filter(v => DATE_VAL_RE.test(v)).length;
  if (dateCount / nonEmpty.length > 0.6) return { type: 'date' };

  const unique = [...new Set(nonEmpty)];
  if (unique.length <= 20 && nonEmpty.every(v => v.length <= 80)) {
    const hasComma = nonEmpty.some(v => v.includes(', ') && !v.match(/^[^,]{30,}/));
    if (hasComma) return { type: 'multi_select' };
    if (unique.length <= 15) return { type: 'select', options: unique };
  }

  return { type: 'text' };
}

// Normalize Notion date strings to ISO format (or "start/end" for ranges)
const NOTION_DATE_RE = /^([A-Z][a-z]+ \d{1,2},\s*\d{4})(\s+\d{1,2}:\d{2}\s*(?:AM|PM))?/i;

export function normalizeNotionDate(val: string): string {
  if (!val) return val;
  if (val.includes('→')) {
    const [startStr, endStr] = val.split('→').map(s => s.trim());
    const start = normalizeNotionDate(startStr);
    const end = normalizeNotionDate(endStr);
    return end ? `${start}/${end}` : start;
  }
  const m = NOTION_DATE_RE.exec(val);
  if (m) {
    const datePart = m[1];
    const timePart = m[2]?.trim();
    const d = new Date(datePart + (timePart ? ` ${timePart}` : ''));
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      if (timePart) {
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      }
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return val;
}

// Image file extensions recognized for upload
const IMG_EXT_RE = /\.(png|jpg|jpeg|gif|webp|svg)$/i;

/**
 * Scan the markdown content for local image references, replace them with
 * an internal placeholder `![alt](__NOTION_IMG__:zipPath)` so the import
 * route can later substitute real Cloudinary URLs (or strip them entirely).
 *
 * @param content   raw markdown content
 * @param mdDirPrefix  the ZIP directory prefix of the file containing this content
 * @returns processed content and array of referenced ZIP paths
 */
function extractAndReplaceMDImages(
  content: string,
  mdDirPrefix: string,
): { content: string; imageRefs: string[] } {
  const imageRefs: string[] = [];
  const processed = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, rawPath) => {
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return match;
      if (!IMG_EXT_RE.test(rawPath.split('?')[0])) return match;
      const decoded = decodeURIComponent(rawPath.split('?')[0]);
      const zipPath = mdDirPrefix + decoded;
      imageRefs.push(zipPath);
      return `![${alt}](__NOTION_IMG__:${zipPath})`;
    },
  );
  return { content: processed, imageRefs };
}

// Strip remaining __NOTION_IMG__ placeholders from content (when not importing images)
export function stripImagePlaceholders(content: string): string {
  return content.replace(/!\[([^\]]*)\]\(__NOTION_IMG__:[^)]+\)/g, '');
}

// Replace __NOTION_IMG__ placeholders with real URLs from the map
export function applyImageMap(content: string, imageMap: Map<string, string>): string {
  return content.replace(/!\[([^\]]*)\]\(__NOTION_IMG__:([^)]+)\)/g, (_, alt, zipPath) => {
    const url = imageMap.get(zipPath);
    return url ? `![${alt}](${url})` : '';
  });
}

// Convert [Title](relative/path.md) → **Title**  (dead relative links)
function cleanMDLinks(content: string): string {
  return content.replace(/\[([^\]]+)\]\([^)]+\.md[^)]*\)/g, '**$1**');
}

// ── Tree builder ───────────────────────────────────────────────────────────────

async function buildItems(
  zip: JSZip,
  allPaths: string[],
  dirPrefix: string,
  spaceImages: Map<string, number>,  // zipPath → sizeBytes (accumulates across calls)
): Promise<NotionTreeItem[]> {
  const direct = new Set<string>();

  for (const p of allPaths) {
    if (!p.startsWith(dirPrefix)) continue;
    const rest = p.slice(dirPrefix.length);
    if (!rest) continue;
    const seg = rest.split('/')[0];
    if (seg) direct.add(seg);
  }

  const items: NotionTreeItem[] = [];
  const seenTitles = new Set<string>();

  const dbTitles = new Set<string>();
  for (const seg of direct) {
    if (seg.endsWith('_all.csv')) {
      dbTitles.add(extractTitle(seg.replace(/_all\.csv$/i, '')));
    }
  }

  for (const seg of direct) {
    const fullPath = dirPrefix + seg;
    const isDir = zip.files[fullPath]?.dir ?? allPaths.some(p => p.startsWith(fullPath + '/'));

    if (isDir && isUuidFolder(seg)) {
      const subItems = await buildItems(zip, allPaths, fullPath + '/', spaceImages);
      items.push(...subItems);
      continue;
    }

    if (seg.endsWith('.csv') && !seg.endsWith('_all.csv')) continue;
    if (/\.(mp4|xlsx|docx|pdf|zip)$/i.test(seg)) continue;
    // Track images at this level (they'll be referenced by MD files here)
    if (IMG_EXT_RE.test(seg)) {
      if (!spaceImages.has(fullPath)) {
        spaceImages.set(fullPath, getZipFileSize(zip, fullPath));
      }
      continue;
    }

    if (seg.endsWith('_all.csv')) {
      const title = extractTitle(seg.replace(/_all\.csv$/i, ''));
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const csvContent = await zip.files[fullPath]?.async('string') ?? '';
      const { headers, rows } = parseCSV(csvContent);

      const META_COLS = new Set([
        'Person', 'Created by', 'Last edited by',
        'Created time', 'Last edited time',
        'Oluşturulma Tarihi', 'Son Düzenlenme Tarihi',
      ]);
      const titleColName = headers[0] ?? 'Title';
      const columns: NotionColumn[] = headers
        .filter(h => !META_COLS.has(h))
        .map(h => {
          const vals = rows.map(r => r[h] ?? '');
          const inferred = inferColumnType(h, vals);
          return { name: h, ...inferred };
        });

      const rowDirPrefix = dirPrefix + title + '/';
      const rowMdByTitle = new Map<string, { content: string; imageRefs: string[] }>();
      for (const p of allPaths) {
        if (p.startsWith(rowDirPrefix) && p.endsWith('.md')) {
          const rowBase = p.slice(rowDirPrefix.length).split('/')[0];
          const rowTitle = extractTitle(rowBase.replace(/\.md$/i, ''));
          const rawContent = await zip.files[p]?.async('string') ?? '';
          const withImgPlaceholders = extractAndReplaceMDImages(rawContent, rowDirPrefix);
          const cleaned = cleanMDLinks(withImgPlaceholders.content);
          withImgPlaceholders.imageRefs.forEach(ref => {
            if (!spaceImages.has(ref)) spaceImages.set(ref, getZipFileSize(zip, ref));
          });
          rowMdByTitle.set(rowTitle, { content: cleaned, imageRefs: withImgPlaceholders.imageRefs });
        }
      }

      const dbRows: NotionDbRow[] = rows.map(r => {
        const rowTitle = r[titleColName] || 'Untitled';
        const rowData = rowMdByTitle.get(rowTitle) ?? { content: '', imageRefs: [] };
        return {
          title: rowTitle,
          properties: r,
          content: rowData.content,
          imageRefs: rowData.imageRefs,
        };
      });

      items.push({ type: 'database', title, content: '', children: [], columns, rows: dbRows, imageRefs: [] });
      continue;
    }

    if (seg.endsWith('.md') && !isDir) {
      const title = extractTitle(seg.replace(/\.md$/i, ''));
      if (seenTitles.has(title)) continue;
      if (dbTitles.has(title)) continue;
      seenTitles.add(title);

      const rawContent = await zip.files[fullPath]?.async('string') ?? '';
      const withImgPlaceholders = extractAndReplaceMDImages(rawContent, dirPrefix);
      const content = cleanMDLinks(withImgPlaceholders.content);
      withImgPlaceholders.imageRefs.forEach(ref => {
        if (!spaceImages.has(ref)) spaceImages.set(ref, getZipFileSize(zip, ref));
      });

      const childDirPrefix = dirPrefix + title + '/';
      const hasChildren = allPaths.some(p => p.startsWith(childDirPrefix));
      const children = hasChildren ? await buildItems(zip, allPaths, childDirPrefix, spaceImages) : [];

      items.push({ type: 'page', title, content, children, columns: [], rows: [], imageRefs: withImgPlaceholders.imageRefs });
      continue;
    }

    if (isDir && !isUuidFolder(seg)) {
      const title = seg;
      if (dbTitles.has(title)) continue;
      if (!seenTitles.has(title)) {
        seenTitles.add(title);
        const children = await buildItems(zip, allPaths, fullPath + '/', spaceImages);
        items.push({ type: 'page', title, content: '', children, columns: [], rows: [], imageRefs: [] });
      }
    }
  }

  return items;
}

// ── Stats helpers ──────────────────────────────────────────────────────────────

function collectSpaceStats(items: NotionTreeItem[], acc: NotionSpaceStats): void {
  for (const item of items) {
    if (item.type === 'page') {
      acc.pages++;
      collectSpaceStats(item.children, acc);
    } else {
      acc.databases++;
      acc.rows += item.rows.length;
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function parseNotionExport(buffer: Buffer): Promise<NotionParseResult> {
  let workingZip = await JSZip.loadAsync(buffer);

  const innerZipName = Object.keys(workingZip.files).find(f => f.endsWith('.zip'));
  if (innerZipName) {
    const innerBuf = await workingZip.files[innerZipName].async('nodebuffer');
    workingZip = await JSZip.loadAsync(innerBuf);
  }

  const allPaths = Object.keys(workingZip.files).filter(p => !workingZip.files[p].dir);

  const rootFolder = allPaths[0]?.split('/')[0];
  if (!rootFolder) throw new Error('Empty or invalid Notion export ZIP');
  const rootPrefix = rootFolder + '/';

  const topLevelDirs = new Set<string>();
  const topLevelFiles: string[] = [];
  for (const p of allPaths) {
    if (!p.startsWith(rootPrefix)) continue;
    const rest = p.slice(rootPrefix.length);
    const seg = rest.split('/')[0];
    if (!seg) continue;
    if (rest.includes('/')) topLevelDirs.add(seg);
    else topLevelFiles.push(seg);
  }

  const spaces: NotionSpace[] = [];

  for (const dir of topLevelDirs) {
    if (isUuidFolder(dir)) continue;
    const spacePrefix = rootPrefix + dir + '/';
    const spaceImages = new Map<string, number>();
    const items = await buildItems(workingZip, allPaths, spacePrefix, spaceImages);
    if (items.length === 0 && spaceImages.size === 0) continue;

    const imageEntries: NotionImageEntry[] = [...spaceImages.entries()].map(([zipPath, sizeBytes]) => ({ zipPath, sizeBytes }));
    const statsAcc: NotionSpaceStats = { pages: 0, databases: 0, rows: 0, imageCount: imageEntries.length, imageBytes: imageEntries.reduce((s, e) => s + e.sizeBytes, 0) };
    collectSpaceStats(items, statsAcc);
    spaces.push({ name: dir, items, images: imageEntries, stats: statsAcc });
  }

  // Loose .md files at root → "Private" space
  const rootMdFiles = topLevelFiles.filter(f => f.endsWith('.md'));
  if (rootMdFiles.length > 0) {
    const spaceImages = new Map<string, number>();
    const items: NotionTreeItem[] = [];
    for (const seg of rootMdFiles) {
      const title = extractTitle(seg.replace(/\.md$/i, ''));
      const rawContent = await workingZip.files[rootPrefix + seg]?.async('string') ?? '';
      const withImgPlaceholders = extractAndReplaceMDImages(rawContent, rootPrefix);
      const content = cleanMDLinks(withImgPlaceholders.content);
      withImgPlaceholders.imageRefs.forEach(ref => {
        if (!spaceImages.has(ref)) spaceImages.set(ref, getZipFileSize(workingZip, ref));
      });
      items.push({ type: 'page', title, content, children: [], columns: [], rows: [], imageRefs: withImgPlaceholders.imageRefs });
    }
    const imageEntries: NotionImageEntry[] = [...spaceImages.entries()].map(([zipPath, sizeBytes]) => ({ zipPath, sizeBytes }));
    const statsAcc: NotionSpaceStats = { pages: items.length, databases: 0, rows: 0, imageCount: imageEntries.length, imageBytes: imageEntries.reduce((s, e) => s + e.sizeBytes, 0) };
    const privateSpace = spaces.find(s => s.name === 'Private & Shared');
    if (privateSpace) {
      privateSpace.items.push(...items);
      privateSpace.images.push(...imageEntries);
      privateSpace.stats.pages += statsAcc.pages;
      privateSpace.stats.imageCount += statsAcc.imageCount;
      privateSpace.stats.imageBytes += statsAcc.imageBytes;
    } else {
      spaces.push({ name: 'Private', items, images: imageEntries, stats: statsAcc });
    }
  }

  let pages = 0, databases = 0, rows = 0;
  for (const s of spaces) { pages += s.stats.pages; databases += s.stats.databases; rows += s.stats.rows; }

  return { spaces, stats: { pages, databases, rows }, zip: workingZip };
}
