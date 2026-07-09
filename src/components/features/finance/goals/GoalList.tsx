'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Target, Circle, CheckCircle, PauseCircle } from 'lucide-react';
import { useGoals, useUpdateGoal, useDeleteGoal } from '@/hooks/finance/useGoals';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 border-red-500/40',
  medium: 'text-amber-400 border-amber-500/40',
  low: 'text-green-400 border-green-500/40',
};

const STATUS_ICONS: Record<string, any> = {
  active: Circle,
  completed: CheckCircle,
  paused: PauseCircle,
};

export default function GoalList({ workspaceId, onAdd }: { workspaceId: string; onAdd: () => void }) {
  const t = useTranslations('Finance');
  const { data: goals, isLoading } = useGoals(workspaceId);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">{t('loading')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{t('goalsTitle')}</h2>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg">
          <Plus size={14} /> {t('addGoal')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(goals ?? []).map(goal => {
          const percent = goal.targetAmountCents > 0
            ? Math.min(100, Math.round((goal.currentAmountCents / goal.targetAmountCents) * 100))
            : 0;
          const StatusIcon = STATUS_ICONS[goal.status] ?? Circle;
          const dueDate = goal.targetDate ? new Date(goal.targetDate) : null;

          return (
            <div key={goal.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusIcon size={14} className={`shrink-0 ${
                    goal.status === 'completed' ? 'text-green-400' :
                    goal.status === 'paused' ? 'text-amber-400' : 'text-blue-400'
                  }`} />
                  <span className="text-sm font-medium text-neutral-50 truncate">{goal.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[goal.priority] ?? 'text-neutral-500'}`}>
                    {goal.priority}
                  </span>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => {
                      const nextStatus = goal.status === 'active' ? 'completed' : goal.status === 'completed' ? 'paused' : 'active';
                      updateGoal.mutate({ id: goal.id, data: { status: nextStatus as any } });
                    }}
                    className="text-[11px] text-neutral-600 hover:text-neutral-300 transition-colors"
                  >
                    {goal.status === 'active' ? t('complete') : goal.status === 'completed' ? t('pause') : t('resume')}
                  </button>
                  <button onClick={() => { if (confirm(t('deleteConfirm'))) deleteGoal.mutate(goal.id); }}
                    className="text-[11px] text-neutral-600 hover:text-red-400 transition-colors">
                    {t('delete')}
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : percent >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-500">{percent}% · {formatCents(goal.currentAmountCents)} / {formatCents(goal.targetAmountCents)}</span>
                {dueDate && <span className="text-neutral-500">{dueDate.toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {(goals ?? []).length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <Target size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('noGoals')}</p>
          <button onClick={onAdd} className="mt-3 text-xs text-blue-400 hover:text-blue-300">{t('addFirstGoal')}</button>
        </div>
      )}
    </div>
  );
}
