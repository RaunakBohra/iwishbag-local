import { OptimizedCostEstimator } from '@/components/shared/OptimizedCostEstimator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Display, H2, H3, BodyLarge, Body } from '@/components/ui/typography';
import { Section, Container } from '@/components/ui/spacing';
import { Calculator, ArrowRight, Zap, Shield, Globe, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/design-system';

const CostEstimatorPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({ hero: false, calculator: false, features: false });

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      // Simple visibility detection
      const heroElement = document.getElementById('hero-section');
      const calculatorElement = document.getElementById('calculator-section');
      const featuresElement = document.getElementById('features-section');

      const checkVisibility = (element: Element | null) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
      };

      setIsVisible({
        hero: checkVisibility(heroElement),
        calculator: checkVisibility(calculatorElement),
        features: checkVisibility(featuresElement),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Zap,
      title: 'Instant Estimates',
      description: 'Get accurate cost calculations in seconds, not days.',
    },
    {
      icon: Shield,
      title: 'Transparent Pricing',
      description: 'No hidden fees. See exactly what you pay for.',
    },
    {
      icon: Globe,
      title: 'Global Coverage',
      description: 'Calculate costs for shipping to 100+ countries.',
    },
  ];

  const benefits = [
    'Real-time exchange rates',
    'Customs duty calculations',
    'Shipping cost optimization',
    'Insurance and handling fees',
    'Tax and VAT calculations',
    'Multi-currency support',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Section id="hero-section" className="py-20 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
        <Container>
          <div
            className={cn(
              'text-center max-w-4xl mx-auto transition-all duration-1000',
              isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            )}
          >
            <Badge className="mb-6 bg-teal-50 text-teal-700 border-teal-200">
              <Calculator className="w-3 h-3 mr-1" />
              Free Cost Calculator
            </Badge>

            <Display className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Calculate your shopping costs
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent">
                before you buy
              </span>
            </Display>

            <BodyLarge className="mb-8 text-gray-600 max-w-2xl mx-auto">
              Get instant, accurate estimates for international shipping, customs duties, and all
              fees. No surprises at checkout.
            </BodyLarge>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                className="group bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-4 text-lg"
                onClick={() => {
                  document.getElementById('calculator-section')?.scrollIntoView({
                    behavior: 'smooth',
                  });
                }}
              >
                Start Calculating
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg border-gray-200 hover:border-gray-300"
                asChild
              >
                <Link to="/quote">Get Full Quote</Link>
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    'transition-all duration-700',
                    isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
                  )}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-teal-50 rounded-full flex items-center justify-center">
                    <feature.icon className="w-8 h-8 bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent" />
                  </div>
                  <H3 className="mb-2 text-gray-900">{feature.title}</H3>
                  <Body className="text-gray-600">{feature.description}</Body>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Calculator Section */}
      <Section id="calculator-section" className="py-20 bg-white">
        <Container>
          <div
            className={cn(
              'transition-all duration-1000',
              isVisible.calculator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            )}
          >
            <div className="text-center mb-12">
              <H2 className="mb-4 text-gray-900">Cost Calculator</H2>
              <Body className="text-gray-600 max-w-2xl mx-auto">
                Enter your product details below to get an instant cost estimate
              </Body>
            </div>

            {/* Calculator Container */}
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Calculator */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                    <OptimizedCostEstimator variant="tools" />
                  </div>
                </div>

                {/* Benefits Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-2xl p-6 h-fit">
                    <H3 className="mb-6 text-gray-900">What's included</H3>
                    <div className="space-y-3">
                      {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <Body className="text-gray-700">{benefit}</Body>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 p-4 bg-teal-50 rounded-lg">
                      <Body className="text-teal-700 text-sm">
                        <strong>Pro tip:</strong> Costs are calculated using real-time exchange
                        rates and current shipping prices for maximum accuracy.
                      </Body>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Features Section */}
      <Section id="features-section" className="py-20 bg-gray-50">
        <Container>
          <div
            className={cn(
              'text-center transition-all duration-1000',
              isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            )}
          >
            <H2 className="mb-6 text-gray-900">Why use our calculator?</H2>
            <BodyLarge className="text-gray-600 max-w-2xl mx-auto mb-12">
              Make informed decisions with accurate cost estimates before you commit to any
              purchase.
            </BodyLarge>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <H3 className="mb-3 text-gray-900">Accurate Estimates</H3>
                <Body className="text-gray-600">
                  Our calculator uses real-time data from shipping partners and customs authorities
                  to provide the most accurate estimates possible.
                </Body>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent" />
                </div>
                <H3 className="mb-3 text-gray-900">Instant Results</H3>
                <Body className="text-gray-600">
                  Get your cost breakdown in seconds. No waiting, no complicated forms, just enter
                  your details and get results.
                </Body>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section className="py-20 bg-gradient-to-br from-teal-600 to-orange-600 text-white">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <H2 className="mb-6 text-white">Ready to start shopping?</H2>
            <BodyLarge className="mb-8 text-teal-100">
              Get a detailed quote with personalized assistance from our international shopping
              experts.
            </BodyLarge>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="group bg-white bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent hover:bg-gray-100 px-8 py-4 text-lg font-medium"
                asChild
              >
                <Link to="/quote">
                  Get Detailed Quote
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent px-8 py-4 text-lg font-medium"
                asChild
              >
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default CostEstimatorPage;
