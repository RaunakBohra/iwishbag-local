import React, { useState } from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import WeightRecommendationDemo1 from './WeightRecommendationDemo1';
import WeightRecommendationDemo2 from './WeightRecommendationDemo2';
import WeightRecommendationDemo3 from './WeightRecommendationDemo3';
import CompactWeightDemo from './CompactWeightDemo';
import UltraCompactDemo from './UltraCompactDemo';
import InlineStripeDemo from './InlineStripeDemo';
import TaxManagementDemo from './TaxManagementDemo';
import ValuationMethodDemo from './ValuationMethodDemo';
import WorldClassItemManagement from './WorldClassItemManagement';
import UnifiedQuotePageRedesign from './UnifiedQuotePageRedesign';
import CustomerQuoteViewRedesign from './CustomerQuoteViewRedesign';
import CustomerQuoteViewPremium from './CustomerQuoteViewPremium';
import CustomerQuoteAmazonStyle from './CustomerQuoteAmazonStyle';
import AdminShippingFeesEnhanced from './AdminShippingFeesEnhanced';
import UnifiedQuotePageEnhanced from './UnifiedQuotePageEnhanced';
import UnifiedQuoteOrderSystem from './UnifiedQuoteOrderSystem';
import { R2StorageDemo } from '../components/demo/R2StorageDemo';
import { KVCacheDemo } from '../components/demo/KVCacheDemo';
import AIProductClassifierDemo from './AIProductClassifierDemo';
import { LeanWeightDemo } from './LeanWeightDemo';

