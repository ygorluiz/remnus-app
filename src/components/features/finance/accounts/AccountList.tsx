'use client';

import { useTranslations } from 'next-intl';
import { Plus, Building2, Wallet, PiggyBank, Landmark, Smartphone, Globe } from 'lucide-react';
import { useAccounts, useDeleteAccount, useArchiveAccount } from '@/hooks/finance/useAccounts';
import type { FinanceAccountRow } from '@/lib/actions/finance/accounts';

const TYPE_ICONS: Record<string, typeof Building2> = {
  checking: Building2,
  savings: PiggyBank,
  wallet: Wallet,
  cash: Landmark,
  digital: Smartphone,
  international: Globe,
};

const TYPE_COLORS: Record<string, string> = {
  checking: 'text-blue-400',
  savings: 'text-green-400',
  wallet: 'text-amber-400',
  cash: 'text-purple-400',
  digital: 'text-cyan-400',
  international: 'text-pink-400',
};

function formatCents(cents: number, currency: string): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const value = (abs / 100).toFixed(2);
  if (currency === 'USD') return `${sign}$${value}`;
  if (currency === 'EUR') return `${sign}€${value}`;
  if (currency === 'BRL') return `${sign}R$${value.replace('.', ',')}`;
  return `${sign}${value} ${currency}`;
}

export default function AccountList({
  workspaceId,
  onAdd,
  onEdit,
}: {
  workspaceId: string;
  onAdd: () => void;
  onEdit: (account: FinanceAccountRow) => void;
}) {
  const t = useTranslations('Finance');
  const { data: accounts, isLoading } = useAccounts(workspaceId);
  const deleteAccount = useDeleteAccount();
  const archiveAccount = useArchiveAccount();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  const total = (accounts ?? []).reduce((sum: number, a: FinanceAccountRow) => sum + a.currentBalanceCents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-neutral-50">{formatCents(total, 'BRL')}</p>
          <p className="text-xs text-neutral-500">{t('totalBalance')}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Plus size={14} />
          {t('addAccount')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(accounts ?? []).map(account => {
          const TypeIcon = TYPE_ICONS[account.type] ?? Building2;
          return (
            <div
              key={account.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors cursor-pointer group"
              onClick={() => onEdit(account)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-neutral-850 ${TYPE_COLORS[account.type] ?? 'text-neutral-400'}`}>
                  <TypeIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-50 truncate">{account.name}</p>
                  {account.bank && (
                    <p className="text-[11px] text-neutral-500 truncate">{account.bank}</p>
                  )}
                </div>
              </div>

              <p className="text-lg font-bold text-neutral-50">
                {formatCents(account.currentBalanceCents, account.currency)}
              </p>
              <p className="text-[10px] text-neutral-600 mt-0.5">
                {t(`accountType_${account.type}`)}
              </p>

              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveAccount.mutate({ id: account.id, archived: !account.isArchived });
                  }}
                  className="text-[11px] px-2 py-1 rounded text-neutral-500 hover:text-neutral-200 bg-neutral-850 hover:bg-neutral-800 transition-colors"
                >
                  {account.isArchived ? t('unarchive') : t('archive')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('deleteConfirm'))) {
                      deleteAccount.mutate(account.id);
                    }
                  }}
                  className="text-[11px] px-2 py-1 rounded text-red-400 hover:text-red-300 bg-neutral-850 hover:bg-red-500/10 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(accounts ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <Wallet size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noAccounts')}</p>
          <button
            onClick={onAdd}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('addFirstAccount')}
          </button>
        </div>
      )}
    </div>
  );
}
