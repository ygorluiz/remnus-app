import { getTranslations } from 'next-intl/server';
import { GitBranch, Mail, MessageSquare } from 'lucide-react';
import ContactForm from './ContactForm';

export default async function ContactSection() {
  const t = await getTranslations('Contact');

  const channels = [
    {
      icon: GitBranch,
      title: t('githubTitle'),
      desc: t('githubDesc'),
      label: t('githubLabel'),
      href: 'https://github.com',
    },
    {
      icon: Mail,
      title: t('emailTitle'),
      desc: t('emailDesc'),
      label: t('emailLabel'),
      href: 'mailto:info@remnus.com',
    },
    {
      icon: MessageSquare,
      title: t('communityTitle'),
      desc: t('communityDesc'),
      label: t('communityLabel'),
      href: null,
    },
  ];

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-5xl font-bold text-neutral-100">{t('title')}</h1>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto leading-relaxed">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {channels.map(({ icon: Icon, title, desc, label, href }) => (
            <div
              key={title}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col gap-4 hover:border-neutral-700 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-100 mb-1">{title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{desc}</p>
              </div>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto text-sm text-blue-500 hover:text-blue-400 transition-colors break-all"
                >
                  {label}
                </a>
              ) : (
                <p className="mt-auto text-sm text-neutral-600">{label}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-xl mx-auto">
          <h2 className="text-center text-lg font-semibold text-neutral-100 mb-6">{t('formHeading')}</h2>
          <ContactForm />
        </div>

        <p className="text-center text-xs text-neutral-600 mt-10">{t('responseNote')}</p>
      </div>
    </section>
  );
}
