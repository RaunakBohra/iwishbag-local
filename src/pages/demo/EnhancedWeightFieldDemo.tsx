import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartDualWeightField } from '@/components/admin/SmartDualWeightField';
import { Scale, Package, Sparkles, Info } from 'lucide-react';

export default function EnhancedWeightFieldDemo() {
  const [productWeights, setProductWeights] = useState<Record<string, number>>({
    laptop: 2.5,
    phone: 0.2,
    book: 0.5,
    shoes: 1.2,
  });

  const [sourcesSelected, setSourcesSelected] = useState<Record<string, string>>({
    laptop: 'hsn',
    phone: 'ml',
    book: 'manual',
    shoes: 'hybrid',
  });

  const handleWeightChange = (productId: string) => (value: number) => {
    setProductWeights(prev => ({ ...prev, [productId]: value }));
  };

  const handleSourceSelected = (productId: string) => (source: 'hsn' | 'ml' | 'manual') => {
    setSourcesSelected(prev => ({ ...prev, [productId]: source }));
  };

  const products = [
    {
      id: 'laptop',
      name: 'MacBook Pro 16-inch',
      hsnCode: '8471',
      url: 'https://www.apple.com/macbook-pro/',
      description: 'High-end laptop with HSN database weight'
    },
    {
      id: 'phone',
      name: 'iPhone 15 Pro',
      hsnCode: '8517',
      url: 'https://www.apple.com/iphone-15-pro/',
      description: 'Smartphone with ML prediction weight'
    },
    {
      id: 'book',
      name: 'The Design of Everyday Things',
      hsnCode: '4901',
      url: 'https://www.amazon.com/Design-Everyday-Things-Revised-Expanded/dp/0465050654',
      description: 'Book with manual weight entry'
    },
    {
      id: 'shoes',
      name: 'Nike Air Max 270',
      hsnCode: '6403',
      url: 'https://www.nike.com/air-max-270',
      description: 'Footwear with hybrid prediction'
    },
  ];

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'hsn': return 'bg-blue-100 text-blue-800';
      case 'ml': return 'bg-purple-100 text-purple-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      case 'hybrid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'hsn': return 'HSN Database';
      case 'ml': return 'ML Prediction';
      case 'manual': return 'Manual Entry';
      case 'hybrid': return 'Smart Hybrid';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {}
                  <SmartDualWeightField
                    value={productWeights[product.id]}
                    onChange={handleWeightChange(product.id)}
                    onSourceSelected={handleSourceSelected(product.id)}
                    productName={product.name}
                    hsnCode={product.hsnCode}
                    productUrl={product.url}
                    label="Product Weight"
                    required
                  />

                  {/* Current Status */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900 mb-1">Current Status:</div>
                    <div className="text-gray-600">
                      Weight: <span className="font-medium">{productWeights[product.id]} kg</span>
                    </div>
                    <div className="text-gray-600">
                      Source: <span className="font-medium">{getSourceLabel(sourcesSelected[product.id])}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-teal-600" />
              How to Use the Enhanced Weight Field
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">🖱️ Interaction:</h4>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>Click on any weight value to open editing mode</li>
                  <li>Type directly in the manual input box</li>
                  <li>Or click on any smart suggestion below</li>
                  <li>Use Save button to confirm manual entry</li>
                  <li>Use Cancel to discard changes</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">🤖 Smart Suggestions:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    you'll see both the manual input AND all smart suggestions at the same time. 
                No need to switch between modes - choose the method that works best for each situation!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary of Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">❌ Before (Old Behavior):</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Click weight → show only input OR only suggestions</li>
                  <li>• Need to click dropdown button for suggestions</li>
                  <li>• Suggestions hidden behind popover</li>
                  <li>• Switch between input/dropdown modes</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">✅ After (Enhanced):</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Click weight → show input AND suggestions together</li>
                  <li>• All options visible simultaneously</li>
                  <li>• One-click selection from suggestions</li>
                  <li>• Unified interface, no mode switching</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}