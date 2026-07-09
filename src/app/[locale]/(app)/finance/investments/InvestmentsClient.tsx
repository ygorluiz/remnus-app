'use client';

import { useState } from 'react';
import InvestmentList from '@/components/features/finance/investments/InvestmentList';
import InvestmentForm from '@/components/features/finance/investments/InvestmentForm';

export default function InvestmentsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <InvestmentList workspaceId={workspaceId} onAdd={() => setShowForm(true)} />
      {showForm && <InvestmentForm workspaceId={workspaceId} onClose={() => setShowForm(false)} />}
    </>
  );
}
