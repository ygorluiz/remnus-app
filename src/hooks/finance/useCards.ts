'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCards, createCard, updateCard, deleteCard } from '@/lib/actions/finance/cards';

export function useCards(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'cards', workspaceId],
    queryFn: () => listCards(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCard,
    onSuccess: (card) => {
      qc.invalidateQueries({ queryKey: ['finance', 'cards', card.workspaceId] });
    },
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCard>[1] }) => updateCard(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'cards'] }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'cards'] }),
  });
}
