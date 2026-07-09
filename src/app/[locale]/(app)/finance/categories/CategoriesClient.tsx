'use client';

import { useState } from 'react';
import CategoryTree from '@/components/features/finance/categories/CategoryTree';
import CategoryForm from '@/components/features/finance/categories/CategoryForm';
import type { FinanceCategoryRow } from '@/lib/actions/finance/categories';

export default function CategoriesClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<FinanceCategoryRow | null>(null);

  return (
    <>
      <CategoryTree
        workspaceId={workspaceId}
        onAdd={() => { setEditCategory(null); setShowForm(true); }}
        onEdit={(cat) => { setEditCategory(cat); setShowForm(true); }}
      />
      {showForm && (
        <CategoryForm
          workspaceId={workspaceId}
          category={editCategory}
          onClose={() => { setShowForm(false); setEditCategory(null); }}
        />
      )}
    </>
  );
}
