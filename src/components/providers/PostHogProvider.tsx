'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import React from 'react';
import type { ConsentValue } from '@/lib/consent';

interface Props {
  children: React.ReactNode;
  /** EU/EEA/UK visitor — capture must wait for explicit opt-in. */
  consentRequired?: boolean;
  /** Stored consent choice (server-read cookie), or null if undecided. */
  initialConsent?: ConsentValue | null;
}

// posthog.init must run exactly once per page load. We init on first client
// render (not module load) so we can gate it on the server-resolved geo/consent
// props — otherwise we'd write cookies / capture before the user can decide.
let initialized = false;

function ensureInit(consentRequired: boolean, initialConsent: ConsentValue | null) {
  if (typeof window === 'undefined' || initialized) return;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return; // PostHog not configured — skip init

  initialized = true;

  const shouldCapture = !consentRequired || initialConsent === 'accepted';

  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // KVKK / GDPR: only identified users get profiles
    capture_pageview: false,            // Next.js App Router manual tracking
    capture_pageleave: true,            // Measure session duration accurately
    opt_out_capturing_by_default: !shouldCapture,
    persistence: shouldCapture ? 'localStorage+cookie' : 'memory',
  });
}

export function PostHogProvider({ children, consentRequired = false, initialConsent = null }: Props) {
  ensureInit(consentRequired, initialConsent);
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
