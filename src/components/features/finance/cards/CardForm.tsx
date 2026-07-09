'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateCard, useUpdateCard } from '@/hooks/finance/useCards';
import { useAccounts } from '@/hooks/finance/useAccounts';
import type { FinanceCardRow } from '@/lib/actions/finance/cards';
import type { FinanceAccountRow } from '@/lib/actions/finance/accounts';

const BRANDS = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other'] as const;

export default function CardForm({
  workspaceId,
  card,
  onClose,
}: {
  workspaceId: string;
  card?: FinanceCardRow | null;
  onClose: () => void;
}) {
  const t = useTranslations('Finance');
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const { data: accounts } = useAccounts(workspaceId);
  const isEdit = !!card;

  const [name, setName] = useState(card?.name ?? '');
  const [brand, setBrand] = useState(card?.brand ?? 'visa');
  const [bank, setBank] = useState(card?.bank ?? '');
  const [creditLimitCents, setCreditLimitCents] = useState(
    card ? String(card.creditLimitCents / 100) : '',
  );
  const [closingDay, setClosingDay] = useState(card?.closingDay ? String(card.closingDay) : '');
  const [dueDay, setDueDay] = useState(card?.dueDay ? String(card.dueDay) : '');
  const [linkedAccountId, setLinkedAccountId] = useState(card?.linkedAccountId ?? '');
  const [isVirtual, setIsVirtual] = useState(card?.isVirtual ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !creditLimitCents) return;

    const limitFloat = parseFloat(creditLimitCents) || 0;
    const limitCents = Math.round(limitFloat * 100);

    if (isEdit && card) {
      await updateCard.mutateAsync({
        id: card.id,
        data: {
          name: name.trim(),
          brand: brand as typeof BRANDS[number],
          bank: bank.trim() || undefined,
          creditLimitCents: limitCents,
          closingDay: closingDay ? parseInt(closingDay) : undefined,
          dueDay: dueDay ? parseInt(dueDay) : undefined,
          linkedAccountId: linkedAccountId || undefined,
          isVirtual,
        },
      });
    } else {
      await createCard.mutateAsync({
        workspaceId,
        name: name.trim(),
        brand: brand as typeof BRANDS[number],
        bank: bank.trim() || undefined,
        creditLimitCents: limitCents,
        closingDay: closingDay ? parseInt(closingDay) : undefined,
        dueDay: dueDay ? parseInt(dueDay) : undefined,
        linkedAccountId: linkedAccountId || undefined,
        isVirtual,
      });
    }
    onClose();
  };

  const isPending = createCard.isPending || updateCard.isPending;

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">
            {isEdit ? t('editCard') : t('addCard')}
          </h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('cardName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder={t('cardNamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('brand')}</label>
              <select
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              >
                {BRANDS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('cardBank')}</label>
              <input
                type="text"
                value={bank}
                onChange={e => setBank(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('creditLimit')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={creditLimitCents}
              onChange={e => setCreditLimitCents(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('closingDay')}</label>
              <input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={e => setClosingDay(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('dueDay')}</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('linkedAccount')}</label>
            <select
              value={linkedAccountId}
              onChange={e => setLinkedAccountId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
            >
              <option value="">{t('noLinkedAccount')}</option>
              {(accounts ?? []).map((acc: FinanceAccountRow) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isVirtual}
              onChange={e => setIsVirtual(e.target.checked)}
              className="rounded bg-neutral-800 border-neutral-700"
            />
            {t('virtualCard')}
          </label>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
              {t('cancel')}
            </button>
            <button type="submit" disabled={!name.trim() || !creditLimitCents || isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {isPending ? t('saving') : isEdit ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
