'use client';
import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Link2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Module-level sequential queue so multiple bookmarks on the same page fetch
// OG metadata one-at-a-time instead of all at once.
let _ogChain: Promise<void> = Promise.resolve();
function enqueueOgFetch(fn: () => Promise<void>): void {
  _ogChain = _ogChain.then(fn).catch(() => {});
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// YouTube exposes thumbnails at a predictable URL — no scraping needed.
function getYoutubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('/')[0] || null;
    } else if (/youtube\.com/.test(u.hostname)) {
      id = u.searchParams.get('v') ||
        (u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : null) ||
        (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
    }
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch { return null; }
}

export default function BookmarkBlockView({
  node,
  deleteNode,
  updateAttributes,
  editor,
}: NodeViewProps) {
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
  const autoFetchedRef = useRef(false);

  const httpOnly = (u: string | null | undefined) => (/^https?:\/\//i.test(u || '') ? (u as string) : '');
  const safeUrl = httpOnly(url) || '#';
  const safeFavicon = httpOnly(favicon);
  const domain = url ? getDomain(url) : '';

  // Prefer stored OG image; fall back to YouTube thumbnail when applicable.
  const safeImage = httpOnly(image) || (url ? (getYoutubeThumbnail(url) ?? '') : '');

  useEffect(() => {
    if (!url) inputRef.current?.focus();
  }, [url]);

  // Auto-fetch OG metadata for bookmarks imported without OG data (title is
  // empty or equals the raw URL). Fetches are serialised through a module-level
  // queue so a page with many bookmarks doesn't fire all requests at once.
  // Only runs in editable editors; shared / read-only views are unaffected.
  useEffect(() => {
    if (autoFetchedRef.current) return;
    if (!url || !editor?.isEditable) return;
    if (title && title !== url) return;
    autoFetchedRef.current = true;
    enqueueOgFetch(async () => {
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
        if (!res.ok) return;
        const data = await res.json();
        updateAttributes({
          title: data.title || url,
          description: data.description || '',
          image: data.image || '',
          favicon: data.favicon || '',
        });
      } catch { /* best-effort */ }
    });
  }, [url, title, editor, updateAttributes]);

  const fetchMeta = async () => {
    const u = input.trim();
    if (!/^https?:\/\//.test(u)) { setError(true); return; }
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
      updateAttributes({ url: u, title: u });
    } finally {
      setLoading(false);
    }
  };

  const openUrl = () => {
    if (safeUrl !== '#') window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <NodeViewWrapper>
      <div contentEditable={false} className="group/bm relative my-2 select-none">
        {url ? (
          <div className="relative">
            <div
              role="link"
              tabIndex={0}
              onClick={openUrl}
              onKeyDown={e => e.key === 'Enter' && openUrl()}
              style={{ outline: 'none' }}
              className="flex items-stretch overflow-hidden rounded-lg border border-neutral-800 bg-neutral-850 hover:border-neutral-700 hover:bg-neutral-800/60 transition-colors cursor-pointer"
            >
              {/* Left: OG / YouTube thumbnail or placeholder */}
              <div className="w-25 sm:w-32.5 shrink-0 relative overflow-hidden rounded-l-lg bg-neutral-800">
                {safeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {safeFavicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={safeFavicon} alt="" className="w-8 h-8 rounded" />
                    ) : (
                      <Link2 size={22} className="text-neutral-600" />
                    )}
                  </div>
                )}
              </div>

              {/* Right: text */}
              <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center gap-0.5">
                <p className="text-sm font-semibold text-neutral-100 truncate m-0 leading-snug">
                  {title && title !== url ? title : domain}
                </p>
                {description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 m-0 leading-relaxed">
                    {description}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  {safeFavicon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={safeFavicon} alt="" className="h-3 w-3 rounded-sm shrink-0" />
                  )}
                  <span className="text-[11px] text-neutral-500 truncate">{domain}</span>
                </div>
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); deleteNode(); }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/bm:opacity-100 transition-opacity p-1 rounded bg-neutral-850/80 text-neutral-300 hover:text-red-400 cursor-pointer text-base leading-none"
              title={t('bookmarkRemove')}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-850 px-3 py-2.5">
            <Link2 size={18} className="shrink-0 text-neutral-400" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); if (error) setError(false); }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); fetchMeta(); }
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
