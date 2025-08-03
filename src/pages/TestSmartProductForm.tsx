/**
 * Test Smart Product Form - Phase 3
 * 
 * Test page for demonstrating the enhanced product form with smart suggestions.
 * Allows testing of all Phase 3 components in isolation.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TestTube,
  CheckCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import our enhanced component
import { EnhancedProductInfoFields } from '@/components/forms/quote-form-fields/EnhancedProductInfoFields';

// Form schema
const testFormSchema = z.object({
  items: z.array(z.object({
    productUrl: z.string().url().optional().or(z.literal('')),
    productName: z.string().min(1, 'Product name is required'),
    options: z.string().optional(),
    costprice_origin: z.number().min(0).optional(),
    quantity: z.number().min(1).optional(),
    weight: z.string().optional(),
    hsnCode: z.string().optional(),
    category: z.string().optional(),
  })),
  destination_country: z.string().default('IN'),
});

type TestFormData = z.infer<typeof testFormSchema>;

export const TestSmartProductForm: React.FC = () => {
  const { toast } = useToast();

  const form = useForm<TestFormData>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      items: [{
        productUrl: '',
        productName: '',
        options: '',
        costprice_origin: undefined,
        quantity: 1,
        weight: '',
        hsnCode: '',
        category: '',
      }],
      destination_country: 'IN',
    },
  });

  const onSubmit = (data: TestFormData) => {
    console.log('📋 [Test Form] Submitted data:', data);
    toast({
      title: 'Form Submitted Successfully!',
      description: 'Check the console for detailed form data.',
    });
  };

  const fillSampleData = (productType: 'mobile' | 'laptop' | 'tshirt') => {
    const sampleData = {
      mobile: {
        productUrl: 'https://www.amazon.com/dp/B0CSTJ17L3',
        productName: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
        options: 'Color: Natural Titanium, Storage: 256GB, Network: Unlocked',
        costprice_origin: 1199,
      },
      laptop: {
        productUrl: 'https://www.amazon.com/dp/B0C7Y7Q2JJ',
        productName: 'Apple MacBook Pro 14-inch M3 Pro chip 512GB SSD',
        options: 'Color: Space Black, Memory: 18GB, Storage: 512GB SSD',
        costprice_origin: 1999,
      },
      tshirt: {
        productUrl: 'https://www.amazon.com/dp/B08MVKJ8TN',
        productName: 'Uniqlo Cotton T-Shirt Regular Fit',
        options: 'Color: Navy Blue, Size: Large, Material: 100% Cotton',
        costprice_origin: 19.90,
      },
    };

    const data = sampleData[productType];
    form.setValue('items.0.productUrl', data.productUrl);
    form.setValue('items.0.productName', data.productName);
    form.setValue('items.0.options', data.options);
    form.setValue('items.0.costprice_origin', data.costprice_origin);

    toast({
      title: 'Sample Data Loaded',
      description: `${productType} data loaded. Watch the AI suggestions appear!`,
    });
  };

  const resetForm = () => {
    form.reset();
    toast({
      title: 'Form Reset',
      description: 'All fields cleared.',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Smart Product Form Test</h1>
            <Badge variant="outline" className="text-sm">
              Phase 3
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Test the enhanced product form with AI-powered HSN suggestions, weight estimation, 
            and customs rate preview. Try different product types to see intelligent suggestions.
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
                onClick={resetForm}
                className="ml-auto"
              >
                Reset Form
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">How to test the smart features:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Fill in a product name and price, then watch AI suggest HSN codes</li>
                <li>• Check the Weight tab for intelligent weight estimation</li>
                <li>• View the Customs tab for real-time rate calculations</li>
                <li>• Use the quick fill buttons for instant test data</li>
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
                  <Badge variant="outline" className="text-xs">
                    AI Enhanced
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedProductInfoFields
                  control={form.control}
                  index={0}
                  setValue={form.setValue}
                  countryCode="IN"
                />

                {/* Price Field for Testing */}
                <div className="mt-6 space-y-2">
                  <label className="text-sm font-medium">Product Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="99.99"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        form.setValue('items.0.costprice_origin', value);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter price to enable customs calculations and full AI features
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-center space-x-4">
              <Button type="submit" size="lg" className="px-8">
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Submit
              </Button>
            </div>
          </form>
        </Form>

        {/* Current Form State Debug */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Form State (Debug)</CardTitle>
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

export default TestSmartProductForm;