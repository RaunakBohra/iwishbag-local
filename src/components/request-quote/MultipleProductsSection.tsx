import React, { useState, useEffect } from 'react';
import { Control, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  ExternalLink, 
  Globe, 
  DollarSign, 
  Hash,
  Info,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react';

interface MultipleProductsSectionProps {
  control: Control<any>;
}

export function MultipleProductsSection({ control }: MultipleProductsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products',
  });

  const [urlValidations, setUrlValidations] = useState<Record<number, {
    isValid: boolean;
    domain?: string;
    message?: string;
  }>>({});

  // Watch all product URLs for validation
  const watchedProducts = useWatch({
    control,
    name: 'products',
  });

  // Validate URLs for all products
  useEffect(() => {
    const newValidations: Record<number, any> = {};
    
    watchedProducts?.forEach((product: any, index: number) => {
      const url = product?.product_url;
      
      if (!url) {
        newValidations[index] = { isValid: false };
        return;
      }

      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        
        // Check if it's a known shopping site
        const knownSites = [
          'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.ca', 'amazon.com.au',
          'ebay.com', 'ebay.co.uk', 'ebay.de',
          'alibaba.com', 'aliexpress.com',
          'walmart.com', 'target.com',
          'bestbuy.com', 'newegg.com',
          'etsy.com', 'shopify.com',
          'flipkart.com', 'myntra.com',
          'prada.com', 'ysl.com', 'balenciaga.com', 'dior.com', 'chanel.com',
          'toysrus.com', 'carters.com',
        ];

        const isKnownSite = knownSites.some(site => domain.includes(site));
        
        newValidations[index] = {
          isValid: true,
          domain: domain,
          message: isKnownSite 
            ? `✓ Recognized shopping site: ${domain}`
            : `⚠️ Unknown site: ${domain} (we can still help!)`
        };
      } catch {
        newValidations[index] = {
          isValid: false,
          message: 'Please enter a valid URL'
        };
      }
    });
    
    setUrlValidations(newValidations);
  }, [watchedProducts]);

  // Popular origin countries for shopping
  const originCountries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  ];

  const addProduct = () => {
    append({
      product_url: '',
      product_name: '',
      origin_country: 'US',
      quantity: 1,
      estimated_price: undefined,
      product_notes: '',
    });
  };

  const duplicateProduct = (index: number) => {
    const productToDuplicate = watchedProducts[index];
    append({
      ...productToDuplicate,
      product_name: `${productToDuplicate.product_name} (Copy)`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Product Information</span>
            <Badge variant="secondary" className="text-xs">
              {fields.length} {fields.length === 1 ? 'Product' : 'Products'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Required</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProduct}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Product
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {fields.map((field, index) => {
          const urlValidation = urlValidations[index] || { isValid: false };
          
          return (
            <div key={field.id} className="relative">
              {/* Product Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Product {index + 1}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateProduct(index)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Product Fields */}
              <div className="space-y-4 pl-10 border-l-2 border-gray-100">
                
                {/* Product URL */}
                <FormField
                  control={control}
                  name={`products.${index}.product_url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <ExternalLink className="h-4 w-4" />
                        <span>Product URL *</span>
                        <Badge variant="secondary" className="text-xs">Critical</Badge>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="url"
                          placeholder="https://amazon.com/product-page, https://prada.com/item, or any international store..."
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {urlValidation.message && (
                        <div className={`flex items-center space-x-2 text-sm mt-2 ${
                          urlValidation.isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {urlValidation.isValid ? 
                            <CheckCircle className="h-4 w-4" /> : 
                            <AlertCircle className="h-4 w-4" />
                          }
                          <span>{urlValidation.message}</span>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                {/* Product Name and Origin Country Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`products.${index}.product_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <Package className="h-4 w-4" />
                          <span>Product Name *</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., iPhone 15 Pro Max, Nike Air Jordan 1..."
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`products.${index}.origin_country`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <span>Origin Country *</span>
                          <Badge variant="secondary" className="text-xs">Critical</Badge>
                        </FormLabel>
                        <FormControl>
                          <select 
                            {...field}
                            className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                          >
                            <option value="">Select country where you're buying from</option>
                            {originCountries.map(country => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quantity and Price Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`products.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <Hash className="h-4 w-4" />
                          <span>Quantity *</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="1"
                            className="h-11"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`products.${index}.estimated_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Estimated Price (USD)</span>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="99.99"
                            className="h-11"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Product Notes */}
                <FormField
                  control={control}
                  name={`products.${index}.product_notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Info className="h-4 w-4" />
                        <span>Product Details & Notes</span>
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Size, color, model, specific requirements, or any other details..."
                          className="min-h-[60px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          );
        })}

        {/* Add Product Button */}
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addProduct}
            className="flex items-center gap-2 border-dashed border-2 border-gray-300 hover:border-gray-400 py-6"
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Product</span>
          </Button>
        </div>

        {/* Help Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Shopping from multiple stores?</strong> Add all your products here! 
            We'll consolidate them into one shipment to save you money on shipping costs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}