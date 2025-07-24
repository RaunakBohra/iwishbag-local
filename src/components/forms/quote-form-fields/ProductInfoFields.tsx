import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ExternalLink, Link, Package, Settings, FileText, Sparkles, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import HSNAutoComplete from '@/components/admin/hsn-components/HSNAutoComplete';
import CustomsCalculationPreview from '@/components/admin/hsn-components/CustomsCalculationPreview';

// Define the shape of a product item in the form
interface ProductFormItem {
  productUrl: string;
  productName: string;
  options: string;
  category?: string;
  hsn_code?: string;
  price_usd?: number;
  quantity?: number;
}

// Define the form data structure
interface ProductFormData extends FieldValues {
  items: ProductFormItem[];
}

interface ProductInfoFieldsProps {
  control: Control<ProductFormData>;
  index: number;
  setValue: UseFormSetValue<ProductFormData>;
  originCountry?: string;
}

// Legacy HSN Category definitions for fallback smart suggestions
const HSN_CATEGORIES = [
  { value: 'electronics', label: 'Electronics & Technology', hsnCodes: ['8517', '8471', '8518', '8443'], keywords: ['phone', 'mobile', 'laptop', 'computer', 'headphone', 'speaker', 'camera', 'tablet', 'electronic'] },
  { value: 'clothing', label: 'Clothing & Textiles', hsnCodes: ['6204', '6109', '6203', '6211'], keywords: ['shirt', 't-shirt', 'dress', 'kurta', 'jeans', 'jacket', 'clothing', 'apparel', 'fashion'] },
  { value: 'books', label: 'Books & Educational Materials', hsnCodes: ['4901'], keywords: ['book', 'textbook', 'manual', 'guide', 'educational', 'learning', 'study'] },
  { value: 'toys', label: 'Toys & Games', hsnCodes: ['9503'], keywords: ['toy', 'game', 'puzzle', 'doll', 'action', 'figure', 'lego', 'board game'] },
  { value: 'cosmetics', label: 'Cosmetics & Personal Care', hsnCodes: ['3304', '3401'], keywords: ['makeup', 'cream', 'lotion', 'shampoo', 'soap', 'skincare', 'beauty'] },
  { value: 'jewelry', label: 'Jewelry & Accessories', hsnCodes: ['7113', '7117'], keywords: ['ring', 'necklace', 'bracelet', 'earring', 'watch', 'jewelry', 'accessory'] },
  { value: 'sports', label: 'Sports & Fitness', hsnCodes: ['9506'], keywords: ['fitness', 'gym', 'sport', 'exercise', 'yoga', 'running', 'workout'] },
  { value: 'home', label: 'Home & Kitchen', hsnCodes: ['7323', '3924'], keywords: ['kitchen', 'home', 'furniture', 'decor', 'utensil', 'cookware'] },
  { value: 'automotive', label: 'Automotive & Parts', hsnCodes: ['8708', '8714'], keywords: ['car', 'auto', 'vehicle', 'bike', 'motorcycle', 'spare', 'part'] },
  { value: 'health', label: 'Health & Medical', hsnCodes: ['3004', '9018'], keywords: ['medicine', 'supplement', 'medical', 'health', 'vitamin', 'drug'] },
];

