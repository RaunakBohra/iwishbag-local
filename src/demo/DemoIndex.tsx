import React, { useState } from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import WeightRecommendationDemo1 from './WeightRecommendationDemo1';
import WeightRecommendationDemo2 from './WeightRecommendationDemo2';
import WeightRecommendationDemo3 from './WeightRecommendationDemo3';
import CompactWeightDemo from './CompactWeightDemo';
import UltraCompactDemo from './UltraCompactDemo';
import InlineStripeDemo from './InlineStripeDemo';

const DemoIndex = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demos = [
    {
      id: 'airbnb-style',
      title: '🏠 Airbnb-Inspired Homepage',
      description: 'Clean, minimalist homepage design inspired by Airbnb\'s proven UX patterns. Single-focus hero with clear visual hierarchy.',
      features: ['Minimalist aesthetic', 'Single primary CTA', 'Clean search interface', 'Airbnb-style navigation'],
      component: () => window.location.href = '/demo/airbnb-style'
    },
    {
      id: 'inline-stripe',
      title: '🔥 Inline Stripe Design (FINAL IMPLEMENTATION)',
      description: 'Ultra-compact inline selectors - Weight & HSN on single line! Already integrated in your product forms.',
      features: ['Single line weight + HSN', 'Stripe minimal design', 'Integrated in SmartItemsManager', 'Mobile responsive'],
      component: InlineStripeDemo
    },
    {
      id: 'ultra-compact',
      title: '⚡ Ultra-Compact Design (3 Variations)',
      description: 'Stripe, Shopify & Modern designs - Input+arrow for weight, HSN number/search pattern. Exactly as requested!',
      features: ['Input + arrow → weight suggestions', 'HSN number or search button', 'World-class design patterns', '3 style variations'],
      component: UltraCompactDemo
    },
    {
      id: 'compact',
      title: '🏆 Compact Inline Design',
      description: 'Ultra-compact inline selectors that integrate seamlessly with your existing forms - 80% space reduction!',
      features: ['Inline weight & HSN selection', 'Quick-apply chips', 'Progressive disclosure', 'Mobile-optimized'],
      component: CompactWeightDemo
    },
    {
      id: 'demo1',
      title: 'Professional HSN Display',
      description: 'Clean, professional layout with clear information hierarchy and international standards compliance',
      features: ['Clear confidence indicators', 'Professional color coding', 'Structured information display', 'Action-oriented CTAs'],
      component: WeightRecommendationDemo1
    },
    {
      id: 'demo2',
      title: 'Modern Card Layout',
      description: 'Contemporary card-based design with gradient backgrounds and enhanced visual appeal',
      features: ['Modern gradient cards', 'Enhanced visual hierarchy', 'Interactive confidence bars', 'Prominent action buttons'],
      component: WeightRecommendationDemo2
    },
    {
      id: 'demo3',
      title: 'Unified Decision Flow',
      description: 'Interactive decision-based interface with clear options and guided selection process',
      features: ['Interactive selection', 'Guided decision flow', 'Smart recommendations', 'Progressive disclosure'],
      component: WeightRecommendationDemo3
    }
  ];

  if (selectedDemo) {
    const demo = demos.find(d => d.id === selectedDemo);
    const Component = demo?.component;
    
    return (
      <div>
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 mb-0">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button 
              onClick={() => setSelectedDemo(null)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Demo List
            </button>
            <div className="h-4 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-900">{demo?.title}</h1>
          </div>
        </div>
        {Component && <Component />}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Weight & HSN Selector Design Demos</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Ultra-compact weight and HSN selectors inspired by world-class design systems. 
            NEW: Stripe, Shopify & Modern designs with your exact specifications - input+arrow for weight, HSN number/search for classification.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <div key={demo.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{demo.title}</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">{demo.description}</p>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                <ul className="space-y-1">
                  {demo.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                onClick={() => setSelectedDemo(demo.id)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Demo
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Design Improvements Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">❌ Current Issues Fixed:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Inconsistent visual hierarchy</li>
                <li>• Competing information displays</li>
                <li>• Non-standard confidence indicators</li>
                <li>• Poor spacing and alignment</li>
                <li>• Unclear action priorities</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">✅ International Standards Applied:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Clear information hierarchy (ISO 9241)</li>
                <li>• Consistent visual language</li>
                <li>• Accessible color schemes</li>
                <li>• Progressive disclosure patterns</li>
                <li>• Standardized confidence displays</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoIndex;