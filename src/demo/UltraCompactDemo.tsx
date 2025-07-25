import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StripeWeightSelector } from '@/components/admin/ultra-compact-selectors/StripeWeightSelector';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { ShopifyWeightSelector } from '@/components/admin/ultra-compact-selectors/ShopifyWeightSelector';
import { ModernWeightSelector } from '@/components/admin/ultra-compact-selectors/ModernWeightSelector';
import { Smartphone, Package, Headphones, Star, Zap, Palette } from 'lucide-react';

// Simple adapter to make SmartHSNSearch work with demo interface
const HSNDemoAdapter = ({ currentHSN, onHSNSelect, onHSNRemove, suggestions }) => {
  return (
    <SmartHSNSearch
      currentHSNCode={currentHSN?.code}
      onHSNSelect={(hsn) => onHSNSelect({ code: hsn.hsn_code, description: hsn.display_name })}
      compact={true}
      size="sm"
    />
  );
};

const UltraCompactDemo = () => {
  // State for Stripe design
  const [stripeWeight1, setStripeWeight1] = useState(0.5);
  const [stripeWeight2, setStripeWeight2] = useState(1.2);
  const [stripeHSN1, setStripeHSN1] = useState({ code: '8517', description: 'Mobile phones' });
  const [stripeHSN2, setStripeHSN2] = useState(undefined);

  // State for Shopify design
  const [shopifyWeight1, setShopifyWeight1] = useState(0.5);
  const [shopifyWeight2, setShopifyWeight2] = useState(1.2);
  const [shopifyHSN1, setShopifyHSN1] = useState({ code: '8517', description: 'Mobile phones' });
  const [shopifyHSN2, setShopifyHSN2] = useState(undefined);

  // State for Modern design
  const [modernWeight1, setModernWeight1] = useState(0.5);
  const [modernWeight2, setModernWeight2] = useState(1.2);
  const [modernHSN1, setModernHSN1] = useState({ code: '8517', description: 'Mobile phones' });
  const [modernHSN2, setModernHSN2] = useState(undefined);

  const weightSuggestions1 = [
    { value: 1.5, source: 'hsn' as const, confidence: 0.95, description: 'Official database range: 1.3-1.7kg' },
    { value: 0.2, source: 'ai' as const, confidence: 0.90, description: 'iPhone 15 Pro match detected' }
  ];

  const weightSuggestions2 = [
    { value: 0.8, source: 'hsn' as const, confidence: 0.85, description: 'Standard laptop accessory weight' },
    { value: 1.1, source: 'ai' as const, confidence: 0.75, description: 'Gaming headset category' }
  ];

  const hsnSuggestions = [
    { code: '8517', description: 'Telephone sets, mobile phones', confidence: 0.92 },
    { code: '8471', description: 'Electronics and computers', confidence: 0.88 },
    { code: '8518', description: 'Audio equipment and headphones', confidence: 0.85 }
  ];

  const designs = [
    {
      name: 'Stripe Inspired',
      icon: Star,
      description: 'Minimal, clean, subtle - following Stripe\'s design philosophy',
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      weight1: stripeWeight1,
      weight2: stripeWeight2,
      hsn1: stripeHSN1,
      hsn2: stripeHSN2,
      setWeight1: setStripeWeight1,
      setWeight2: setStripeWeight2,
      setHSN1: setStripeHSN1,
      setHSN2: setStripeHSN2,
      WeightComponent: StripeWeightSelector,
      HSNComponent: HSNDemoAdapter
    },
    {
      name: 'Shopify Inspired',
      icon: Zap,
      description: 'Professional with green accents - Shopify\'s signature style',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      weight1: shopifyWeight1,
      weight2: shopifyWeight2,
      hsn1: shopifyHSN1,
      hsn2: shopifyHSN2,
      setWeight1: setShopifyWeight1,
      setWeight2: setShopifyWeight2,
      setHSN1: setShopifyHSN1,
      setHSN2: setShopifyHSN2,
      WeightComponent: ShopifyWeightSelector,
      HSNComponent: HSNDemoAdapter
    },
    {
      name: 'Modern Hybrid',
      icon: Palette,
      description: 'Contemporary gradients and micro-interactions - best of both worlds',
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      weight1: modernWeight1,
      weight2: modernWeight2,
      hsn1: modernHSN1,
      hsn2: modernHSN2,
      setWeight1: setModernWeight1,
      setWeight2: setModernWeight2,
      setHSN1: setModernHSN1,
      setHSN2: setModernHSN2,
      WeightComponent: ModernWeightSelector,
      HSNComponent: HSNDemoAdapter
    }
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Ultra-Compact Weight & HSN Selectors</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Three world-class designs inspired by Stripe, Shopify, and modern UI patterns. 
            Each follows your exact specification: <strong>input + arrow</strong> for weight, <strong>HSN number or search button</strong> for classification.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {designs.map((design) => {
            const Icon = design.icon;
            const WeightComponent = design.WeightComponent;
            const HSNComponent = design.HSNComponent;
            
            return (
              <div key={design.name} className="space-y-6">
                {/* Design Header */}
                <Card className={`${design.borderColor} ${design.bgColor} border-2`}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${design.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold">{design.name}</div>
                        <div className="text-sm text-gray-600 font-normal">
                          {design.description}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* Product 1 - iPhone */}
                <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      iPhone 15 Pro
                      <Badge variant="info" className="ml-auto">₹2,222.00</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <div className="font-medium">1</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Price (USD):</span>
                        <div className="font-medium">$2,222.00</div>
                      </div>
                    </div>

                    {/* Weight Selector */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <WeightComponent
                        weight={design.weight1}
                        suggestions={weightSuggestions1}
                        onWeightChange={(weight, source) => {
                          design.setWeight1(weight);
                          console.log(`${design.name} - Weight: ${weight}kg (${source})`);
                        }}
                      />
                    </div>

                    {/* HSN Selector */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <HSNComponent
                        currentHSN={design.hsn1}
                        suggestions={hsnSuggestions}
                        onHSNSelect={(hsn) => {
                          design.setHSN1(hsn);
                          console.log(`${design.name} - HSN: ${hsn.code}`);
                        }}
                        onHSNRemove={() => design.setHSN1(undefined)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Product 2 - Gaming Headset */}
                <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Headphones className="w-5 h-5 text-purple-600" />
                      Gaming Headset Pro
                      <Badge variant="success" className="ml-auto">₹8,999.00</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <div className="font-medium">1</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Price (USD):</span>
                        <div className="font-medium">$8,999.00</div>
                      </div>
                    </div>

                    {/* Weight Selector */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <WeightComponent
                        weight={design.weight2}
                        suggestions={weightSuggestions2}
                        onWeightChange={(weight, source) => {
                          design.setWeight2(weight);
                          console.log(`${design.name} - Weight: ${weight}kg (${source})`);
                        }}
                      />
                    </div>

                    {/* HSN Selector */}
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <HSNComponent
                        currentHSN={design.hsn2}
                        suggestions={hsnSuggestions.slice(1)}
                        onHSNSelect={(hsn) => {
                          design.setHSN2(hsn);
                          console.log(`${design.name} - HSN: ${hsn.code}`);
                        }}
                        onHSNRemove={() => design.setHSN2(undefined)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Comparison Summary */}
        <Card className="mt-12 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Design Pattern Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-900 mb-3">🎯 Weight Selector Pattern</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>Input box</strong> for direct weight entry</li>
                  <li>• <strong>Arrow button</strong> reveals AI & HSN suggestions</li>
                  <li>• <strong>Confidence indicators</strong> show reliability</li>
                  <li>• <strong>One-click apply</strong> from dropdown</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-3">🏷️ HSN Selector Pattern</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>HSN number badge</strong> when code is selected</li>
                  <li>• <strong>Search button</strong> when no code assigned</li>
                  <li>• <strong>Smart suggestions</strong> based on product</li>
                  <li>• <strong>Full search interface</strong> with autocomplete</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">🚀 Perfect for Your Platform</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong className="text-blue-900">Stripe:</strong>
                  <div className="text-blue-700">Minimal, clean, focuses on functionality. Perfect for professional admin interfaces.</div>
                </div>
                <div>
                  <strong className="text-blue-900">Shopify:</strong>
                  <div className="text-blue-700">Green accents, more visual hierarchy. Great for e-commerce focused workflows.</div>
                </div>
                <div>
                  <strong className="text-blue-900">Modern:</strong>
                  <div className="text-blue-700">Contemporary gradients and animations. Best user experience with sophisticated interactions.</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UltraCompactDemo;