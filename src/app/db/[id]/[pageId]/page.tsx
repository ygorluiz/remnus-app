import { getPage } from '@/lib/actions/page';
import { getDatabase } from '@/lib/actions/database';
import { getSubItems } from '@/lib/actions/workspace';
import { notFound } from 'next/navigation';
import PageEditor from '@/components/features/PageEditor';

export default async function PageDetail(props: { params: Promise<{ id: string, pageId: string }> }) {
  const params = await props.params;
  const [db, page, subItems] = await Promise.all([
    getDatabase(params.id),
    getPage(params.pageId),
    getSubItems(params.pageId),
  ]);

  if (!db || !page) return notFound();

  return (
    <div className="flex-1 overflow-auto bg-neutral-850">
      <PageEditor database={db} initialPage={page} subItems={subItems} />
    </div>
  );
}
