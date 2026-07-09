'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateSubscription } from '@/hooks/finance/useSubscriptions';

export default function SubscriptionForm({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const t = useTranslations('Finance');
  const createSub = useCreateSubscription();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'quarterly' | 'weekly'>('monthly');
  const [nextRenewal, setNextRenewal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !nextRenewal) return;
    await createSub.mutateAsync({
      workspaceId,
      name,
      amountCents: Math.round(parseFloat(amount) * 100),
      billingCycle,
      nextRenewalDate: new Date(nextRenewal),
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">{t('addSubscription')}</h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('subscriptionName')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder={t('subscriptionNamePlaceholder')} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('amount')}</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('billingCycle')}</label>
            <select value={billingCycle} onChange={e => setBillingCycle(e.target.value as any)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60">
              <option value="monthly">{t('monthly')}</option>
              <option value="yearly">{t('yearly')}</option>
              <option value="quarterly">{t('quarterly')}</option>
              <option value="weekly">{t('weekly')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('nextRenewal')}</label>
            <input type="date" value={nextRenewal} onChange={e => setNextRenewal(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">{t('cancel')}</button>
            <button type="submit" disabled={!name || !amount || !nextRenewal || createSub.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {createSub.isPending ? t('saving') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
