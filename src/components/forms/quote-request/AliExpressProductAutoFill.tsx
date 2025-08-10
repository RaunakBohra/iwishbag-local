import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, CheckCircle, AlertCircle, Wand2 } from 'lucide-react';
import { UseFormSetValue } from 'react-hook-form';
import { enhancedAliExpressIntegration } from '@/services/enhanced-aliexpress-integration';
import { useToast } from '@/hooks/use-toast';

interface AliExpressProductAutoFillProps {
  productUrl: string;
  setValue: UseFormSetValue<any>;
  onDataFetched?: (data: any) => void;
  disabled?: boolean;
}

export const AliExpressProductAutoFill: React.FC<AliExpressProductAutoFillProps> = ({
  productUrl,
  setValue,
  onDataFetched,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string>('');
  const [fetchResult, setFetchResult] = useState<{
    success: boolean;
    message: string;
    source?: string;
  } | null>(null);

  const isAliExpressUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase().includes('aliexpress.');
    } catch {
      return false;
    }
  };

  const handleAutoFill = async () => {
    if (!productUrl || !isAliExpressUrl(productUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid AliExpress product URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFetchResult(null);

    try {
      const result = await enhancedAliExpressIntegration.fetchProductData(productUrl);
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Auto-fill form fields
        if (data.title) {
          setValue('product_name', data.title);
        }
        
        if (data.price) {
          setValue('estimated_price', data.price);
        }
        
        if (data.weight) {
          setValue('estimated_weight', data.weight);
        }
        
        if (data.category) {
          setValue('product_category', data.category);
        }
        
        if (data.brand) {
          setValue('brand', data.brand);
        }
        
        // Set origin country for AliExpress (usually China or US)
        const originCountry = productUrl.includes('aliexpress.us') ? 'US' : 'CN';
        setValue('origin_country', originCountry);
        
        // Combine description and specifications for product notes
        let productNotes = '';
        if (data.description) {
          productNotes += `Description: ${data.description}\n\n`;
        }
        
        // Add variants information if available
        if (data.variants && data.variants.length > 0) {
          productNotes += 'Available Variants:\n';
          data.variants.forEach((variant, i) => {
            productNotes += `${variant.name}: ${variant.options.join(', ')}\n`;
          });
        }

        // Add AliExpress-specific information if available
        if (data.aliexpress_specific) {
          const specific = data.aliexpress_specific;
          if (specific.store_name) {
            productNotes += `\nStore: ${specific.store_name}`;
          }
          if (specific.sold_count > 0) {
            productNotes += `\nSold: ${specific.sold_count} items`;
          }
          if (specific.review_count > 0) {
            productNotes += `\nReviews: ${specific.review_count}`;
          }
          if (specific.shipping_info) {
            productNotes += `\nShipping: ${specific.shipping_info}`;
          }
        }
        
        if (productNotes) {
          setValue('product_notes', productNotes.trim());
        }
        
        // Store images for potential future use
        if (data.images && data.images.length > 0) {
          // Could be used for image preview or additional product validation
          setValue('product_images', data.images);
        }

        setLastFetchedUrl(productUrl);
        setFetchResult({
          success: true,
          message: `Product data fetched successfully from ${result.source}!`,
          source: result.source
        });

        toast({
          title: "Auto-fill Successful! ✨",
          description: `Product information has been automatically filled from ${result.source === 'scraper' ? 'AliExpress' : result.source}.`,
        });

        // Call the callback with the fetched data
        if (onDataFetched) {
          onDataFetched({
            ...data,
            originalUrl: productUrl,
            fetchSource: result.source,
            fetchTimestamp: new Date().toISOString()
          });
        }

      } else {
        setFetchResult({
          success: false,
          message: result.error || 'Failed to fetch product data'
        });

        toast({
          title: "Auto-fill Failed",
          description: "Could not fetch product data. Please fill in the information manually.",
          variant: "destructive",
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setFetchResult({
        success: false,
        message: errorMessage
      });

      toast({
        title: "Auto-fill Error",
        description: "An error occurred while fetching product data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the button if URL is not AliExpress
  if (!isAliExpressUrl(productUrl)) {
    return null;
  }

  const hasBeenFetched = lastFetchedUrl === productUrl && fetchResult?.success;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
            <Sparkles className="h-3 w-3 mr-1" />
            AliExpress Detected
          </Badge>
        </div>
        
        <Button
          type="button"
          variant={hasBeenFetched ? "outline" : "default"}
          size="sm"
          onClick={handleAutoFill}
          disabled={isLoading || disabled}
          className={hasBeenFetched ? "border-green-200 text-green-700" : "bg-orange-600 hover:bg-orange-700"}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </>
          ) : hasBeenFetched ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Re-fetch Data
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Auto-fill Product Info
            </>
          )}
        </Button>
      </div>

      {fetchResult && (
        <Alert className={fetchResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {fetchResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={fetchResult.success ? "text-green-800" : "text-red-800"}>
            {fetchResult.message}
            {fetchResult.success && fetchResult.source && (
              <div className="mt-1 text-sm text-green-600">
                Source: {fetchResult.source === 'scraper' ? 'Live AliExpress Data' : fetchResult.source}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};