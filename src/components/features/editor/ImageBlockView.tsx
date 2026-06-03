'use client';
import { useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { GripVertical, ImageIcon, Loader2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError(false);
    try {
      const uploaded = await uploadImage(file, workspaceId);
      updateAttributes({ src: uploaded, alt: file.name.replace(/\.[^.]+$/, '') });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const submitUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) {
      setError(true);
      return;
    }
    updateAttributes({ src: u });
  };

  return (
    <NodeViewWrapper>
      <div contentEditable={false} className="group/img relative my-2 select-none">
        <div
          data-drag-handle
          className="absolute -left-5 top-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400"
        >
          <GripVertical size={14} />
        </div>

        {src ? (
          <div
            className={`flex ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}
          >
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={node.attrs.alt || ''} className="max-w-full rounded-md" />
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity rounded bg-neutral-900/80 p-0.5">
                {([
                  ['left', AlignLeft],
                  ['center', AlignCenter],
                  ['right', AlignRight],
                ] as const).map(([a, Icon]) => (
                  <button
                    key={a}
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
                  onClick={() => {
                    deleteUploadedAsset(src);
                    deleteNode();
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-red-400 cursor-pointer text-base leading-none"
                  title={t('removeImage')}
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="shrink-0 text-neutral-400" />
              <input
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  if (error) setError(false);
                }}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitUrl();
                  }
                }}
                placeholder={t('imagePlaceholder')}
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                onClick={submitUrl}
                className="shrink-0 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                {t('imageAdd')}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                {t('imageUpload')}
              </button>
              {error && <span className="text-xs text-red-400">{t('imageError')}</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
