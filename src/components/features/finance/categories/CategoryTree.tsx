'use client';

import { useTranslations } from 'next-intl';
import { Plus, FolderOpen, Pencil, Trash } from 'lucide-react';
import { useCategories, useDeleteCategory } from '@/hooks/finance/useCategories';
import type { FinanceCategoryRow } from '@/lib/actions/finance/categories';

function buildTree(categories: FinanceCategoryRow[]): (FinanceCategoryRow & { children: FinanceCategoryRow[] })[] {
  const map = new Map<string, FinanceCategoryRow & { children: FinanceCategoryRow[] }>();
  const roots: (FinanceCategoryRow & { children: FinanceCategoryRow[] })[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function CategoryTree({
  workspaceId,
  onAdd,
  onEdit,
}: {
  workspaceId: string;
  onAdd: () => void;
  onEdit: (cat: FinanceCategoryRow) => void;
}) {
  const t = useTranslations('Finance');
  const { data: categories, isLoading } = useCategories(workspaceId);
  const deleteCategory = useDeleteCategory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  const tree = buildTree(categories ?? []);

  const renderNode = (
    node: FinanceCategoryRow & { children: FinanceCategoryRow[] },
    depth: number = 0,
  ) => (
    <div key={node.id}>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-neutral-900 transition-colors group cursor-pointer ${
          depth > 0 ? 'ml-6' : ''
        }`}
            onClick={() => {
              const { children, ...cat } = node;
              onEdit(cat);
            }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: node.color || '#6b7280' }}
        />
        {node.emoji && <span className="text-sm">{node.emoji}</span>}
        <span className="flex-1 text-neutral-50 truncate">{node.name}</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const { children, ...cat } = node;
              onEdit(cat);
            }}
            className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t('deleteConfirm'))) {
                deleteCategory.mutate(node.id);
              }
            }}
            className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>
      {node.children.map(child => renderNode(child as FinanceCategoryRow & { children: FinanceCategoryRow[] }, depth + 1))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-neutral-500">
          {t('categoryCount', { count: (categories ?? []).length })}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Plus size={14} />
          {t('addCategory')}
        </button>
      </div>

      <div>
        {tree.map(node => renderNode(node))}
      </div>

      {(categories ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <FolderOpen size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noCategories')}</p>
        </div>
      )}
    </div>
  );
}
