'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDebts, createDebt, updateDebt, deleteDebt } from '@/lib/actions/finance/debts';

export function useDebts(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'debts', workspaceId],
    queryFn: () => listDebts(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'debts'] }),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateDebt>[1] }) =>
      updateDebt(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'debts'] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDebt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'debts'] }),
  });
}
