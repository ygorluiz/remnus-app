'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateGoal } from '@/hooks/finance/useGoals';

export default function GoalForm({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const t = useTranslations('Finance');
  const createGoal = useCreateGoal();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    await createGoal.mutateAsync({
      workspaceId,
      name,
      targetAmountCents: Math.round(parseFloat(targetAmount) * 100),
      priority,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">{t('addGoal')}</h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('goalName')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder={t('goalNamePlaceholder')} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('targetAmount')}</label>
            <input type="number" step="0.01" min="0" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('priority')}</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60">
              <option value="low">{t('priorityLow')}</option>
              <option value="medium">{t('priorityMedium')}</option>
              <option value="high">{t('priorityHigh')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('targetDate')}</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">{t('cancel')}</button>
            <button type="submit" disabled={!name || !targetAmount || createGoal.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {createGoal.isPending ? t('saving') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
