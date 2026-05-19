import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { auth } from '@/auth';
import { getActiveWorkspaceId, getAllWorkspaceItems, getWorkspaces } from '@/lib/actions/workspace';
import WorkspaceSidebar from '@/components/features/WorkspaceSidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Remna',
  description: 'Customizable database and pages',
  icons: {
    icon: '/logo-square-dark.ico',
    shortcut: '/logo-square-dark.ico',
    apple: '/logo-square-dark.png',
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  // Middleware ensures unauthenticated users are redirected to /login before reaching here.
  // If session is missing (e.g., login page), render a bare layout without sidebar.
  if (!session?.user) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-neutral-950 text-neutral-50`}>
          {children}
        </body>
      </html>
    );
  }

  const activeWorkspaceId = await getActiveWorkspaceId();
  const workspacesList = await getWorkspaces();
  const items = await getAllWorkspaceItems();
  const activeWorkspace = workspacesList.find((w) => w.id === activeWorkspaceId) || workspacesList[0];

  const currentUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };

  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 flex h-screen overflow-hidden`}>
        <aside className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <WorkspaceSidebar
            items={items}
            workspaces={workspacesList}
            activeWorkspace={activeWorkspace ?? { id: '', name: 'Workspace' }}
            currentUser={currentUser}
          />
        </aside>
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-850">
          {children}
        </main>
      </body>
    </html>
  );
}
