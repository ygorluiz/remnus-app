'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useAccounts } from '@/hooks/finance/useAccounts';
import type { FinanceAccountRow } from '@/lib/actions/finance/accounts';

function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const value = (abs / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$${value}`;
}

export default function DashboardOverview({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations('Finance');
  const { data: accounts, isLoading } = useAccounts(workspaceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  const totalBalance = (accounts ?? []).reduce((sum: number, a: FinanceAccountRow) =>
    a.includeInTotal ? sum + a.currentBalanceCents : sum, 0,
  );
  const totalIncome = (accounts ?? []).reduce((sum: number, a: FinanceAccountRow) =>
    a.currentBalanceCents > 0 ? sum + a.currentBalanceCents : sum, 0,
  );
  const checkingAccounts = (accounts ?? []).filter((a: FinanceAccountRow) => a.type === 'checking' || a.type === 'wallet');
  const savingsAccounts = (accounts ?? []).filter((a: FinanceAccountRow) => a.type === 'savings');

  return (
    <div className="space-y-4">
      {/* Total net worth card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <p className="text-xs text-neutral-500 mb-1">{t('totalBalance')}</p>
        <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCents(totalBalance)}
        </p>
        <p className="text-[11px] text-neutral-600 mt-1">
          {accounts?.length ?? 0} {t('accounts')}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <span className="text-[11px] text-neutral-500">{t('checkingAccounts')}</span>
          </div>
          <p className="text-lg font-bold text-neutral-50">
            {formatCents(checkingAccounts.reduce((s: number, a: FinanceAccountRow) => s + a.currentBalanceCents, 0))}
          </p>
          <p className="text-[10px] text-neutral-600">{checkingAccounts.length} {t('accounts')}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <PiggyBank size={14} className="text-blue-400" />
            </div>
            <span className="text-[11px] text-neutral-500">{t('savingsAccounts')}</span>
          </div>
          <p className="text-lg font-bold text-neutral-50">
            {formatCents(savingsAccounts.reduce((s: number, a: FinanceAccountRow) => s + a.currentBalanceCents, 0))}
          </p>
          <p className="text-[10px] text-neutral-600">{savingsAccounts.length} {t('accounts')}</p>
        </div>
      </div>

      {/* Account list */}
      <div>
        <p className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">{t('allAccounts')}</p>
        <div className="space-y-1">
          {(accounts ?? []).map((account: FinanceAccountRow) => {
            const sign = account.currentBalanceCents >= 0 ? '+' : '';
            return (
              <div
                key={account.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: account.color || '#6b7280' }}
                  />
                  <span className="text-sm text-neutral-300">{account.name}</span>
                </div>
                <span className={`text-sm font-medium ${
                  account.currentBalanceCents >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {sign}{formatCents(account.currentBalanceCents)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
