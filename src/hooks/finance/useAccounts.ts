'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAccounts, createAccount, updateAccount, archiveAccount, deleteAccount, reconcileAccount } from '@/lib/actions/finance/accounts';

export function useAccounts(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'accounts', workspaceId],
    queryFn: () => listAccounts(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: (account) => {
      qc.invalidateQueries({ queryKey: ['finance', 'accounts', account.workspaceId] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateAccount>[1] }) => updateAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveAccount(id, archived),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}

export function useReconcileAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reconcileAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'accounts'] });
    },
  });
}
