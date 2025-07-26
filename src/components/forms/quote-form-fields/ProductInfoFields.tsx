import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ExternalLink, Link, Package, Settings, FileText, Sparkles, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

// Define the shape of a product item in the form
interface ProductFormItem {
  productUrl: string;
  productName: string;
  options: string;
  costprice_origin?: number;
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
}

export const ProductInfoFields = ({ control, index, setValue }: ProductInfoFieldsProps) => {
  // Watch the product URL and product name fields
  const productUrl = useWatch({
    control,
    name: `items.${index}.productUrl`,
  });

  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const handleOpenUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
    </div>
  );
};
