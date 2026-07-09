'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/lib/actions/finance/categories';

export function useCategories(workspaceId: string) {
  return useQuery({
    queryKey: ['finance', 'categories', workspaceId],
    queryFn: () => listCategories(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['finance', 'categories', cat.workspaceId] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) => updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'categories'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'categories'] });
    },
  });
}
