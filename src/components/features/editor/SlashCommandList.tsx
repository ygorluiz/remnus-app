'use client';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { CheckSquare, Heading1, Heading2, Heading3, List, ListOrdered, Minus, Quote, Code2, Table, FileText, Database } from 'lucide-react';
import { createStandalonePage, createWorkspaceDatabase } from '@/lib/actions/workspace';

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
            attrs: { itemId: result.dbId, title: 'Untitled', itemType: 'database', icon: null, iconColor: null },
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
];

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

const SlashCommandList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

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

    const hasChildItems = items.some(i => i.id.startsWith('child-'));

    return (
      <div className="min-w-[220px] bg-neutral-900 border border-neutral-800 rounded-md shadow-xl overflow-hidden py-1">
        {items.map((item, index) => {
          // Separator above the first child-block command (Page/Database at the bottom)
          const isFirstChild = hasChildItems && item.id.startsWith('child-') && (index === 0 || !items[index - 1].id.startsWith('child-'));
          return (
            <div key={item.id}>
              {isFirstChild && <div className="border-t border-neutral-800 my-1" />}
              <button
                onClick={() => command(item)}
                title={item.description}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                }`}
              >
                <span className="text-neutral-500 shrink-0">{item.icon}</span>
                <span className="text-sm font-medium leading-none">{item.label}</span>
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
