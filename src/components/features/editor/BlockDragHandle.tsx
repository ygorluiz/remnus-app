'use client';
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import {
  GripVertical, Trash2, Copy, Check, ChevronRight,
  Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2,
  Link2, Image as ImageIcon, SquarePlay, File as FileIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useZoom } from '@/components/providers/ZoomProvider';
import { extractYouTubeId } from './YoutubeEmbedExtension';
import { deleteWorkspaceItem, checkItemHasContent } from '@/lib/actions/workspace';

// ── Drag source state: shared with BlockEditor's handleDrop ──
let _activeDragSource: { pos: number; node: any } | null = null;
export function getDragSource() { return _activeDragSource; }

// ── Nest target state: shared with BlockEditor's handleDrop ──
let _nestTarget: { pos: number; node: any } | null = null;
export function getNestTarget() { return _nestTarget; }
export function clearNestTarget() { _nestTarget = null; }

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'ordered' | 'quote' | 'code';

const BLOCK_APPLIES: Record<BlockType, (e: Editor) => void> = {
  paragraph: (e) => e.chain().focus().clearNodes().run(),
  h1: (e) => e.chain().focus().clearNodes().setNode('heading', { level: 1 }).run(),
  h2: (e) => e.chain().focus().clearNodes().setNode('heading', { level: 2 }).run(),
  h3: (e) => e.chain().focus().clearNodes().setNode('heading', { level: 3 }).run(),
  bullet: (e) => { if (e.isActive('bulletList')) return; if (e.isActive('orderedList')) e.chain().focus().toggleOrderedList().run(); e.chain().focus().toggleBulletList().run(); },
  ordered: (e) => { if (e.isActive('orderedList')) return; if (e.isActive('bulletList')) e.chain().focus().toggleBulletList().run(); e.chain().focus().toggleOrderedList().run(); },
  quote: (e) => e.chain().focus().clearNodes().toggleBlockquote().run(),
  code: (e) => e.chain().focus().clearNodes().toggleCodeBlock().run(),
};

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  paragraph: <Pilcrow size={14} />,
  h1: <Heading1 size={14} />,
  h2: <Heading2 size={14} />,
  h3: <Heading3 size={14} />,
  bullet: <List size={14} />,
  ordered: <ListOrdered size={14} />,
  quote: <Quote size={14} />,
  code: <Code2 size={14} />,
};

const BLOCK_TYPES: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'bullet', 'ordered', 'quote', 'code'];

// ── URL/link-type atom blocks, convertible among themselves ──
type MediaType = 'bookmarkBlock' | 'imageBlock' | 'youtubeEmbed' | 'fileBlock';
const MEDIA_TYPES: MediaType[] = ['bookmarkBlock', 'imageBlock', 'youtubeEmbed', 'fileBlock'];
const MEDIA_NODES = new Set<string>(MEDIA_TYPES);

const MEDIA_ICONS: Record<MediaType, React.ReactNode> = {
  bookmarkBlock: <Link2 size={14} />,
  imageBlock: <ImageIcon size={14} />,
  youtubeEmbed: <SquarePlay size={14} />,
  fileBlock: <FileIcon size={14} />,
};

function fileNameFromUrl(u: string): string {
  try {
    const name = new URL(u).pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : u;
  } catch { return u; }
}

function mediaUrlOf(node: { type: { name: string }; attrs: Record<string, any> }): string {
  switch (node.type.name) {
    case 'bookmarkBlock':
    case 'fileBlock': return node.attrs.url || '';
    case 'imageBlock': return node.attrs.src || '';
    case 'youtubeEmbed': return node.attrs.videoId ? `https://www.youtube.com/watch?v=${node.attrs.videoId}` : '';
    default: return '';
  }
}

function mediaAttrsFor(target: MediaType, url: string): Record<string, any> {
  switch (target) {
    case 'bookmarkBlock': return { url: url || null, title: url || '', description: '', image: '', favicon: '' };
    case 'imageBlock': return { src: url || null, alt: '', align: 'center' };
    case 'fileBlock': return { url: url || null, name: url ? fileNameFromUrl(url) : '', size: 0 };
    case 'youtubeEmbed': return { videoId: url ? extractYouTubeId(url) : null };
  }
}

