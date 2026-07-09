'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateDebt } from '@/hooks/finance/useDebts';

export default function DebtForm({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const t = useTranslations('Finance');
  const createDebt = useCreateDebt();
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalAmount) return;
    const totalCents = Math.round(parseFloat(totalAmount) * 100);
    await createDebt.mutateAsync({
      workspaceId,
      name,
      creditor: creditor || undefined,
      totalAmountCents: totalCents,
      remainingAmountCents: remainingAmount ? Math.round(parseFloat(remainingAmount) * 100) : totalCents,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">{t('addDebt')}</h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('debtName')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder={t('debtNamePlaceholder')} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('creditor')}</label>
            <input value={creditor} onChange={e => setCreditor(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder={t('creditorPlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('totalAmount')}</label>
              <input type="number" step="0.01" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="0,00" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('remaining')}</label>
              <input type="number" step="0.01" min="0" value={remainingAmount} onChange={e => setRemainingAmount(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('interestRate')} (%)</label>
              <input type="number" step="0.01" min="0" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="0,00" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('dueDate')}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">{t('cancel')}</button>
            <button type="submit" disabled={!name || !totalAmount || createDebt.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {createDebt.isPending ? t('saving') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
