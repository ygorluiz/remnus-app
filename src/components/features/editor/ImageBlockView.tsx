'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper } from '@tiptap/react';
import { ImageIcon, Loader2, AlignLeft, AlignCenter, AlignRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { deleteUploadedAsset } from './assetClient';

async function uploadImage(file: File, workspaceId: string | null): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', 'image');
  if (workspaceId) fd.append('workspaceId', workspaceId);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  const { url } = await res.json();
  return url as string;
}

export default function ImageBlockView({
  node,
  deleteNode,
  updateAttributes,
  editor,
}: {
  node: any;
  deleteNode: () => void;
  updateAttributes: (attrs: Record<string, any>) => void;
  editor: any;
}) {
  const t = useTranslations('Editor');
  const workspaceId: string | null =
    editor?.extensionManager?.extensions?.find((e: any) => e.name === 'imageBlock')?.options?.workspaceId ?? null;

  const src: string | null = node.attrs.src || null;
  const align: string = node.attrs.align || 'center';
  const width: number = node.attrs.width || 100;
  const indent: number = (node.attrs.indent as number) ?? 0;

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [resizeLabel, setResizeLabel] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true); setError(false);
    try {
      const uploaded = await uploadImage(file, workspaceId);
      updateAttributes({ src: uploaded, alt: file.name.replace(/\.[^.]+$/, '') });
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  const submitUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) { setError(true); return; }
    updateAttributes({ src: u });
  };

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;
    let current = startWidth;

    const onMove = (ev: MouseEvent) => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const parentW = parent.getBoundingClientRect().width;
      const dx = ev.clientX - startX;
      const pct = Math.max(10, Math.min(100, Math.round(((startWidth / 100) * parentW + dx) / parentW * 100)));
      current = pct;
      setLiveWidth(pct);
      setResizeLabel(pct);
    };

    const onUp = () => {
      const snapped = Math.max(10, Math.min(100, Math.round(current / 5) * 5));
      updateAttributes({ width: snapped });
      setLiveWidth(null);
      setResizeLabel(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    // IndentGlobal's renderHTML doesn't reach ReactNodeViewRenderer — apply indent directly
    <NodeViewWrapper style={indent ? { paddingLeft: `${indent * 1.5}rem` } : undefined}>
      <div contentEditable={false} className="group/img relative my-2 select-none">
        {src ? (
          <div
            className={`flex ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}
          >
            <div ref={containerRef} style={{ width: `${liveWidth ?? width}%` }} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={node.attrs.alt || ''}
                className="w-full rounded-md cursor-zoom-in block"
                onClick={() => setLightbox(true)}
                draggable={false}
              />

              {/* Resize label shown while dragging */}
              {resizeLabel !== null && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-neutral-100 text-xs font-medium px-2 py-0.5 rounded pointer-events-none">
                  {resizeLabel}%
                </div>
              )}

              {/* Hover toolbar */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity rounded bg-neutral-900/80 p-0.5">
                {([
                  ['left', AlignLeft],
                  ['center', AlignCenter],
                  ['right', AlignRight],
                ] as const).map(([a, Icon]) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updateAttributes({ align: a })}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      align === a ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100'
                    }`}
                    title={t(`imageAlign_${a}` as 'imageAlign_left' | 'imageAlign_center' | 'imageAlign_right')}
                  >
                    <Icon size={13} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { deleteUploadedAsset(src); deleteNode(); }}
                  className="p-1 rounded text-neutral-400 hover:text-red-400 cursor-pointer text-base leading-none transition-colors"
                  title={t('removeImage')}
                >
                  ×
                </button>
              </div>

              {/* Right-edge drag resize handle */}
              <button
                type="button"
                onMouseDown={onResizeMouseDown}
                className="absolute inset-y-0 right-0 w-4 flex items-center justify-end pr-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-ew-resize"
                title={t('imageWidthIncrease')}
              >
                <div className="w-1.5 h-10 rounded-full transition-colors" style={{ background: 'rgba(60,60,60,0.85)', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.45), 0 1px 4px rgba(0,0,0,0.5)' }} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="shrink-0 text-neutral-400" />
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); if (error) setError(false); }}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); submitUrl(); } }}
                placeholder={t('imagePlaceholder')}
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={submitUrl}
                className="shrink-0 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                {t('imageAdd')}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                {t('imageUpload')}
              </button>
              {error && <span className="text-xs text-red-400">{t('imageError')}</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && src && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer"
            onClick={() => setLightbox(false)}
            title={t('imageLightboxClose')}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={node.attrs.alt || ''}
            className="max-w-[90vw] max-h-[90vh] rounded-md object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
            draggable={false}
          />
        </div>,
        document.body,
      )}
    </NodeViewWrapper>
  );
}
