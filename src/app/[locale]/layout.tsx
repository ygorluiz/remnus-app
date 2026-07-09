import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { auth } from '@/auth';
import { cookies, headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import PostHogPageView from '@/components/providers/PostHogPageView';
import PostHogIdentify from '@/components/providers/PostHogIdentify';
import AttributionCapture from '@/components/providers/AttributionCapture';
import { ConsentProvider } from '@/components/providers/ConsentContext';
import CookieConsentBanner from '@/components/features/CookieConsentBanner';
import { CONSENT_COOKIE, isConsentRequired, parseConsent } from '@/lib/consent';
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

  const currentUser = session?.user ? {
    id: session.user.id,
    name: (session.user.name as string | undefined) ?? null,
    email: (session.user.email as string | undefined) ?? null,
    image: (session.user.image as string | undefined) ?? null,
    role: (session.user.role as string) ?? 'user',
  } : null;

  return (
    <>
      <PostHogProvider consentRequired={consentRequired} initialConsent={initialConsent}>
        <PostHogPageView skip={currentUser ? isAdminRole(currentUser.role) : false} />
        {currentUser && <PostHogIdentify user={currentUser} />}
        {!currentUser && <AttributionCapture />}
        <NextIntlClientProvider messages={messages}>
          <ConsentProvider
            consentRequired={consentRequired}
            initialConsent={initialConsent}
            userRole={currentUser?.role}
          >
            {children}
            <CookieConsentBanner />
          </ConsentProvider>
        </NextIntlClientProvider>
      </PostHogProvider>
      <Analytics />
    </>
  );
}
