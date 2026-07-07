// Confirm-button page for the emailed account-deletion link (mutation NOT on
// GET — mail scanners prefetch links, same reasoning as /unsubscribe). Not
// whitelisted in auth.config.ts: this route is deliberately auth-protected
// by the default middleware behavior (unauthenticated visits bounce to
// /login?callbackUrl=..., NextAuth's own redirect callback sends them back
// here afterward), since confirming deletion requires the SAME live session
// that requested it — the emailed link alone isn't sufficient.

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { db } from '@/db';
import { accountDeletionTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { confirmAccountDeletion } from '@/lib/actions/account';

export const metadata = { title: 'Confirm account deletion | Remnus' };

function isTokenLive(row: { userId: string; usedAt: Date | null; expiresAt: Date } | undefined, userId: string): boolean {
  if (!row || row.userId !== userId || row.usedAt) return false;
  return row.expiresAt.getTime() > Date.now();
}

export default async function ConfirmAccountDeletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations('UserSettings');
  const tErrors = await getTranslations('Errors');
  const user = await getCurrentUser();

  const [row] = token
    ? await db.select().from(accountDeletionTokens).where(eq(accountDeletionTokens.token, token)).limit(1)
    : [undefined];

  const valid = isTokenLive(row, user.id);

  async function confirm() {
    'use server';
    if (!token) return;
    const result = await confirmAccountDeletion(token);
    // Success redirects internally (signOut) and never returns here.
    if (result?.error) redirect(`/account-delete/confirm?token=${encodeURIComponent(token)}&error=1`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo-square-dark.png" alt="Remnus" width={30} height={30} className="rounded-lg" />
          <span className="text-lg font-semibold text-neutral-100">Remnus</span>
        </div>

        {!valid ? (
          <>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500">
              <AlertTriangle size={20} />
            </div>
            <h1 className="text-lg font-semibold text-neutral-100">{t('deleteAccountLinkInvalidTitle')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{t('deleteAccountLinkInvalidBody')}</p>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/12 text-red-400">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-lg font-semibold text-neutral-100">{t('deleteAccountConfirmTitle')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{t('deleteAccountFinalConfirmBody')}</p>
            {error === '1' && (
              <p className="mt-3 text-xs text-red-400 leading-relaxed">{tErrors('accountDeleteInvalidToken')}</p>
            )}
            <form action={confirm} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-lg bg-red-500/80 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
              >
                {t('deleteAccountConfirmButton')}
              </button>
            </form>
          </>
        )}

        <Link
          href="/app"
          className="mt-6 inline-block text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          {t('deleteAccountCancel')}
        </Link>
      </div>
    </div>
  );
}
