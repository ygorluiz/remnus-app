'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTransactions, createTransaction, updateTransaction, deleteTransaction, type TransactionFilters } from '@/lib/actions/finance/transactions';

export function useTransactions(workspaceId: string, filters?: TransactionFilters, limit?: number) {
  return useQuery({
    queryKey: ['finance', 'transactions', workspaceId, filters, limit],
    queryFn: () => listTransactions(workspaceId, filters, limit ?? 50),
    enabled: !!workspaceId,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTransaction>[1] }) => updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}
