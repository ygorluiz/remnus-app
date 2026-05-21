import { getTranslations } from 'next-intl/server';

export default async function LandingWhy() {
  const t = await getTranslations('Landing');

  return (
    <section id="why" className="px-14 py-16">
      <div className="max-w-[1200px] mx-auto">
        {/* section header */}
        <div className="flex items-center gap-3 mb-12">
          <span className="font-mono text-[11px] text-dim uppercase tracking-[0.18em]">
            {t('bridgeWhySnum')}
          </span>
          <span className="flex-1 h-px bg-neutral-800" />
        </div>

        <blockquote
          className="m-0 font-sans font-medium text-neutral-100 max-w-[1100px]"
          style={{ fontSize: 52, lineHeight: 1.16, letterSpacing: '-0.025em' }}
        >
          {t('bridgeWhyPart1')}{' '}
          <span className="font-serif italic text-accent-strong" style={{ fontSize: 58 }}>
            {t('bridgeWhyAccent')}
          </span>
          {t('bridgeWhyPart2')}
        </blockquote>

        <div className="mt-8 flex items-center gap-3 justify-end text-[13px] text-dim">
          <span className="w-8 h-px bg-dim" />
          <span className="font-mono">{t('bridgeWhySig')}</span>
        </div>
      </div>
    </section>
  );
}
