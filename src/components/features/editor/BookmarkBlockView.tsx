'use client';
import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { GripVertical, Link2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BookmarkBlockView({
  node,
  deleteNode,
  updateAttributes,
}: {
  node: any;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, any>) => void;
}) {
  const t = useTranslations('Editor');
  const { url, title, description, image, favicon } = node.attrs as {
    url: string | null;
    title: string;
    description: string;
    image: string;
    favicon: string;
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never render a non-http(s) scheme into an href/src sink — attributes can be
  // tampered/synced via raw markdown, so guard at render time (defense in depth
  // alongside the parseHTML allowlist).
  const httpOnly = (u: string | null | undefined) => (/^https?:\/\//i.test(u || '') ? (u as string) : '');
  const safeUrl = httpOnly(url) || '#';
  const safeImage = httpOnly(image);
  const safeFavicon = httpOnly(favicon);

  useEffect(() => {
    if (!url) inputRef.current?.focus();
  }, [url]);

  const fetchMeta = async () => {
    const u = input.trim();
    if (!/^https?:\/\//.test(u)) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(u)}`);
      const data = await res.json();
      updateAttributes({
        url: data.url || u,
        title: data.title || u,
        description: data.description || '',
        image: data.image || '',
        favicon: data.favicon || '',
      });
    } catch {
      // Fall back to a bare bookmark so the user still gets a card.
      updateAttributes({ url: u, title: u });
    } finally {
      setLoading(false);
    }
  };

  return (
    <NodeViewWrapper>
      <div contentEditable={false} className="group/bm relative my-2 select-none">
        <div
          data-drag-handle
          className="absolute -left-5 top-2.5 opacity-0 group-hover/bm:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400"
        >
          <GripVertical size={14} />
        </div>

        {url ? (
          <div className="relative">
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-stretch overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors no-underline"
            >
              <div className="flex-1 min-w-0 p-3">
                <div className="text-sm font-medium text-neutral-100 truncate">{title || url}</div>
                {description && (
                  <div className="mt-0.5 text-xs text-neutral-400 line-clamp-2">{description}</div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  {safeFavicon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={safeFavicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  )}
                  <span className="text-xs text-neutral-500 truncate">{url}</span>
                </div>
              </div>
              {safeImage && (
                <div className="hidden sm:block w-[140px] shrink-0 border-l border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={safeImage} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </a>
            <button
              onClick={() => deleteNode()}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/bm:opacity-100 transition-opacity p-1 rounded bg-neutral-900/80 text-neutral-300 hover:text-red-400 hover:bg-neutral-900 cursor-pointer text-base leading-none"
              title={t('bookmarkRemove')}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5">
            <Link2 size={18} className="shrink-0 text-neutral-400" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                if (error) setError(false);
              }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchMeta();
                }
              }}
              placeholder={t('bookmarkPlaceholder')}
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
            {error && <span className="text-xs text-red-400 shrink-0">{t('bookmarkInvalid')}</span>}
            <button
              onClick={fetchMeta}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              {t('bookmarkAdd')}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
