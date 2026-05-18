import { getPage } from '@/lib/actions/page';
import { getDatabase } from '@/lib/actions/database';
import { notFound } from 'next/navigation';
import PageEditor from '@/components/features/PageEditor';

export default async function PageDetail(props: { params: Promise<{ id: string, pageId: string }> }) {
  const params = await props.params;
  const db = await getDatabase(params.id);
  const page = await getPage(params.pageId);

  if (!db || !page) return notFound();

  return (
    <div className="flex-1 overflow-auto bg-neutral-850">
      <PageEditor database={db} initialPage={page} />
    </div>
  );
}
