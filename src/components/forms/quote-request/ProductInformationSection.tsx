import React, { useState, useEffect } from 'react';
import { Control, useWatch, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import { AliExpressProductAutoFill } from './AliExpressProductAutoFill';

interface ProductInformationSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
}

export function ProductInformationSection({ control, setValue }: ProductInformationSectionProps) {
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    domain?: string;
    message?: string;
  }>({ isValid: false });

  // Watch URL field for validation
  const productUrl = useWatch({
    control,
    name: 'product_url',
  });

  // Validate URL and extract domain
  useEffect(() => {
    if (!productUrl) {
      setUrlValidation({ isValid: false });
      return;
    }

    try {
      const url = new URL(productUrl);
      const domain = url.hostname.toLowerCase();
      
      // Check if it's a known shopping site
      const knownSites = [
        'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.ca', 'amazon.com.au',
        'ebay.com', 'ebay.co.uk', 'ebay.de',
        'alibaba.com', 'aliexpress.com', 'aliexpress.us',
        'walmart.com', 'target.com',
        'bestbuy.com', 'newegg.com',
        'etsy.com', 'shopify.com',
        'flipkart.com', 'myntra.com',
        'prada.com', 'ysl.com', 'balenciaga.com', 'dior.com', 'chanel.com',
        'toysrus.com', 'carters.com',
      ];

      const isKnownSite = knownSites.some(site => domain.includes(site));
      
      setUrlValidation({
        isValid: true,
        domain: domain,
        message: isKnownSite 
          ? `✓ Recognized shopping site: ${domain}`
          : `⚠️ Unknown site: ${domain} (we can still help!)`
      });
    } catch {
      setUrlValidation({
        isValid: false,
        message: 'Please enter a valid URL'
      });
    }
  }, [productUrl]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Product Information</span>
          </div>
          <Badge variant="destructive">Required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Product URL - Critical Field */}
        <FormField
          control={control}
          name="product_url"
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
                  placeholder="https://amazon.com/product-page, https://chanel.com/product, or any international store..."
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
              <p className="text-sm text-gray-500 mt-1">
                Paste the full product page URL from any online store
              </p>
            </FormItem>
          )}
        />

        {/* AliExpress Auto-fill Component */}
        {productUrl && (
          <AliExpressProductAutoFill
            productUrl={productUrl}
            setValue={setValue}
          />
        )}

        {/* Product Name and Origin Country Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="product_name"
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
            name="origin_country"
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
                <p className="text-sm text-gray-500 mt-1">
                  Which country is the seller/store located in?
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Quantity and Price Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="quantity"
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
            name="estimated_price"
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
                <p className="text-sm text-gray-500 mt-1">
                  Helps us provide more accurate shipping estimates
                </p>
              </FormItem>
            )}
          />
        </div>

        {/* Product Notes */}
        <FormField
          control={control}
          name="product_notes"
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
                  className="min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500 mt-1">
                Include size, color, model number, or any specific variants you need
              </p>
            </FormItem>
          )}
        />

        {/* Help Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Can't find the exact product?</strong> No problem! Just provide as much detail as possible, 
            and our team will help you find the right item or suggest alternatives.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}