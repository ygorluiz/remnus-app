'use client';
import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CALLOUT_COLORS } from './CalloutBlockExtension';

const COLOR_CLASSES: Record<string, string> = {
  default: 'bg-neutral-800/40 border-neutral-700',
  blue: 'bg-blue-500/10 border-blue-500/30',
  green: 'bg-green-400/10 border-green-400/30',
  amber: 'bg-amber-500/10 border-amber-500/30',
  red: 'bg-red-400/10 border-red-400/30',
};

const SWATCH: Record<string, string> = {
  default: 'bg-neutral-500',
  blue: 'bg-blue-500',
  green: 'bg-green-400',
  amber: 'bg-amber-500',
  red: 'bg-red-400',
};

const EMOJI_CHOICES = ['💡', 'ℹ️', '⚠️', '✅', '❌', '📌', '🔥', '📝'];

export default function CalloutBlockView({
  node,
  deleteNode,
  updateAttributes,
}: {
  node: any;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, any>) => void;
}) {
  const t = useTranslations('Editor');
  const { icon, color, text } = node.attrs as { icon: string; color: string; text: string };
  const [emojiOpen, setEmojiOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Autosize the textarea to its content. On a freshly-inserted node the element
  // isn't laid out yet, so scrollHeight reads 0 — never collapse below one line,
  // or the box becomes 0px tall (no placeholder, unclickable) until a remount.
  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight, 24) + 'px';
  };
  useEffect(autosize, [text]);
  // Re-measure once after the first paint, when layout is finally available.
  useEffect(() => {
    const id = requestAnimationFrame(autosize);
    return () => cancelAnimationFrame(id);
  }, []);

  // A freshly-inserted callout leaves a NodeSelection on the atom, so the
  // textarea never receives the caret until the editor is remounted. Grab focus
  // on mount when empty (i.e. just created) across a few frames to win the race.
  useEffect(() => {
    if (text) return;
    let frame = 0;
    const grab = () => {
      const ta = taRef.current;
      if (ta && document.activeElement !== ta) ta.focus();
      if (frame < 4) {
        frame++;
        requestAnimationFrame(grab);
      }
    };
    requestAnimationFrame(grab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className={`group/callout relative my-2 flex gap-2.5 rounded-md border px-3 py-2.5 select-none ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}
      >
        <div
          data-drag-handle
          className="absolute -left-5 top-2.5 opacity-0 group-hover/callout:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400"
        >
          <GripVertical size={14} />
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setEmojiOpen(v => !v)}
            className="text-lg leading-none cursor-pointer hover:opacity-80"
            title={t('calloutChangeIcon')}
          >
            {icon}
          </button>
          {emojiOpen && (
            <div className="absolute left-0 top-7 z-50 flex flex-wrap gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-1.5 shadow-xl w-[140px]">
              {EMOJI_CHOICES.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    updateAttributes({ icon: e });
                    setEmojiOpen(false);
                  }}
                  className="text-base leading-none p-1 rounded hover:bg-neutral-800 cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={taRef}
          value={text}
          onChange={e => updateAttributes({ text: e.target.value })}
          // Pointer events are stopped natively via useStopNodeSelection (a React
          // onMouseDown fires too late to beat ProseMirror). Keys still need a
          // synthetic stop so PM shortcuts don't fire while typing.
          onKeyDown={e => e.stopPropagation()}
          rows={1}
          placeholder={t('calloutPlaceholder')}
          className="flex-1 resize-none bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none leading-relaxed overflow-hidden min-h-6"
        />

        <div className="flex shrink-0 items-start gap-1 opacity-0 group-hover/callout:opacity-100 transition-opacity">
          {CALLOUT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => updateAttributes({ color: c })}
              className={`h-3 w-3 rounded-full ${SWATCH[c]} ${color === c ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white/60' : ''} cursor-pointer`}
              title={c}
            />
          ))}
          <button
            onClick={() => deleteNode()}
            className="ml-0.5 text-neutral-500 hover:text-red-400 cursor-pointer text-base leading-none"
            title={t('calloutRemove')}
          >
            ×
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
