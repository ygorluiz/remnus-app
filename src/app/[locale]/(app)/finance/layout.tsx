import { auth } from '@/auth';
import { getActiveWorkspaceId } from '@/lib/actions/workspace';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/login');

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) redirect('/app');

  return <>{children}</>;
}
