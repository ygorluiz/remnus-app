'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, ArrowDown, ArrowUp, ArrowLeftRight, RotateCcw } from 'lucide-react';
import { useTransactions, useDeleteTransaction } from '@/hooks/finance/useTransactions';
import type { FinanceTransactionRow, TransactionFilters } from '@/lib/actions/finance/transactions';

function formatCents(cents: number, currency: string): string {
  const abs = Math.abs(cents);
  const value = (abs / 100).toFixed(2);
  if (currency === 'USD') return `$${value}`;
  if (currency === 'EUR') return `€${value}`;
  if (currency === 'BRL') return `R$${value.replace('.', ',')}`;
  return `${value} ${currency}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TYPE_ICONS: Record<string, typeof ArrowDown> = {
  income: ArrowDown,
  expense: ArrowUp,
  transfer: ArrowLeftRight,
  refund: RotateCcw,
};

const TYPE_COLORS: Record<string, string> = {
  income: 'text-green-400',
  expense: 'text-red-400',
  transfer: 'text-blue-400',
  refund: 'text-amber-400',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cleared: 'bg-green-500/10 text-green-400 border-green-500/20',
  reconciled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function TransactionList({
  workspaceId,
  onAdd,
  onEdit,
  filters,
}: {
  workspaceId: string;
  onAdd: () => void;
  onEdit: (txn: FinanceTransactionRow) => void;
  filters?: TransactionFilters;
}) {
  const t = useTranslations('Finance');
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const { data, isLoading } = useTransactions(workspaceId, filters, pageSize);
  const deleteTransaction = useDeleteTransaction();

  const transactions: FinanceTransactionRow[] = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-400">
          {total > 0 ? t('transactionCount', { count: total }) : ''}
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Plus size={14} />
          {t('addTransaction')}
        </button>
      </div>

      <div className="space-y-1">
        {transactions.map(txn => {
          const TypeIcon = TYPE_ICONS[txn.type] ?? ArrowUp;
          const sign = txn.type === 'income' || txn.type === 'refund' ? '+' : '-';

          return (
            <div
              key={txn.id}
              onClick={() => onEdit(txn)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer group border-b border-neutral-850 last:border-b-0"
            >
              <div className={`p-1.5 rounded-lg bg-neutral-850 ${TYPE_COLORS[txn.type]}`}>
                <TypeIcon size={14} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-50 truncate">{txn.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span>{formatDate(txn.transactionDate)}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_BADGES[txn.status] ?? ''}`}>
                    {t(`status_${txn.status}`)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${txn.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                  {sign}{formatCents(txn.amountCents, txn.currency)}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t('deleteConfirm'))) {
                    deleteTransaction.mutate(txn.id);
                  }
                }}
                className="shrink-0 p-1 rounded text-neutral-600 hover:text-red-400 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
                title={t('delete')}
              >
                <Plus size={12} className="rotate-45" />
              </button>
            </div>
          );
        })}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <ArrowLeftRight size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noTransactions')}</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-7 h-7 text-xs rounded-lg transition-colors ${
                i === page
                  ? 'bg-blue-500 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-850 hover:bg-neutral-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
