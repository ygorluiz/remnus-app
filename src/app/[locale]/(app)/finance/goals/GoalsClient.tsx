'use client';

import { useState } from 'react';
import GoalList from '@/components/features/finance/goals/GoalList';
import GoalForm from '@/components/features/finance/goals/GoalForm';

export default function GoalsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <GoalList workspaceId={workspaceId} onAdd={() => setShowForm(true)} />
      {showForm && <GoalForm workspaceId={workspaceId} onClose={() => setShowForm(false)} />}
    </>
  );
}
