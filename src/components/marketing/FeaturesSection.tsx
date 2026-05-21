import { getTranslations } from 'next-intl/server';
import { FileText, Database, Columns2, Calendar, Globe, Layers } from 'lucide-react';

const ICONS = [FileText, Database, Columns2, Calendar, Globe, Layers];

export default async function FeaturesSection() {
  const t = await getTranslations('Landing');

  const features = [
    { icon: ICONS[0], titleKey: 'feature1Title', descKey: 'feature1Desc' },
    { icon: ICONS[1], titleKey: 'feature2Title', descKey: 'feature2Desc' },
    { icon: ICONS[2], titleKey: 'feature3Title', descKey: 'feature3Desc' },
    { icon: ICONS[3], titleKey: 'feature4Title', descKey: 'feature4Desc' },
    { icon: ICONS[4], titleKey: 'feature5Title', descKey: 'feature5Desc' },
    { icon: ICONS[5], titleKey: 'feature6Title', descKey: 'feature6Desc' },
  ] as const;

  return (
    <section className="border-t border-neutral-800/60">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-4xl font-bold text-neutral-100">{t('featuresTitle')}</h2>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto">{t('featuresSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-7 flex flex-col gap-4 hover:border-neutral-700 hover:bg-neutral-900/80 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-100 mb-1.5">{t(titleKey)}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
