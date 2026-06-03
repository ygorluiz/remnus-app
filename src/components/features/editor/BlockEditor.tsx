'use client';
import { useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import BubbleMenuBar from './BubbleMenuBar';
import { SlashCommand } from './SlashCommandMenu';
import { ChildBlock } from './ChildBlockExtension';
import { YoutubeEmbed } from './YoutubeEmbedExtension';
import { ImageBlock } from './ImageBlockExtension';
import { CalloutBlock } from './CalloutBlockExtension';
import { BookmarkBlock } from './BookmarkBlockExtension';
import { FileBlock } from './FileBlockExtension';
import { PageLink } from './PageLinkNode';
import { PageMention } from './PageMentionExtension';
import { CollapsibleHeading, HeadingCollapsePlugin } from './HeadingCollapseExtension';
import type { WorkspaceItemRow } from '@/lib/actions/workspace';

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

type Props = {
  initialContent: string;
  onChange: (markdown: string) => void;
  onImmediateSave?: (markdown: string) => void;
  placeholder?: string;
  workspaceId?: string;
  parentId?: string;
  initialSubItems?: WorkspaceItemRow[];
};

// Block-level markdown patterns that HTML clipboard cannot reliably represent.
const BLOCK_MARKDOWN_RE = /^#{1,6} |^[-*+] |^\d+\. |^> |^```|^\|/m;

// Upload a dropped/pasted image and insert it as an imageBlock at `pos`
// (or the current selection when pos is omitted).
async function uploadAndInsertImage(editor: any, file: File, workspaceId: string | null, pos?: number) {
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', 'image');
    if (workspaceId) fd.append('workspaceId', workspaceId);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return;
    const { url } = await res.json();
    const attrs = { src: url, alt: file.name.replace(/\.[^.]+$/, '') };
    if (typeof pos === 'number') {
      editor.chain().insertContentAt(pos, { type: 'imageBlock', attrs }).run();
    } else {
      editor.chain().focus().insertContent({ type: 'imageBlock', attrs }).run();
    }
  } catch {
    /* best-effort */
  }
}

function buildInitialContent(markdown: string, subItems: WorkspaceItemRow[]): string {
  if (!subItems.length) return markdown;

  // Find which item IDs are already serialized in the markdown
  const inMarkdown = new Set<string>();
  const idRe = /data-cb-id="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(markdown)) !== null) inMarkdown.add(m[1]);

  const missing = subItems.filter(i => !inMarkdown.has(i.id));
  if (!missing.length) return markdown;

  // Prepend any items that weren't saved yet (e.g. debounce didn't fire before navigation)
  const blocks = missing
    .map(item => {
      const safeTitle = (item.title || '').replace(/"/g, '&quot;');
      return `<div data-cb-id="${item.id}" data-cb-dbid="${item.databaseId || ''}" data-cb-type="${item.type}" data-cb-title="${safeTitle}" data-cb-icon="${item.icon || ''}" data-cb-iconcolor="${item.iconColor || ''}"></div>`;
    })
    .join('\n\n');

  return blocks + (markdown ? '\n\n' + markdown : '');
}

export default function BlockEditor({
  initialContent,
  onChange,
  onImmediateSave,
  placeholder,
  workspaceId,
  parentId,
  initialSubItems,
}: Props) {
  const editorRef = useRef<any>(null);
  const router = useRouter();

  // Kept in a ref so the (closure-captured) editorProps click handler always
  // reaches the latest onImmediateSave without recreating the editor.
  const onImmediateSaveRef = useRef(onImmediateSave);
  useEffect(() => {
    onImmediateSaveRef.current = onImmediateSave;
  }, [onImmediateSave]);

  const computedInitial = useMemo(
    () => buildInitialContent(initialContent, initialSubItems ?? []),
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        // Typed/pasted URLs auto-link and become clickable. We drive navigation
        // ourselves (openOnClick: false) so internal page links use the SPA
        // router instead of a full page load.
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: 'https',
          HTMLAttributes: {
            rel: 'noopener noreferrer nofollow',
          },
        },
      }),
      CollapsibleHeading,
      HeadingCollapsePlugin.configure({
        pageId: parentId ?? null,
      }),
      Markdown,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading...';
          return placeholder ?? "Type '/' for commands or start writing...";
        },
        showOnlyCurrent: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      ChildBlock.configure({
        workspaceId: workspaceId ?? null,
        parentId: parentId ?? null,
        onImmediateSave: onImmediateSave ?? null,
      }),
      SlashCommand.configure({
        workspaceId: workspaceId ?? null,
        parentId: parentId ?? null,
      }),
      YoutubeEmbed,
      ImageBlock.configure({ workspaceId: workspaceId ?? null }),
      CalloutBlock,
      BookmarkBlock,
      FileBlock.configure({ workspaceId: workspaceId ?? null }),
      PageLink,
      PageMention,
    ],
    content: computedInitial,
    contentType: 'markdown',
    onUpdate: ({ editor }) => {
      const md = (editor as any).getMarkdown();
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[500px]',
        spellcheck: 'false',
      },
      handleClick: (_view, _pos, event) => {
        const anchor = (event.target as HTMLElement | null)?.closest('a');
        const href = anchor?.getAttribute('href');
        if (!href) return false;

        event.preventDefault();
        // Internal page/database links → SPA navigation (save first so edits
        // persist on return). External links → open in a new tab.
        // Guard against protocol-relative ("//evil.com") and backslash tricks
        // ("/\\evil.com") which start with "/" but resolve off-origin.
        const isInternal = href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\');
        if (isInternal) {
          const md = editorRef.current?.getMarkdown?.();
          const save = onImmediateSaveRef.current;
          const go = () => router.push(href);
          if (md && typeof save === 'function') {
            Promise.resolve(save(md)).catch(() => {}).finally(go);
          } else {
            go();
          }
        } else {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return true;
      },
      handleKeyDown: (view, event) => {
        if (event.key !== 'Backspace') return false;
        const { state } = view;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parentOffset !== 0) return false;
        if ($from.parent.type.name !== 'paragraph' || $from.parent.content.size !== 0) return false;

        const pos = $from.before($from.depth);
        if (pos === 0) return false;
        const nodeBefore = state.doc.resolve(pos).nodeBefore;
        if (!nodeBefore || nodeBefore.type.name !== 'horizontalRule') return false;

        const hrFrom = pos - nodeBefore.nodeSize;
        view.dispatch(state.tr.delete(hrFrom, pos));
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        const images = files.filter(f => f.type.startsWith('image/'));
        if (!images.length) return false;
        event.preventDefault();
        const coords = { left: (event as DragEvent).clientX, top: (event as DragEvent).clientY };
        const pos = view.posAtCoords(coords)?.pos ?? view.state.selection.from;
        const ed = editorRef.current;
        if (ed) images.forEach(img => uploadAndInsertImage(ed, img, workspaceId ?? null, pos));
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        const images = files.filter(f => f.type.startsWith('image/'));
        if (images.length) {
          const ed = editorRef.current;
          if (ed) images.forEach(img => uploadAndInsertImage(ed, img, workspaceId ?? null));
          return true;
        }

        const text = event.clipboardData?.getData('text/plain');
        if (!text || !BLOCK_MARKDOWN_RE.test(text)) return false;

        const ed = editorRef.current;
        if (!ed) return false;

        try {
          const manager: any = (ed as any).markdown;
          if (!manager?.parse) return false;

          const doc = manager.parse(text);
          if (!doc?.content?.length) return false;

          ed.commands.insertContent(doc.content);
          return true;
        } catch {
          return false;
        }
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="relative">
      <BubbleMenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