function getNodeType(editor: Editor, pos: number): BlockType | null {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return null;
  if (node.type.name === 'heading') {
    const lvl = node.attrs.level;
    return lvl === 1 ? 'h1' : lvl === 2 ? 'h2' : 'h3';
  }
  if (node.type.name === 'bulletList') return 'bullet';
  if (node.type.name === 'orderedList') return 'ordered';
  if (node.type.name === 'blockquote') return 'quote';
  if (node.type.name === 'codeBlock') return 'code';
  if (node.type.name === 'paragraph') return 'paragraph';
  return null;
}

// Granular blocks that should each get their own handle even though they live
// inside a single top-level list node.
const ITEM_NODES = new Set(['listItem', 'taskItem']);

// Resolve the most specific draggable block at vertical position clientY.
function blockAt(editor: Editor, clientY: number): { pos: number; dom: HTMLElement } | null {
  const view = editor.view;
  const er = view.dom.getBoundingClientRect();
  const children = Array.from(view.dom.children) as HTMLElement[];

  for (const el of children) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (clientY < r.top - 2 || clientY > r.bottom + 2) continue;

    const sampleY = Math.min(Math.max(clientY, r.top + 2), r.bottom - 2);
    const sampleX = Math.min(er.right - 16, r.right - 4);

    let coords = view.posAtCoords({ left: sampleX, top: sampleY });
    if (!coords || coords.inside < 0) {
      const fb = view.posAtCoords({ left: r.left + 6, top: r.top + r.height / 2 });
      if (fb) coords = fb;
    }
    if (!coords) continue;

    let pos: number;
    if (coords.inside >= 0) {
      const $inside = view.state.doc.resolve(coords.inside);
      pos = $inside.depth > 0 ? $inside.before(1) : coords.inside;
      for (let d = $inside.depth; d >= 1; d--) {
        if (ITEM_NODES.has($inside.node(d).type.name)) { pos = $inside.before(d); break; }
      }
    } else {
      const clampedPos = Math.max(0, Math.min(coords.pos, view.state.doc.content.size - 1));
      const $near = view.state.doc.resolve(clampedPos);
      pos = $near.depth > 0 ? $near.before(1) : clampedPos;
      for (let d = $near.depth; d >= 1; d--) {
        if (ITEM_NODES.has($near.node(d).type.name)) { pos = $near.before(d); break; }
      }
    }

    const dom = view.nodeDOM(pos);
    return { pos, dom: dom instanceof HTMLElement ? dom : el };
  }
  return null;
}

type Handle = { pos: number; top: number; left: number };
type DropIndicator = { top: number; left: number; width: number; height: number; zone: 'above' | 'inside' | 'below' };
type Props = { editor: Editor };

