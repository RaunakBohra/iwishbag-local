import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LazySection } from '@/components/home/LazySection';

// Eagerly load critical above-the-fold content
import HeroSection from '@/components/home/HeroSection';

// Lazy load below-the-fold sections
const HowItWorksSection = lazy(() =>
  import('@/components/home/HowItWorksSection').then((m) => ({
    default: m.HowItWorksSection,
  })),
);

// Loading components for each section
const SectionSkeleton = ({ height = 'h-96' }: { height?: string }) => (
  <div className={`${height} bg-gray-100 animate-pulse rounded-lg`} />
);

export default function Index() {
  // Default settings for the homepage
  const settings = {
    companyName: 'iwishBag',
    heroTitle: 'Shop International. Delivered to Your Door.',
    heroSubtitle:
      'Get quotes from Amazon, Flipkart, eBay, Alibaba and more. We handle shipping, customs, and delivery to India and Nepal.',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    logoUrl: '/logo.svg',
  };

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section - Always loaded immediately */}
      <HeroSection settings={settings} />

      {/* How It Works Section - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[500px]" />}>
          <HowItWorksSection />
        </Suspense>
      </LazySection>

    </main>
  );
}
