'use client';

import { useState } from 'react';
import CardList from '@/components/features/finance/cards/CardList';
import CardForm from '@/components/features/finance/cards/CardForm';
import type { FinanceCardRow } from '@/lib/actions/finance/cards';

export default function CardsClient({ workspaceId }: { workspaceId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<FinanceCardRow | null>(null);

  return (
    <>
      <CardList
        workspaceId={workspaceId}
        onAdd={() => { setEditCard(null); setShowForm(true); }}
        onEdit={(card) => { setEditCard(card); setShowForm(true); }}
      />
      {showForm && (
        <CardForm
          workspaceId={workspaceId}
          card={editCard}
          onClose={() => { setShowForm(false); setEditCard(null); }}
        />
      )}
    </>
  );
}
