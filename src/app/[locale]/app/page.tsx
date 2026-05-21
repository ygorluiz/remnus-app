import { auth } from '@/auth';
import { getActiveWorkspaceId, getWorkspaceItems } from '@/lib/actions/workspace';
import { redirect } from 'next/navigation';

// Redirect authenticated users to their workspace; guests go to login.
export default async function AppRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const activeWorkspaceId = await getActiveWorkspaceId();

  if (!activeWorkspaceId) {
    redirect('/login');
  }

  const items = await getWorkspaceItems(activeWorkspaceId);

  if (items.length > 0) {
    const first = items[0];
    if (first.type === 'database' && first.databaseId) {
      redirect(`/db/${first.databaseId}`);
    } else {
      redirect(`/page/${first.id}`);
    }
  }

  redirect('/login');
}