export default function BlockDragHandle({ editor }: Props) {
  const t = useTranslations('Editor');
  const zoom = useZoom();
  const zoomRef = useRef(zoom);
  // eslint-disable-next-line react-hooks/refs
  zoomRef.current = zoom;
  const [handle, setHandle] = useState<Handle | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [confirmChild, setConfirmChild] = useState<{ pos: number; itemId: string } | null>(null);
  // Custom drop indicator (replaces ProseMirror's dropcursor for all our drags)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const handleRef = useRef<Handle | null>(null);
  // eslint-disable-next-line react-hooks/refs
  handleRef.current = handle;

  const BLOCK_LABELS: Record<BlockType, string> = {
    paragraph: t('slashParagraph'),
    h1: t('slashHeading1'),
    h2: t('slashHeading2'),
    h3: t('slashHeading3'),
    bullet: t('slashBulletList'),
    ordered: t('slashNumberedList'),
    quote: t('slashQuote'),
    code: t('slashCodeBlock'),
  };

  // Track the hovered block and position the handle beside it.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (menuOpen) return;
      if (rafRef.current) return;
      const { clientX: x, clientY: y } = e;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const er = editor.view.dom.getBoundingClientRect();
        const inZone = x >= er.left - 64 && x <= er.right + 8 && y >= er.top - 4 && y <= er.bottom + 4;

        if (!inZone) {
          if (!hideTimer.current) hideTimer.current = setTimeout(() => { setHandle(null); hideTimer.current = null; }, 250);
          return;
        }
        if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }

        const found = blockAt(editor, y);
        if (!found) return;
        const nodeType = editor.state.doc.nodeAt(found.pos)?.type.name;
        const rect = found.dom.getBoundingClientRect();

        const px = Math.min(Math.max(rect.left + 8, 0), window.innerWidth - 1);
        const py = Math.min(Math.max(rect.top + 4, 0), window.innerHeight - 1);
        const probe = document.elementFromPoint(px, py);
        if (probe && !editor.view.dom.contains(probe)) { setHandle(null); return; }

        const isHeading = nodeType === 'heading';
        const LIST_INDENT = 24;
        let listLevel = 0;
        try {
          const $p = editor.state.doc.resolve(found.pos + 1);
          for (let d = 0; d <= $p.depth; d++) {
            if (ITEM_NODES.has($p.node(d).type.name)) listLevel++;
          }
        } catch { /* out-of-range pos — treat as root */ }

        const z = zoomRef.current;
        const newTop = (rect.top + 2) / z;
        let newLeft: number;
        if (isHeading) {
          newLeft = Math.max(2, er.left - 48);
        } else if (listLevel === 0) {
          newLeft = Math.max(2, er.left - 28);
        } else {
          newLeft = Math.max(2, er.left + (listLevel - 1) * LIST_INDENT - 20);
        }
        newLeft = newLeft / z;

        const prev = handleRef.current;
        if (prev && prev.pos === found.pos && Math.abs(prev.top - newTop) < 1 && Math.abs(prev.left - newLeft) < 1) return;
        setHandle({ pos: found.pos, top: newTop, left: newLeft });
      });
    };

    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (subTimer.current) clearTimeout(subTimer.current);
    };
  }, [editor, menuOpen]);

  // Track dragover: show our own indicator for all three zones.
  // Only activates when our own drag handle initiated the drag (_activeDragSource set).
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!_activeDragSource) return;
      if (dragRafRef.current) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const src = _activeDragSource;
        if (!src) { _nestTarget = null; setDropIndicator(null); return; }

        const y = e.clientY;
        const found = blockAt(editor, y);
        if (!found) { _nestTarget = null; setDropIndicator(null); return; }

        const targetNode = editor.view.state.doc.nodeAt(found.pos);
        if (!targetNode || found.pos === src.pos) { _nestTarget = null; setDropIndicator(null); return; }

        const rect = found.dom.getBoundingClientRect();
        const relY = (y - rect.top) / Math.max(rect.height, 1);
        const z = zoomRef.current;
        // Indent padding is applied inside the element (padding-left), so rect.left
        // doesn't change. Manually offset the line to align with visible content.
        const indent = (targetNode.attrs?.indent as number) ?? 0;
        const indentPx = (indent * 24) / z; // 1.5rem = 24px per level
        const base = {
          top: rect.top / z,
          left: rect.left / z + indentPx,
          width: rect.width / z - indentPx,
          height: rect.height / z,
        };

        const canNest = !ITEM_NODES.has(targetNode.type.name) && !ITEM_NODES.has(src.node.type.name);

        if (canNest && relY >= 0.3 && relY <= 0.7) {
          _nestTarget = { pos: found.pos, node: targetNode };
          setDropIndicator({ ...base, zone: 'inside' });
        } else {
          _nestTarget = null;
          setDropIndicator({ ...base, zone: relY < 0.5 ? 'above' : 'below' });
        }
      });
    };

    document.addEventListener('dragover', onDragOver);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      if (dragRafRef.current) { cancelAnimationFrame(dragRafRef.current); dragRafRef.current = null; }
    };
  }, [editor]);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setHandle(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  // Hide the handle while the user is typing/selecting.
  useEffect(() => {
    const hide = () => { if (!menuOpen) setHandle(null); };
    editor.on('blur', hide);
    return () => { editor.off('blur', hide); };
  }, [editor, menuOpen]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!menuOpen) setSubOpen(false); }, [menuOpen]);

  const removeBlockAt = (pos: number) => {
    editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
  };

  const confirmDeleteChild = () => {
    if (!confirmChild) return;
    removeBlockAt(confirmChild.pos);
    deleteWorkspaceItem(confirmChild.itemId);
    setConfirmChild(null);
    setHandle(null);
  };

  const confirmModal = confirmChild
    ? createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-500 flex items-center justify-center p-4"
          onClick={() => setConfirmChild(null)}
        >
          <div
            className="bg-neutral-850 border border-neutral-800 rounded-lg p-5 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-neutral-100 mb-2 truncate">{t('deleteChildTitle')}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-5">{t('deleteChildDesc')}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmChild(null)}
                className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                {t('deleteChildCancel')}
              </button>
              <button
                onClick={confirmDeleteChild}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer border border-red-500/20"
              >
                {t('deleteChildConfirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  if (!handle) return confirmModal;

  const onDragStart = (e: React.DragEvent) => {
    const view = editor.view;
    const pos = handleRef.current?.pos;
    if (pos == null) return;
    const node = view.state.doc.nodeAt(pos);
    if (!node) return;

    setMenuOpen(false);
    _activeDragSource = { pos, node };

    const sel = NodeSelection.create(view.state.doc, pos);
    view.dispatch(view.state.tr.setSelection(sel));
    const slice = sel.content();
    // eslint-disable-next-line react-hooks/immutability
    view.dragging = { slice, move: true };

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    const nodeDom = view.nodeDOM(pos);
    if (nodeDom instanceof HTMLElement) e.dataTransfer.setDragImage(nodeDom, 0, 0);
  };

  const onDragEnd = () => {
    _activeDragSource = null;
    _nestTarget = null;
    // eslint-disable-next-line react-hooks/immutability
    editor.view.dragging = null;
    setHandle(null);
    setDropIndicator(null);
  };

  const focusBlock = (pos: number) => {
    const node = editor.state.doc.nodeAt(pos);
    if (node && node.isTextblock) {
      editor.chain().focus().setTextSelection(pos + 1).run();
    } else {
      editor.chain().focus().setNodeSelection(pos).run();
    }
  };

  const deleteChild = async (pos: number, node: any) => {
    const { itemId, linkOnly } = node.attrs;
    setMenuOpen(false);
    if (linkOnly) { removeBlockAt(pos); setHandle(null); return; }
    let hasContent = false;
    try { hasContent = await checkItemHasContent(itemId); } catch { /* best-effort */ }
    if (hasContent) { setConfirmChild({ pos, itemId }); return; }
    removeBlockAt(pos);
    deleteWorkspaceItem(itemId);
    setHandle(null);
  };

  const doDelete = () => {
    const pos = handle.pos;
    const node = editor.state.doc.nodeAt(pos);
    if (node?.type.name === 'childBlock') { deleteChild(pos, node); return; }
    removeBlockAt(pos);
    setMenuOpen(false);
    setHandle(null);
  };

  const doDuplicate = () => {
    const pos = handle.pos;
    const node = editor.state.doc.nodeAt(pos);
    if (node) {
      let json: any = node.toJSON();
      if (node.type.name === 'childBlock' && !node.attrs.linkOnly) {
        json = { ...json, attrs: { ...json.attrs, linkOnly: true } };
      }
      editor.chain().focus().insertContentAt(pos + node.nodeSize, json).run();
    }
    setMenuOpen(false);
    setHandle(null);
  };

  const turnInto = (type: BlockType) => {
    focusBlock(handle.pos);
    BLOCK_APPLIES[type](editor);
    setMenuOpen(false);
    setHandle(null);
  };

  const mediaTurnInto = (target: MediaType) => {
    const pos = handle.pos;
    const node = editor.state.doc.nodeAt(pos);
    if (node) {
      const attrs = mediaAttrsFor(target, mediaUrlOf(node));
      editor.chain().focus().command(({ tr, state }) => {
        tr.setNodeMarkup(pos, state.schema.nodes[target], attrs);
        return true;
      }).run();
    }
    setMenuOpen(false);
    setHandle(null);
  };

  const SUB_W = 196;
  const openSub = (e: React.MouseEvent<HTMLElement>) => {
    if (subTimer.current) { clearTimeout(subTimer.current); subTimer.current = null; }
    const r = e.currentTarget.getBoundingClientRect();
    const z = zoomRef.current;
    const vw = window.innerWidth / z;
    const vh = window.innerHeight / z;
    const rRight = r.right / z;
    const rLeft = r.left / z;
    const rTop = r.top / z;
    const left = rRight + SUB_W + 8 <= vw ? rRight + 4 : rLeft - SUB_W - 4;
    const top = Math.min(rTop - 4, vh - (BLOCK_TYPES.length * 36 + 16));
    setSubPos({ top: Math.max(4, top), left: Math.max(4, left) });
    setSubOpen(true);
  };
  const scheduleCloseSub = () => {
    if (subTimer.current) clearTimeout(subTimer.current);
    subTimer.current = setTimeout(() => { setSubOpen(false); subTimer.current = null; }, 180);
  };
  const cancelCloseSub = () => { if (subTimer.current) { clearTimeout(subTimer.current); subTimer.current = null; } };

  const hovNode = editor.state.doc.nodeAt(handle.pos);
  const isMedia = !!hovNode && MEDIA_NODES.has(hovNode.type.name);
  const activeType = getNodeType(editor, handle.pos);

  type TurnOption = { key: string; label: string; icon: React.ReactNode; active: boolean; apply: () => void };
  const MEDIA_LABELS: Record<MediaType, string> = {
    bookmarkBlock: t('slashBookmark'),
    imageBlock: t('slashImage'),
    youtubeEmbed: t('slashVideo'),
    fileBlock: t('slashFile'),
  };
  const turnOptions: TurnOption[] = isMedia
    ? MEDIA_TYPES.map((type) => ({
        key: type, label: MEDIA_LABELS[type], icon: MEDIA_ICONS[type],
        active: hovNode!.type.name === type, apply: () => mediaTurnInto(type),
      }))
    : BLOCK_TYPES.map((type) => ({
        key: type, label: BLOCK_LABELS[type], icon: BLOCK_ICONS[type],
        active: type === activeType, apply: () => turnInto(type),
      }));
  const showTurnInto = isMedia || !hovNode?.isAtom;
  const currentTurnInto = turnOptions.find((o) => o.active)?.icon ?? <Pilcrow size={14} />;
  // eslint-disable-next-line react-hooks/refs
  const menuTop = Math.min(handle.top + 26, window.innerHeight / zoomRef.current - 200);

  return (
    <>
      <button
        draggable
        // eslint-disable-next-line react-hooks/immutability
        onDragStart={onDragStart}
        // eslint-disable-next-line react-hooks/immutability
        onDragEnd={onDragEnd}
        onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
        onMouseEnter={() => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } }}
        style={{ position: 'fixed', top: handle.top, left: handle.left, zIndex: 100 }}
        className="flex items-center justify-center p-1 text-neutral-600 hover:text-neutral-200 hover:bg-neutral-800/60 rounded cursor-grab active:cursor-grabbing transition-colors"
        title={t('blockHandleTooltip')}
      >
        <GripVertical size={16} />
      </button>

      {/* Custom drop indicator — replaces ProseMirror dropcursor for all our drags */}
      {dropIndicator && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropIndicator.zone === 'above'
              ? dropIndicator.top
              : dropIndicator.top + dropIndicator.height - 1,
            left: dropIndicator.zone === 'inside'
              ? dropIndicator.left + 24
              : dropIndicator.left,
            width: dropIndicator.zone === 'inside'
              ? dropIndicator.width - 24
              : dropIndicator.width,
            height: 2,
            background: '#445c95',
            borderRadius: '1px',
            pointerEvents: 'none',
            zIndex: 99,
          }}
        />,
        document.body,
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuTop, left: Math.max(4, handle.left), zIndex: 9998 }}
          className="min-w-50 bg-neutral-850 border border-neutral-800 shadow-xl py-1 rounded-md overflow-hidden"
        >
          <button
            onClick={doDelete}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-neutral-400 hover:text-red-400 hover:bg-neutral-800/60 transition-colors"
          >
            <Trash2 size={14} className="text-neutral-600" />
            <span className="text-sm">{t('blockDelete')}</span>
          </button>
          <button
            onClick={doDuplicate}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            <Copy size={14} className="text-neutral-600" />
            <span className="text-sm">{t('blockDuplicate')}</span>
          </button>

          {showTurnInto && <div className="my-1 h-px bg-neutral-800" />}

          {showTurnInto && (
          <button
            onMouseEnter={openSub}
            onMouseLeave={scheduleCloseSub}
            onClick={openSub}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              subOpen ? 'text-neutral-100 bg-neutral-800' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <span className="text-neutral-600">{currentTurnInto}</span>
            <span className="text-sm">{t('bubbleTurnInto')}</span>
            <ChevronRight size={14} className="ml-auto text-neutral-600" />
          </button>
          )}

          {showTurnInto && subOpen && (
            <div
              onMouseEnter={cancelCloseSub}
              onMouseLeave={scheduleCloseSub}
              style={{ position: 'fixed', top: subPos.top, left: subPos.left, width: SUB_W, zIndex: 9999 }}
              className="bg-neutral-850 border border-neutral-800 shadow-xl py-1 rounded-md"
            >
              {turnOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={opt.apply}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    opt.active ? 'text-neutral-100 bg-neutral-800' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                >
                  <span className={opt.active ? 'text-neutral-300' : 'text-neutral-600'}>{opt.icon}</span>
                  <span className="text-sm">{opt.label}</span>
                  {opt.active && <Check size={12} className="ml-auto text-neutral-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmModal}
    </>
  );
}
