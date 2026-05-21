import MarketingShell from '@/components/marketing/MarketingShell';
import HeroSection from '@/components/marketing/HeroSection';
import FeaturesSection from '@/components/marketing/FeaturesSection';
import PricingSection from '@/components/marketing/PricingSection';

export default function HomePage() {
  return (
    <MarketingShell>
      <HeroSection />
      <FeaturesSection />
      <PricingSection compact />
    </MarketingShell>
  );
}
