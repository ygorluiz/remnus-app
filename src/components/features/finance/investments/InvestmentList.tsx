'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { useInvestmentsWithValue, usePortfolioSummary, useDeleteInvestment } from '@/hooks/finance/useInvestments';

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TYPE_LABELS: Record<string, string> = {
  stock: 'Ações', fii: 'FIIs', treasury: 'Tesouro', cdb: 'CDB', etf: 'ETF', crypto: 'Crypto', funds: 'Fundos',
};

export default function InvestmentList({ workspaceId, onAdd }: { workspaceId: string; onAdd: () => void }) {
  const t = useTranslations('Finance');
  const { data: investments, isLoading } = useInvestmentsWithValue(workspaceId);
  const { data: summary } = usePortfolioSummary(workspaceId);
  const deleteInv = useDeleteInvestment();

  if (isLoading) return <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">{t('loading')}</div>;

  return (
    <div>
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500 mb-1">{t('totalInvested')}</div>
            <div className="text-sm font-semibold text-neutral-50">R$ {fmt(summary.totalInvested)}</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500 mb-1">{t('currentValue')}</div>
            <div className="text-sm font-semibold text-neutral-50">R$ {fmt(summary.totalCurrent)}</div>
          </div>
          <div className={`bg-neutral-900 border border-neutral-800 rounded-lg p-3 ${
            summary.totalProfitLoss >= 0 ? 'border-green-500/30' : 'border-red-500/30'
          }`}>
            <div className="text-[11px] text-neutral-500 mb-1">{t('profitLoss')}</div>
            <div className={`text-sm font-semibold flex items-center gap-1 ${
              summary.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {summary.totalProfitLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              R$ {fmt(Math.abs(summary.totalProfitLoss))} ({summary.totalProfitLossPercent > 0 ? '+' : ''}{summary.totalProfitLossPercent}%)
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t('investmentsTitle')} ({investments?.length ?? 0})</h2>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg">
          <Plus size={14} /> {t('addInvestment')}
        </button>
      </div>

      <div className="space-y-1">
        {(investments ?? []).map(inv => (
          <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-neutral-850/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
                {inv.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-50 truncate">{inv.symbol}</div>
                <div className="text-[11px] text-neutral-500 truncate">{inv.name} · {TYPE_LABELS[inv.type] ?? inv.type}</div>
              </div>
              <span className="text-[11px] text-neutral-500">{inv.quantity}x</span>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-sm font-medium text-neutral-50">R$ {fmt(inv.currentValue)}</div>
                <div className="text-[11px] text-neutral-500">R$ {fmt(inv.totalInvested)}</div>
              </div>
              <div className={`text-xs font-medium flex items-center gap-0.5 ${
                inv.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {inv.profitLoss >= 0 ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
                {inv.profitLossPercent > 0 ? '+' : ''}{inv.profitLossPercent}%
              </div>
              <button onClick={() => { if (confirm(t('deleteConfirm'))) deleteInv.mutate(inv.id); }}
                className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors">{t('delete')}</button>
            </div>
          </div>
        ))}
      </div>

      {(investments ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noInvestments')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t('addFirstInvestment')}</button>
        </div>
      )}
    </div>
  );
}
