'use client';

import { useState } from 'react';
import TransactionList from '@/components/features/finance/transactions/TransactionList';
import TransactionForm from '@/components/features/finance/transactions/TransactionForm';
import type { FinanceTransactionRow } from '@/lib/actions/finance/transactions';

export default function TransactionsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<FinanceTransactionRow | null>(null);

  return (
    <>
      <TransactionList
        workspaceId={workspaceId}
        onAdd={() => { setEditTransaction(null); setShowForm(true); }}
        onEdit={(txn) => { setEditTransaction(txn); setShowForm(true); }}
      />
      {showForm && (
        <TransactionForm
          workspaceId={workspaceId}
          transaction={editTransaction}
          onClose={() => { setShowForm(false); setEditTransaction(null); }}
        />
      )}
    </>
  );
}
