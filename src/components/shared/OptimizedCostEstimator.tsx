import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseCountries } from "@/hooks/usePurchaseCountries";
import { useCountryWithCurrency } from "@/hooks/useCountryWithCurrency";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { quoteCalculatorService } from "@/services/QuoteCalculatorService";
import { useToast } from "@/components/ui/use-toast";
import { Calculator, Package, Globe, DollarSign } from "lucide-react";

interface CostEstimate {
  itemTotal: number;
  shippingCost: number;
  customsDuty: number;
  serviceFee: number;
  total: number;
  breakdown?: {
    vat: number;
    [key: string]: unknown;
  };
  currency: string;
}

interface OptimizedCostEstimatorProps {
  variant?: 'landing' | 'tools';
  className?: string;
}

export const OptimizedCostEstimator: React.FC<OptimizedCostEstimatorProps> = ({ 
  variant = 'tools',
  className = ""
}) => {
  const [formData, setFormData] = useState({
    purchaseCountry: "",
    destinationCountry: "",
    itemPrice: "",
    itemWeight: "",
    customsCategory: "",
  });
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");

  const { formatAmount } = useUserCurrency();
  const { toast } = useToast();

  // Memoized query for country settings - single query instead of multiple
  const { data: countryData, isLoading: countriesLoading } = useQuery({
    queryKey: ['cost-estimator-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_settings")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // Cache for 5 minutes
    cacheTime: 600000, // Keep in cache for 10 minutes
  });

  // Memoized filtered countries
  const countries = useMemo(() => {
    if (!countryData) return { purchase: [], shipping: [] };
    return {
      purchase: countryData.filter(c => c.purchase_allowed),
      shipping: countryData.filter(c => c.shipping_allowed)
    };
  }, [countryData]);

  // Memoized query for customs categories
  const { data: customsCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["customs-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customs_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // Cache for 5 minutes
    cacheTime: 600000, // Keep in cache for 10 minutes
  });

  // Memoized form validation
  const isFormValid = useMemo(() => {
    const { purchaseCountry, destinationCountry, itemPrice, itemWeight } = formData;
    return (
      purchaseCountry &&
      destinationCountry &&
      itemPrice &&
      parseFloat(itemPrice) > 0 &&
      itemWeight &&
      parseFloat(itemWeight) > 0
    );
  }, [formData]);

  // Optimized form update handler
  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error on input change
  }, []);

  // Memoized calculate handler
  const handleCalculate = useCallback(async () => {
    if (!isFormValid) {
      setError("Please fill in all required fields");
      return;
    }

    if (!countryData || countryData.length === 0) {
      setError("Country data is still loading. Please try again.");
      return;
    }

    setIsCalculating(true);
    setError("");

    try {
      const { purchaseCountry, destinationCountry, itemPrice, itemWeight, customsCategory } = formData;
      
      // Get country settings for the purchase country
      const countrySettings = countryData?.find(c => c.code === purchaseCountry);
      if (!countrySettings) {
        throw new Error(`Country settings not found for ${purchaseCountry}`);
      }

      // Create calculation parameters following the expected format
      const calculationParams = {
        items: [{
          id: '1',
          item_price: parseFloat(itemPrice) || 0,
          item_weight: parseFloat(itemWeight) || 0,
          quantity: 1,
          product_name: 'Product'
        }],
        originCountry: purchaseCountry,
        destinationCountry: destinationCountry,
        currency: countrySettings.currency || 'USD',
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        discount: 0,
        insurance_amount: 0,
        customs_percentage: customsCategory ? 
          (customsCategories?.find(c => c.id === customsCategory)?.duty_percent || 0) : 0,
        countrySettings: countrySettings
      };

      const result = await quoteCalculatorService.calculateQuote(calculationParams);
      
      if (!result.success || !result.breakdown) {
        throw new Error(result.error?.message || 'Calculation failed');
      }

      // Transform the result to match the expected format for display
      const estimateData = {
        itemTotal: result.breakdown.total_item_price,
        shippingCost: result.breakdown.international_shipping,
        customsDuty: result.breakdown.customs_and_ecs,
        serviceFee: result.breakdown.payment_gateway_fee,
        total: result.breakdown.final_total,
        breakdown: result.breakdown,
        currency: countrySettings.currency || 'USD'
      };

      setEstimate(estimateData);
      
      // Track estimation (analytics)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'cost_estimation', {
          purchase_country: purchaseCountry,
          destination_country: destinationCountry,
          item_price: itemPrice,
          item_weight: itemWeight,
          category: customsCategory
        });
      }
    } catch (error) {
      console.error("Error calculating estimate:", error);
      setError(error instanceof Error ? error.message : "Failed to calculate estimate");
      toast({
        title: "Calculation Error",
        description: error instanceof Error ? error.message : "Failed to calculate estimate",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [formData, isFormValid, toast, countryData, customsCategories]);

  // Reset form
  const handleReset = useCallback(() => {
    setFormData({
      purchaseCountry: "",
      destinationCountry: "",
      itemPrice: "",
      itemWeight: "",
      customsCategory: "",
    });
    setEstimate(null);
    setError("");
  }, []);

  const isLoading = countriesLoading || categoriesLoading;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {variant === 'landing' ? 'Quick Cost Estimator' : 'Shipping Cost Calculator'}
        </CardTitle>
        <CardDescription>
          Get an instant estimate of shipping costs and fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Purchase Country */}
        <div className="space-y-2">
          <Label htmlFor="purchase-country" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Purchase Country
          </Label>
          <Select
            value={formData.purchaseCountry}
            onValueChange={(value) => updateFormData('purchaseCountry', value)}
          >
            <SelectTrigger id="purchase-country">
              <SelectValue placeholder="Select where you're buying from" />
            </SelectTrigger>
            <SelectContent>
              {countries.purchase.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination Country */}
        <div className="space-y-2">
          <Label htmlFor="destination-country" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Destination Country
          </Label>
          <Select
            value={formData.destinationCountry}
            onValueChange={(value) => updateFormData('destinationCountry', value)}
          >
            <SelectTrigger id="destination-country">
              <SelectValue placeholder="Select delivery destination" />
            </SelectTrigger>
            <SelectContent>
              {countries.shipping.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item Price */}
        <div className="space-y-2">
          <Label htmlFor="item-price" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Item Price (USD)
          </Label>
          <Input
            id="item-price"
            type="number"
            placeholder="0.00"
            value={formData.itemPrice}
            onChange={(e) => updateFormData('itemPrice', e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        {/* Item Weight */}
        <div className="space-y-2">
          <Label htmlFor="item-weight" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Item Weight (kg)
          </Label>
          <Input
            id="item-weight"
            type="number"
            placeholder="0.0"
            value={formData.itemWeight}
            onChange={(e) => updateFormData('itemWeight', e.target.value)}
            min="0"
            step="0.1"
          />
        </div>

        {/* Customs Category (Optional) */}
        {customsCategories && customsCategories.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="customs-category">
              Customs Category (Optional)
            </Label>
            <Select
              value={formData.customsCategory}
              onValueChange={(value) => updateFormData('customsCategory', value)}
            >
              <SelectTrigger id="customs-category">
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {customsCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCalculate}
            disabled={!isFormValid || isCalculating}
            className="flex-1"
          >
            {isCalculating ? "Calculating..." : "Calculate Estimate"}
          </Button>
          {estimate && (
            <Button
              onClick={handleReset}
              variant="outline"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Results */}
        {estimate && !error && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-3">Estimated Costs</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Item Cost:</span>
                <span className="font-medium">{estimate.currency} {estimate.itemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-medium">{estimate.currency} {estimate.shippingCost.toFixed(2)}</span>
              </div>
              {estimate.customsDuty > 0 && (
                <div className="flex justify-between">
                  <span>Customs & Duties:</span>
                  <span className="font-medium">{estimate.currency} {estimate.customsDuty.toFixed(2)}</span>
                </div>
              )}
              {estimate.serviceFee > 0 && (
                <div className="flex justify-between">
                  <span>Payment Gateway Fee:</span>
                  <span className="font-medium">{estimate.currency} {estimate.serviceFee.toFixed(2)}</span>
                </div>
              )}
              {estimate.breakdown && estimate.breakdown.vat > 0 && (
                <div className="flex justify-between">
                  <span>VAT:</span>
                  <span className="font-medium">{estimate.currency} {estimate.breakdown.vat.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Estimate:</span>
                  <span className="text-green-600">{estimate.currency} {estimate.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * This is an estimate. Final costs may vary based on actual product details and shipping options.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};