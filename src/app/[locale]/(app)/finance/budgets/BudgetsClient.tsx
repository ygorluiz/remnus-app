'use client';

import { useState } from 'react';
import BudgetList from '@/components/features/finance/budgets/BudgetList';
import BudgetForm from '@/components/features/finance/budgets/BudgetForm';

export default function BudgetsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <BudgetList workspaceId={workspaceId} onAdd={() => setShowForm(true)} />
      {showForm && (
        <BudgetForm workspaceId={workspaceId} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
