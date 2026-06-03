'use client';
import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { GripVertical, Download, File as FileIcon, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { deleteUploadedAsset } from './assetClient';

function formatSize(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FileBlockView({
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
    editor?.extensionManager?.extensions?.find((e: any) => e.name === 'fileBlock')?.options?.workspaceId ?? null;
  const { url, name, size } = node.attrs as { url: string | null; name: string; size: number };
  // Only ever put an http(s) URL into the download href (attributes may be tampered/synced).
  const safeUrl = /^https?:\/\//i.test(url || '') ? (url as string) : '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!url) fileRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'file');
      if (workspaceId) fd.append('workspaceId', workspaceId);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      updateAttributes({ url: data.url, name: data.name || file.name, size: data.size || file.size });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NodeViewWrapper>
      <div contentEditable={false} className="group/file relative my-2 select-none">
        <div
          data-drag-handle
          className="absolute -left-5 top-2.5 opacity-0 group-hover/file:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400"
        >
          <GripVertical size={14} />
        </div>

        {url ? (
          <div className="relative flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5">
            <FileIcon size={18} className="shrink-0 text-neutral-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-neutral-100 truncate">{name || t('fileUntitled')}</div>
              {size > 0 && <div className="text-xs text-neutral-500">{formatSize(size)}</div>}
            </div>
            <a
              href={safeUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              download={name || undefined}
              className="shrink-0 p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
              title={t('fileDownload')}
            >
              <Download size={15} />
            </a>
            <button
              onClick={() => {
                deleteUploadedAsset(url);
                deleteNode();
              }}
              className="shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 cursor-pointer text-base leading-none"
              title={t('fileRemove')}
            >
              ×
            </button>
          </div>
        ) : (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5"
          >
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {t('fileUpload')}
            </button>
            {error && <span className="text-xs text-red-400">{t('fileError')}</span>}
            <input ref={fileRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
