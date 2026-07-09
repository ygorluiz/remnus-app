/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Tiptap extension command augmentations.
 *
 * Tiptap uses TypeScript declaration-merging: each extension injects its
 * commands into the `ChainedCommands` / `SingleCommands` interfaces at import
 * time.  In production builds (Vercel / Turbopack) files may be compiled in an
 * order where the extension module hasn't been processed yet, so the augmented
 * types are missing and the build fails with "Property … does not exist on
 * type 'ChainedCommands'".
 *
 * This file explicitly declares every command the codebase uses so the types
 * are always available.  It is referenced via `tsconfig.json` → `include`.
 */

import type { Range } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // ── StarterKit built-in commands ──────────────────────────────────
    bold: { toggleBold: () => ReturnType };
    italic: { toggleItalic: () => ReturnType };
    strike: { toggleStrike: () => ReturnType };
    code: { toggleCode: () => ReturnType };
    heading: {
      setNode: (typeOrName: string, attrs?: Record<string, unknown>) => ReturnType;
      toggleHeading: (attrs: { level: number }) => ReturnType;
    };
    blockquote: { toggleBlockquote: () => ReturnType };
    codeBlock: { toggleCodeBlock: () => ReturnType };
    horizontalRule: { setHorizontalRule: () => ReturnType };
    bulletList: { toggleBulletList: () => ReturnType };
    orderedList: { toggleOrderedList: () => ReturnType };
    taskList: { toggleTaskList: () => ReturnType };

    // ── Editing helpers ──────────────────────────────────────────────
    clearNodes: { clearNodes: () => ReturnType };
    deleteRange: { deleteRange: (range: Range) => ReturnType };

    // ── Link ─────────────────────────────────────────────────────────
    link: {
      setLink: (attrs: { href: string; target?: string; rel?: string }) => ReturnType;
      unsetLink: () => ReturnType;
      extendMarkRange: (typeOrName: string, attrs?: Record<string, unknown>) => ReturnType;
    };

    // ── Color / Highlight ────────────────────────────────────────────
    color: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
    highlight: {
      setHighlight: (attrs: { color: string }) => ReturnType;
      unsetHighlight: () => ReturnType;
      toggleHighlight: (attrs?: { color?: string }) => ReturnType;
    };

    // ── Table ────────────────────────────────────────────────────────
    table: {
      insertTable: (opts: { rows: number; cols: number; withHeaderRow?: boolean }) => ReturnType;
    };
  }
}

/**
 * Augment the Editor interface for the @tiptap/markdown extension which adds
 * `editor.getMarkdown()` and `editor.markdown` at runtime but ships no types.
 */
declare module '@tiptap/core' {
  interface Editor {
    getMarkdown: () => string;
    markdown: {
      parse: (markdown: string) => ProseMirrorNode | null;
    };
  }
}
