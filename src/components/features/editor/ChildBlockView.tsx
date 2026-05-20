'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { GripVertical } from 'lucide-react';
import PageIcon from '../PageIcon';
import { deleteWorkspaceItem, checkItemHasContent } from '@/lib/actions/workspace';

export default function ChildBlockView({
  node,
  deleteNode,
  editor,
}: {
  node: any;
  deleteNode: () => void;
  editor: any;
}) {
  const { itemId, title, itemType, icon, iconColor } = node.attrs;
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const href = itemType === 'database' ? `/db/${itemId}` : `/page/${itemId}`;

  const handleNavigate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Save content immediately before navigating so it persists on return
    const md = (editor as any).getMarkdown?.();
    const ext = editor.extensionManager.extensions.find((e: any) => e.name === 'childBlock');
    if (md && typeof ext?.options?.onImmediateSave === 'function') {
      try { await ext.options.onImmediateSave(md); } catch {}
    }

    router.push(href);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasContent = await checkItemHasContent(itemId);
    if (hasContent) {
      setShowConfirm(true);
    } else {
      deleteNode();
      deleteWorkspaceItem(itemId);
    }
  };

  const confirmDelete = () => {
    setShowConfirm(false);
    deleteNode();
    deleteWorkspaceItem(itemId);
  };

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        className="group/child flex items-center gap-1.5 rounded py-1 px-1 hover:bg-neutral-800/25 transition-colors my-0.5 select-none"
      >
        <div
          data-drag-handle
          className="opacity-0 group-hover/child:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-neutral-600 hover:text-neutral-400 shrink-0"
        >
          <GripVertical size={13} />
        </div>

        <span className="shrink-0">
          <PageIcon icon={icon || null} iconColor={iconColor || null} size={16} fallbackType={itemType} />
        </span>

        <button
          onClick={handleNavigate}
          className="flex-1 text-sm text-neutral-300 hover:text-white truncate text-left cursor-pointer"
        >
          {title}
        </button>

        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover/child:opacity-100 transition-opacity p-1 rounded text-neutral-600 hover:text-red-400 hover:bg-neutral-800/60 cursor-pointer shrink-0 text-base leading-none"
          title="Delete"
        >
          ×
        </button>
      </div>

      {showConfirm &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 z-500 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-neutral-100 mb-2 truncate">
                Delete &ldquo;{title}&rdquo;?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-5">
                This item has content that will be permanently deleted and cannot be recovered.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer border border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
