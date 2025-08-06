/**
 * HSN Search Component Comparison Demo
 * 
 * Shows the difference between the original UnifiedHSNSearch and the new CompactHSNSearch
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { UnifiedHSNSearch } from '@/components/forms/quote-form-fields/UnifiedHSNSearch';
import { CompactHSNSearch } from '@/components/forms/quote-form-fields/CompactHSNSearch';
import { ArrowDown, ArrowUp } from 'lucide-react';

export const HSNComparisonDemo: React.FC = () => {
  const [demoProduct] = useState('adidas Men Drogo M Running Shoe');
  const [demoPrice] = useState(89.99);
  const [values, setValues] = useState<Record<string, any>>({
    original: {},
    compact: {}
  });

  const handleValueChange = (version: 'original' | 'compact') => (name: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [version]: {
        ...prev[version],
        [name]: value
      }
    }));
  };

  const mockHSNInfo = (hsnCode: string, countryCode: string) => {
    const hsnRates: Record<string, { customsRate: number; countryRate: number; description: string }> = {
      '6403': { customsRate: 15, countryRate: 20, description: 'Sports footwear with rubber/plastic soles' },
      '6404': { customsRate: 18, countryRate: 20, description: 'Footwear with textile uppers' },
      '8471': { customsRate: 10, countryRate: 15, description: 'Computer equipment' },
      '8517': { customsRate: 10, countryRate: 15, description: 'Mobile phones and accessories' }
    };
    return hsnRates[hsnCode] || { customsRate: 20, countryRate: 20, description: 'Default classification' };
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">HSN Search Component Comparison</h1>
        <p className="text-gray-600">See the difference between the original and compact versions</p>
      </div>

      {/* Demo Product Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Demo Product</h3>
              <p className="text-sm text-gray-600">{demoProduct}</p>
            </div>
            <Badge variant="outline">${demoPrice}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Version */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Original UnifiedHSNSearch</span>
              <Badge variant="destructive">Large</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 border-dashed border-red-200 bg-red-50/30 rounded">
              <div className="text-sm text-red-700 mb-2 flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Takes significant vertical space
              </div>
              <UnifiedHSNSearch
                control={null}
                index={0}
                setValue={handleValueChange('original')}
                countryCode="IN"
                productName={demoProduct}
                currentCategory={values.original.category}
                currentHSN={values.original.hsnCode}
                currentUseHSNRates={values.original.useHSNRates}
                currentValuationPreference={values.original.valuationPreference || 'auto'}
                onHSNRateToggle={(useRates) => handleValueChange('original')('useHSNRates', useRates)}
                onValuationChange={(pref) => handleValueChange('original')('valuationPreference', pref)}
                getHSNInfo={mockHSNInfo}
              />
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Multiple large cards</div>
              <div>• Always expanded interface</div>
              <div>• Verbose result display</div>
              <div>• Heavy visual footprint</div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Version */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>New CompactHSNSearch</span>
              <Badge variant="default" className="bg-green-600">Compact</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 border-dashed border-green-200 bg-green-50/30 rounded">
              <div className="text-sm text-green-700 mb-2 flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Single line, space efficient
              </div>
              <CompactHSNSearch
                control={null}
                index={0}
                setValue={handleValueChange('compact')}
                countryCode="IN"
                productName={demoProduct}
                currentCategory={values.compact.category}
                currentHSN={values.compact.hsnCode}
                currentUseHSNRates={values.compact.useHSNRates}
                currentValuationPreference={values.compact.valuationPreference || 'auto'}
                onHSNRateToggle={(useRates) => handleValueChange('compact')('useHSNRates', useRates)}
                onValuationChange={(pref) => handleValueChange('compact')('valuationPreference', pref)}
                getHSNInfo={mockHSNInfo}
              />
            </div>
            
            <div className="text-xs text-green-600 space-y-1">
              <div>• Single line combobox interface</div>
              <div>• Popover-based search results</div>
              <div>• Progressive disclosure for settings</div>
              <div>• Minimal visual footprint</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-red-700">Original Issues</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Takes 300-400px of vertical space</li>
                <li>• Always shows search interface</li>
                <li>• Multiple cards create visual clutter</li>
                <li>• Settings always visible when selected</li>
                <li>• Not mobile-optimized</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-700">Compact Benefits</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Only ~40px height (90% space reduction)</li>
                <li>• Clean single-line interface</li>
                <li>• Popover-based interactions</li>
                <li>• Progressive disclosure for settings</li>
                <li>• Fully responsive design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Switch?</h3>
          <p className="text-gray-600 mb-4">
            The compact version maintains all functionality while using 90% less vertical space.
          </p>
          <div className="flex justify-center gap-2">
            <Badge className="bg-green-600">✅ Same search intelligence</Badge>
            <Badge className="bg-blue-600">✅ All settings preserved</Badge>
            <Badge className="bg-purple-600">✅ Better UX</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};