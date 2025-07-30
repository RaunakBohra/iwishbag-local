import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StripeWeightSelector } from '@/components/admin/ultra-compact-selectors/StripeWeightSelector';
import { ShopifyWeightSelector } from '@/components/admin/ultra-compact-selectors/ShopifyWeightSelector';
import { ModernWeightSelector } from '@/components/admin/ultra-compact-selectors/ModernWeightSelector';
import { Smartphone, Package, Headphones, Star, Zap, Palette } from 'lucide-react';

// Simple adapter to make Smartononsuggestions }) => {
  return (
    <SmartHSNSearch
      currentHSNCode={currentHSN?.code}
      ondescription: hsn.display_name })}
      compact={true}
      size="sm"
    />
  );
};

const UltraCompactDemo = () => {
  // State for Stripe design
  const [stripeWeight1, setStripeWeight1] = useState(0.5);
  const [stripeWeight2, setStripeWeight2] = useState(1.2);
  const [stripesetStripedescription: 'Mobile phones' });
  const [stripesetStripesetShopifyWeight1] = useState(0.5);
  const [shopifyWeight2, setShopifyWeight2] = useState(1.2);
  const [shopifysetShopifydescription: 'Mobile phones' });
  const [shopifysetShopifysetModernWeight1] = useState(0.5);
  const [modernWeight2, setModernWeight2] = useState(1.2);
  const [modernsetModerndescription: 'Mobile phones' });
  const [modernsetModernsource: 'hsn' as const,
      confidence: 0.95,
      description: 'Official database range: 1.3-1.7kg',
    },
    {
      value: 0.2,
      source: 'ai' as const,
      confidence: 0.9,
      description: 'iPhone 15 Pro match detected',
    },
  ];

  const weightSuggestions2 = [
    {
      value: 0.8,
      source: 'hsn' as const,
      confidence: 0.85,
      description: 'Standard laptop accessory weight',
    },
    { value: 1.1, source: 'ai' as const, confidence: 0.75, description: 'Gaming headset category' },
  ];

  const hsnSuggestions = [
    { code: '8517', description: 'Telephone sets, mobile phones', confidence: 0.92 },
    { code: '8471', description: 'Electronics and computers', confidence: 0.88 },
    { code: '8518', description: 'Audio equipment and headphones', confidence: 0.85 },
  ];

  const designs = [
    {
      name: 'Stripe Inspired',
      icon: Star,
      description: "Minimal, clean, subtle - following Stripe's design philosophy",
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      weight1: stripeWeight1,
      weight2: stripeWeight2,
      hsn1: stripehsn2: stripesetWeight1: setStripeWeight1,
      setWeight2: setStripeWeight2,
      setsetWeightComponent: StripeWeightSelector,
    },
    {
      name: 'Shopify Inspired',
      icon: Zap,
      description: "Professional with green accents - Shopify's signature style",
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      weight1: shopifyWeight1,
      weight2: shopifyWeight2,
      hsn1: shopifyhsn2: shopifysetWeight1: setShopifyWeight1,
      setWeight2: setShopifyWeight2,
      setsetWeightComponent: ShopifyWeightSelector,
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
      hsn1: modernhsn2: modernsetWeight1: setModernWeight1,
      setWeight2: setModernWeight2,
      setsetWeightComponent: ModernWeightSelector,
    },
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Ultra-Compact Weight & Shopify, and modern UI patterns. Each
            follows your exact specification: <strong>input + arrow</strong> for weight,{' '}
            <strong>HSN number or search button</strong> for classification.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {designs.map((design) => {
            const Icon = design.icon;
            const WeightComponent = design.WeightComponent;
            const HSNComponent = design.HSNComponent;

            return (
              <div key={design.name} className="space-y-6">
                {}
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

                {}
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
                  <li>
                    • <strong>Input box</strong> for direct weight entry
                  </li>
                  <li>
                    • <strong>Arrow button</strong> reveals AI & clean, focuses on functionality. Perfect for professional admin
                    interfaces.
                  </div>
                </div>
                <div>
                  <strong className="text-blue-900">Shopify:</strong>
                  <div className="text-blue-700">
                    Green accents, more visual hierarchy. Great for e-commerce focused workflows.
                  </div>
                </div>
                <div>
                  <strong className="text-blue-900">Modern:</strong>
                  <div className="text-blue-700">
                    Contemporary gradients and animations. Best user experience with sophisticated
                    interactions.
                  </div>
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
