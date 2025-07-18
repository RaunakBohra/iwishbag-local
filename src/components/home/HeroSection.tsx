import { Button } from '@/components/ui/button';
import { Display, BodyLarge, StatNumber, StatLabel } from '@/components/ui/typography';
import { ArrowRight, Globe, Package, Shield, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface HeroSectionProps {
  settings: {
    hero_banner_url?: string;
    hero_headline?: string;
    hero_subheadline?: string;
    hero_cta_text?: string;
    hero_cta_link?: string;
  } | null;
}

const HeroSection = ({ settings }: HeroSectionProps) => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.bottom > 0) {
          setScrollY(window.scrollY);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!settings) return null;

  const heroBannerUrl = settings.hero_banner_url?.trim();
  const backgroundImage = heroBannerUrl ? `url(${heroBannerUrl})` : undefined;

  const floatingIcons = [
    { Icon: Package, delay: '0s', x: '10%', y: '20%' },
    { Icon: Globe, delay: '0.2s', x: '85%', y: '15%' },
    { Icon: Shield, delay: '0.4s', x: '15%', y: '75%' },
    { Icon: Zap, delay: '0.6s', x: '80%', y: '70%' },
  ];

  const stats = [
    { value: '50K+', label: 'Happy Customers' },
    { value: '100+', label: 'Countries Served' },
    { value: '24/7', label: 'Customer Support' },
    { value: '5M+', label: 'Products Delivered' },
  ];

  return (
    <section ref={heroRef} className="relative min-h-[700px] flex items-center bg-white">
      {/* Simple Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Simple Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-8">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            <span className="text-sm text-blue-700 font-medium">Free shipping on orders over $500</span>
          </div>

          {/* Main Heading */}
          <Display className="mb-6">
            {settings.hero_headline || 'Shop the World,'}
            <br />
            <span className="text-blue-600">
              Delivered to You
            </span>
          </Display>

          {/* Subheading */}
          <BodyLarge className="mb-8 text-gray-600 max-w-3xl mx-auto">
            {settings.hero_subheadline ||
              'Access millions of products from Amazon, eBay, Alibaba and more. We handle everything - purchasing, shipping, and customs clearance.'}
          </BodyLarge>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              className="group bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-8 py-4 text-lg font-medium rounded-lg"
              onClick={() => (window.location.href = settings.hero_cta_link || '/quote')}
            >
              {settings.hero_cta_text || 'Get Your Free Quote'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-300 px-8 py-4 text-lg font-medium rounded-lg"
              onClick={() => (window.location.href = '/cost-estimator')}
            >
              Calculate Costs Instantly
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <StatNumber className="mb-1">{stat.value}</StatNumber>
                <StatLabel>{stat.label}</StatLabel>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simple Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
