'use client';
import { useRef, useEffect } from 'react';
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
  placeholder?: string;
};

// Block-level markdown patterns that HTML clipboard cannot reliably represent.
const BLOCK_MARKDOWN_RE = /^#{1,6} |^[-*+] |^\d+\. |^> |^```|^\|/m;

export default function BlockEditor({ initialContent, onChange, placeholder }: Props) {
  const editorRef = useRef<any>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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
      SlashCommand,
    ],
    content: initialContent,
    contentType: 'markdown',
    onUpdate: ({ editor }) => {
      const md = (editor as any).getMarkdown();
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[500px]',
      },
      handleKeyDown: (view, event) => {
        if (event.key !== 'Backspace') return false;
        const { state } = view;
        const { selection } = state;
        const { $from, empty } = selection;

        // Only intercept when cursor is at the very start of an empty paragraph
        if (!empty || $from.parentOffset !== 0) return false;
        if ($from.parent.type.name !== 'paragraph' || $from.parent.content.size !== 0) return false;

        // If the node immediately before this paragraph is an hr, delete only the hr
        const pos = $from.before($from.depth);
        if (pos === 0) return false;
        const nodeBefore = state.doc.resolve(pos).nodeBefore;
        if (!nodeBefore || nodeBefore.type.name !== 'horizontalRule') return false;

        const hrFrom = pos - nodeBefore.nodeSize;
        view.dispatch(state.tr.delete(hrFrom, pos));
        return true;
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text || !BLOCK_MARKDOWN_RE.test(text)) return false;

        const ed = editorRef.current;
        if (!ed) return false;

        try {
          // editor.markdown is set by @tiptap/markdown and exposes parse()
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
