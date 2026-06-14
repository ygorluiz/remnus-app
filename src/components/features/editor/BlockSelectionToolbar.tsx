'use client';
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Trash2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useZoom } from '@/components/providers/ZoomProvider';
import {
  blockSelectionKey,
  getBlockSelection,
  type BlockSelectionState,
} from './BlockSelectionExtension';

type Props = { editor: Editor };

const TOOLBAR_H = 34;
const MARGIN = 8;

export default function BlockSelectionToolbar({ editor }: Props) {
  const t = useTranslations('Editor');
  const zoom = useZoom();
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const anchorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ top: number; left: number } | null>(null);
  const [selState, setSelState] = useState<BlockSelectionState>({ selected: [], anchor: null });

  useEffect(() => {
    const update = () => {
      const s = getBlockSelection(editor.state);
      setSelState(s);

      if (!s.selected.length) {
        setLayout(null);
        return;
      }

      const sorted = [...s.selected].sort((a, b) => a - b);
      const firstPos = sorted[0];

      try {
        const view = editor.view;
        // Use a position just inside the first block to get stable coords
        const firstCoords = view.coordsAtPos(firstPos + 1);

        const anchor = anchorRef.current;
        if (!anchor) return;
        const anchorRect = anchor.getBoundingClientRect();

        const z = zoomRef.current;
        const toLocal = (v: number) => v / z;

        const toolbarW = toolbarRef.current?.offsetWidth ?? 220;
        const topAbove = toLocal(firstCoords.top - anchorRect.top) - TOOLBAR_H - MARGIN;

        // Horizontal: center above the editor content area
        const editorRect = view.dom.getBoundingClientRect();
        const midX = toLocal((editorRect.left + editorRect.right) / 2 - anchorRect.left);
        const left = midX - toolbarW / 2;

        setLayout({ top: Math.max(0, topAbove), left });
      } catch {
        setLayout(null);
      }
    };

    editor.on('transaction', update);
    return () => { editor.off('transaction', update as any); };
  }, [editor]);

  const deleteSelected = () => {
    const s = getBlockSelection(editor.state);
    if (!s.selected.length) return;
    const sorted = [...s.selected].sort((a, b) => b - a);
    let tr = editor.state.tr;
    for (const pos of sorted) {
      const mappedPos = tr.mapping.map(pos);
      const node = tr.doc.nodeAt(mappedPos);
      if (!node) continue;
      tr = tr.delete(mappedPos, mappedPos + node.nodeSize);
    }
    tr.setMeta(blockSelectionKey, { selected: [], anchor: null });
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const duplicateSelected = () => {
    const s = getBlockSelection(editor.state);
    if (!s.selected.length) return;

    const sorted = [...s.selected].sort((a, b) => a - b);
    const lastPos = sorted[sorted.length - 1];
    const lastNode = editor.state.doc.nodeAt(lastPos);
    if (!lastNode) return;

    const insertAt = lastPos + lastNode.nodeSize;
    const nodes = sorted
      .map(pos => editor.state.doc.nodeAt(pos))
      .filter((n): n is NonNullable<typeof n> => n != null);

    let tr = editor.state.tr;
    let offset = 0;
    for (const node of nodes) {
      tr = tr.insert(insertAt + offset, node);
      offset += node.nodeSize;
    }
    tr.setMeta(blockSelectionKey, { selected: [], anchor: null });
    editor.view.dispatch(tr);
  };

  const count = selState.selected.length;

  // Always render the anchor div so positioning works
  return (
    <>
      <div ref={anchorRef} className="absolute inset-0 pointer-events-none" />
      {layout && count > 0 && (
        <div
          ref={toolbarRef}
          className="absolute z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 shadow-xl shadow-black/40 text-xs select-none"
          style={{ top: layout.top, left: layout.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="text-neutral-500 px-1.5 whitespace-nowrap">
            {t('blockSelectionCount', { count })}
          </span>
          <div className="w-px h-4 bg-neutral-700 mx-0.5" />
          <button
            onMouseDown={(e) => { e.preventDefault(); duplicateSelected(); }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <Copy size={12} />
            {t('blockDuplicate')}
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); deleteSelected(); }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-950/60 transition-colors"
          >
            <Trash2 size={12} />
            {t('blockDelete')}
          </button>
        </div>
      )}
    </>
  );
}
