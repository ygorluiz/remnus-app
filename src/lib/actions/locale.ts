'use server';

import { cookies } from 'next/headers';
import { routing } from '@/i18n/routing';

export async function setLocale(locale: string) {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) return;
  (await cookies()).set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: true,
  });
}
