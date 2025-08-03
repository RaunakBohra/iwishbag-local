/**
 * Enhanced Product Info Fields - Phase 3
 * 
 * Combines all smart components for a complete intelligent product form experience.
 * Features HSN suggestions, weight estimation, customs preview, and smart enhancements.
 */

import React, { useState, useEffect } from 'react';
import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Link,
  Package,
  Settings,
  Sparkles,
  Info,
  TrendingUp,
  CheckCircle,
  Brain,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Import our new smart components
import { SmartHSNField } from './SmartHSNField';
import { EnhancedSmartWeightField } from './EnhancedSmartWeightField';
import { SmartCustomsPreview } from './SmartCustomsPreview';

// Import services
import { smartQuoteEnhancementService } from '@/services/SmartQuoteEnhancementService';
import type { ProductSuggestion } from '@/services/ProductIntelligenceService';

interface ProductFormItem {
  productUrl: string;
  productName: string;
  options: string;
  costprice_origin?: number;
  quantity?: number;
  weight?: string;
  hsnCode?: string;
  category?: string;
}

interface ProductFormData extends FieldValues {
  items: ProductFormItem[];
  destination_country?: string;
}

interface EnhancedProductInfoFieldsProps {
  control: Control<ProductFormData>;
  index: number;
  setValue: UseFormSetValue<ProductFormData>;
  countryCode?: string;
}

