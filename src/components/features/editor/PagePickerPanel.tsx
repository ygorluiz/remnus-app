'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import PageIcon from '../PageIcon';
import { searchPageItems, type PageLinkItem } from './pageLinkData';

type Props = {
  onSelect: (item: PageLinkItem) => void;
  onClose: () => void;
};

// Self-contained search box + list for the block "Link to page" picker. Unlike
// the inline "@" suggestion (which reads its query from the document), this owns
// its own input because it is opened on demand by a slash command.
export default function PagePickerPanel({ onSelect, onClose }: Props) {
  const t = useTranslations('Editor');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PageLinkItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The picker is opened by a slash command while ProseMirror still owns focus,
  // and its async focus can land back on the editor after our mount effect runs.
  // Retry across a few frames so the search input reliably wins the focus race.
  useEffect(() => {
    let frame = 0;
    const grab = () => {
      const input = inputRef.current;
      if (input && document.activeElement !== input) input.focus();
      if (frame < 5) {
        frame++;
        requestAnimationFrame(grab);
      }
    };
    requestAnimationFrame(grab);
  }, []);

  useEffect(() => {
    let active = true;
    searchPageItems(query, 12).then(res => {
      if (active) {
        setItems(res);
        setSelectedIndex(0);
      }
    });
    return () => {
      active = false;
    };
  }, [query]);

  // Intercept navigation keys at the capture phase so they take effect even if
  // the editor (ProseMirror) still has DOM focus — otherwise arrows/Enter would
  // edit the document line instead of moving the selection.
  useEffect(() => {
    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => (i + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => (i - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (items[selectedIndex]) onSelect(items[selectedIndex]);
      }
    };
    document.addEventListener('keydown', onKeyDownCapture, true);
    return () => document.removeEventListener('keydown', onKeyDownCapture, true);
  }, [items, selectedIndex, onSelect, onClose]);

  return (
    <div className="w-[280px] bg-neutral-900 border border-neutral-800 rounded-md shadow-xl overflow-hidden">
      <div className="p-1.5 border-b border-neutral-800">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('pageLinkSearchPlaceholder')}
          className="w-full bg-neutral-850 text-sm text-neutral-100 placeholder:text-neutral-500 px-2.5 py-1.5 rounded focus:outline-none"
        />
      </div>
      <div className="max-h-[260px] overflow-y-auto py-1">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-xs text-neutral-500">{t('pageLinkEmpty')}</div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
              }`}
            >
              <span className="shrink-0">
                <PageIcon icon={item.icon} iconColor={item.iconColor} size={16} fallbackType={item.type} />
              </span>
              <span className="text-sm font-medium leading-none truncate">{item.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
