'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateCategory, useUpdateCategory } from '@/hooks/finance/useCategories';
import { useCategories } from '@/hooks/finance/useCategories';
import type { FinanceCategoryRow } from '@/lib/actions/finance/categories';

const PRESET_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

export default function CategoryForm({
  workspaceId,
  category,
  onClose,
}: {
  workspaceId: string;
  category?: FinanceCategoryRow | null;
  onClose: () => void;
}) {
  const t = useTranslations('Finance');
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: allCategories } = useCategories(workspaceId);
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [emoji, setEmoji] = useState(category?.emoji ?? '');
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit && category) {
      await updateCategory.mutateAsync({
        id: category.id,
        data: { name: name.trim(), parentId: parentId || undefined, emoji: emoji || undefined, color },
      });
    } else {
      await createCategory.mutateAsync({
        workspaceId,
        name: name.trim(),
        parentId: parentId || undefined,
        emoji: emoji || undefined,
        color,
      });
    }
    onClose();
  };

  const isPending = createCategory.isPending || updateCategory.isPending;
  const parentOptions = (allCategories ?? []).filter(c => c.id !== category?.id);

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">
            {isEdit ? t('editCategory') : t('addCategory')}
          </h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('categoryName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60"
              placeholder={t('categoryNamePlaceholder')}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('parentCategory')}</label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            >
              <option value="">{t('noParentCategory')}</option>
              {parentOptions.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('emoji')}</label>
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60"
              placeholder={t('emojiPlaceholder')}
              maxLength={10}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('color')}</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-neutral-50 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg transition-colors"
            >
              {isPending ? t('saving') : isEdit ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
