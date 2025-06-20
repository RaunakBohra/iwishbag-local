import { Control, useWatch } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link, Package, Settings, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { productAnalyzer, ProductAnalysis } from "@/lib/productAnalyzer";
import { useToast } from "@/hooks/use-toast";

interface ProductInfoFieldsProps {
  control: Control<any>;
  index: number;
  setValue: (name: string, value: any) => void;
}

export const ProductInfoFields = ({ control, index, setValue }: ProductInfoFieldsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProductAnalysis | null>(null);
  const { toast } = useToast();
  
  // Watch the product URL field
  const productUrl = useWatch({
    control,
    name: `items.${index}.productUrl`
  });

  const handleOpenUrl = (url: string) => {
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAnalyzeProduct = async () => {
    if (!productUrl || !productUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a product URL first.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const analysis = await productAnalyzer.analyzeProduct(productUrl);
      setAnalysisResult(analysis);
      
      // Auto-fill the form with analyzed data
      setValue(`items.${index}.productName`, analysis.name);
      
      // Set product image if available
      if (analysis.imageUrl) {
        setValue(`items.${index}.imageUrl`, analysis.imageUrl);
      }
      
      // Add brand and other details to options if available
      let options = '';
      if (analysis.brand) {
        options += `Brand: ${analysis.brand}\n`;
      }
      if (analysis.description) {
        options += `Description: ${analysis.description.substring(0, 200)}...\n`;
      }
      if (analysis.averageRating) {
        options += `Rating: ${analysis.averageRating} stars (${analysis.totalReviews} reviews)\n`;
      }
      if (analysis.featureBullets && analysis.featureBullets.length > 0) {
        options += `Features: ${analysis.featureBullets.slice(0, 3).join(', ')}\n`;
      }
      
      // eBay-specific details
      if (analysis.condition) {
        options += `Condition: ${analysis.condition}\n`;
      }
      if (analysis.seller) {
        options += `Seller: ${analysis.seller}\n`;
      }
      if (analysis.location) {
        options += `Location: ${analysis.location}\n`;
      }
      if (analysis.shippingCost !== undefined) {
        const shippingText = analysis.shippingCost > 0 ? 
          `Shipping: ${analysis.shippingCurrency === 'INR' ? '₹' : analysis.shippingCurrency === 'GBP' ? '£' : analysis.shippingCurrency === 'EUR' ? '€' : '$'}${analysis.shippingCost.toFixed(2)}` : 
          'Shipping: Free';
        options += `${shippingText}\n`;
      }
      if (analysis.availableQuantity) {
        options += `Available: ${analysis.availableQuantity}\n`;
      }
      if (analysis.soldItems) {
        options += `Sold: ${analysis.soldItems}\n`;
      }
      if (analysis.returnPolicy) {
        options += `Return Policy: ${analysis.returnPolicy}\n`;
      }
      
      if (options) {
        setValue(`items.${index}.options`, options.trim());
      }

      toast({
        title: "Product Analyzed!",
        description: `Successfully analyzed: ${analysis.name}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
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
              <Badge variant="secondary" className="text-xs">Required</Badge>
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeProduct}
                    disabled={isAnalyzing || !field.value}
                    className="text-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Smart Analysis
                      </>
                    )}
                  </Button>
                  {analysisResult && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Analyzed</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the direct link to the product from any international store (US, China, Japan, UK, etc.)
                </p>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium text-green-800">
                Product Analysis Complete
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div><strong>Name:</strong> {analysisResult.name}</div>
                {analysisResult.brand && (
                  <div><strong>Brand:</strong> {analysisResult.brand}</div>
                )}
                {analysisResult.price > 0 && (
                  <div><strong>Price:</strong> {analysisResult.currency === 'INR' ? '₹' : analysisResult.currency === 'GBP' ? '£' : analysisResult.currency === 'EUR' ? '€' : '$'}{analysisResult.price.toFixed(2)}</div>
                )}
                {analysisResult.averageRating && (
                  <div><strong>Rating:</strong> {analysisResult.averageRating} stars ({analysisResult.totalReviews} reviews)</div>
                )}
                {analysisResult.platform && (
                  <div><strong>Platform:</strong> {analysisResult.platform}</div>
                )}
                {/* eBay-specific information */}
                {analysisResult.condition && (
                  <div><strong>Condition:</strong> {analysisResult.condition}</div>
                )}
                {analysisResult.seller && (
                  <div><strong>Seller:</strong> {analysisResult.seller}</div>
                )}
                {analysisResult.location && (
                  <div><strong>Location:</strong> {analysisResult.location}</div>
                )}
                {analysisResult.shippingCost !== undefined && (
                  <div><strong>Shipping:</strong> {analysisResult.shippingCost > 0 ? `${analysisResult.shippingCurrency === 'INR' ? '₹' : analysisResult.shippingCurrency === 'GBP' ? '£' : analysisResult.shippingCurrency === 'EUR' ? '€' : '$'}${analysisResult.shippingCost.toFixed(2)}` : 'Free'}</div>
                )}
                {analysisResult.availableQuantity && (
                  <div><strong>Available:</strong> {analysisResult.availableQuantity}</div>
                )}
                {analysisResult.soldItems && (
                  <div><strong>Sold:</strong> {analysisResult.soldItems}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Name */}
      <FormField
        control={control}
        name={`items.${index}.productName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Product Name</span>
              <Badge variant="outline" className="text-xs">Auto-filled</Badge>
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Input 
                  placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5" 
                  {...field} 
                />
                <p className="text-xs text-muted-foreground">
                  {analysisResult ? "Auto-filled from product analysis" : "A brief description helps us understand what you're looking for"}
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
              <Badge variant="outline" className="text-xs">Auto-filled</Badge>
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Textarea 
                  placeholder="e.g., Color: Space Gray, Storage: 256GB, Size: Large, Quantity: 2, or any specific requirements" 
                  {...field} 
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {analysisResult ? "Auto-filled with product details from analysis" : "Include any specific requirements like size, color, quantity, or special features you need"}
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
