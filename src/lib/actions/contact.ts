'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { sendEmail } from '@/lib/email/send';
import { contactFormEmail } from '@/lib/email/templates';

// Fixed team inbox — the /contact page has no other notion of "who receives this".
const CONTACT_INBOX = 'info@remnus.com';

const MAX_NAME_LEN = 120;
const MAX_MESSAGE_LEN = 5000;
// A bot that fills + submits the form faster than this is almost certainly scripted.
const MIN_FILL_MS = 2500;

// Per-IP submission cap. In-memory (same pattern as the MCP route's rate
// limiter) — resets on redeploy/cold start, but that's an acceptable trade-off
// for a low-volume marketing form vs. standing up an external store.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const submissionsByIp = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = submissionsByIp.get(ip);
  if (!entry || entry.resetAt < now) {
    submissionsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count++;
  return true;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') || 'unknown';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
  /** Honeypot — a hidden field real visitors never see or fill. Non-empty ⇒ bot. */
  company?: string;
  /** `Date.now()` captured when the form mounted, used for the fill-time check. */
  startedAt: number;
}

export type ContactFormResult = { ok: true } | { ok: false; error: string };

/**
 * Sends a /contact page message to the team inbox, reply-to set to the
 * visitor's own address. Spam signals (honeypot, too-fast submit) fail soft —
 * report success without sending, so a bot never learns what tripped it.
 */
export async function submitContactForm(input: ContactFormInput): Promise<ContactFormResult> {
  const t = await getTranslations('Errors');

  const name = input.name.trim().slice(0, MAX_NAME_LEN);
  const email = input.email.trim().slice(0, 254);
  const message = input.message.trim().slice(0, MAX_MESSAGE_LEN);

  if (!name || !email || !message) return { ok: false, error: t('contactFormMissingFields') };
  if (!EMAIL_RE.test(email)) return { ok: false, error: t('contactFormInvalidEmail') };

  if (input.company) return { ok: true };
  if (!Number.isFinite(input.startedAt) || Date.now() - input.startedAt < MIN_FILL_MS) return { ok: true };

  const ip = await clientIp();
  if (!checkRateLimit(ip)) return { ok: false, error: t('contactFormRateLimited') };

  const { subject, html } = contactFormEmail(name, email, message);
  const result = await sendEmail({
    to: CONTACT_INBOX,
    userId: null,
    kind: 'contact',
    subject,
    html,
    replyTo: email,
  });

  if (!result.ok) return { ok: false, error: t('contactFormSendFailed') };
  return { ok: true };
}
