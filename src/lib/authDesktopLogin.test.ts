import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDesktopLoginOrigin, getDesktopLoginUrl } from './authDesktopLogin';
import { getPublicAppUrl } from './authRedirects';
import { getClientActivateRedirectUrl } from './clientActivateRedirect';

describe('desktop login URLs', () => {
  it('uses the configured public origin outside local development', () => {
    assert.equal(
      getDesktopLoginOrigin('https://app.example.com', 'https://staging.example.com'),
      'https://staging.example.com',
    );
  });

  it('keeps localhost desktop login local during development', () => {
    assert.equal(
      getDesktopLoginOrigin('http://localhost:3000', 'https://app.example.com'),
      'http://localhost:3000',
    );
  });

  it('keeps loopback desktop login local during development', () => {
    assert.equal(
      getDesktopLoginOrigin('http://127.0.0.1:3000', 'https://app.example.com'),
      'http://127.0.0.1:3000',
    );

    assert.equal(
      getDesktopLoginOrigin('http://[::1]:3000', 'https://app.example.com'),
      'http://[::1]:3000',
    );
  });

  it('falls back to the current origin when the configured origin is malformed', () => {
    assert.equal(
      getDesktopLoginOrigin('https://app.example.com', 'app.example.com'),
      'https://app.example.com',
    );

    assert.equal(
      getDesktopLoginOrigin('https://app.example.com', 'file:///tmp/remnus'),
      'https://app.example.com',
    );
  });

  it('builds the client-login URL on the same configured environment as the polling app', () => {
    assert.equal(
      getDesktopLoginUrl('device 1', 'https://app.example.com', 'https://staging.example.com/app'),
      'https://staging.example.com/client-login?device_id=device%201',
    );
  });

  it('uses the configured public app URL for activation redirects', () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.example.com';
    delete process.env.NEXTAUTH_URL;
    delete process.env.AUTH_URL;

    try {
      const request = new Request('https://localhost:3010/api/auth/client-activate');
      assert.equal(
        getPublicAppUrl('/app', request).toString(),
        'https://staging.example.com/app',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });

  it('falls back through NEXTAUTH_URL and AUTH_URL when public app URL is blank', () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = '';
    process.env.NEXTAUTH_URL = 'https://auth.example.com/base';
    process.env.AUTH_URL = 'https://fallback.example.com';

    try {
      const request = new Request('https://localhost:3010/api/auth/client-activate');
      assert.equal(
        getPublicAppUrl('/login', request).toString(),
        'https://auth.example.com/login',
      );

      delete process.env.NEXTAUTH_URL;
      assert.equal(
        getPublicAppUrl('/login', request).toString(),
        'https://fallback.example.com/login',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });

  it('ignores malformed configured URLs and does not throw', () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'staging.example.com';
    process.env.NEXTAUTH_URL = 'also invalid';
    process.env.AUTH_URL = 'https://fallback.example.com/app';

    try {
      const request = new Request('https://localhost:3010/api/auth/client-activate');
      assert.equal(
        getPublicAppUrl('/app', request).toString(),
        'https://fallback.example.com/app',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });

  it('ignores non-HTTP configured URLs and does not throw', () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'file:///tmp/remnus';
    process.env.NEXTAUTH_URL = 'mailto:test@example.com';
    process.env.AUTH_URL = 'https://fallback.example.com/app';

    try {
      const request = new Request('https://localhost:3010/api/auth/client-activate');
      assert.equal(
        getPublicAppUrl('/app', request).toString(),
        'https://fallback.example.com/app',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });

  it('does not trust forwarded headers for auth redirects without a configured app URL', () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.AUTH_URL;

    try {
      const request = new Request('http://127.0.0.1:3010/api/auth/client-activate', {
        headers: {
          'x-forwarded-host': 'staging.example.com',
          'x-forwarded-proto': 'https',
        },
      });

      assert.equal(
        getPublicAppUrl('/login?error=token', request).toString(),
        'http://127.0.0.1:3010/login?error=token',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });

  it('maps client activation route branches to public redirect URLs', async () => {
    const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
    const previousNextAuth = process.env.NEXTAUTH_URL;
    const previousAuth = process.env.AUTH_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.example.com';
    delete process.env.NEXTAUTH_URL;
    delete process.env.AUTH_URL;

    try {
      const request = new Request('https://localhost:3010/api/auth/client-activate');
      assert.equal(
        (await getClientActivateRedirectUrl(request, null, async () => {})).toString(),
        'https://staging.example.com/login',
      );

      assert.equal(
        (
          await getClientActivateRedirectUrl(request, 'bad', async () => {
            throw new Error('invalid token');
          })
        ).toString(),
        'https://staging.example.com/login?error=token',
      );

      assert.equal(
        (await getClientActivateRedirectUrl(request, 'ok', async () => {})).toString(),
        'https://staging.example.com/app',
      );
    } finally {
      restoreEnv(previousPublic, previousNextAuth, previousAuth);
    }
  });
});

function restoreEnv(
  previousPublic: string | undefined,
  previousNextAuth: string | undefined,
  previousAuth: string | undefined,
) {
  if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousPublic;

  if (previousNextAuth === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = previousNextAuth;

  if (previousAuth === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = previousAuth;
}
