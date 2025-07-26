import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calculator, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Info,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced mock data with HSN minimum valuations
const mockItemsWithValuation = [
  { 
    id: '1', 
    name: 'iPhone 15 Pro', 
    price: 800, 
    quantity: 1, 
    hsn_code: '8517',
    category: 'Electronics',
    minimum_valuation: 1000, // Higher than actual price
    currency: 'USD'
  },
  { 
    id: '2', 
    name: 'MacBook Pro M3', 
    price: 1200, 
    quantity: 1, 
    hsn_code: '8471',
    category: 'Computers',
    minimum_valuation: null, // No minimum data available
    currency: 'USD'
  },
  { 
    id: '3', 
    name: 'Designer Ring', 
    price: 500, 
    quantity: 1, 
    hsn_code: '7113',
    category: 'Jewelry',
    minimum_valuation: 300, // Lower than actual price
    currency: 'USD'
  },
  { 
    id: '4', 
    name: 'Branded Shoes', 
    price: 150, 
    quantity: 2, 
    hsn_code: '6403',
    category: 'Footwear',
    minimum_valuation: 200, // Higher than actual
    currency: 'USD'
  }
];

// Valuation method options
type ValuationMethod = 'product_value' | 'minimum_valuation' | 'higher_of_both' | 'auto';

