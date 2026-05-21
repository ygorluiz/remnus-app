import { getTranslations } from 'next-intl/server';
import WhatsInsideViewer from './WhatsInsideViewer';
import MarkdownPageMini from './mini/MarkdownPageMini';

export default async function LandingWhatsInside() {
  const t = await getTranslations('Landing');

  return (
    <section className="px-14 py-[110px]">
      <div className="max-w-[1280px] mx-auto">
        {/* section header */}
        <div className="flex items-center gap-3 mb-10">
          <span className="font-mono text-[11px] text-dim uppercase tracking-[0.18em]">
            {t('bridgeInsideSnum')}
          </span>
          <span className="flex-1 h-px bg-neutral-800" />
          <span className="font-mono text-[11px] text-dim">{t('bridgeInsideCaption')}</span>
        </div>

        {/* intro */}
        <div className="grid gap-20 mb-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <h2
            className="m-0 font-sans font-semibold text-neutral-100 leading-[0.98]"
            style={{ fontSize: 50, letterSpacing: '-0.035em' }}
          >
            {t('bridgeInsideH2Part1')}
            <br />
            <span className="font-serif italic text-accent-strong" style={{ fontSize: 54 }}>
              {t('bridgeInsideH2Accent')}
            </span>
            {' '}{t('bridgeInsideH2Part2')}
          </h2>
          <p className="m-auto mt-auto text-base leading-[1.6] text-neutral-50">
            {t('bridgeInsideBody')}
          </p>
        </div>

        {/* workspace frame — animated viewer */}
        <WhatsInsideViewer
          breadcrumb1={t('bridgeInsideBreadcrumb1')}
          breadcrumb2={t('bridgeInsideBreadcrumb2')}
          viewLabel={t('bridgeInsideViewLabel')}
          labels={[t('bridgeInsideTabBoard'), t('bridgeInsideTabTable'), t('bridgeInsideTabCalendar')]}
          subs={[t('bridgeInsideTabBoardSub'), t('bridgeInsideTabTableSub'), t('bridgeInsideTabCalendarSub')]}
          footer1={t('bridgeInsideFrameFooter1')}
          footer2={t('bridgeInsideFrameFooter2')}
        />

        {/* Pages adjunct */}
        <div className="mt-7 grid gap-8 items-stretch" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
          {/* page mini */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-[10px] overflow-hidden flex items-center justify-center p-[18px]">
            <MarkdownPageMini width={520} />
          </div>

          {/* pages copy */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-[10px] flex flex-col px-7 py-7">
            <span className="font-mono text-[11px] text-accent-strong uppercase tracking-[0.12em]">
              {t('bridgeInsidePagesKicker')}
            </span>
            <h3
              className="mt-3 mb-3 font-semibold text-neutral-100 leading-[1.1]"
              style={{ fontSize: 26, letterSpacing: '-0.02em' }}
            >
              {t('bridgeInsidePagesH3')}
            </h3>
            <p className="m-0 text-sm text-dim leading-[1.6] flex-1">
              {t('bridgeInsidePagesBody')}
            </p>
            <div className="mt-[18px] flex items-center gap-2 flex-wrap">
              {['remnus://pages/<id>', 'page.update_content'].map((chip) => (
                <span
                  key={chip}
                  className="font-mono text-[11.5px] text-accent-strong bg-neutral-850 px-2 py-0.5 rounded border border-neutral-800"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* dual-control callout */}
        <div
          className="mt-7 flex items-center gap-4 flex-wrap px-[22px] py-4 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-50"
          style={{ borderLeft: '3px solid var(--color-blue-500)' }}
        >
          <span className="text-base text-neutral-100 font-medium">{t('bridgeInsideCallout1')}</span>
          <span className="text-dim">{t('bridgeInsideCallout2')}</span>
        </div>
      </div>
    </section>
  );
}
