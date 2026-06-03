'use client';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { CheckSquare, Heading1, Heading2, Heading3, List, ListOrdered, Minus, Quote, Code2, Table, FileText, Database, Link2, SquarePlay, ImageIcon, Info, Bookmark, Paperclip } from 'lucide-react';
import { createStandalonePage, createWorkspaceDatabase } from '@/lib/actions/workspace';
import { useTranslations } from 'next-intl';
import { openPagePicker } from './pagePicker';

export type SlashCommandItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
};

export function buildChildCommands(workspaceId: string, parentId: string): SlashCommandItem[] {
  return [
    {
      id: 'child-link',
      label: 'Link to page',
      description: 'Link to an existing page or database',
      icon: <Link2 size={15} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        openPagePicker(editor);
      },
    },
    {
      id: 'child-page',
      label: 'Page',
      description: 'Embed a nested page',
      icon: <FileText size={15} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        createStandalonePage(workspaceId, 'Untitled', parentId).then(({ itemId }) => {
          editor.commands.insertContent({
            type: 'childBlock',
            attrs: { itemId, title: 'Untitled', itemType: 'page', icon: null, iconColor: null },
          });
        });
      },
    },
    {
      id: 'child-database',
      label: 'Database',
      description: 'Embed a nested database',
      icon: <Database size={15} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        createWorkspaceDatabase(workspaceId, 'Untitled', { parentId }).then(result => {
          editor.commands.insertContent({
            type: 'childBlock',
            attrs: { itemId: result.itemId, databaseId: result.dbId, title: 'Untitled', itemType: 'database', icon: null, iconColor: null },
          });
        });
      },
    },
  ];
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Unordered list of items',
    icon: <List size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Numbered List',
    description: 'Ordered list of items',
    icon: <ListOrdered size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: 'Task List',
    description: 'Checkbox list for tasks',
    icon: <CheckSquare size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Capture a quote or callout',
    icon: <Quote size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Display code with syntax',
    icon: <Code2 size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a 3×3 table',
    icon: <Table size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Visual horizontal separator',
    icon: <Minus size={15} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'video',
    label: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: <SquarePlay size={15} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'youtubeEmbed', attrs: { videoId: null } })
        .run(),
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: <ImageIcon size={15} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'imageBlock', attrs: { src: null } })
        .run(),
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Highlighted info box',
    icon: <Info size={15} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'calloutBlock', attrs: { icon: '💡', color: 'blue', text: '' } })
        .run(),
  },
  {
    id: 'bookmark',
    label: 'Bookmark',
    description: 'Link preview card',
    icon: <Bookmark size={15} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'bookmarkBlock', attrs: { url: null } })
        .run(),
  },
  {
    id: 'file',
    label: 'File',
    description: 'Upload a file attachment',
    icon: <Paperclip size={15} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'fileBlock', attrs: { url: null } })
        .run(),
  },
];

// Typed shortcuts / synonyms so "/h1", "/img", "/todo" etc. match. Used by the
// suggestion filter in SlashCommandMenu alongside the (English) label.
export const SLASH_KEYWORDS: Record<string, string[]> = {
  h1: ['h1', 'heading1', 'title'],
  h2: ['h2', 'heading2', 'subtitle'],
  h3: ['h3', 'heading3'],
  bullet: ['ul', 'bullet', 'list', 'unordered'],
  ordered: ['ol', 'numbered', 'ordered'],
  task: ['todo', 'task', 'checkbox', 'check'],
  quote: ['quote', 'blockquote'],
  code: ['code', 'codeblock', 'pre'],
  table: ['table', 'grid'],
  divider: ['hr', 'divider', 'rule', 'separator', 'line'],
  video: ['video', 'youtube', 'yt', 'embed'],
  image: ['image', 'img', 'picture', 'photo'],
  callout: ['callout', 'info', 'note', 'warning', 'tip'],
  bookmark: ['bookmark', 'link', 'url', 'preview'],
  file: ['file', 'attachment', 'attach', 'upload', 'pdf'],
  'child-link': ['link', 'mention', 'reference'],
  'child-page': ['page', 'subpage'],
  'child-database': ['database', 'db', 'table'],
};

// Media / embed commands rendered as their own divider-separated group.
export const MEDIA_IDS = ['video', 'image', 'callout', 'bookmark', 'file'];

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

const SlashCommandList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const t = useTranslations('Editor');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const LABEL_KEYS: Record<string, string> = {
      h1: t('slashHeading1'),
      h2: t('slashHeading2'),
      h3: t('slashHeading3'),
      bullet: t('slashBulletList'),
      ordered: t('slashNumberedList'),
      task: t('slashTaskList'),
      quote: t('slashQuote'),
      code: t('slashCodeBlock'),
      table: t('slashTable'),
      video: t('slashVideo'),
      image: t('slashImage'),
      callout: t('slashCallout'),
      bookmark: t('slashBookmark'),
      file: t('slashFile'),
      'child-link': t('slashLinkPage'),
      'child-page': t('slashPage'),
      'child-database': t('slashDatabase'),
    };

    const DESC_KEYS: Record<string, string> = {
      h1: t('slashHeading1Desc'),
      h2: t('slashHeading2Desc'),
      h3: t('slashHeading3Desc'),
      bullet: t('slashBulletListDesc'),
      ordered: t('slashNumberedListDesc'),
      task: t('slashTaskListDesc'),
      quote: t('slashQuoteDesc'),
      code: t('slashCodeBlockDesc'),
      table: t('slashTableDesc'),
      video: t('slashVideoDesc'),
      image: t('slashImageDesc'),
      callout: t('slashCalloutDesc'),
      bookmark: t('slashBookmarkDesc'),
      file: t('slashFileDesc'),
      'child-link': t('slashLinkPageDesc'),
      'child-page': t('slashPageDesc'),
      'child-database': t('slashDatabaseDesc'),
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          if (items[selectedIndex]) command(items[selectedIndex]);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) return null;

    const isMedia = (id: string) => MEDIA_IDS.includes(id);
    const isChild = (id: string) => id.startsWith('child-');

    return (
      <div className="min-w-[220px] bg-neutral-900 border border-neutral-800 rounded-md shadow-xl overflow-hidden py-1">
        {items.map((item, index) => {
          const prevId = index > 0 ? items[index - 1].id : null;
          // Separator above the first media block and above the first child block,
          // so /-menu reads as three groups: basic blocks · media · pages.
          const isFirstMedia = isMedia(item.id) && (index === 0 || !isMedia(prevId!));
          const isFirstChild = isChild(item.id) && (index === 0 || !isChild(prevId!));
          return (
            <div key={item.id}>
              {(isFirstMedia || isFirstChild) && <div className="border-t border-neutral-800 my-1" />}
              <button
                onClick={() => command(item)}
                title={DESC_KEYS[item.id] ?? item.description}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                }`}
              >
                <span className="text-neutral-500 shrink-0">{item.icon}</span>
                <span className="text-sm font-medium leading-none">{LABEL_KEYS[item.id] ?? item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }
);

SlashCommandList.displayName = 'SlashCommandList';
export default SlashCommandList;
