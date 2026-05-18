'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ArrowLeftRight } from 'lucide-react';
import { updateStandalonePageContent, updateWorkspaceItemTitle } from '@/lib/actions/workspace';
import BlockEditor from '@/components/features/editor/BlockEditor';

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

type Item = { id: string; title: string };
type Page = { id: string; content: string };

export default function StandalonePageEditor({ item, page }: { item: Item; page: Page }) {
  const [title, setTitle] = useState(item.title);
  const savedTitle = useRef(item.title);
  type WidthMode = 'narrow' | 'wide' | 'full';
  const [widthMode, setWidthMode] = useState<WidthMode>('narrow');

  useEffect(() => {
    const saved = localStorage.getItem(`page-width-${item.id}`) as WidthMode | null;
    if (saved === 'narrow' || saved === 'wide' || saved === 'full') setWidthMode(saved);
    else if (saved === 'true') setWidthMode('full'); // migrate old boolean
  }, [item.id]);

  const cycleWidth = () => {
    const next: WidthMode = widthMode === 'narrow' ? 'wide' : widthMode === 'wide' ? 'full' : 'narrow';
    setWidthMode(next);
    localStorage.setItem(`page-width-${item.id}`, next);
  };

  const widthLabels: Record<WidthMode, string> = { narrow: 'Narrow', wide: 'Wide', full: 'Full width' };

  useEffect(() => {
    if (title === savedTitle.current) return;
    const t = setTimeout(() => {
      updateWorkspaceItemTitle(item.id, title);
      savedTitle.current = title;
    }, 800);
    return () => clearTimeout(t);
  }, [title, item.id]);

  useEffect(() => {
    document.title = `${title || 'Untitled'} | Remna`;
  }, [title]);

  const handleContentChange = useMemo(
    () => debounce((md: string) => updateStandalonePageContent(item.id, md), 1000),
    [item.id]
  );

  const containerClass =
    widthMode === 'full' ? 'px-16 py-10' :
    widthMode === 'wide' ? 'max-w-7xl mx-auto px-8 lg:px-12 py-10' :
    'max-w-4xl mx-auto px-8 lg:px-16 py-10';

  return (
    <div className={containerClass}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          <ChevronLeft size={14} />
          Workspace
        </Link>
        <button
          onClick={cycleWidth}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
        >
          <ArrowLeftRight size={14} />
          {widthLabels[widthMode]}
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full bg-transparent text-white font-bold text-4xl focus:outline-none placeholder:text-neutral-700 mb-8 tracking-tight"
      />
      <BlockEditor
        key={page.id}
        initialContent={page.content}
        onChange={handleContentChange}
        placeholder="Start writing..."
      />
    </div>
  );
}