export const ProductInfoFields = ({ control, index, setValue, originCountry = 'US' }: ProductInfoFieldsProps) => {
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestedHSN, setSuggestedHSN] = useState<string | null>(null);
  const [selectedHSNData, setSelectedHSNData] = useState<any>(null);

  // Watch the product URL and product name fields
  const productUrl = useWatch({
    control,
    name: `items.${index}.productUrl`,
  });
  
  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const selectedCategory = useWatch({
    control,
    name: `items.${index}.category`,
  });

  const currentHsnCode = useWatch({
    control,
    name: `items.${index}.hsn_code`,
  });

  const priceUsd = useWatch({
    control,
    name: `items.${index}.price_usd`,
  });

  const quantity = useWatch({
    control,
    name: `items.${index}.quantity`,
  });

  // Smart category suggestion based on product name
  useEffect(() => {
    if (productName && productName.length > 3) {
      const productNameLower = productName.toLowerCase();
      
      // Find best matching category based on keywords
      let bestMatch = null;
      let bestScore = 0;
      
      for (const category of HSN_CATEGORIES) {
        const matchCount = category.keywords.filter(keyword => 
          productNameLower.includes(keyword.toLowerCase())
        ).length;
        
        if (matchCount > bestScore) {
          bestScore = matchCount;
          bestMatch = category;
        }
      }
      
      if (bestMatch && bestScore > 0) {
        setSuggestedCategory(bestMatch.value);
        setSuggestedHSN(bestMatch.hsnCodes[0]); // Primary HSN code
      } else {
        setSuggestedCategory(null);
        setSuggestedHSN(null);
      }
    }
  }, [productName]);

  // Auto-suggest HSN code when category is selected (legacy fallback)
  useEffect(() => {
    if (selectedCategory && !currentHsnCode) {
      const category = HSN_CATEGORIES.find(cat => cat.value === selectedCategory);
      if (category) {
        setValue(`items.${index}.hsn_code`, category.hsnCodes[0]);
        setSuggestedHSN(category.hsnCodes[0]);
      }
    }
  }, [selectedCategory, setValue, index, currentHsnCode]);

  const handleOpenUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestedCategory) {
      setValue(`items.${index}.category`, suggestedCategory);
    }
  };

  // HSN management handlers
  const handleHSNSelect = (hsnData: any) => {
    setSelectedHSNData(hsnData);
    setValue(`items.${index}.hsn_code`, hsnData.hsn_code);
    setValue(`items.${index}.category`, hsnData.category);
  };

  const handleHSNClear = () => {
    setSelectedHSNData(null);
    setValue(`items.${index}.hsn_code`, '');
  };

  return (
    <div className="space-y-6">
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
                Auto-filled
              </Badge>
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input
                  placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5"
                  {...field}
                />
                <p className="text-xs text-muted-foreground">
                  A brief description helps us understand what you're looking for
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
                Auto-filled
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

      {/* Smart Category Suggestion Alert */}
      {suggestedCategory && !selectedCategory && (
        <Alert className="border-blue-200 bg-blue-50">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="text-blue-800">
                Smart suggestion: This looks like <strong>{HSN_CATEGORIES.find(cat => cat.value === suggestedCategory)?.label}</strong>
              </span>
              {suggestedHSN && (
                <div className="text-xs text-blue-600 mt-1">
                  HSN Code: {suggestedHSN} • Helps calculate accurate customs
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAcceptSuggestion}
              className="ml-2 h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Accept
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced HSN Classification Interface */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-900">HSN Classification</span>
          <Badge variant="outline" className="text-xs">
            Smart Search
          </Badge>
        </div>
        
        <HSNAutoComplete
          value={currentHsnCode || ''}
          productName={productName}
          originCountry={originCountry}
          onHSNSelect={handleHSNSelect}
          onClear={handleHSNClear}
          placeholder="Search HSN codes for this product..."
        />
        
        {currentHsnCode && priceUsd && Number(priceUsd) > 0 && (
          <CustomsCalculationPreview
            productPrice={Number(priceUsd)}
            quantity={quantity || 1}
            hsnCode={currentHsnCode}
            category={selectedHSNData?.category || selectedCategory || ''}
            minimumValuationUSD={selectedHSNData?.minimum_valuation_usd}
            originCountry={originCountry}
            destinationCountry="IN" // Default to India, can be made dynamic
          />
        )}
        
        <p className="text-xs text-muted-foreground">
          HSN classification helps calculate accurate customs duties and taxes for international purchases.
        </p>
      </div>
    </div>
  );
};
