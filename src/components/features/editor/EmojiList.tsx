'use client';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { EmojiEntry } from './emojiData';

type Props = {
  items: EmojiEntry[];
  command: (item: EmojiEntry) => void;
};

const EmojiList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const t = useTranslations('Editor');
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (!items.length) return false;
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          if (items[selectedIndex]) command(items[selectedIndex]);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="min-w-[220px] bg-neutral-850 border border-neutral-800 rounded-md shadow-xl px-3 py-2 text-xs text-neutral-500">
          {t('emojiPickerEmpty')}
        </div>
      );
    }

    return (
      <div className="min-w-[240px] max-w-[260px] bg-neutral-850 border border-neutral-800 rounded-md shadow-xl overflow-hidden py-1 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.name}
            onClick={() => command(item)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
              index === selectedIndex
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
            }`}
          >
            <span className="shrink-0 text-base leading-none">{item.emoji}</span>
            <span className="text-sm font-medium leading-none truncate">:{item.name}:</span>
          </button>
        ))}
      </div>
    );
  },
);

EmojiList.displayName = 'EmojiList';
export default EmojiList;
