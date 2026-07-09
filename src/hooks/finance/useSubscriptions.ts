'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSubscriptions,
  createSubscription,
  updateSubscription,
  toggleSubscription,
  deleteSubscription,
} from '@/lib/actions/finance/subscriptions';

export function useSubscriptions(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'subscriptions', workspaceId],
    queryFn: () => listSubscriptions(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'subscriptions'] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateSubscription>[1] }) =>
      updateSubscription(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'subscriptions'] }),
  });
}

export function useToggleSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'subscriptions'] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'subscriptions'] }),
  });
}
