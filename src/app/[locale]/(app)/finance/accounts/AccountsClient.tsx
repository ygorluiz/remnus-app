'use client';

import { useState } from 'react';
import AccountList from '@/components/features/finance/accounts/AccountList';
import AccountForm from '@/components/features/finance/accounts/AccountForm';
import type { FinanceAccountRow } from '@/lib/actions/finance/accounts';

export default function AccountsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<FinanceAccountRow | null>(null);

  return (
    <>
      <AccountList
        workspaceId={workspaceId}
        onAdd={() => { setEditAccount(null); setShowForm(true); }}
        onEdit={(account) => { setEditAccount(account); setShowForm(true); }}
      />
      {showForm && (
        <AccountForm
          workspaceId={workspaceId}
          account={editAccount}
          onClose={() => { setShowForm(false); setEditAccount(null); }}
        />
      )}
    </>
  );
}
