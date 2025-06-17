import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateShippingQuotes, CountrySettings } from "@/lib/quote-calculator";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurrency } from "@/hooks/useUserCurrency";

const CostEstimator = () => {
  const [itemPrice, setItemPrice] = useState<string>("");
  const [itemWeight, setItemWeight] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [customsCategory, setCustomsCategory] = useState<string>("");
  const [estimate, setEstimate] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { formatAmount } = useUserCurrency();

  const { data: countries, isLoading: countriesLoading } = useQuery({
    queryKey: ["shipping-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_settings")
        .select("*")
        .eq("shipping_allowed", true)
        .eq("purchase_allowed", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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
  });

  const handleCalculate = () => {
    if (!itemPrice || !itemWeight || !country || !customsCategory || !countries) {
      return;
    }

    setIsCalculating(true);

    const selectedCountry = countries.find(c => c.code === country);
    const selectedCategory = customsCategories?.find(c => c.name === customsCategory);
    
    if (!selectedCountry || !selectedCategory) {
      setIsCalculating(false);
      return;
    }

    // Convert country settings to USD if they're not already
    const exchangeRate = selectedCountry.rate_from_usd || 1;
    const countrySettingsInUSD: CountrySettings = {
      ...selectedCountry,
      min_shipping: (selectedCountry.min_shipping || 0) / exchangeRate,
      additional_weight: (selectedCountry.additional_weight || 0) / exchangeRate,
      payment_gateway_fixed_fee: (selectedCountry.payment_gateway_fixed_fee || 0) / exchangeRate,
      weight_unit: selectedCountry.weight_unit as "lbs" | "kg"
    };

    try {
      const result = calculateShippingQuotes(
        parseFloat(itemWeight),
        parseFloat(itemPrice),
        0, // sales tax
        0, // merchant shipping
        selectedCategory.duty_percent || 0,
        0, // domestic shipping
        0, // handling charge
        0, // discount
        0, // insurance
        countrySettingsInUSD
      );

      setEstimate({
        ...result,
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        customsCategory: selectedCategory.name,
        originalCurrency: 'USD' // All calculations are in USD
      });
    } catch (error) {
      console.error("Error calculating estimate:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  if (countriesLoading || categoriesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 order-1">
          <Label htmlFor="country">Destination Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination country" />
            </SelectTrigger>
            <SelectContent>
              {countries?.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 order-2">
          <Label htmlFor="itemPrice">Item Price (USD)</Label>
          <Input
            id="itemPrice"
            type="number"
            placeholder="Enter item price in USD"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2 order-3">
          <Label htmlFor="itemWeight">Item Weight</Label>
          <Input
            id="itemWeight"
            type="number"
            placeholder="Enter weight"
            value={itemWeight}
            onChange={(e) => setItemWeight(e.target.value)}
          />
        </div>
        <div className="space-y-2 order-4">
          <Label htmlFor="category">Product Category</Label>
          <Select value={customsCategory} onValueChange={setCustomsCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select product category" />
            </SelectTrigger>
            <SelectContent>
              {customsCategories?.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleCalculate}
        disabled={!itemPrice || !itemWeight || !country || !customsCategory || isCalculating}
        className="w-full"
      >
        {isCalculating ? "Calculating..." : "Calculate Estimate"}
      </Button>

      {estimate && (
        <Card>
          <CardHeader>
            <CardTitle>Total Estimated Cost for {estimate.country}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-lg font-semibold mb-2">Total Estimated Cost</span>
              <div className="font-bold text-3xl text-primary mb-2">{formatAmount(estimate.finalTotal)}</div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                All amounts are displayed in your preferred currency
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CostEstimator;
