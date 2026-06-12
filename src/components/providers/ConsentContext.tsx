'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  type ConsentValue,
} from '@/lib/consent';
import { setAnalyticsConsent } from '@/lib/actions/consent';

interface ConsentContextValue {
  /** Whether this visitor's jurisdiction requires prior opt-in (EU/EEA/UK). */
  consentRequired: boolean;
  /** Current stored choice, or null if not decided yet. */
  consent: ConsentValue | null;
  accept: () => void;
  reject: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function writeConsentCookie(value: ConsentValue) {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Single source of truth for analytics capture state.
 *
 * Effective capture = NOT admin AND (consent not required OR explicitly accepted).
 * This provider owns every posthog opt-in/opt-out call; PostHogIdentify only
 * identifies/resets the user. Keeping the opt logic in one place avoids the two
 * fighting (e.g. identify forcing opt-in over an EU "reject").
 */
export function ConsentProvider({
  children,
  consentRequired,
  initialConsent,
  userRole,
}: {
  children: React.ReactNode;
  consentRequired: boolean;
  initialConsent: ConsentValue | null;
  userRole?: string;
}) {
  const [consent, setConsent] = useState<ConsentValue | null>(initialConsent);
  // Avoid redundant server writes when the effective permission is unchanged.
  const persistedConsent = useRef<boolean | null>(null);

  useEffect(() => {
    const isAdmin = userRole === 'admin';
    const allowed = !isAdmin && (!consentRequired || consent === 'accepted');

    if (allowed) {
      posthog.set_config({ persistence: 'localStorage+cookie' });
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    } else {
      if (!posthog.has_opted_out_capturing()) posthog.opt_out_capturing();
      // Drop cookies for visitors who must consent but haven't (or rejected).
      if (consentRequired && consent !== 'accepted') {
        posthog.set_config({ persistence: 'memory' });
      }
    }

    // Persist the effective permission for logged-in users so server-side funnel
    // events with no cookie context (MCP agent calls) can decide identified vs
    // anonymous capture. admin/demo are never captured, so skip the write.
    if (userRole && userRole !== 'admin' && userRole !== 'demo') {
      if (persistedConsent.current !== allowed) {
        persistedConsent.current = allowed;
        setAnalyticsConsent(allowed).catch(() => {});
      }
    }
  }, [consent, consentRequired, userRole]);

  const accept = useCallback(() => {
    writeConsentCookie('accepted');
    setConsent('accepted');
  }, []);

  const reject = useCallback(() => {
    writeConsentCookie('rejected');
    setConsent('rejected');
  }, []);

  return (
    <ConsentContext.Provider value={{ consentRequired, consent, accept, reject }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within a ConsentProvider');
  return ctx;
}
