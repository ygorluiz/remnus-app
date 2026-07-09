'use client';

import { useState } from 'react';
import DebtList from '@/components/features/finance/debts/DebtList';
import DebtForm from '@/components/features/finance/debts/DebtForm';

export default function DebtsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <DebtList workspaceId={workspaceId} onAdd={() => setShowForm(true)} />
      {showForm && <DebtForm workspaceId={workspaceId} onClose={() => setShowForm(false)} />}
    </>
  );
}
