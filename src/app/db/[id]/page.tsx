import { getDatabase } from '@/lib/actions/database';
import { getPages } from '@/lib/actions/page';
import { notFound } from 'next/navigation';
import DatabaseView from '@/components/features/DatabaseView';

export default async function DatabasePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const db = await getDatabase(params.id);
  
  if (!db) return notFound();

  const pages = await getPages(params.id);

  return (
    <div className="flex-1 overflow-hidden bg-neutral-850 flex flex-col">
      <DatabaseView database={db} initialPages={pages} />
    </div>
  );
}
