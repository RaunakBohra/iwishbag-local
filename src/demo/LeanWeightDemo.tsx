// ============================================================================
// LEAN WEIGHT DEMO - Demonstrates the new SmartDualWeightField integration
// Shows how to use the lean weight service in quote creation
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { SmartDualWeightField } from '@/components/admin/SmartDualWeightField';
import { leanWeightService } from '@/services/LeanWeightService';
import { Package, Info, CheckCircle, Brain, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DemoItem {
  id: string;
  product_name: string;
  product_url: string;
  hsn_code: string;
  weight: number;
  price: number;
  quantity: number;
  selectedWeightSource?: 'hsn' | 'ml' | 'manual';
}

export const LeanWeightDemo: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<DemoItem[]>([
    {
      id: '1',
      product_name: 'iPhone 15 Pro Max',
      product_url: 'https://www.amazon.com/dp/B0CRHKF6XX',
      hsn_code: '851762',
      weight: 0,
      price: 1199,
      quantity: 1,
    },
  ]);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Sample HSN codes for demo
  const sampleHSNCodes = [
    { code: '851762', name: 'Mobile phones' },
    { code: '847130', name: 'Laptops' },
    { code: '851770', name: 'Phone accessories' },
    { code: '620442', name: 'Women\'s dresses' },
    { code: '640299', name: 'Sports shoes' },
    { code: '420212', name: 'Backpacks' },
    { code: '950450', name: 'Gaming consoles' },
    { code: '330499', name: 'Cosmetics' },
  ];

  const updateItem = (id: string, field: keyof DemoItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    const newItem: DemoItem = {
      id: Date.now().toString(),
      product_name: '',
      product_url: '',
      hsn_code: '',
      weight: 0,
      price: 0,
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleWeightSourceSelected = (itemId: string, source: 'hsn' | 'ml' | 'manual') => {
    updateItem(itemId, 'selectedWeightSource', source);
    
    toast({
      title: 'Weight Source Selected',
      description: `Using ${source.toUpperCase()} weight for calculation`,
    });
  };

  const fetchAnalytics = async () => {
    const stats = leanWeightService.getStats();
    const samplePredictions = await Promise.all([
      leanWeightService.predictWeight('MacBook Air 13 inch', '847130'),
      leanWeightService.predictWeight('Nike Air Max shoes', '640299'),
      leanWeightService.predictWeight('Samsung Galaxy S24 Ultra'),
    ]);

    setAnalytics({
      stats,
      samplePredictions,
    });
    setShowAnalytics(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            Lean Weight Service Demo
          </CardTitle>
          <CardDescription>
            Demonstrates the new intelligent weight prediction system that combines HSN database with ML predictions
            while staying within Supabase free tier limits.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Items Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Items</CardTitle>
          <CardDescription>
            Add items to see how the weight prediction works with different sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Item {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={item.product_name}
                    onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                    placeholder="e.g., iPhone 15 Pro Max"
                  />
                </div>

                <div>
                  <Label>HSN Code</Label>
                  <Select
                    value={item.hsn_code}
                    onValueChange={(value) => updateItem(item.id, 'hsn_code', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select HSN code" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleHSNCodes.map(hsn => (
                        <SelectItem key={hsn.code} value={hsn.code}>
                          {hsn.code} - {hsn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Product URL (Optional)</Label>
                  <Input
                    value={item.product_url}
                    onChange={(e) => updateItem(item.id, 'product_url', e.target.value)}
                    placeholder="https://amazon.com/..."
                  />
                </div>

                <div>
                  <SmartDualWeightField
                    value={item.weight}
                    onChange={(weight) => updateItem(item.id, 'weight', weight)}
                    productName={item.product_name}
                    hsnCode={item.hsn_code}
                    productUrl={item.product_url}
                    onSourceSelected={(source) => handleWeightSourceSelected(item.id, source)}
                    showDebug={true}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (USD)</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {item.selectedWeightSource && (
                <Alert className="mt-2">
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Weight source: <Badge variant="outline">{item.selectedWeightSource.toUpperCase()}</Badge>
                    {item.selectedWeightSource === 'hsn' && ' - Using official HSN database weight'}
                    {item.selectedWeightSource === 'ml' && ' - Using ML prediction based on product name'}
                    {item.selectedWeightSource === 'manual' && ' - Using manually entered weight'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}

          <Button onClick={addItem} variant="outline" className="w-full">
            + Add Another Item
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  Item {index + 1}: {item.product_name || 'Unnamed'}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={item.selectedWeightSource === 'hsn' ? 'default' : 'secondary'}>
                    {item.weight} kg
                  </Badge>
                  {item.selectedWeightSource && (
                    <Badge variant="outline" className="text-xs">
                      {item.selectedWeightSource === 'hsn' && <Package className="w-3 h-3 mr-1" />}
                      {item.selectedWeightSource === 'ml' && <Brain className="w-3 h-3 mr-1" />}
                      {item.selectedWeightSource === 'manual' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {item.selectedWeightSource}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Total Weight:</span>
              <span>{items.reduce((sum, item) => sum + (item.weight * item.quantity), 0).toFixed(2)} kg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Service Analytics</CardTitle>
          <CardDescription>
            View the lean weight service performance and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchAnalytics} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Show Analytics
          </Button>

          {showAnalytics && analytics && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Service Statistics</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Cache Size</p>
                    <p className="font-medium">{analytics.stats.cacheSize} entries</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pattern Rules</p>
                    <p className="font-medium">
                      {analytics.stats.patterns.sizes + analytics.stats.patterns.brands + analytics.stats.patterns.materials} total
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Storage Used</p>
                    <p className="font-medium text-green-600">&lt; 1 MB</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Sample Predictions</h4>
                <div className="space-y-2">
                  {analytics.samplePredictions.map((pred: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Test {idx + 1}</span>
                        <Badge variant="outline">
                          {pred.weight} kg ({Math.round(pred.confidence * 100)}% confidence)
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Source: {pred.source} | {pred.reasoning[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Storage Efficient</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• HSN weights as primary source (&lt; 1MB)</li>
                <li>• Selective ML storage for exceptions only</li>
                <li>• Pattern matching without database storage</li>
                <li>• Total usage &lt; 10MB on free tier</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Intelligent Prediction</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• HSN database for official weights</li>
                <li>• ML refinements for specific products</li>
                <li>• Size/brand/material modifiers</li>
                <li>• Confidence scoring for transparency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};