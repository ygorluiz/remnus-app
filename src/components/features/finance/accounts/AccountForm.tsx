'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateAccount, useUpdateAccount } from '@/hooks/finance/useAccounts';
import type { FinanceAccountRow } from '@/lib/actions/finance/accounts';

const ACCOUNT_TYPES = ['checking', 'savings', 'wallet', 'cash', 'digital', 'international'] as const;

export default function AccountForm({
  workspaceId,
  account,
  onClose,
}: {
  workspaceId: string;
  account?: FinanceAccountRow | null;
  onClose: () => void;
}) {
  const t = useTranslations('Finance');
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isEdit = !!account;

  const [name, setName] = useState(account?.name ?? '');
  const [bank, setBank] = useState(account?.bank ?? '');
  const [type, setType] = useState(account?.type ?? 'checking');
  const [initialBalanceCents, setInitialBalanceCents] = useState(
    account ? String(account.initialBalanceCents / 100) : '0',
  );
  const [currency, setCurrency] = useState(account?.currency ?? 'BRL');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const balanceFloat = parseFloat(initialBalanceCents) || 0;
    const balanceCents = Math.round(balanceFloat * 100);

    if (isEdit && account) {
      await updateAccount.mutateAsync({
        id: account.id,
        data: { name: name.trim(), bank: bank.trim() || undefined, type, initialBalanceCents: balanceCents, currency },
      });
    } else {
      await createAccount.mutateAsync({
        workspaceId,
        name: name.trim(),
        bank: bank.trim() || undefined,
        type,
        initialBalanceCents: balanceCents,
        currency,
      });
    }
    onClose();
  };

  const isPending = createAccount.isPending || updateAccount.isPending;

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">
            {isEdit ? t('editAccount') : t('addAccount')}
          </h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('accountName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60"
              placeholder={t('accountNamePlaceholder')}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('bankName')}</label>
            <input
              type="text"
              value={bank}
              onChange={e => setBank(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/60"
              placeholder={t('bankNamePlaceholder')}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('accountType')}</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            >
              {ACCOUNT_TYPES.map(tp => (
                <option key={tp} value={tp}>{t(`accountType_${tp}`)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('initialBalance')}</label>
              <input
                type="number"
                step="0.01"
                value={initialBalanceCents}
                onChange={e => setInitialBalanceCents(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('currency')}</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
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
