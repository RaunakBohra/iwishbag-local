/**
 * Working Test Smart Product Form - Phase 3
 * 
 * Test page without external service dependencies to isolate the issue.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TestTube,
  CheckCircle,
  Info,
  Sparkles,
  Package,
  Hash,
  Scale,
  Calculator,
} from 'lucide-react';

interface TestFormData {
  productName: string;
  productUrl: string;
  options: string;
  costPrice: number;
  hsnCode: string;
  weight: string;
}

const TestSmartProductFormWorking: React.FC = () => {
  const [smartSuggestions, setSmartSuggestions] = useState<any>(null);

  const form = useForm<TestFormData>({
    defaultValues: {
      productName: '',
      productUrl: '',
      options: '',
      costPrice: 0,
      hsnCode: '',
      weight: '',
    },
  });

  const onSubmit = (data: TestFormData) => {
    console.log('📋 [Test Form] Submitted data:', data);
    alert('Form submitted successfully! Check console for data.');
  };

  const fillSampleData = (productType: 'mobile' | 'laptop' | 'tshirt') => {
    const sampleData = {
      mobile: {
        productUrl: 'https://www.amazon.com/dp/B0CSTJ17L3',
        productName: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
        options: 'Color: Natural Titanium, Storage: 256GB, Network: Unlocked',
        costPrice: 1199,
      },
      laptop: {
        productUrl: 'https://www.amazon.com/dp/B0C7Y7Q2JJ',
        productName: 'Apple MacBook Pro 14-inch M3 Pro chip 512GB SSD',
        options: 'Color: Space Black, Memory: 18GB, Storage: 512GB SSD',
        costPrice: 1999,
      },
      tshirt: {
        productUrl: 'https://www.amazon.com/dp/B08MVKJ8TN',
        productName: 'Uniqlo Cotton T-Shirt Regular Fit',
        options: 'Color: Navy Blue, Size: Large, Material: 100% Cotton',
        costPrice: 19.90,
      },
    };

    const data = sampleData[productType];
    form.setValue('productUrl', data.productUrl);
    form.setValue('productName', data.productName);
    form.setValue('options', data.options);
    form.setValue('costPrice', data.costPrice);

    // Simulate smart suggestions with minimum valuation logic
    const mockSuggestions = {
      mobile: { 
        hsnCode: '8517', 
        weight: '0.18', 
        customs: '18%', 
        confidence: '95%',
        minimumValuation: 50,
        valuationMethod: 'minimum_valuation'
      },
      laptop: { 
        hsnCode: '8471', 
        weight: '2.50', 
        customs: '0%', 
        confidence: '90%',
        minimumValuation: 200,
        valuationMethod: 'minimum_valuation'
      },
      tshirt: { 
        hsnCode: '6109', 
        weight: '0.15', 
        customs: '12%', 
        confidence: '85%',
        minimumValuation: 5,
        valuationMethod: 'product_price'
      },
    };

    setSmartSuggestions(mockSuggestions[productType]);
    
    setTimeout(() => {
      form.setValue('hsnCode', mockSuggestions[productType].hsnCode);
      form.setValue('weight', mockSuggestions[productType].weight);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Smart Product Form Test</h1>
            <Badge variant="outline" className="text-sm">Phase 3</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test the enhanced product form with simulated AI suggestions. 
            This version works without external dependencies.
          </p>
        </div>

        {/* Quick Fill Buttons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Quick Test Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillSampleData('mobile')}
                className="flex items-center space-x-2"
              >
                <span>📱</span>
                <span>iPhone 15 Pro</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillSampleData('laptop')}
                className="flex items-center space-x-2"
              >
                <span>💻</span>
                <span>MacBook Pro</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillSampleData('tshirt')}
                className="flex items-center space-x-2"
              >
                <span>👕</span>
                <span>T-Shirt</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                className="ml-auto"
              >
                Reset Form
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Smart Suggestions Alert */}
        {smartSuggestions && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center justify-between">
                <span>🤖 AI suggestions applied! HSN: {smartSuggestions.hsnCode}, Weight: {smartSuggestions.weight}kg, Customs: {smartSuggestions.customs}</span>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {smartSuggestions.confidence} confidence
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">How to test:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Click quick fill buttons to see simulated AI suggestions</li>
                <li>• Check the tabs below for different smart features</li>
                <li>• Form validation and submission work normally</li>
                <li>• This version demonstrates the UI without backend dependencies</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>Product Information</span>
                  <Badge variant="outline" className="text-xs">Mock AI</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Name */}
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>Product Name</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., iPhone 15 Pro, MacBook Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Smart Features Tabs */}
                <Tabs defaultValue="hsn" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="hsn">HSN Code</TabsTrigger>
                    <TabsTrigger value="weight">Weight</TabsTrigger>
                    <TabsTrigger value="customs">Customs</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="hsn" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hsnCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Hash className="h-4 w-4" />
                            <span>HSN Code</span>
                            <Badge variant="outline" className="text-xs">Mock AI</Badge>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 8517 (will be suggested)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="weight" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <Scale className="h-4 w-4" />
                            <span>Weight (kg)</span>
                            <Badge variant="outline" className="text-xs">Mock AI</Badge>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.18" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="customs" className="space-y-4">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Calculator className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Customs Preview</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {smartSuggestions ? (
                            <div className="space-y-2">
                              <p>Estimated customs rate: {smartSuggestions.customs}</p>
                              
                              {/* Minimum Valuation Info */}
                              {smartSuggestions.valuationMethod === 'minimum_valuation' && (
                                <div className="p-2 bg-orange-100 rounded text-orange-800 text-xs">
                                  <p className="font-medium">⚠️ Minimum Valuation Applied</p>
                                  <p>
                                    This product has a minimum customs valuation of ${smartSuggestions.minimumValuation}.
                                    {form.watch('costPrice') < smartSuggestions.minimumValuation 
                                      ? ` Your price ($${form.watch('costPrice')}) is below minimum - customs calculated on $${smartSuggestions.minimumValuation}.`
                                      : ' Customs calculated on minimum valuation amount.'
                                    }
                                  </p>
                                </div>
                              )}
                              
                              {/* Show calculation example */}
                              {form.watch('costPrice') > 0 && (
                                <div className="text-xs">
                                  <p className="font-medium">Calculation:</p>
                                  <p>
                                    {smartSuggestions.valuationMethod === 'minimum_valuation' 
                                      ? `$${Math.max(form.watch('costPrice'), smartSuggestions.minimumValuation)} × ${smartSuggestions.customs}`
                                      : `$${form.watch('costPrice')} × ${smartSuggestions.customs}`
                                    }
                                    {' = '}
                                    ${(
                                      (smartSuggestions.valuationMethod === 'minimum_valuation' 
                                        ? Math.max(form.watch('costPrice'), smartSuggestions.minimumValuation)
                                        : form.watch('costPrice')
                                      ) * (parseFloat(smartSuggestions.customs) / 100)
                                    ).toFixed(2)} customs duty
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p>Fill in product details to see customs estimation</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Price Field */}
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Price (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="99.99"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-center">
              <Button type="submit" size="lg" className="px-8">
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Submit
              </Button>
            </div>
          </form>
        </Form>

        {/* Debug Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Current Form State</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(form.watch(), null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestSmartProductFormWorking;