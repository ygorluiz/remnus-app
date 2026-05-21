import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

export default async function MarketingFooter() {
  const t = await getTranslations('Landing');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="flex flex-col gap-3 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo-square-dark.png"
                alt="Remnus"
                width={24}
                height={24}
                className="rounded-md"
              />
              <span className="text-sm font-semibold text-neutral-100">Remnus</span>
            </Link>
            <p className="text-xs text-neutral-500 leading-relaxed">{t('footerTagline')}</p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {t('footerLinks')}
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                {t('navHome')}
              </Link>
              <Link href="/pricing" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                {t('navPricing')}
              </Link>
              <Link href="/contact" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                {t('navContact')}
              </Link>
              <Link href="/login" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                {t('footerApp')}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-800 pt-6">
          <p className="text-xs text-neutral-600">
            {t('footerCopyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
