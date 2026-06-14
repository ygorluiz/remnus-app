import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface BlockSelectionState {
  /** Sorted positions of selected visual blocks (top-level or listItem/taskItem). */
  selected: number[];
  /** The anchor block position where drag/shift-click started. */
  anchor: number | null;
}

const EMPTY: BlockSelectionState = { selected: [], anchor: null };

export const blockSelectionKey = new PluginKey<BlockSelectionState>('blockSelection');

export function getBlockSelection(editorState: any): BlockSelectionState {
  return blockSelectionKey.getState(editorState) ?? EMPTY;
}

export function hasBlockSelection(editorState: any): boolean {
  return (getBlockSelection(editorState).selected.length > 0);
}

// ── Document helpers ──────────────────────────────────────────────────────────

/**
 * Find the position of the "visual block" for a given document position.
 * Inside a listItem/taskItem → returns the list item position.
 * Otherwise → returns the top-level block position.
 */
function resolveVisualBlockPos(doc: PmNode, pos: number): number | null {
  try {
    const $pos = doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) {
      const name = $pos.node(d).type.name;
      if (name === 'listItem' || name === 'taskItem') return $pos.before(d);
    }
    if ($pos.depth >= 1) return $pos.before(1);
    return null;
  } catch {
    return null;
  }
}

/**
 * Enumerate all "visual block" positions in the document in order:
 * - Top-level non-list nodes → their position
 * - listItem / taskItem inside lists → their individual positions
 */
export function allVisualBlocks(doc: PmNode): number[] {
  const result: number[] = [];
  doc.forEach((topNode, topOffset) => {
    const name = topNode.type.name;
    if (name === 'bulletList' || name === 'orderedList' || name === 'taskList') {
      topNode.forEach((item, itemOffset) => {
        result.push(topOffset + 1 + itemOffset); // +1 for the list opening token
      });
    } else {
      result.push(topOffset);
    }
  });
  return result;
}

/**
 * Return positions of all visual blocks between anchor and head (inclusive),
 * preserving document order regardless of drag direction.
 */
function blocksBetween(doc: PmNode, anchorPos: number, headPos: number): number[] {
  const all = allVisualBlocks(doc);
  const lo = Math.min(anchorPos, headPos);
  const hi = Math.max(anchorPos, headPos);
  return all.filter(pos => pos >= lo && pos <= hi);
}

