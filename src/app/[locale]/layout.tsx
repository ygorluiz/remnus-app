import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { auth } from '@/auth';
import { cookies, headers } from 'next/headers';
import { getAllWorkspaceItems, getWorkspaces } from '@/lib/actions/workspace';
import WorkspaceSidebar from '@/components/features/WorkspaceSidebar';
import MobileNavWrapper from '@/components/features/MobileNavWrapper';
import QueryProvider from '@/components/providers/QueryProvider';
import AppShell from '@/components/AppShell';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import PostHogPageView from '@/components/providers/PostHogPageView';
import PostHogIdentify from '@/components/providers/PostHogIdentify';
import AttributionCapture from '@/components/providers/AttributionCapture';
import { ConsentProvider } from '@/components/providers/ConsentContext';
import CookieConsentBanner from '@/components/features/CookieConsentBanner';
import { CONSENT_COOKIE, isConsentRequired, parseConsent } from '@/lib/consent';
import UpdateBanner from '@/components/features/UpdateBanner';
import ActivityTracker from '@/components/providers/ActivityTracker';
import BillingSuccessModal from '@/components/features/BillingSuccessModal';
import { METADATA_BASE_URL, DEFAULT_OG_IMAGE, DEFAULT_TWITTER_IMAGE } from '@/lib/metadata';
import { isAdminRole } from '@/lib/auth/roles';

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE_URL),
  title: {
    default: 'Remnus',
    template: '%s | Remnus',
  },
  description: 'Remnus is the MCP-Native workspace for vibe coders — kanban boards, databases, and pages that Claude, Cursor, and any AI agent can read and write via MCP.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Remnus',
  },
  icons: {
    icon: '/logo-square-dark.ico',
    shortcut: '/logo-square-dark.ico',
    apple: '/logo-square-dark.png',
  },
  openGraph: {
    title: 'Remnus | MCP-Native workspace for vibe coders',
    description: 'Kanban boards, databases, and pages that Claude, Cursor, and any AI agent can read and write via MCP.',
    url: METADATA_BASE_URL,
    siteName: 'Remnus',
    images: [DEFAULT_OG_IMAGE],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Remnus | MCP-Native workspace for vibe coders',
    description: 'Kanban boards, databases, and pages that Claude, Cursor, and any AI agent can read and write via MCP.',
    images: [DEFAULT_TWITTER_IMAGE],
  },
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
  const headerStore = await headers();

  let session;
  try {
    session = await auth.api.getSession({ headers: headerStore });
  } catch {
    // auth failure — treat as unauthenticated
  }

  // Geo-aware cookie consent (server-resolved so the banner renders flash-free).
  const consentCookieStore = await cookies();
  const consentRequired = isConsentRequired(headerStore.get('x-vercel-ip-country'));
  const initialConsent = parseConsent(consentCookieStore.get(CONSENT_COOKIE)?.value);

  if (!session?.user) {
    return (
      <>
        <PostHogProvider consentRequired={consentRequired} initialConsent={initialConsent}>
          <PostHogPageView />
          <AttributionCapture />
          <NextIntlClientProvider messages={messages}>
            <ConsentProvider consentRequired={consentRequired} initialConsent={initialConsent}>
              {children}
              <CookieConsentBanner />
            </ConsentProvider>
          </NextIntlClientProvider>
        </PostHogProvider>
        <Analytics />
      </>
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
  const sidebarDensity = (cookieStore.get('remnus_sidebar_density')?.value ?? 'comfortable') as 'compact' | 'comfortable';

  const currentUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: (session.user as Record<string, unknown>).role as string ?? 'user',
  };

  const demoBanner = (session.user as Record<string, unknown>).role === 'demo' ? (
    <div key="demo-banner" className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
      <div className="flex items-center gap-1.5 text-xs text-amber-400 min-w-0">
        <span className="font-semibold shrink-0">{t('demoMode')}</span>
        <span className="text-amber-500/70 shrink-0">—</span>
        <span className="text-amber-400/80 truncate">{t('demoChangesNote')}</span>
      </div>
      <form
        action={async () => {
          'use server';
          await auth.api.signOut({ headers: await headers() });
          redirect('/login');
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
  ) : undefined;

  return (
    <PostHogProvider consentRequired={consentRequired} initialConsent={initialConsent}>
      <PostHogPageView skip={currentUser ? isAdminRole(currentUser.role) : true} />
      <PostHogIdentify user={currentUser} />
      <NextIntlClientProvider messages={messages}>
        <ConsentProvider
          consentRequired={consentRequired}
          initialConsent={initialConsent}
          userRole={currentUser.role}
        >
        <ActivityTracker />
        <BillingSuccessModal />
        <UpdateBanner />
        <QueryProvider>
          <AppShell
            items={items}
            activeWorkspaceId={activeWorkspace?.id ?? ''}
            sidebar={
              <WorkspaceSidebar
                key="workspace-sidebar"
                items={items}
                workspaces={workspacesList}
                activeWorkspace={activeWorkspace ?? { id: '', name: 'Workspace' }}
                currentUser={currentUser}
                density={sidebarDensity}
              />
            }
            mobileNav={
              <MobileNavWrapper
                key="mobile-nav"
                items={items}
                workspaces={workspacesList}
                activeWorkspace={activeWorkspace ?? { id: '', name: 'Workspace' }}
                currentUser={currentUser}
              />
            }
            demoBanner={demoBanner}
          >
            {children}
          </AppShell>
        </QueryProvider>
        <Analytics />
        <CookieConsentBanner />
        </ConsentProvider>
      </NextIntlClientProvider>
    </PostHogProvider>
  );
}
