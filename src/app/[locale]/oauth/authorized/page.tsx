import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { createHmac, timingSafeEqual } from 'crypto';
import { OAuthSuccessView } from './OAuthSuccessView';

function verifyRedirectSig(url: string, sig: string): boolean {
  try {
    // Fail closed when AUTH_SECRET is missing — never validate against a known
    // fallback key (that would let anyone forge the redirect signature).
    const secret = process.env.AUTH_SECRET;
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update(url).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(sig, 'hex');
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export default async function OAuthAuthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; sig?: string }>;
}) {
  const { to, sig } = await searchParams;
  const t = await getTranslations('OAuthAuthorize');

  const isValid =
    !!to &&
    !!sig &&
    sig.length === 64 && // sha256 hex = 64 chars
    verifyRedirectSig(to, sig);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      {isValid ? (
        <OAuthSuccessView
          to={to!}
          successTitle={t('successTitle')}
          successMessage={t('successMessage')}
          successClose={t('successClose')}
        />
      ) : (
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="inline-flex flex-col items-center hover:opacity-80 transition-opacity mb-8">
            <img
              src="/logo-square-dark.png"
              alt="Remnus"
              className="w-14 h-14 object-contain rounded-xl shadow-lg"
            />
          </Link>
          <div className="w-12 h-12 bg-red-400/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#cd4d55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">{t('invalidRedirect')}</p>
        </div>
      )}
    </div>
  );
}