export const EnhancedProductInfoFields: React.FC<EnhancedProductInfoFieldsProps> = ({
  control,
  index,
  setValue,
  countryCode = 'IN',
}) => {
  const { toast } = useToast();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementApplied, setEnhancementApplied] = useState(false);
  const [selectedHSN, setSelectedHSN] = useState<ProductSuggestion | null>(null);

  // Watch form fields
  const productUrl = useWatch({
    control,
    name: `items.${index}.productUrl`,
  });

  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const hsnCode = useWatch({
    control,
    name: `items.${index}.hsnCode`,
  });

  const weight = useWatch({
    control,
    name: `items.${index}.weight`,
  });

  const costPrice = useWatch({
    control,
    name: `items.${index}.costprice_origin`,
  });

  // Auto-enhance when product info is complete
  useEffect(() => {
    if (productName && costPrice && !enhancementApplied) {
      const timeoutId = setTimeout(() => {
        autoEnhanceProduct();
      }, 1500); // Longer delay for auto-enhancement

      return () => clearTimeout(timeoutId);
    }
  }, [productName, costPrice, enhancementApplied]);

  const autoEnhanceProduct = async () => {
    if (!productName) return;

    setIsEnhancing(true);
    try {
      const currentItem = {
        name: productName,
        unit_price_usd: costPrice ? parseFloat(costPrice) : 0,
        quantity: 1,
        description: '',
        product_url: productUrl || undefined,
      };

      const enhanced = await smartQuoteEnhancementService.enhanceQuoteItem(
        currentItem,
        {
          country_code: countryCode,
          auto_apply_threshold: 0.8, // High confidence threshold for auto-apply
          include_weight_estimation: true,
          include_hsn_suggestions: true,
        }
      );

      // Apply high-confidence suggestions automatically
      if (enhanced.smart_suggestions) {
        const suggestions = enhanced.smart_suggestions;

        // Auto-apply HSN if high confidence and not manually set
        if (suggestions.hsn_suggestions && 
            suggestions.hsn_suggestions.length > 0 && 
            !hsnCode &&
            suggestions.hsn_suggestions[0].confidence_score >= 0.8) {
          const topSuggestion = suggestions.hsn_suggestions[0];
          setValue(`items.${index}.hsnCode`, topSuggestion.classification_code);
          setValue(`items.${index}.category`, topSuggestion.category);
          setSelectedHSN(topSuggestion);
          
          toast({
            title: 'HSN Code Auto-Applied',
            description: `${topSuggestion.classification_code} - ${topSuggestion.product_name}`,
          });
        }

        // Auto-apply weight if high confidence and not manually set
        if (suggestions.weight_estimation && 
            !weight &&
            suggestions.weight_estimation.confidence_score >= 0.8) {
          setValue(`items.${index}.weight`, suggestions.weight_estimation.estimated_weight_kg.toString());
          
          toast({
            title: 'Weight Auto-Applied',
            description: `${suggestions.weight_estimation.estimated_weight_kg} kg (AI estimated)`,
          });
        }
      }

      setEnhancementApplied(true);
      console.log('🚀 [Enhancement] Auto-enhancement completed for:', productName);
    } catch (error) {
      console.error('Auto-enhancement error:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleOpenUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleHSNSelected = (hsnCode: string, suggestion: ProductSuggestion) => {
    setSelectedHSN(suggestion);
    setValue(`items.${index}.category`, suggestion.category);
    
    // Also apply customs rate if available
    if (suggestion.customs_rate) {
      console.log(`📊 [HSN] Customs rate available: ${suggestion.customs_rate}%`);
    }
  };

  const hasSmartData = hsnCode || weight || selectedHSN;

  return (
    <div className="space-y-6">
      {/* Auto-Enhancement Indicator */}
      {isEnhancing && (
        <Alert className="border-blue-200 bg-blue-50">
          <Brain className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>AI is analyzing your product and applying smart suggestions...</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhancement Applied Success */}
      {enhancementApplied && hasSmartData && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <div className="flex items-center justify-between">
              <span>Smart suggestions applied! Review and adjust as needed.</span>
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Zap className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Product URL */}
      <FormField
        control={control}
        name={`items.${index}.productUrl`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-2">
              <Link className="h-4 w-4" />
              <span>Product Link</span>
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.amazon.com/product-link or any international store"
                    {...field}
                    className="flex-1"
                  />
                  {field.value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenUrl(field.value)}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the direct link to the product from any international store (US, China,
                  Japan, UK, etc.)
                </p>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product Name */}
      <FormField
        control={control}
        name={`items.${index}.productName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Product Name</span>
              <Badge variant="outline" className="text-xs">
                AI Enhanced
              </Badge>
              {enhancementApplied && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enhanced
                </Badge>
              )}
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setEnhancementApplied(false); // Reset enhancement when product name changes
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  A detailed product name helps AI provide better suggestions for HSN codes, weight, and customs rates
                </p>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product Options */}
      <FormField
        control={control}
        name={`items.${index}.options`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Specifications & Options</span>
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Textarea
                  placeholder="e.g., Color: Space Gray, Storage: 256GB, Size: Large, Quantity: 2, or any specific requirements"
                  {...field}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Include any specific requirements like size, color, quantity, or special features
                  you need
                </p>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Smart Fields Section */}
      {productName && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>Smart Product Intelligence</span>
              <Badge variant="outline" className="text-xs">
                AI Powered
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="hsn" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hsn">HSN Classification</TabsTrigger>
                <TabsTrigger value="weight">Weight Estimation</TabsTrigger>
                <TabsTrigger value="customs">Customs Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="hsn" className="space-y-4">
                <SmartHSNField
                  control={control}
                  index={index}
                  setValue={setValue}
                  countryCode={countryCode}
                  onHSNSelected={handleHSNSelected}
                />
              </TabsContent>
              
              <TabsContent value="weight" className="space-y-4">
                <EnhancedSmartWeightField
                  control={control}
                  index={index}
                  setValue={setValue}
                  hsnCode={hsnCode}
                  countryCode={countryCode}
                />
              </TabsContent>
              
              <TabsContent value="customs" className="space-y-4">
                <SmartCustomsPreview
                  control={control}
                  index={index}
                  countryCode={countryCode}
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Customs rates are estimates based on HSN classification. Actual rates may vary based on 
                    specific product details, trade agreements, and current regulations.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Intelligence Summary */}
      {hasSmartData && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">AI Intelligence Summary</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {hsnCode && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    HSN: {hsnCode}
                  </Badge>
                  {selectedHSN && (
                    <span className="text-xs text-green-600">
                      {Math.round(selectedHSN.confidence_score * 100)}% confidence
                    </span>
                  )}
                </div>
              )}
              {weight && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Weight: {weight} kg
                  </Badge>
                </div>
              )}
              {selectedHSN?.customs_rate && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Customs: {selectedHSN.customs_rate}%
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};