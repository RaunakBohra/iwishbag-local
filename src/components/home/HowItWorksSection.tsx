import { motion } from 'framer-motion';
import { SectionHeading, SectionDescription, H4, BodySmall } from '@/components/ui/typography';
import { Search, ShoppingCart, Truck, Package, CheckCircle } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Find Your Product',
    description: 'Share the product link from Amazon, eBay, or any supported store',
    icon: Search,
  },
  {
    id: 2,
    title: 'Get Instant Quote',
    description: 'We calculate shipping, customs, and all fees upfront',
    icon: ShoppingCart,
  },
  {
    id: 3,
    title: 'We Purchase',
    description: 'Our team buys the product from the original store',
    icon: Package,
  },
  {
    id: 4,
    title: 'Global Shipping',
    description: 'We handle international shipping and customs clearance',
    icon: Truck,
  },
  {
    id: 5,
    title: 'Delivered to You',
    description: 'Receive your package at your doorstep, hassle-free',
    icon: CheckCircle,
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-blue-600 uppercase tracking-wider">
            Simple Process
          </span>
          <SectionHeading className="mt-4 mb-6">
            How It Works
          </SectionHeading>
          <SectionDescription className="mx-auto">
            From browsing to delivery, we make international shopping effortless in just 5 simple
            steps
          </SectionDescription>
        </div>

        {/* Steps Container */}
        <div className="relative max-w-6xl mx-auto">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 transform -translate-y-1/2 hidden lg:block" />

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200 relative group">
                  {/* Step Number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {step.id}
                  </div>

                  {/* Icon Container */}
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 mx-auto">
                    <step.icon className="w-8 h-8 text-blue-600" />
                  </div>

                  {/* Content */}
                  <H4 className="mb-2 text-center">
                    {step.title}
                  </H4>
                  <BodySmall className="text-center">{step.description}</BodySmall>
                </div>

                {/* Arrow (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg width="32" height="32" viewBox="0 0 24 24">
                      <path
                        d="M5 12h14m0 0l-7-7m7 7l-7 7"
                        stroke="#6B7280"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button
            onClick={() => (window.location.href = '/quote')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
          >
            Start Shopping Now
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
};