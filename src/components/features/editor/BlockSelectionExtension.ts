import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { contentToCleanMarkdown, nodesToCleanMarkdown } from './clipboardMarkdown';

export interface BlockSelectionState {
  /** Sorted positions of selected visual blocks (top-level or listItem/taskItem). */
  selected: number[];
  /** The anchor block position where the selection started (for shift+click / arrows). */
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

/**
 * Serialize the currently block-selected nodes to markdown — the single source
 * of truth for "copy block selection" (the toolbar Copy button, Ctrl/Cmd+C and
 * Ctrl/Cmd+X all go through this so they produce identical output). Matches the
 * editor's storage format, so it pastes back cleanly through the markdown paste
 * path. Returns null when there is no block selection.
 */
const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList']);
const LIST_ITEM_TYPES = new Set(['listItem', 'taskItem']);

export function serializeBlockSelectionMarkdown(editor: any): string | null {
  const s = getBlockSelection(editor.state);
  if (!s.selected.length) return null;
  const doc = editor.state.doc;
  const sorted = [...s.selected].sort((a, b) => a - b);

  // Resolve each selected position to its node + parent list type, skipping any
  // position that sits inside an already-collected node (so selecting both a list
  // item and one of its nested children doesn't serialize the child twice).
  type Entry = { node: PmNode; parentType: string; parentAttrs: Record<string, any> };
  const entries: Entry[] = [];
  let coveredUntil = -1;
  for (const pos of sorted) {
    if (pos < coveredUntil) continue;
    const node = doc.nodeAt(pos);
    if (!node) continue;
    const parent = doc.resolve(pos).parent;
    entries.push({ node, parentType: parent.type.name, parentAttrs: parent.attrs ?? {} });
    coveredUntil = pos + node.nodeSize;
  }
  if (!entries.length) return null;

  // Loose list items selected on their own serialize as separate `- x` blocks,
  // which the doc's blank-line (`\n\n`) join then spreads apart with an empty line
  // between every item. Regroup consecutive items sharing the same parent list back
  // into that list so they serialize as one tight list (single newlines).
  const content: any[] = [];
  let i = 0;
  while (i < entries.length) {
    const e = entries[i];
    if (LIST_ITEM_TYPES.has(e.node.type.name) && LIST_TYPES.has(e.parentType)) {
      const listType = e.parentType;
      const items: any[] = [];
      const attrs = e.parentAttrs;
      while (
        i < entries.length &&
        entries[i].parentType === listType &&
        LIST_ITEM_TYPES.has(entries[i].node.type.name)
      ) {
        items.push(entries[i].node.toJSON());
        i++;
      }
      content.push({ type: listType, attrs, content: items });
    } else {
      content.push(e.node.toJSON());
      i++;
    }
  }

  return contentToCleanMarkdown(editor, content) ?? nodesToCleanMarkdown(editor, entries.map((e) => e.node));
}

/**
 * Delete every block-selected node and clear the selection. Uses `deleteRange`
 * (not `delete`) so a now-empty parent — e.g. the last listItem in a list — is
 * removed too; a raw delete would leave an empty bulletList, which is invalid
 * schema content and crashes the next normalization transaction.
 */
export function deleteBlockSelection(view: EditorView): boolean {
  const s = getBlockSelection(view.state);
  if (!s.selected.length) return false;
  const sorted = [...s.selected].sort((a, b) => b - a);
  let tr = view.state.tr;
  for (const pos of sorted) {
    const mappedPos = tr.mapping.map(pos);
    const node = tr.doc.nodeAt(mappedPos);
    if (!node) continue;
    tr = tr.deleteRange(mappedPos, mappedPos + node.nodeSize);
  }
  tr.setMeta(blockSelectionKey, EMPTY);
  view.dispatch(tr);
  return true;
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
 * preserving document order regardless of direction.
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

/** Standard AABB intersection between two viewport-space rectangles. */
function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Walk up from `el` to find the nearest scroll container (fallback: documentElement).
 * Matches on the overflow style ALONE — NOT on `scrollHeight > clientHeight`. This is
 * resolved once when the plugin mounts, when the page is often still short (content not
 * yet overflowing); requiring an overflow at mount time would wrongly fall through to
 * documentElement, and later auto-scroll / anchor-tracking would target the wrong
 * element. The styled scroll container (e.g. `.overflow-auto`) is the right target
 * regardless of how much content it currently holds.
 */
function findScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

/** True if the event target is (or sits inside) an interactive element we must not hijack. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('button, a, input, textarea, select, [data-drag-handle], [contenteditable="true"] [contenteditable="false"]');
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const BlockSelection = Extension.create({
  name: 'blockSelection',

  addProseMirrorPlugins() {
    const getEditor = () => this.editor;
    return [
      new Plugin({
        key: blockSelectionKey,

        state: {
          init: () => EMPTY,
          apply(tr, prev) {
            const meta = tr.getMeta(blockSelectionKey);
            if (meta !== undefined) return meta as BlockSelectionState;
            // Clear on any document change (typing/formatting) not driven by this plugin.
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
            // Shift+click on a block extends an existing block selection; a plain
            // click inside the editor clears any block selection (and falls through
            // so ProseMirror still places the cursor normally).
            mousedown(view, event) {
              if (event.button !== 0) return false;

              if (event.shiftKey) {
                const cur = getBlockSelection(view.state);
                if (cur.selected.length && cur.anchor != null) {
                  const posInfo = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  const blockPos = posInfo ? resolveVisualBlockPos(view.state.doc, posInfo.pos) : null;
                  if (blockPos != null) {
                    event.preventDefault();
                    const selected = blocksBetween(view.state.doc, cur.anchor, blockPos);
                    view.dispatch(view.state.tr.setMeta(blockSelectionKey, { selected, anchor: cur.anchor }));
                    return true;
                  }
                }
              }

              // Plain click inside the text → drop any block selection.
              const cur = getBlockSelection(view.state);
              if (cur.selected.length) {
                view.dispatch(view.state.tr.setMeta(blockSelectionKey, EMPTY));
              }
              return false;
            },
          },

          handleKeyDown(view, event) {
            const s = getBlockSelection(view.state);

            // Escape — select the current block (no selection) / clear it (selection).
            if (event.key === 'Escape') {
              if (s.selected.length) {
                view.dispatch(view.state.tr.setMeta(blockSelectionKey, EMPTY));
                view.focus();
              } else {
                const pos = resolveVisualBlockPos(view.state.doc, view.state.selection.from);
                if (pos != null) {
                  view.dispatch(view.state.tr.setMeta(blockSelectionKey, { selected: [pos], anchor: pos }));
                }
              }
              return true;
            }

            if (!s.selected.length) return false;

            // Delete / Backspace → remove all selected blocks.
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault();
              deleteBlockSelection(view);
              return true;
            }

            // ArrowUp / ArrowDown → grow/shrink the selection from the anchor.
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

              const newSelected = blocksBetween(view.state.doc, anchor, allBlocks[nextIdx]);
              view.dispatch(view.state.tr.setMeta(blockSelectionKey, { selected: newSelected, anchor }));
              return true;
            }

            return false;
          },
        },

        // Marquee (rubber-band) selection: drag from the empty margin/gutter area
        // around the content to select blocks by rectangle intersection — like a
        // desktop file-area selection. Lives in the plugin's view() so it can attach
        // document-level listeners that catch mousedowns in the page padding (which
        // never reach ProseMirror's own DOM).
        view(editorView: EditorView) {
          let marqueeEl: HTMLDivElement | null = null;
          // Start point is kept in VIEWPORT coords (startX/startY) plus the scroll
          // offset at mousedown (startScroll*). On every update the anchor is shifted
          // by how far the container has scrolled since, so the marquee stays pinned
          // to the CONTENT under it (not the viewport) — otherwise scrolling mid-drag
          // would slide the selection along with the page.
          let startX = 0;
          let startY = 0;
          let startScrollTop = 0;
          let startScrollLeft = 0;
          let curClientX = 0;
          let curClientY = 0;
          let active = false;
          let rafId: number | null = null;
          let autoScrollRaf: number | null = null;
          // The real scroll container, resolved FRESH on each marquee mousedown (not
          // at plugin mount): when the plugin's view() first runs, tiptap's editor DOM
          // is often not yet placed under the page's scroll wrapper, so resolving here
          // would wrongly fall through to documentElement and break auto-scroll /
          // anchor-tracking. By mousedown the tree is settled.
          let scroller: HTMLElement = document.documentElement;

          const lastBlockBottom = (): number => {
            const blocks = allVisualBlocks(editorView.state.doc);
            let bottom = editorView.dom.getBoundingClientRect().top;
            for (const pos of blocks) {
              const dom = editorView.nodeDOM(pos) as HTMLElement | null;
              if (dom && typeof dom.getBoundingClientRect === 'function') {
                bottom = Math.max(bottom, dom.getBoundingClientRect().bottom);
              }
            }
            return bottom;
          };

          const computeSelected = (rect: { left: number; top: number; right: number; bottom: number }): number[] => {
            const blocks = allVisualBlocks(editorView.state.doc);
            const out: number[] = [];
            for (const pos of blocks) {
              const dom = editorView.nodeDOM(pos) as HTMLElement | null;
              if (!dom || typeof dom.getBoundingClientRect !== 'function') continue;
              if (rectsIntersect(rect, dom.getBoundingClientRect())) out.push(pos);
            }
            return out;
          };

          // The visible (viewport-space) rectangle of the scroll container. For the
          // root scroller fall back to the window box.
          const scrollViewportRect = () => {
            if (scroller === document.documentElement || scroller === document.body) {
              return { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
            }
            const r = scroller.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
          };

          // Recompute the marquee box + selection from the current pointer position,
          // shifting the start anchor by however far the container has scrolled since
          // mousedown so the marquee stays glued to the content beneath it.
          const updateMarquee = () => {
            if (!active) return;
            const anchorX = startX - (scroller.scrollLeft - startScrollLeft);
            const anchorY = startY - (scroller.scrollTop - startScrollTop);

            const left = Math.min(anchorX, curClientX);
            const top = Math.min(anchorY, curClientY);
            const right = Math.max(anchorX, curClientX);
            const bottom = Math.max(anchorY, curClientY);

            if (marqueeEl) {
              marqueeEl.style.left = `${left}px`;
              marqueeEl.style.top = `${top}px`;
              marqueeEl.style.width = `${right - left}px`;
              marqueeEl.style.height = `${bottom - top}px`;
            }

            const selected = computeSelected({ left, top, right, bottom });
            const cur = getBlockSelection(editorView.state);
            if (
              cur.selected.length === selected.length &&
              cur.selected.every((p, i) => p === selected[i])
            ) return;

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              const anchor = selected.length ? selected[0] : null;
              editorView.dispatch(editorView.state.tr.setMeta(blockSelectionKey, { selected, anchor }));
              rafId = null;
            });
          };

          // Auto-scroll while the pointer sits near the top/bottom edge of the
          // scroll container, so a drag can extend the selection past the visible
          // area without the user scrolling manually. Self-reschedules each frame
          // while in an edge zone and the container can still scroll that way.
          const EDGE = 56;
          const MAX_SPEED = 22;
          const autoScrollStep = () => {
            autoScrollRaf = null;
            if (!active) return;
            const vp = scrollViewportRect();
            let dy = 0;
            if (curClientY < vp.top + EDGE) {
              dy = -Math.ceil(((vp.top + EDGE - curClientY) / EDGE) * MAX_SPEED);
            } else if (curClientY > vp.bottom - EDGE) {
              dy = Math.ceil(((curClientY - (vp.bottom - EDGE)) / EDGE) * MAX_SPEED);
            }
            if (dy === 0) return;
            const before = scroller.scrollTop;
            scroller.scrollTop += dy;
            if (scroller.scrollTop !== before) updateMarquee();
            autoScrollRaf = requestAnimationFrame(autoScrollStep);
          };
          const ensureAutoScroll = () => {
            if (autoScrollRaf == null) autoScrollRaf = requestAnimationFrame(autoScrollStep);
          };

          const onMouseMove = (e: MouseEvent) => {
            if (!active) return;
            e.preventDefault();
            curClientX = e.clientX;
            curClientY = e.clientY;
            updateMarquee();
            ensureAutoScroll();
          };

          const teardown = () => {
            active = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = null; }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.classList.remove('block-marquee-active');
            if (marqueeEl) { marqueeEl.remove(); marqueeEl = null; }
          };

          const onMouseUp = () => {
            teardown();
          };

          // Ctrl/Cmd+C and Ctrl/Cmd+X over a block selection — copy the same
          // markdown the toolbar Copy button produces (and, for cut, delete the
          // blocks). This is a DOCUMENT-level capture listener (not the editor's
          // handleDOMEvents.copy/cut) because the marquee mousedown preventDefaults
          // focus, so the editor usually ISN'T focused and the copy/cut events
          // never reach view.dom. Gated on an active block selection, so normal
          // text copy/cut anywhere else is untouched. Uses the async clipboard API
          // (the keydown is a user gesture, so writeText is permitted).
          const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
            const key = e.key.toLowerCase();
            if (key !== 'c' && key !== 'x') return;
            if (!hasBlockSelection(editorView.state)) return;
            const md = serializeBlockSelectionMarkdown(getEditor());
            if (md == null) return;
            e.preventDefault();
            void navigator.clipboard?.writeText(md).catch(() => {});
            if (key === 'x') {
              deleteBlockSelection(editorView);
            } else {
              // Copy keeps the blocks but closes the selection (mirrors the button).
              editorView.dispatch(editorView.state.tr.setMeta(blockSelectionKey, EMPTY));
            }
          };

          const onMouseDown = (event: MouseEvent) => {
            if (event.button !== 0 || event.shiftKey) return;
            if (isInteractiveTarget(event.target)) return;

            const pmRect = editorView.dom.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const x = event.clientX;
            const y = event.clientY;
            const bottomEdge = lastBlockBottom();

            // Horizontally allow the WHOLE scroll container (the full empty area left
            // and right of the centered content column, not just the column's own
            // padding) so a marquee can start from anywhere beside the content —
            // including the wide blank gutter between the sidebar and the column.
            // Vertically: from the editor top down to the container bottom (so the
            // blank space under a short page can start a marquee too) — Notion-style.
            const inContainerX = x >= containerRect.left && x <= containerRect.right;
            const inVerticalSpan = y >= pmRect.top - 4 && y <= containerRect.bottom;

            // Empty-area zones (NOT over text): left margin, right margin, or below
            // the last block. Clicking directly on text falls through to ProseMirror.
            const inLeftMargin = x < pmRect.left;
            const inRightMargin = x > pmRect.right;
            const belowContent = y > bottomEdge;
            const isEmptyZone = inLeftMargin || inRightMargin || belowContent;

            if (!inContainerX || !inVerticalSpan || !isEmptyZone) {
              // Clicking empty space (not text) with an active selection clears it.
              const cur = getBlockSelection(editorView.state);
              if (cur.selected.length && (inLeftMargin || inRightMargin || belowContent)) {
                editorView.dispatch(editorView.state.tr.setMeta(blockSelectionKey, EMPTY));
              }
              return;
            }

            event.preventDefault();
            // Drop any text selection / block selection before starting fresh.
            document.getSelection()?.removeAllRanges();
            editorView.dispatch(editorView.state.tr.setMeta(blockSelectionKey, EMPTY));

            scroller = findScrollParent(editorView.dom);
            startX = x;
            startY = y;
            startScrollTop = scroller.scrollTop;
            startScrollLeft = scroller.scrollLeft;
            curClientX = x;
            curClientY = y;
            active = true;
            document.body.classList.add('block-marquee-active');

            marqueeEl = document.createElement('div');
            marqueeEl.className = 'block-marquee';
            marqueeEl.style.left = `${x}px`;
            marqueeEl.style.top = `${y}px`;
            marqueeEl.style.width = '0px';
            marqueeEl.style.height = '0px';
            document.body.appendChild(marqueeEl);

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
          };

          // Listen on the editor's scroll container so margin mousedowns are caught.
          const container = findScrollParent(editorView.dom);
          container.addEventListener('mousedown', onMouseDown);
          // Capture phase so we beat any other handler and can preventDefault the
          // browser's native copy/cut before it fires.
          document.addEventListener('keydown', onKeyDown, true);

          return {
            destroy() {
              teardown();
              container.removeEventListener('mousedown', onMouseDown);
              document.removeEventListener('keydown', onKeyDown, true);
            },
          };
        },
      }),
    ];
  },
});
