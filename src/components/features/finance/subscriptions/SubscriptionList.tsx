'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Repeat, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSubscriptions, useToggleSubscription, useDeleteSubscription } from '@/hooks/finance/useSubscriptions';
import type { FinanceSubscriptionRow } from '@/lib/actions/finance/subscriptions';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function SubscriptionList({ workspaceId, onAdd }: { workspaceId: string; onAdd: () => void }) {
  const t = useTranslations('Finance');
  const { data: subs, isLoading } = useSubscriptions(workspaceId);
  const toggleSub = useToggleSubscription();
  const deleteSub = useDeleteSubscription();

  if (isLoading) return <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">{t('loading')}</div>;

  const totalMonthly = (subs ?? []).filter(s => s.isActive).reduce((sum, s) => {
    switch (s.billingCycle) {
      case 'yearly': return sum + s.amountCents / 12;
      case 'quarterly': return sum + s.amountCents / 3;
      case 'weekly': return sum + s.amountCents * 4.33;
      default: return sum + s.amountCents;
    }
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">{t('subscriptionsTitle')}</h2>
          <span className="text-lg font-semibold text-neutral-50">{formatCents(Math.round(totalMonthly))}<span className="text-xs text-neutral-500 font-normal">/mês</span></span>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg">
          <Plus size={14} /> {t('addSubscription')}
        </button>
      </div>

      <div className="space-y-2">
        {(subs ?? []).map((sub: FinanceSubscriptionRow) => {
          const days = daysUntil(new Date(sub.nextRenewalDate));
          return (
            <div key={sub.id} className={`bg-neutral-900 border rounded-lg p-4 hover:border-neutral-700 transition-colors ${sub.isActive ? 'border-neutral-800' : 'border-neutral-850 opacity-60'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Repeat size={14} className="shrink-0 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-50 truncate">{sub.name}</span>
                  {!sub.isActive && <span className="text-[10px] text-neutral-500 bg-neutral-850 px-1.5 py-0.5 rounded">{t('inactive')}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-50">{formatCents(sub.amountCents)}</span>
                  <button onClick={() => toggleSub.mutate(sub.id)} className="text-neutral-500 hover:text-neutral-200 transition-colors">
                    {sub.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => { if (confirm(t('deleteConfirm'))) deleteSub.mutate(sub.id); }}
                    className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors">{t('delete')}</button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                <span>{sub.billingCycle}</span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(sub.nextRenewalDate).toLocaleDateString()}</span>
                {sub.isActive && (
                  <span className={days <= 7 ? 'text-amber-400' : 'text-neutral-500'}>
                    {days <= 0 ? t('dueToday') : t('inDays', { days })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(subs ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <Repeat size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noSubscriptions')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t('addFirstSubscription')}</button>
        </div>
      )}
    </div>
  );
}
