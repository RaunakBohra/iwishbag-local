import React from 'react';
import { Search, MessageSquare, Truck } from 'lucide-react';

export const AirbnbHowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Search,
      title: 'Find & Share',
      description: 'Search or share links to products from any international store',
      details: 'Amazon, eBay, Alibaba, Best Buy, Target - we support 100+ stores worldwide'
    },
    {
      icon: MessageSquare,
      title: 'Get Quote',
      description: 'Receive instant pricing with shipping, taxes, and our service fees',
      details: 'Transparent pricing with no hidden costs. Approve before we purchase'
    },
    {
      icon: Truck,
      title: 'We Handle Everything',
      description: 'Purchase, consolidate, clear customs, and deliver to your door',
      details: 'Full tracking, insurance, and 24/7 support throughout the process'
    }
  ];

  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
            How it works
          </h2>
          <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
            International shopping made simple in three easy steps
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              {/* Icon Circle */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-full mb-6">
                <step.icon className="w-8 h-8 text-white" />
              </div>

              {/* Step Number */}
              <div className="text-sm font-medium text-teal-600 mb-2">
                Step {index + 1}
              </div>

              {/* Title */}
              <h3 className="text-xl font-medium text-gray-900 mb-4">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-4 font-light leading-relaxed">
                {step.description}
              </p>

              {/* Details */}
              <p className="text-sm text-gray-500 font-light">
                {step.details}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <span>Average delivery time:</span>
            <span className="font-medium text-teal-600">7-14 days</span>
            <span>•</span>
            <span>Free consolidation</span>
            <span>•</span>
            <span className="font-medium text-teal-600">$5 minimum service fee</span>
          </div>
        </div>
      </div>
    </div>
  );
};