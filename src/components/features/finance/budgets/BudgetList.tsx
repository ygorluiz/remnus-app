'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, PiggyBank, AlertTriangle } from 'lucide-react';
import { useBudgetsWithSpent, useDeleteBudget } from '@/hooks/finance/useBudgets';
import { useCategories } from '@/hooks/finance/useCategories';
import type { BudgetWithSpent } from '@/lib/actions/finance/budgets';
import type { FinanceCategoryRow } from '@/lib/actions/finance/categories';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

export default function BudgetList({
  workspaceId,
  onAdd,
}: {
  workspaceId: string;
  onAdd: () => void;
}) {
  const t = useTranslations('Finance');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const { data: budgets, isLoading } = useBudgetsWithSpent(workspaceId, selectedMonth);
  const { data: categories } = useCategories(workspaceId);
  const deleteBudget = useDeleteBudget();

  const catMap = new Map((categories ?? []).map((c: FinanceCategoryRow) => [c.id, c]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  const totalBudgeted = (budgets ?? []).reduce((s: number, b: BudgetWithSpent) => s + b.amountCents, 0);
  const totalSpent = (budgets ?? []).reduce((s: number, b: BudgetWithSpent) => s + b.spentCents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
        >
          <Plus size={14} />
          {t('addBudget')}
        </button>
      </div>

      {/* Summary bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-neutral-400">{t('budgeted')}: {formatCents(totalBudgeted)}</span>
          <span className="text-neutral-50 font-medium">{t('spent')}: {formatCents(totalSpent)}</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              totalBudgeted > 0 && totalSpent > totalBudgeted
                ? 'bg-red-500'
                : totalBudgeted > 0 && (totalSpent / totalBudgeted) > 0.8
                  ? 'bg-amber-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0)}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {(budgets ?? []).map((budget: BudgetWithSpent) => {
          const category = catMap.get(budget.categoryId);
          const isOver = budget.percentUsed >= 100;
          const isWarning = budget.percentUsed >= parseFloat(budget.alertThreshold) * 100;

          return (
            <div
              key={budget.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {category?.emoji && <span>{category.emoji}</span>}
                  <span className="text-sm font-medium text-neutral-50">
                    {category?.name ?? t('uncategorized')}
                  </span>
                  {isOver && <AlertTriangle size={14} className="text-red-400" />}
                  {isWarning && !isOver && <AlertTriangle size={14} className="text-amber-400" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400">{formatCents(budget.amountCents)}</span>
                  <button
                    onClick={() => {
                      if (confirm(t('deleteConfirm'))) deleteBudget.mutate(budget.id);
                    }}
                    className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>

              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${budget.percentUsed}%` }}
                />
              </div>

              <div className="flex justify-between mt-1 text-[11px]">
                <span className="text-neutral-500">
                  {formatCents(budget.spentCents)} {t('spent')}
                </span>
                <span className={`${budget.remainingCents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {budget.remainingCents >= 0 ? '' : '-'}{formatCents(Math.abs(budget.remainingCents))}
                  {' '}{budget.remainingCents >= 0 ? t('remaining') : t('over')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {(budgets ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <PiggyBank size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noBudgets')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
            {t('addFirstBudget')}
          </button>
        </div>
      )}
    </div>
  );
}
