import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Raise the Next.js proxy body limit for /api/upload (kind=file accepts up to
  // 25 MB attachments). The Notion import route receives only a JSON payload —
  // the ZIP is parsed entirely in the browser and never sent to the server.
  experimental: {
    proxyClientMaxBodySize: '30mb',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.posthog.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.stripe.com; connect-src 'self' https://*.posthog.com https://*.stripe.com https://api.cloudinary.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
};

const intlConfig = withNextIntl(nextConfig);

// Only apply the PWA wrapper in production so Turbopack runs unobstructed in dev.
// withPWA injects webpack plugins even when `disable: true`, which prevents
// Next.js from selecting Turbopack and causes significantly slower recompilation.
export default process.env.NODE_ENV === 'production'
  ? withPWAInit({
      dest: 'public',
      cacheOnFrontEndNav: true,
      reloadOnOnline: true,
      workboxOptions: { disableDevLogs: true },
    })(intlConfig)
  : intlConfig;