const DemoIndex = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demos = [
    {
      id: 'lean-weight',
      title: '🎯 Lean Weight Service Demo',
      description:
        'Intelligent weight prediction combining HSN database with ML predictions while staying within Supabase free tier limits',
      features: [
        'HSN + ML hybrid predictions',
        'Dual source display with confidence',
        'Pattern matching without DB storage',
        'Analytics tracking < 10MB total',
      ],
      component: LeanWeightDemo,
    },
    {
      id: 'kv-cache',
      title: '⚡ Optimized Currency Cache Demo',
      description:
        'Lightning-fast exchange rates with browser-optimized 2-tier caching: Memory → localStorage → Database. Experience 5-20x performance improvements!',
      features: [
        'Browser-optimized 2-tier caching',
        'Real-time performance testing',
        '5-20x faster response times',
        'Memory + localStorage optimization',
      ],
      component: KVCacheDemo,
    },
    {
      id: 'r2-storage',
      title: '☁️ Cloudflare R2 Storage Demo',
      description:
        'Upload and manage files using Cloudflare R2 - Object storage with S3 compatibility and zero egress fees',
      features: [
        'Drag & drop file uploads',
        'Image preview gallery',
        'Progress tracking',
        'Secure file management',
      ],
      component: R2StorageDemo,
    },
    {
      id: 'unified-quote-order',
      title: '⚡ Unified Quote/Order System',
      description:
        'Complete quote-to-order lifecycle management with status-based UI transformation',
      features: [
        'Inline editing with smart popovers',
        'Progressive order tracking',
        'Margin analysis & CS calculation',
        'Purchase variance management',
      ],
      component: UnifiedQuoteOrderSystem,
    },
    {
      id: 'customer-quote-amazon',
      title: '🛒 Amazon-Style Customer Quote',
      description:
        'Customer quote view inspired by Amazon product pages - Familiar e-commerce layout with buy box',
      features: [
        'Amazon-style product gallery',
        'Sticky buy box with pricing',
        'Technical specs & features',
        'Customer reviews section',
      ],
      component: CustomerQuoteAmazonStyle,
    },
    {
      id: 'customer-quote-premium',
      title: '💎 Premium Customer Quote View',
      description:
        'World-class customer quote view inspired by Shopify & Stripe - Premium design with exceptional UX',
      features: [
        'Shopify-style product cards',
        'Stripe-inspired pricing breakdown',
        'Premium gradient action cards',
        'Elegant trust indicators & reviews',
      ],
      component: CustomerQuoteViewPremium,
    },
    {
      id: 'customer-quote-view',
      title: '🛍️ Customer Quote View Redesign',
      description:
        'Beautiful customer-facing quote view with mobile-first design, trust indicators, and clear pricing transparency',
      features: [
        'Mobile-first responsive design',
        'Savings highlight & comparison',
        'Trust badges & buyer protection',
        'Clear timeline & FAQ section',
      ],
      component: CustomerQuoteViewRedesign,
    },
    {
      id: 'admin-shipping-fees',
      title: '📦 Enhanced Admin Shipping & Fees',
      description:
        'Comprehensive shipping, fees, and communication management with all missing fields integrated',
      features: [
        'Domestic shipping configuration',
        'Smart insurance calculation',
        'Customer & internal notes',
        'Complete fee breakdown',
      ],
      component: AdminShippingFeesEnhanced,
    },
    {
      id: 'unified-quote-enhanced',
      title: '🚀 Enhanced Unified Quote Page',
      description:
        'Complete admin quote page with ALL missing fields integrated - Domestic shipping, insurance, handling, and notes',
      features: [
        'Comprehensive shipping tab with domestic delivery',
        'Smart insurance calculation',
        'Customer & internal notes management',
        'Complete fee breakdown with handling',
      ],
      component: UnifiedQuotePageEnhanced,
    },
    {
      id: 'unified-quote-page',
      title: '🚀 Unified Quote Page Redesign',
      description:
        'Complete admin quote detail page redesign - Seamlessly handles single & multi-product quotes with world-class UX',
      features: [
        'Tab-based navigation for different sections',
        'Stripe-style persistent sidebar',
        'Integrated item & tax management',
        'Real-time activity timeline & messaging',
      ],
      component: UnifiedQuotePageRedesign,
    },
    {
      id: 'world-class-items',
      title: '🌟 World-Class Item Management',
      description:
        'Best-in-class item management UI inspired by Stripe, Shopify, Linear & Notion - Complete with all fields and tax configuration',
      features: [
        'Multiple view modes (Table/Cards/Compact)',
        'Progressive disclosure with expandable rows',
        'Stripe-style sidebar for detailed editing',
        'Bulk operations and smart indicators',
      ],
      component: WorldClassItemManagement,
    },
    {
      id: 'valuation-method',
      title: '💎 Valuation Method Management',
      description:
        'Per-item valuation methods (Product vs Minimum) - Compare quote-level vs item-level approaches with smart defaults',
      features: [
        'Quote-level vs Per-item comparison',
        'Smart auto-detection logic',
        'Visual impact calculator',
        'Bulk management tools',
      ],
      component: ValuationMethodDemo,
    },
    {
      id: 'tax-management',
      title: '🎯 Tax Management UI Approaches',
      description:
        'Compare different UI approaches for per-item tax management - Sidebar vs Main Component vs Hybrid Smart Design',
      features: [
        'Current broken approach demo',
        'Sidebar approach with progressive disclosure',
        'Main component integration',
        'Hybrid smart approach with indicators',
      ],
      component: TaxManagementDemo,
    },
    {
      id: 'inline-stripe',
      title: '🔥 Inline Stripe Design (FINAL IMPLEMENTATION)',
      description:
        'Ultra-compact inline selectors - Weight & HSN on single line! Already integrated in your product forms.',
      features: [
        'Single line weight + HSN',
        'Stripe minimal design',
        'Integrated in SmartItemsManager',
        'Mobile responsive',
      ],
      component: InlineStripeDemo,
    },
    {
      id: 'ultra-compact',
      title: '⚡ Ultra-Compact Design (3 Variations)',
      description:
        'Stripe, Shopify & Modern designs - Input+arrow for weight, HSN number/search pattern. Exactly as requested!',
      features: [
        'Input + arrow → weight suggestions',
        'HSN number or search button',
        'World-class design patterns',
        '3 style variations',
      ],
      component: UltraCompactDemo,
    },
    {
      id: 'compact',
      title: '🏆 Compact Inline Design',
      description:
        'Ultra-compact inline selectors that integrate seamlessly with your existing forms - 80% space reduction!',
      features: [
        'Inline weight & HSN selection',
        'Quick-apply chips',
        'Progressive disclosure',
        'Mobile-optimized',
      ],
      component: CompactWeightDemo,
    },
    {
      id: 'demo1',
      title: 'Professional HSN Display',
      description:
        'Clean, professional layout with clear information hierarchy and international standards compliance',
      features: [
        'Clear confidence indicators',
        'Professional color coding',
        'Structured information display',
        'Action-oriented CTAs',
      ],
      component: WeightRecommendationDemo1,
    },
    {
      id: 'demo2',
      title: 'Modern Card Layout',
      description:
        'Contemporary card-based design with gradient backgrounds and enhanced visual appeal',
      features: [
        'Modern gradient cards',
        'Enhanced visual hierarchy',
        'Interactive confidence bars',
        'Prominent action buttons',
      ],
      component: WeightRecommendationDemo2,
    },
    {
      id: 'demo3',
      title: 'Unified Decision Flow',
      description:
        'Interactive decision-based interface with clear options and guided selection process',
      features: [
        'Interactive selection',
        'Guided decision flow',
        'Smart recommendations',
        'Progressive disclosure',
      ],
      component: WeightRecommendationDemo3,
    },
  ];

  if (selectedDemo) {
    const demo = demos.find((d) => d.id === selectedDemo);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Weight & HSN Selector Design Demos
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Ultra-compact weight and HSN selectors inspired by world-class design systems. NEW:
            Stripe, Shopify & Modern designs with your exact specifications - input+arrow for
            weight, HSN number/search for classification.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
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
              <h4 className="font-medium text-gray-900 mb-2">
                ✅ International Standards Applied:
              </h4>
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
