'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitContactForm } from '@/lib/actions/contact';

const inputCls =
  'w-full text-sm rounded-lg bg-neutral-850 border border-neutral-800 px-3.5 py-2.5 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors';

export default function ContactForm() {
  const t = useTranslations('Contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const startedAtRef = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setStatus('idle');
    startTransition(async () => {
      const res = await submitContactForm({
        name,
        email,
        message,
        company,
        startedAt: startedAtRef.current ?? Date.now(),
      });
      if (res.ok) {
        setStatus('success');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatus('error');
        setErrorMsg(res.error);
      }
    });
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col items-center text-center gap-3 max-w-xl mx-auto">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-400/10 text-green-400">
          <CheckCircle2 size={20} />
        </div>
        <h3 className="text-base font-semibold text-neutral-100">{t('formSuccessTitle')}</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{t('formSuccessBody')}</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-1 text-sm text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
        >
          {t('formSendAnother')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col gap-4 max-w-xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-xs font-medium text-neutral-400">
            {t('formNameLabel')}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('formNamePlaceholder')}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-xs font-medium text-neutral-400">
            {t('formEmailLabel')}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('formEmailPlaceholder')}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-xs font-medium text-neutral-400">
          {t('formMessageLabel')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          maxLength={5000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('formMessagePlaceholder')}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Honeypot — hidden from real visitors (visually + from screen readers), left for bots to fill in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors cursor-pointer"
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        {pending ? t('formSending') : t('formSubmit')}
      </button>
    </form>
  );
}