function makeDecorations(doc: PmNode, selected: number[]): DecorationSet {
  if (!selected.length) return DecorationSet.empty;
  const decos: Decoration[] = [];
  for (const pos of selected) {
    const node = doc.nodeAt(pos);
    if (!node) continue;
    decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'block-selected' }));
  }
  return DecorationSet.create(doc, decos);
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const BlockSelection = Extension.create({
  name: 'blockSelection',

  addProseMirrorPlugins() {
    let dragAnchorPos: number | null = null;
    let inBlockMode = false;
    let rafId: number | null = null;
    let cleanupDrag: (() => void) | null = null;

    return [
      new Plugin({
        key: blockSelectionKey,

        state: {
          init: () => EMPTY,
          apply(tr, prev) {
            const meta = tr.getMeta(blockSelectionKey);
            if (meta !== undefined) return meta as BlockSelectionState;
            // Clear on any document changes (typing, formatting) that aren't from this plugin
            if (prev.selected.length && tr.docChanged) return EMPTY;
            return prev;
          },
        },

        props: {
          decorations(state) {
            const s = blockSelectionKey.getState(state);
            if (!s?.selected.length) return DecorationSet.empty;
            return makeDecorations(state.doc, s.selected);
          },

          handleDOMEvents: {
            // When in block-drag mode, intercept PM's own mousemove so it doesn't
            // extend its text selection. PM checks the return value of dispatchEvent
            // and skips updateSelection when a plugin returns true.
            mousemove(_view, _event) {
              return inBlockMode;
            },

            mousedown(view, event) {
              if (event.button !== 0) return false;

              // Clean up any previous drag listeners
              cleanupDrag?.();
              cleanupDrag = null;
              if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
              inBlockMode = false;
              dragAnchorPos = null;

              const coords = { left: event.clientX, top: event.clientY };
              const posInfo = view.posAtCoords(coords);
              if (!posInfo) return false;

              const blockPos = resolveVisualBlockPos(view.state.doc, posInfo.pos);

              // ── Shift+click anywhere: extend existing block selection ────────
              if (event.shiftKey) {
                const cur = getBlockSelection(view.state);
                if (cur.selected.length && cur.anchor != null && blockPos != null) {
                  event.preventDefault();
                  const selected = blocksBetween(view.state.doc, cur.anchor, blockPos);
                  view.dispatch(
                    view.state.tr.setMeta(blockSelectionKey, { selected, anchor: cur.anchor })
                  );
                  return true;
                }
              }

              // ── Regular click: clear any existing block selection ────────────
              const cur = getBlockSelection(view.state);
              if (cur.selected.length) {
                view.dispatch(view.state.tr.setMeta(blockSelectionKey, EMPTY));
              }

              if (blockPos == null) return false;

              // Record anchor for potential cross-block drag (any click in the editor).
              // We return false here so ProseMirror handles cursor placement normally.
              // Block mode only activates in the mousemove handler when the pointer
              // crosses into a different block.
              dragAnchorPos = blockPos;

              const onMouseMove = (e: MouseEvent) => {
                if (dragAnchorPos == null) return;

                const coords = { left: e.clientX, top: e.clientY };
                const posInfo = view.posAtCoords(coords);
                if (!posInfo) return;

                const headPos = resolveVisualBlockPos(view.state.doc, posInfo.pos);
                if (headPos == null) return;

                if (!inBlockMode) {
                  // Only enter block mode when the pointer crosses into a different block
                  if (headPos === dragAnchorPos) return;
                  inBlockMode = true;
                  view.dom.classList.add('block-selecting');
                  document.getSelection()?.removeAllRanges();
                  // Collapse PM's text selection in the same transaction so PM's
                  // selectionToDOM doesn't keep re-applying the text selection highlight,
                  // and BubbleMenuBar sees hasBlockSelection=true immediately.
                  const collapseAt = Math.min(dragAnchorPos! + 1, view.state.doc.content.size - 1);
                  try {
                    const collapsed = TextSelection.near(view.state.doc.resolve(collapseAt));
                    view.dispatch(
                      view.state.tr
                        .setSelection(collapsed)
                        .setMeta(blockSelectionKey, { selected: [dragAnchorPos!], anchor: dragAnchorPos! })
                    );
                    // PM's selectionToDOM may re-add a selection range; clear it again
                    document.getSelection()?.removeAllRanges();
                  } catch { /* ignore if position invalid */ }
                }

                const selected = blocksBetween(view.state.doc, dragAnchorPos!, headPos);
                const curSel = getBlockSelection(view.state);

                if (
                  curSel.anchor === dragAnchorPos &&
                  curSel.selected.length === selected.length &&
                  curSel.selected.every((p, i) => p === selected[i])
                ) return;

                if (rafId) cancelAnimationFrame(rafId);
                const capturedAnchor = dragAnchorPos;
                rafId = requestAnimationFrame(() => {
                  view.dispatch(
                    view.state.tr.setMeta(blockSelectionKey, { selected, anchor: capturedAnchor })
                  );
                  rafId = null;
                });
              };

              const onMouseUp = () => {
                view.dom.classList.remove('block-selecting');
                cleanupDrag?.();
                cleanupDrag = null;
                inBlockMode = false;
                dragAnchorPos = null;
              };

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp, { once: true });
              cleanupDrag = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };

              return false; // Let ProseMirror place cursor normally; block mode starts on cross-block drag
            },
          },

          handleKeyDown(view, event) {
            const s = getBlockSelection(view.state);

            // Escape — two modes:
            // 1. Blocks already selected → clear the selection
            // 2. No blocks selected (normal editing) → select the current block (Notion-style)
            if (event.key === 'Escape') {
              if (s.selected.length) {
                view.dispatch(view.state.tr.setMeta(blockSelectionKey, EMPTY));
                view.focus();
              } else {
                const pos = resolveVisualBlockPos(view.state.doc, view.state.selection.from);
                if (pos != null) {
                  view.dispatch(
                    view.state.tr.setMeta(blockSelectionKey, { selected: [pos], anchor: pos })
                  );
                }
              }
              return true;
            }

            if (!s.selected.length) return false;

            // Delete / Backspace → delete all selected blocks
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault();
              const sorted = [...s.selected].sort((a, b) => b - a); // high → low
              let tr = view.state.tr;
              for (const pos of sorted) {
                const mappedPos = tr.mapping.map(pos);
                const node = tr.doc.nodeAt(mappedPos);
                if (!node) continue;
                tr = tr.delete(mappedPos, mappedPos + node.nodeSize);
              }
              tr.setMeta(blockSelectionKey, EMPTY);
              view.dispatch(tr);
              return true;
            }

            // ArrowUp / ArrowDown → extend / shrink selection
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              const allBlocks = allVisualBlocks(view.state.doc);
              const { anchor, selected } = s;
              if (!allBlocks.length || anchor == null) return true;

              const sortedSel = [...selected].sort((a, b) => a - b);
              const isDown = event.key === 'ArrowDown';
              const headPos = isDown ? sortedSel[sortedSel.length - 1] : sortedSel[0];
              const headIdx = allBlocks.indexOf(headPos);
              if (headIdx < 0) return true;

              const nextIdx = isDown ? headIdx + 1 : headIdx - 1;
              if (nextIdx < 0 || nextIdx >= allBlocks.length) return true;

              const newHead = allBlocks[nextIdx];
              const newSelected = blocksBetween(view.state.doc, anchor, newHead);
              view.dispatch(
                view.state.tr.setMeta(blockSelectionKey, { selected: newSelected, anchor })
              );
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
