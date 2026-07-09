'use client';

import { useTranslations } from 'next-intl';
import { Plus, CreditCard } from 'lucide-react';
import { useCards, useDeleteCard } from '@/hooks/finance/useCards';
import type { FinanceCardRow } from '@/lib/actions/finance/cards';

const BRAND_COLORS: Record<string, string> = {
  visa: 'text-blue-400',
  mastercard: 'text-red-400',
  elo: 'text-yellow-400',
  amex: 'text-green-400',
  hipercard: 'text-purple-400',
  other: 'text-neutral-400',
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(closingDay: number | null, dueDay: number | null): { days: number; label: string } | null {
  if (!closingDay || !dueDay) return null;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let closeDate = new Date(currentYear, currentMonth, closingDay);
  if (closeDate < now) closeDate = new Date(currentYear, currentMonth + 1, closingDay);

  let dueDate = new Date(currentYear, currentMonth, dueDay);
  if (dueDate < now) dueDate = new Date(currentYear, currentMonth + 1, dueDay);

  const daysToClose = Math.round((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysToDue = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToDue >= 0) return { days: daysToDue, label: `Vence em ${daysToDue}d` };
  return { days: daysToClose, label: `Fecha em ${daysToClose}d` };
}

export default function CardList({
  workspaceId,
  onAdd,
  onEdit,
}: {
  workspaceId: string;
  onAdd: () => void;
  onEdit: (card: FinanceCardRow) => void;
}) {
  const t = useTranslations('Finance');
  const { data: cards, isLoading } = useCards(workspaceId);
  const deleteCard = useDeleteCard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  const totalLimit = (cards ?? []).reduce((s: number, c: FinanceCardRow) => s + c.creditLimitCents, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-neutral-50">
            {formatCents(totalLimit)}
          </p>
          <p className="text-xs text-neutral-500">{t('totalCreditLimit')}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Plus size={14} />
          {t('addCard')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(cards ?? []).map((card: FinanceCardRow) => {
          const cycleInfo = daysUntil(card.closingDay, card.dueDay);
          return (
            <div
              key={card.id}
              onClick={() => onEdit(card)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-neutral-850 ${BRAND_COLORS[card.brand]}`}>
                  <CreditCard size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-50 truncate">{card.name}</p>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">{card.brand}</p>
                </div>
                {card.isVirtual && (
                  <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                    Virtual
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <p className="text-lg font-bold text-neutral-50">{formatCents(card.creditLimitCents)}</p>
                <p className="text-[10px] text-neutral-600">limite</p>
              </div>

              {cycleInfo && (
                <p className="text-[11px] text-neutral-500 mt-1">{cycleInfo.label}</p>
              )}

              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('deleteConfirm'))) deleteCard.mutate(card.id);
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

      {(cards ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <CreditCard size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noCards')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
            {t('addFirstCard')}
          </button>
        </div>
      )}
    </div>
  );
}
