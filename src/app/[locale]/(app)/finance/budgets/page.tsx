import { getActiveWorkspaceId } from '@/lib/actions/workspace';
import { getTranslations } from 'next-intl/server';
import BudgetsClient from './BudgetsClient';

export default async function BudgetsPage() {
  const workspaceId = await getActiveWorkspaceId();
  const t = await getTranslations('Finance');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-neutral-800">
        <h1 className="text-sm font-semibold text-neutral-50">{t('budgetsTitle')}</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <BudgetsClient workspaceId={workspaceId!} />
      </div>
    </div>
  );
}
