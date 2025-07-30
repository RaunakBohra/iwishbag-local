import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineStripeSelectors } from '@/components/admin/ultra-compact-selectors/InlineStripeSelectors';
import { Smartphone, Package, Edit, ArrowRight } from 'lucide-react';

const InlineStripeDemo = () => {
  const [weight1, setWeight1] = useState(0.5);
  const [weight2, setWeight2] = useState(1.2);
  const [hsn1, setHsn1] = useState({ code: '8517', description: 'Mobile phones' });
  const [hsn2, setHsn2] = useState(undefined);

  const weightSuggestions1 = [
    {
      value: 1.5,
      source: 'hsn' as const,
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Inline Stripe Design - Final Implementation
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Ultra-compact inline weight & HSN selectors integrated into product edit forms. Based on
            your exact specifications: input+arrow for weight}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-gray-600" />
              Edit Product Form - Live Example
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" value="iPhone 15 Pro" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input id="url" value="https://amazon.com/iphone-15-pro" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value="1" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input id="price" type="number" value="999.99" className="mt-1" />
                </div>
              </div>

              {}
              <div>
                <Label className="mb-2">Weight & HSN Classification</Label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <InlineStripeSelectors
                    weight={weight1}
                    weightSuggestions={weightSuggestions1}
                    onWeightChange={(weight, source) => {
                      setWeight1(weight);
                      console.log(`Weight: ${weight}kg (${source})`);
                    }}
                    currentHSN={hsn1}
                    hsnSuggestions={[]}
                    onHSNSelect={(hsn) => {
                      setHsn1(hsn);
                      console.log(`HSN: ${hsn.code}`);
                    }}
                    onHSNRemove={() => setHsn1(undefined)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Options/Notes</Label>
                <Input id="notes" placeholder="Size, color, specifications..." className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-purple-600" />
                Gaming Headset Pro
                <Badge variant="success" className="ml-auto">
                  ₹8,999.00
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <InlineStripeSelectors
                  weight={weight2}
                  weightSuggestions={weightSuggestions2}
                  onWeightChange={(weight, source) => setWeight2(weight)}
                  currentHSN={hsn2}
                  hsnSuggestions={[]}
                  onHSNSelect={(hsn) => setHsn2(hsn)}
                  onHSNRemove={() => setHsn2(undefined)}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-green-600">
                <ArrowRight className="w-4 h-4" />
                <span>Clean Stripe design with progressive disclosure</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Design Features */}
        <Card className="mt-8 border-2 border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50">
          <CardHeader>
            <CardTitle className="text-gray-900">Inline Design Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">🎯 Ultra Compact</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Single line for weight & minimal design</li>
                  <li>• Subtle interactions</li>
                  <li>• Professional appearance</li>
                  <li>• Progressive disclosure</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 mt-6">
              <p className="text-sm text-gray-700">
                <strong>Integration Complete:</strong> The inline Stripe selectors are now
                integrated into your SmartItemsManager component for both Edit and Add dialogs. The
                design follows Stripe's minimal aesthetic while providing all the functionality you
                need in the most compact form possible.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InlineStripeDemo;
