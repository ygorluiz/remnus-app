'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Wallet,
  ArrowLeftRight,
  LayoutDashboard,
  Tags,
  CreditCard,
  PiggyBank,
  Target,
  Repeat,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const ITEMS = [
  { href: '/finance/dashboard', labelKey: 'dashboardTitle', icon: LayoutDashboard },
  { href: '/finance/accounts', labelKey: 'accountsTitle', icon: Wallet },
  { href: '/finance/cards', labelKey: 'cardsTitle', icon: CreditCard },
  { href: '/finance/budgets', labelKey: 'budgetsTitle', icon: PiggyBank },
  { href: '/finance/goals', labelKey: 'goalsTitle', icon: Target },
  { href: '/finance/subscriptions', labelKey: 'subscriptionsTitle', icon: Repeat },
  { href: '/finance/debts', labelKey: 'debtsTitle', icon: TrendingDown },
  { href: '/finance/investments', labelKey: 'investmentsTitle', icon: TrendingUp },
  { href: '/finance/transactions', labelKey: 'transactionsTitle', icon: ArrowLeftRight },
  { href: '/finance/categories', labelKey: 'categoriesTitle', icon: Tags },
];

export default function FinanceGroup({ activeWorkspaceId }: { activeWorkspaceId: string }) {
  const t = useTranslations('Finance');
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(() => {
    return pathname.startsWith('/finance');
  });

  const isActive = pathname.startsWith('/finance');

  return (
    <div className="pt-3">
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm transition-all ${
          isActive
            ? 'text-neutral-50 font-medium'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/50'
        }`}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {t('financeLabel')}
        </span>
      </button>

      {isExpanded && (
        <div className="pl-3 space-y-0.5 border-l border-neutral-800 ml-2.5 my-1">
          {ITEMS.map(item => {
            const Icon = item.icon;
            const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all ${
                  itemActive
                    ? 'bg-neutral-850 text-neutral-50 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-850/50 hover:text-neutral-200'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
