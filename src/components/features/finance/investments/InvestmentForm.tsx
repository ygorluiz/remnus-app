'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useCreateInvestment } from '@/hooks/finance/useInvestments';

const INVESTMENT_TYPES = ['stock', 'fii', 'treasury', 'cdb', 'etf', 'crypto', 'funds'] as const;

export default function InvestmentForm({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const t = useTranslations('Finance');
  const createInv = useCreateInvestment();
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<typeof INVESTMENT_TYPES[number]>('stock');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || !quantity) return;
    await createInv.mutateAsync({
      workspaceId,
      symbol: symbol.toUpperCase(),
      name,
      type,
      quantity: parseFloat(quantity),
      averagePrice: averagePrice ? parseFloat(averagePrice) : undefined,
      currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-300 bg-black/60" onClick={onClose} />
      <div className="fixed z-300 inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md bg-neutral-850 border border-neutral-800 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">{t('addInvestment')}</h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('symbol')}</label>
              <input value={symbol} onChange={e => setSymbol(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60 uppercase"
                placeholder="PETR4" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('type')}</label>
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60">
                {INVESTMENT_TYPES.map(tp => <option key={tp} value={tp}>{t(`invType${tp}` as any) || tp}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('investmentName')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60"
              placeholder="Petrobras PN" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('quantity')}</label>
              <input type="number" step="0.0001" min="0" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="100" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('avgPrice')}</label>
              <input type="number" step="0.01" min="0" value={averagePrice} onChange={e => setAveragePrice(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="25,50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400 mb-1 block">{t('currentPrice')}</label>
              <input type="number" step="0.01" min="0" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-blue-500/60" placeholder="28,00" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg">{t('cancel')}</button>
            <button type="submit" disabled={!symbol || !name || !quantity || createInv.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg">
              {createInv.isPending ? t('saving') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
