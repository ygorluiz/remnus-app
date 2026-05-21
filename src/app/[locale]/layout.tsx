import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { Analytics } from '@vercel/analytics/next';
import { auth, signOut } from '@/auth';
import { cookies, headers } from 'next/headers';
import { getAllWorkspaceItems, getWorkspaces } from '@/lib/actions/workspace';
import WorkspaceSidebar from '@/components/features/WorkspaceSidebar';
import MobileNavWrapper from '@/components/features/MobileNavWrapper';
import QueryProvider from '@/components/providers/QueryProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';

function isMarketingPath(pathname: string) {
  const clean = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
  return clean === '/' || clean.startsWith('/pricing') || clean.startsWith('/contact');
}

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Remnus',
  description: 'Customizable database and pages',
  icons: {
    icon: '/logo-square-dark.ico',
    shortcut: '/logo-square-dark.ico',
    apple: '/logo-square-dark.png',
  }
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  const session = await auth();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/';
  const isMarketing = isMarketingPath(pathname);

  if (!session?.user || isMarketing) {
    return (
      <html lang={locale}>
        <body className={`${inter.className} bg-neutral-950 text-neutral-50`}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
          <Analytics />
        </body>
      </html>
    );
  }

  const t = await getTranslations('Layout');

  const [workspacesList, items] = await Promise.all([
    getWorkspaces(),
    getAllWorkspaceItems(),
  ]);

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('remnus_workspace_id')?.value;
  const activeWorkspace = workspacesList.find((w) => w.id === activeWorkspaceId) || workspacesList[0];

  const currentUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-neutral-950 text-neutral-50 flex h-screen overflow-hidden`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <aside className="hidden lg:flex w-72 bg-neutral-900 border-r border-neutral-800 flex-col">
              <WorkspaceSidebar
                items={items}
                workspaces={workspacesList}
                activeWorkspace={activeWorkspace ?? { id: '', name: 'Workspace' }}
                currentUser={currentUser}
              />
            </aside>
            <MobileNavWrapper
              items={items}
              workspaces={workspacesList}
              activeWorkspace={activeWorkspace ?? { id: '', name: 'Workspace' }}
              currentUser={currentUser}
            />
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-850 pb-14 lg:pb-0">
              {session.user.role === 'demo' && (
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 min-w-0">
                    <span className="font-semibold shrink-0">{t('demoMode')}</span>
                    <span className="text-amber-500/70 shrink-0">—</span>
                    <span className="text-amber-400/80 truncate">{t('demoChangesNote')}</span>
                  </div>
                  <form
                    action={async () => {
                      'use server';
                      await signOut({ redirectTo: '/register' });
                    }}
                  >
                    <button
                      type="submit"
                      className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-100 transition-colors self-start sm:self-auto"
                    >
                      {t('createFreeAccount')}
                    </button>
                  </form>
                </div>
              )}
              {children}
            </main>
          </QueryProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
