'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useUpsertBudget } from '@/hooks/finance/useBudgets';
import { useCategories } from '@/hooks/finance/useCategories';
import type { FinanceCategoryRow } from '@/lib/actions/finance/categories';

export default function BudgetForm({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const t = useTranslations('Finance');
  const upsertBudget = useUpsertBudget();
  const { data: categories } = useCategories(workspaceId);

  const [categoryId, setCategoryId] = useState('');
  const [amountCents, setAmountCents] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amountCents) return;

    await upsertBudget.mutateAsync({
      workspaceId,
      categoryId,
      amountCents: Math.round(parseFloat(amountCents) * 100),
      month,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">{t('addBudget')}</h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('category')}</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            >
              <option value="">{t('selectCategory')}</option>
              {(categories ?? []).map((cat: FinanceCategoryRow) => (
                <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('monthlyLimit')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountCents}
              onChange={e => setAmountCents(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('month')}</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
              {t('cancel')}
            </button>
            <button type="submit" disabled={!categoryId || !amountCents || upsertBudget.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {upsertBudget.isPending ? t('saving') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
