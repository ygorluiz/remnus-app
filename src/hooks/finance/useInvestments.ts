'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listInvestments,
  getInvestmentsWithValue,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  createInvestmentTransaction,
  getPortfolioSummary,
} from '@/lib/actions/finance/investments';

export function useInvestments(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'investments', workspaceId],
    queryFn: () => listInvestments(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useInvestmentsWithValue(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'investments', 'value', workspaceId],
    queryFn: () => getInvestmentsWithValue(workspaceId),
    enabled: !!workspaceId,
  });
}

export function usePortfolioSummary(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'portfolio', 'summary', workspaceId],
    queryFn: () => getPortfolioSummary(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInvestment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'investments'] }),
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateInvestment>[1] }) =>
      updateInvestment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'investments'] }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvestment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'investments'] }),
  });
}

export function useCreateInvestmentTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInvestmentTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'investments'] }),
  });
}
