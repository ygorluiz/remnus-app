'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/finance/useTransactions';
import { useAccounts } from '@/hooks/finance/useAccounts';
import { useCategories } from '@/hooks/finance/useCategories';
import type { FinanceTransactionRow } from '@/lib/actions/finance/transactions';

const TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'refund'] as const;

export default function TransactionForm({
  workspaceId,
  transaction,
  onClose,
}: {
  workspaceId: string;
  transaction?: FinanceTransactionRow | null;
  onClose: () => void;
}) {
  const t = useTranslations('Finance');
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: accounts } = useAccounts(workspaceId);
  const { data: categories } = useCategories(workspaceId);
  const isEdit = !!transaction;

  const [title, setTitle] = useState(transaction?.title ?? '');
  const [type, setType] = useState(transaction?.type ?? 'expense');
  const [amountCents, setAmountCents] = useState(
    transaction ? String(transaction.amountCents / 100) : '',
  );
  const [accountId, setAccountId] = useState(transaction?.accountId ?? '');
  const [destinationAccountId, setDestinationAccountId] = useState(
    transaction?.destinationAccountId ?? '',
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [transactionDate, setTransactionDate] = useState(
    transaction
      ? new Date(transaction.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [status, setStatus] = useState(transaction?.status ?? 'pending');
  const [notes, setNotes] = useState(transaction?.notes ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amountCents || !accountId) return;

    const floatVal = parseFloat(amountCents) || 0;
    const cents = Math.round(floatVal * 100);

    if (isEdit && transaction) {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        data: {
          title: title.trim(),
          type: type as 'income' | 'expense' | 'transfer' | 'refund',
          amountCents: cents,
          accountId,
          destinationAccountId: destinationAccountId || undefined,
          categoryId: categoryId || undefined,
          transactionDate,
          status,
          notes: notes || undefined,
        },
      });
    } else {
      await createTransaction.mutateAsync({
        workspaceId,
        title: title.trim(),
        type: type as 'income' | 'expense' | 'transfer' | 'refund',
        amountCents: cents,
        accountId,
        destinationAccountId: destinationAccountId || undefined,
        categoryId: categoryId || undefined,
        transactionDate,
        status,
        notes: notes || undefined,
      });
    }
    onClose();
  };

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">
            {isEdit ? t('editTransaction') : t('addTransaction')}
          </h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('transactionTitle')}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60"
              placeholder={t('transactionTitlePlaceholder')}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('type')}</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                {TRANSACTION_TYPES.map(tp => (
                  <option key={tp} value={tp}>{t(`transactionType_${tp}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('amount')}</label>
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
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('account')}</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            >
              <option value="">{t('selectAccount')}</option>
              {(accounts ?? []).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('destinationAccount')}</label>
              <select
                value={destinationAccountId}
                onChange={e => setDestinationAccountId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                <option value="">{t('selectAccount')}</option>
                {(accounts ?? []).filter(a => a.id !== accountId).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('category')}</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                <option value="">{t('noCategory')}</option>
                {(categories ?? []).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('status')}</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                <option value="pending">{t('status_pending')}</option>
                <option value="cleared">{t('status_cleared')}</option>
                <option value="reconciled">{t('status_reconciled')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('date')}</label>
            <input
              type="date"
              value={transactionDate}
              onChange={e => setTransactionDate(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60 resize-none"
            />
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
              disabled={!title.trim() || !amountCents || !accountId || isPending}
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
