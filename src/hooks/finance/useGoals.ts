'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listGoals, createGoal, updateGoal, deleteGoal } from '@/lib/actions/finance/goals';

export function useGoals(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'goals', workspaceId],
    queryFn: () => listGoals(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateGoal>[1] }) =>
      updateGoal(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'goals'] }),
  });
}
