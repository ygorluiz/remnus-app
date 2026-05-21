'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  user?: { name: string | null; email: string | null } | null;
}

export default function MarketingHeader({ user }: Props) {
  const t = useTranslations('Landing');
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || null;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo-square-dark.png" alt="Remnus" width={28} height={28} className="rounded-md" />
          <span className="text-base font-semibold text-neutral-100">Remnus</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            {t('navHome')}
          </Link>
          <Link href="/pricing" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            {t('navPricing')}
          </Link>
          <Link href="/contact" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            {t('navContact')}
          </Link>
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <User size={14} />
                </div>
                <span className="max-w-30 truncate">{displayName}</span>
              </div>
              <Link
                href="/app"
                className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500/90 transition-colors"
              >
                {t('navGoToApp')}
                <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
                {t('navSignIn')}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500/90 transition-colors"
              >
                {t('navGetStarted')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-neutral-400 hover:text-neutral-100 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950 px-6 py-4 flex flex-col gap-4">
          <Link href="/" className="text-sm text-neutral-300" onClick={() => setMenuOpen(false)}>
            {t('navHome')}
          </Link>
          <Link href="/pricing" className="text-sm text-neutral-300" onClick={() => setMenuOpen(false)}>
            {t('navPricing')}
          </Link>
          <Link href="/contact" className="text-sm text-neutral-300" onClick={() => setMenuOpen(false)}>
            {t('navContact')}
          </Link>

          <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    <User size={14} />
                  </div>
                  <span className="truncate">{displayName}</span>
                </div>
                <Link
                  href="/app"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('navGoToApp')}
                  <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-neutral-300">
                  {t('navSignIn')}
                </Link>
                <Link
                  href="/register"
                  className="w-full text-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white"
                >
                  {t('navGetStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
