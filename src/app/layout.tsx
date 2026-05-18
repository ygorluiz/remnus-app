import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
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
  const activeWorkspaceId = await getActiveWorkspaceId();
  const workspacesList = await getWorkspaces();
  const items = await getAllWorkspaceItems();
  const activeWorkspace = workspacesList.find(w => w.id === activeWorkspaceId) || workspacesList[0] || { id: 'default-workspace', name: 'My Workspace' };

  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 flex h-screen overflow-hidden`}>
        <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <WorkspaceSidebar 
            items={items} 
            workspaces={workspacesList}
            activeWorkspace={activeWorkspace}
          />
        </aside>
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">
          {children}
        </main>
      </body>
    </html>
  );
}
