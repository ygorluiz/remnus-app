'use client';

import { useState } from 'react';
import SubscriptionList from '@/components/features/finance/subscriptions/SubscriptionList';
import SubscriptionForm from '@/components/features/finance/subscriptions/SubscriptionForm';

export default function SubsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <>
      <SubscriptionList workspaceId={workspaceId} onAdd={() => setShowForm(true)} />
      {showForm && <SubscriptionForm workspaceId={workspaceId} onClose={() => setShowForm(false)} />}
    </>
  );
}