export default function ValuationMethodDemo() {
  const [selectedApproach, setSelectedApproach] = useState('per-item');
  const [globalValuationMethod, setGlobalValuationMethod] = useState<ValuationMethod>('higher_of_both');
  const [itemOverrides, setItemOverrides] = useState<Record<string, ValuationMethod>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper to calculate valuation base
  const calculateValuationBase = (item: typeof mockItemsWithValuation[0], method: ValuationMethod) => {
    const hasMinimum = item.minimum_valuation !== null;
    
    switch (method) {
      case 'product_value':
        return item.price;
      
      case 'minimum_valuation':
        if (!hasMinimum) return item.price; // Fallback
        return item.minimum_valuation!;
      
      case 'higher_of_both':
      case 'auto':
        if (!hasMinimum) return item.price;
        return Math.max(item.price, item.minimum_valuation!);
      
      default:
        return item.price;
    }
  };

  // Get effective valuation method for item
  const getEffectiveMethod = (itemId: string) => {
    return itemOverrides[itemId] || globalValuationMethod;
  };

  // Component: Current Quote-Level Approach
  const QuoteLevelApproach = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Quote-Level Valuation (Current)
        </CardTitle>
        <CardDescription>
          Single valuation method applied to all items - limited flexibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-sm font-medium">Global Valuation Method</Label>
          <Select defaultValue="minimum_valuation">
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_value">Product Value</SelectItem>
              <SelectItem value="minimum_valuation">Minimum Valuation</SelectItem>
              <SelectItem value="higher_of_both">Higher of Both</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 mt-2">
            This method applies to ALL items in the quote
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Problem: Laptop has no minimum valuation data, but forced to use minimum method!
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Impact on Items</Label>
          {mockItemsWithValuation.map(item => {
            const base = calculateValuationBase(item, 'minimum_valuation');
            const hasIssue = !item.minimum_valuation && 'minimum_valuation' === 'minimum_valuation';
            
            return (
              <div key={item.id} className={cn(
                "flex items-center justify-between p-3 border rounded",
                hasIssue && "border-red-300 bg-red-50"
              )}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500">${item.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasIssue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      No Min Data
                    </Badge>
                  )}
                  <span className="text-sm font-medium">
                    Base: ${base}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  // Component: Per-Item Valuation Approach
  const PerItemApproach = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="w-5 h-5" />
          Per-Item Valuation (Recommended)
        </CardTitle>
        <CardDescription>
          Each item can have its own valuation method with smart defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Default Valuation Method</Label>
            <Button variant="link" size="sm" className="text-xs">
              Apply to all items
            </Button>
          </div>
          <Select 
            value={globalValuationMethod}
            onValueChange={(v: ValuationMethod) => setGlobalValuationMethod(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_value">Product Value</SelectItem>
              <SelectItem value="minimum_valuation">Minimum Valuation</SelectItem>
              <SelectItem value="higher_of_both">Higher of Both (Recommended)</SelectItem>
              <SelectItem value="auto">Auto-Detect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Per-Item Configuration</Label>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Simple View' : 'Advanced View'}
            </Button>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Item</th>
                  <th className="text-center p-3">Product Value</th>
                  <th className="text-center p-3">Min Valuation</th>
                  <th className="text-center p-3">Method</th>
                  <th className="text-center p-3">Customs Base</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockItemsWithValuation.map(item => {
                  const method = getEffectiveMethod(item.id);
                  const base = calculateValuationBase(item, method);
                  const isHigher = item.minimum_valuation && item.minimum_valuation > item.price;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        ${item.price}
                      </td>
                      <td className="text-center p-3">
                        {item.minimum_valuation ? (
                          <span className={cn(
                            "inline-flex items-center gap-1",
                            isHigher ? "text-orange-600" : "text-green-600"
                          )}>
                            ${item.minimum_valuation}
                            {isHigher ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="text-center p-3">
                        {showAdvanced ? (
                          <Select
                            value={method}
                            onValueChange={(v: ValuationMethod) => {
                              setItemOverrides({...itemOverrides, [item.id]: v});
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product_value">Product</SelectItem>
                              <SelectItem value="minimum_valuation">Minimum</SelectItem>
                              <SelectItem value="higher_of_both">Higher</SelectItem>
                              <SelectItem value="auto">Auto</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {method === 'higher_of_both' ? 'Higher' : method}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center p-3">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold">${base}</span>
                          {base !== item.price && (
                            <Badge className="text-xs" variant={base > item.price ? "destructive" : "default"}>
                              {base > item.price ? '+' : '-'}${Math.abs(base - item.price)}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <Check className="w-4 h-4 inline mr-1" />
              Each item uses the most appropriate valuation method
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Component: Smart Hybrid Approach
  const SmartHybridApproach = () => {
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Smart Hybrid with Bulk Operations
          </CardTitle>
          <CardDescription>
            Intelligent defaults with bulk management capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <Label className="text-sm font-medium">Smart Default</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Auto-Detect</Badge>
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-xs">Best method per item</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <Label className="text-sm font-medium">Override Control</Label>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBulkMode(!bulkMode)}
                  className="w-full"
                >
                  {bulkMode ? 'Exit Bulk Mode' : 'Bulk Edit Mode'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Intelligent Item Management</Label>
            {mockItemsWithValuation.map(item => {
              const method = getEffectiveMethod(item.id);
              const base = calculateValuationBase(item, method);
              const recommendation = item.minimum_valuation && item.minimum_valuation > item.price 
                ? 'minimum_valuation' 
                : 'product_value';
              
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {bulkMode && (
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id));
                            }
                          }}
                        />
                      )}
                      <Package className="w-4 h-4" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge 
                      variant={method === recommendation ? "default" : "outline"}
                      className="text-xs"
                    >
                      {method === recommendation && <Check className="w-3 h-3 mr-1" />}
                      {method}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-500">Product</p>
                      <p className="font-medium">${item.price}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Minimum</p>
                      <p className="font-medium">
                        {item.minimum_valuation ? `$${item.minimum_valuation}` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Recommended</p>
                      <p className="font-medium text-blue-600">{recommendation}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Base</p>
                      <p className="font-semibold text-green-600">${base}</p>
                    </div>
                  </div>
                  
                  {method !== recommendation && (
                    <Alert className="py-2">
                      <Info className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Recommendation: Use {recommendation} for optimal compliance
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>

          {bulkMode && selectedItems.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">
                Bulk Actions ({selectedItems.length} items selected)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="default">
                  Apply Product Value
                </Button>
                <Button size="sm" variant="outline">
                  Apply Minimum
                </Button>
                <Button size="sm" variant="outline">
                  Apply Higher
                </Button>
                <Button size="sm" variant="secondary">
                  Auto-Detect All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Component: Visual Comparison
  const VisualComparison = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Valuation Impact Visualization</CardTitle>
        <CardDescription>
          See how different methods affect customs calculations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockItemsWithValuation.map(item => {
            const productBase = item.price;
            const minimumBase = item.minimum_valuation || item.price;
            const higherBase = Math.max(productBase, minimumBase);
            const customsRate = 15; // Example customs rate
            
            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{item.name}</h4>
                  <Badge variant="outline">
                    {item.hsn_code ? `HSN: ${item.hsn_code}` : 'No HSN'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className={cn(
                    "p-3 rounded-lg text-center",
                    productBase === higherBase ? "bg-green-50 border-green-200 border-2" : "bg-gray-50"
                  )}>
                    <p className="text-gray-600 text-xs">Product Value</p>
                    <p className="font-semibold text-lg">${productBase}</p>
                    <p className="text-xs text-gray-500">
                      Customs: ${(productBase * customsRate / 100).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "p-3 rounded-lg text-center",
                    item.minimum_valuation ? (
                      minimumBase === higherBase ? "bg-green-50 border-green-200 border-2" : "bg-gray-50"
                    ) : "bg-gray-100 opacity-50"
                  )}>
                    <p className="text-gray-600 text-xs">Minimum Valuation</p>
                    <p className="font-semibold text-lg">
                      {item.minimum_valuation ? `$${minimumBase}` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.minimum_valuation ? `Customs: $${(minimumBase * customsRate / 100).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border-blue-200 border-2 p-3 rounded-lg text-center">
                    <p className="text-gray-600 text-xs">Higher of Both</p>
                    <p className="font-semibold text-lg">${higherBase}</p>
                    <p className="text-xs text-blue-600 font-medium">
                      Customs: ${(higherBase * customsRate / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {item.minimum_valuation && item.minimum_valuation > item.price && (
                  <Alert className="mt-3">
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Minimum valuation increases customs base by ${item.minimum_valuation - item.price}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Summary Impact</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total (Product Value)</p>
              <p className="font-semibold">
                ${mockItemsWithValuation.reduce((sum, item) => sum + item.price * item.quantity, 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total (Minimum)</p>
              <p className="font-semibold">
                ${mockItemsWithValuation.reduce((sum, item) => 
                  sum + (item.minimum_valuation || item.price) * item.quantity, 0
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total (Higher)</p>
              <p className="font-semibold text-blue-600">
                ${mockItemsWithValuation.reduce((sum, item) => 
                  sum + Math.max(item.price, item.minimum_valuation || item.price) * item.quantity, 0
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Valuation Method Management Demo</h1>
        <p className="text-gray-600">
          Compare different approaches for handling product value vs minimum valuation
        </p>
      </div>

      <Tabs value={selectedApproach} onValueChange={setSelectedApproach} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quote-level">Quote-Level</TabsTrigger>
          <TabsTrigger value="per-item">Per-Item</TabsTrigger>
          <TabsTrigger value="smart-hybrid">Smart Hybrid</TabsTrigger>
          <TabsTrigger value="visual">Visual Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="quote-level" className="mt-6">
          <QuoteLevelApproach />
        </TabsContent>

        <TabsContent value="per-item" className="mt-6">
          <PerItemApproach />
        </TabsContent>

        <TabsContent value="smart-hybrid" className="mt-6">
          <SmartHybridApproach />
        </TabsContent>

        <TabsContent value="visual" className="mt-6">
          <VisualComparison />
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Key Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Current Challenges
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Quote-level method fails when items lack minimum data</li>
                <li>• No flexibility for item-specific requirements</li>
                <li>• Legal compliance issues with forced methods</li>
                <li>• Poor user experience with error states</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Recommended Solution
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Per-item valuation with smart defaults</li>
                <li>• Auto-detection based on available data</li>
                <li>• Bulk operations for efficiency</li>
                <li>• Clear visual feedback on impact</li>
                <li>• Flexible overrides when needed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}