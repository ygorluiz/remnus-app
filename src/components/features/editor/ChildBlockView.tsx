'use client';
import { NodeViewWrapper } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import PageIcon from '../PageIcon';
import { useTabs } from '@/components/providers/TabsContext';

export default function ChildBlockView({
  node,
  editor,
}: {
  node: any;
  editor: any;
}) {
  const { itemId, databaseId, title, itemType, icon, iconColor } = node.attrs;
  const router = useRouter();
  const tabs = useTabs();

  const ext = editor.extensionManager.extensions.find((e: any) => e.name === 'childBlock');
  const shareMap = ext?.options?.shareMap as Record<string, string> | null;
  const sharedSlug = shareMap?.[itemId];

  // In shared view: link to /share/[slug] if child is also shared, otherwise no link
  // In normal view: link to /page/[id] or /db/[id]
  const isSharedView = shareMap !== null && shareMap !== undefined;
  const normalHref = itemType === 'database' ? `/db/${databaseId || itemId}` : `/page/${itemId}`;
  const href = sharedSlug ? `/share/${sharedSlug}` : normalHref;

  const handleNavigate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSharedView && !sharedSlug) return; // not shared — block navigation

    // Ctrl/Cmd+click or middle-click → open in a new tab (Tauri only; web has no provider).
    const newTab = !!tabs && !isSharedView && (e.metaKey || e.ctrlKey || e.button === 1);

    // Save content immediately before navigating so it persists on return
    const md = editor.getMarkdown?.();
    if (md && typeof ext?.options?.onImmediateSave === 'function') {
      try { await ext.options.onImmediateSave(md); } catch {}
    }

    if (newTab) tabs!.openInNewTab(href);
    else router.push(href);
  };

  // Drag + delete/duplicate are handled by the global BlockDragHandle (gutter),
  // so this view only renders the icon + title link. The `-mx-1 px-1` keeps the
  // hover background padded while aligning the icon with surrounding text.
  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className="group/child flex items-center gap-1.5 rounded py-1 px-1 -mx-1 hover:bg-neutral-800/25 transition-colors my-0.5 select-none"
      >
        <span className="shrink-0">
          <PageIcon icon={icon || null} iconColor={iconColor || null} size={16} fallbackType={itemType} />
        </span>

        <button
          onClick={handleNavigate}
          onAuxClick={(e) => { if (e.button === 1) handleNavigate(e); }}
          disabled={isSharedView && !sharedSlug}
          className={`flex-1 text-sm truncate text-left transition-colors ${
            isSharedView && !sharedSlug
              ? 'text-neutral-600 cursor-default'
              : 'text-neutral-300 hover:text-white cursor-pointer'
          }`}
        >
          {title}
        </button>

        {isSharedView && !sharedSlug && (
          <span title="Not shared" className="shrink-0">
            <Lock size={11} className="text-neutral-700" />
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}
