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
const BrandsSection = lazy(() =>
  import('@/components/home/BrandsSection').then((m) => ({
    default: m.BrandsSection,
  })),
);
const CountriesSection = lazy(() =>
  import('@/components/home/CountriesSection').then((m) => ({
    default: m.CountriesSection,
  })),
);
const ValuePropsSection = lazy(() =>
  import('@/components/home/ValuePropsSection').then((m) => ({
    default: m.ValuePropsSection,
  })),
);
const TestimonialsSection = lazy(() =>
  import('@/components/home/TestimonialsSection').then((m) => ({
    default: m.TestimonialsSection,
  })),
);
const CostEstimatorPreview = lazy(() =>
  import('@/components/home/CostEstimatorPreview').then((m) => ({
    default: m.CostEstimatorPreview,
  })),
);
const TrustIndicators = lazy(() =>
  import('@/components/home/TrustIndicators').then((m) => ({
    default: m.TrustIndicators,
  })),
);

// Loading components for each section
const SectionSkeleton = ({ height = 'h-96' }: { height?: string }) => (
  <div className={`${height} bg-gray-50 animate-pulse rounded-lg`} />
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
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white overflow-hidden">
      {/* Hero Section - Always loaded immediately */}
      <HeroSection settings={settings} />

      {/* How It Works Section - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[500px]" />}>
          <HowItWorksSection />
        </Suspense>
      </LazySection>

      {/* Featured Brands - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[300px]" />}>
          <BrandsSection />
        </Suspense>
      </LazySection>

      {/* Countries Section - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
          <CountriesSection />
        </Suspense>
      </LazySection>

      {/* Value Props - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[400px]" />}>
          <ValuePropsSection settings={settings} />
        </Suspense>
      </LazySection>

      {/* Testimonials - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[500px]" />}>
          <TestimonialsSection />
        </Suspense>
      </LazySection>

      {/* Interactive Cost Estimator Preview - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
          <CostEstimatorPreview />
        </Suspense>
      </LazySection>

      {/* Trust Indicators - Lazy loaded */}
      <LazySection threshold={0.1} rootMargin="100px">
        <Suspense fallback={<SectionSkeleton height="h-[400px]" />}>
          <TrustIndicators />
        </Suspense>
      </LazySection>
    </main>
  );
}
