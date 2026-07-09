'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBudgets,
  getBudgetsWithSpent,
  upsertBudget,
  deleteBudget,
} from '@/lib/actions/finance/budgets';

export function useBudgets(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'budgets', workspaceId],
    queryFn: () => listBudgets(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useBudgetsWithSpent(workspaceId: string, month?: string) {
  return useQuery({
    queryKey: ['finance', 'budgets', 'spent', workspaceId, month],
    queryFn: () => getBudgetsWithSpent(workspaceId, month),
    enabled: !!workspaceId,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budgets'] }),
  });
}
