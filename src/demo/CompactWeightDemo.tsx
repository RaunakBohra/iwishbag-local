import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompactWeightSelector } from '@/components/admin/compact-weight-field/CompactWeightSelector';
import { Package, Smartphone } from 'lucide-react';

const CompactWeightDemo = () => {
  const [weight1, setWeight1] = useState(0.5);
  const [weight2, setWeight2] = useState(1.2);
  const [hsn1, setHsn1] = useState({ code: '8471', description: 'Electronics', confidence: 0.95 });
  const [hsn2, setHsn2] = useState(undefined);

  const weightSuggestions1 = [
    {
      value: 1.5,
      source: 'hsn' as const,
      confidence: 0.95,
      label: 'description: 'Range: 1.3-1.7kg',
    },
    {
      value: 0.2,
      source: 'ml' as const,
      confidence: 0.9,
      label: 'AI',
      description: 'iPhone 15 Pro match found',
    },
    {
      value: weight1,
      source: 'manual' as const,
      confidence: 0.5,
      label: 'Manual',
      description: 'User entered',
    },
  ];

  const weightSuggestions2 = [
    {
      value: 0.8,
      source: 'hsn' as const,
      confidence: 0.85,
      label: 'description: 'Range: 0.6-1.0kg',
    },
    {
      value: 1.1,
      source: 'ml' as const,
      confidence: 0.75,
      label: 'AI',
      description: 'Laptop accessory detected',
    },
    {
      value: weight2,
      source: 'manual' as const,
      confidence: 0.5,
      label: 'Manual',
      description: 'User entered',
    },
  ];

  const hsnSuggestions = [
    { code: '8517', description: 'Telephone sets, mobile phones', confidence: 0.92 },
    { code: '8471', description: 'Electronics and computers', confidence: 0.88 },
    { code: '8504', description: 'Electrical transformers and chargers', confidence: 0.75 },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Compact Weight & HSN Selector Demo
          </h1>
          <p className="text-lg text-gray-600">
            Ultra-compact design that reduces space usage by 80% while maintaining full
            functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <CompactHSNSelector
                  currentHSN={hsn1}
                  suggestions={hsnSuggestions}
                  onHSNChange={(hsn) => {
                    setHsn1(hsn);
                    console.log(`HSN changed to ${hsn.code}`);
                  }}
                />
              </div>

              <div className="text-xs text-gray-500 italic">
                ✨ Notice how compact this is compared to the old design!
              </div>
            </CardContent>
          </Card>

          {}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <CompactHSNSelector
                  currentHSN={hsn2}
                  suggestions={hsnSuggestions.slice(0, 2)}
                  onHSNChange={(hsn) => {
                    setHsn2(hsn);
                    console.log(`HSN changed to ${hsn.code}`);
                  }}
                />
              </div>

              <div className="text-xs text-gray-500 italic">
                🎯 Quick apply chips make selection super fast!
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison */}
        <Card className="mt-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Design Improvements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-900 mb-2">🔥 Space Efficiency</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Reduced from ~300px to ~40px height</li>
                  <li>• Inline design matches your forms</li>
                  <li>• Progressive disclosure for details</li>
                  <li>• Mobile-optimized touch targets</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-2">⚡ Better UX</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Quick-apply chips for common choices</li>
                  <li>• Unified weight + Google, and top
                e-commerce sites - button-based selection, chip filters, and inline validation for
                optimal user experience.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompactWeightDemo;
