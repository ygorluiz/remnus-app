import type { Fragment } from '@tiptap/pm/model';

// ─────────────────────────────────────────────────────────────────────────────
// Clipboard markdown serialization.
//
// The editor's STORAGE serializer (getMarkdown / manager.serialize) emits the
// atom blocks (callout, image, bookmark, file, youtube, child page, page link)
// as single-line `<div data-*>` / `<a data-page-link>` HTML blocks so they
// round-trip losslessly back into the same node on reload. That HTML is correct
// for storage but ugly on the CLIPBOARD — copying a callout would put a raw
// `<div data-callout-…>` onto the clipboard.
//
// This module post-processes that storage markdown into clipboard-friendly
// markdown: the HTML atom blocks become readable markdown (a blockquote, an
// image, a link, a URL…) and excess blank lines are collapsed. Used by BOTH
// copy paths so a native text selection and the marquee block selection produce
// identical, clean markdown.
// ─────────────────────────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Read a single `name="value"` attribute out of a matched HTML element string.
function getAttr(el: string, name: string): string {
  const m = new RegExp(`${name}="([^"]*)"`).exec(el);
  return m ? decodeEntities(m[1]) : '';
}

/**
 * Turn the editor's storage markdown (which may contain `<div data-*>` /
 * `<a data-page-link>` atom blocks) into clipboard-friendly markdown.
 */
export function cleanupCopiedMarkdown(md: string): string {
  let out = md;

  // Callout → blockquote (`> 💡 text`), each inner line prefixed so multi-line
  // callout bodies stay inside the quote.
  out = out.replace(/<div [^>]*data-callout-color="[^"]*"[^>]*><\/div>/g, (el) => {
    const icon = getAttr(el, 'data-callout-icon');
    const text = getAttr(el, 'data-callout-text');
    const body = `${icon ? icon + ' ' : ''}${text}`.trim();
    return body
      .split('\n')
      .map((line) => `> ${line}`.trimEnd())
      .join('\n');
  });

  // Image → ![alt](src)
  out = out.replace(/<div [^>]*data-img-src="[^"]*"[^>]*><\/div>/g, (el) => {
    const src = getAttr(el, 'data-img-src');
    const alt = getAttr(el, 'data-img-alt');
    return src ? `![${alt}](${src})` : '';
  });

  // Bookmark → [title](url)
  out = out.replace(/<div [^>]*data-bm-url="[^"]*"[^>]*><\/div>/g, (el) => {
    const url = getAttr(el, 'data-bm-url');
    const title = getAttr(el, 'data-bm-title') || url;
    return url ? `[${title}](${url})` : '';
  });

  // File → [name](url)
  out = out.replace(/<div [^>]*data-file-url="[^"]*"[^>]*><\/div>/g, (el) => {
    const url = getAttr(el, 'data-file-url');
    const name = getAttr(el, 'data-file-name') || url;
    return url ? `[${name}](${url})` : '';
  });

  // YouTube → watch URL
  out = out.replace(/<div [^>]*data-yt-id="([^"]*)"[^>]*><\/div>/g, (_el, id) =>
    id ? `https://www.youtube.com/watch?v=${id}` : '',
  );

  // Child page / database reference → its title as plain text.
  out = out.replace(/<div [^>]*data-cb-id="[^"]*"[^>]*><\/div>/g, (el) => {
    const title = getAttr(el, 'data-cb-title');
    const icon = getAttr(el, 'data-cb-icon');
    const label = `${icon && !icon.startsWith('lucide:') && !icon.startsWith('http') ? icon + ' ' : ''}${title}`.trim();
    return label;
  });

  // Inline page link → its label as plain text.
  out = out.replace(/<a [^>]*data-page-link[^>]*>([^<]*)<\/a>/g, (_el, label) =>
    decodeEntities(label),
  );

  // Normalize whitespace: drop blank-only (`&nbsp;`) lines the paragraph
  // serializer leaves behind, collapse 3+ newlines to a single blank line, and
  // trim — so pasting never produces the "doubled blank line" look.
  out = out
    .replace(/^[ \t]*(?:&nbsp;| )[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  return out;
}

// Resolve the @tiptap/markdown manager from an editor instance.
function getManager(editor: any): any {
  return editor?.markdown ?? editor?.storage?.markdown?.manager ?? null;
}

/**
 * Serialize a ProseMirror fragment to clipboard-friendly markdown. Loose inline
 * (text) nodes — e.g. a partial selection inside one paragraph — are wrapped in
 * a paragraph so the markdown manager always receives a valid document.
 */
export function fragmentToCleanMarkdown(editor: any, fragment: Fragment): string {
  const manager = getManager(editor);
  if (!manager?.serialize) {
    return fragment.textBetween(0, fragment.size, '\n\n', '\n');
  }

  let json: any = fragment.toJSON() ?? [];
  if (!Array.isArray(json)) json = [json];

  // Group loose inline nodes into paragraphs; pass block nodes through.
  const content: any[] = [];
  let inline: any[] = [];
  const flush = () => {
    if (inline.length) {
      content.push({ type: 'paragraph', content: inline });
      inline = [];
    }
  };
  for (const n of json) {
    if (n && (n.type === 'text' || n.type === 'hardBreak')) {
      inline.push(n);
    } else {
      flush();
      content.push(n);
    }
  }
  flush();

  let md = '';
  try {
    md = manager.serialize({ type: 'doc', content });
  } catch {
    return fragment.textBetween(0, fragment.size, '\n\n', '\n');
  }
  return cleanupCopiedMarkdown(md);
}

/**
 * Serialize an explicit list of block nodes (block selection) to clean markdown.
 */
export function nodesToCleanMarkdown(editor: any, nodes: any[]): string | null {
  const manager = getManager(editor);
  if (!manager?.serialize) {
    return nodes.map((n) => n.textContent).join('\n\n') || null;
  }
  try {
    const md = manager.serialize({ type: 'doc', content: nodes.map((n) => n.toJSON()) });
    return cleanupCopiedMarkdown(md) || null;
  } catch {
    return nodes.map((n) => n.textContent).join('\n\n') || null;
  }
}
