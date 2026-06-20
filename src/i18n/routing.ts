import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr', 'hi', 'es', 'fr', 'de', 'pt-BR'],
  defaultLocale: 'en',
  localePrefix: 'never',
});

export type Locale = (typeof routing.locales)[number];
