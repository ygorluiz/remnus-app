'use client';
import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { GripVertical, SquarePlay } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { extractYouTubeId } from './YoutubeEmbedExtension';

export default function YoutubeEmbedView({
  node,
  deleteNode,
  updateAttributes,
}: {
  node: any;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, any>) => void;
}) {
  const t = useTranslations('Editor');
  const videoId: string | null = node.attrs.videoId || null;
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!videoId) inputRef.current?.focus();
  }, [videoId]);

  const submit = () => {
    const id = extractYouTubeId(url);
    if (!id) {
      setError(true);
      return;
    }
    setError(false);
    updateAttributes({ videoId: id });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className="group/yt relative my-2 select-none"
      >
        <div
          data-drag-handle
          className="absolute -left-5 top-1.5 opacity-0 group-hover/yt:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400"
        >
          <GripVertical size={14} />
        </div>

        {videoId ? (
          <div className="relative">
            <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => deleteNode()}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/yt:opacity-100 transition-opacity p-1 rounded bg-neutral-900/80 text-neutral-300 hover:text-red-400 hover:bg-neutral-900 cursor-pointer text-base leading-none"
              title={t('removeVideo')}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5">
            <SquarePlay size={18} className="shrink-0 text-red-400" />
            <input
              ref={inputRef}
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                if (error) setError(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('videoPlaceholder')}
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
            {error && <span className="text-xs text-red-400 shrink-0">{t('videoInvalid')}</span>}
            <button
              onClick={submit}
              className="shrink-0 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              {t('videoEmbed')}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
