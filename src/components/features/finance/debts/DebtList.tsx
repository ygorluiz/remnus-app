'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Landmark, TrendingDown } from 'lucide-react';
import { useDebts, useDeleteDebt } from '@/hooks/finance/useDebts';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DebtList({ workspaceId, onAdd }: { workspaceId: string; onAdd: () => void }) {
  const t = useTranslations('Finance');
  const { data: debts, isLoading } = useDebts(workspaceId);
  const deleteDebt = useDeleteDebt();

  if (isLoading) return <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">{t('loading')}</div>;

  const totalRemaining = (debts ?? []).reduce((s, d) => s + d.remainingAmountCents, 0);
  const totalOriginal = (debts ?? []).reduce((s, d) => s + d.totalAmountCents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">{t('debtsTitle')}</h2>
          <div className="flex gap-4 text-xs text-neutral-500">
            <span>{t('totalRemaining')}: <span className="text-amber-400 font-medium">{formatCents(totalRemaining)}</span></span>
            <span>{t('totalOriginal')}: <span className="text-neutral-400">{formatCents(totalOriginal)}</span></span>
          </div>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg">
          <Plus size={14} /> {t('addDebt')}
        </button>
      </div>

      <div className="space-y-2">
        {(debts ?? []).map(debt => {
          const paidPct = debt.totalAmountCents > 0
            ? Math.round(((debt.totalAmountCents - debt.remainingAmountCents) / debt.totalAmountCents) * 100)
            : 0;
          return (
            <div key={debt.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Landmark size={14} className="shrink-0 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-50 truncate">{debt.name}</span>
                  {debt.creditor && <span className="text-[11px] text-neutral-500">{debt.creditor}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-amber-400">{formatCents(debt.remainingAmountCents)}</span>
                  <button onClick={() => { if (confirm(t('deleteConfirm'))) deleteDebt.mutate(debt.id); }}
                    className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors">{t('delete')}</button>
                </div>
              </div>

              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${paidPct}%` }} />
              </div>

              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>{paidPct}% {t('paid')}</span>
                <span>{formatCents(debt.remainingAmountCents)} / {formatCents(debt.totalAmountCents)}</span>
                {debt.dueDate && <span>{t('dueDate')}: {new Date(debt.dueDate).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {(debts ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <TrendingDown size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noDebts')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t('addFirstDebt')}</button>
        </div>
      )}
    </div>
  );
}
