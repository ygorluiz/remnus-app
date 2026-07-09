'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileX } from 'lucide-react';

const REDIRECT_AFTER_MS = 3000;

export default function NotFoundRedirect() {
  const t = useTranslations('Errors');
  const router = useRouter();
  const [remaining, setRemaining] = useState(Math.ceil(REDIRECT_AFTER_MS / 1000));

  useEffect(() => {
    if (remaining <= 0) {
      router.replace('/app');
      return;
    }

    const timer = setTimeout(() => {
      setRemaining(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-neutral-850 text-neutral-100">
      <FileX className="w-12 h-12 text-neutral-100/30" strokeWidth={1.5} />
      <div className="text-center">
        <p className="text-base font-medium">{t('resourceNotFound')}</p>
        <p className="text-sm text-neutral-100/50 mt-1">{t('resourceNotFoundDesc')}</p>
      </div>
      <button
        onClick={() => router.replace('/app')}
        className="mt-2 px-4 py-2 text-sm rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        {t('goHome')} ({remaining}s)
      </button>
    </div>
  );
}
