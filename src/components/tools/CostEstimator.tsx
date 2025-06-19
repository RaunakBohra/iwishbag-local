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
        <div className="backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/30 rounded-xl p-4">
          <Skeleton className="h-8 w-full bg-white/30 dark:bg-gray-700/30" />
        </div>
        <div className="backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/30 rounded-xl p-4">
          <Skeleton className="h-8 w-full bg-white/30 dark:bg-gray-700/30" />
        </div>
        <div className="backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/30 rounded-xl p-4">
          <Skeleton className="h-8 w-full bg-white/30 dark:bg-gray-700/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 order-1">
          <Label htmlFor="country" className="text-gray-700 dark:text-gray-300 font-medium">Destination Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="backdrop-blur-xl bg-white/30 dark:bg-gray-700/30 border border-white/40 dark:border-gray-600/40 hover:bg-white/40 dark:hover:bg-gray-700/40 transition-all duration-300">
              <SelectValue placeholder="Select destination country" className="text-gray-700 dark:text-gray-300" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-white/40 dark:border-gray-600/40">
              {countries?.map((country) => (
                <SelectItem key={country.code} value={country.code} className="text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20">
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 order-2">
          <Label htmlFor="itemPrice" className="text-gray-700 dark:text-gray-300 font-medium">Item Price (USD)</Label>
          <Input
            id="itemPrice"
            type="number"
            placeholder="Enter item price in USD"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            className="backdrop-blur-xl bg-white/30 dark:bg-gray-700/30 border border-white/40 dark:border-gray-600/40 hover:bg-white/40 dark:hover:bg-gray-700/40 focus:bg-white/50 dark:focus:bg-gray-700/50 transition-all duration-300 text-gray-700 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-2 order-3">
          <Label htmlFor="itemWeight" className="text-gray-700 dark:text-gray-300 font-medium">Item Weight</Label>
          <Input
            id="itemWeight"
            type="number"
            placeholder="Enter weight"
            value={itemWeight}
            onChange={(e) => setItemWeight(e.target.value)}
            className="backdrop-blur-xl bg-white/30 dark:bg-gray-700/30 border border-white/40 dark:border-gray-600/40 hover:bg-white/40 dark:hover:bg-gray-700/40 focus:bg-white/50 dark:focus:bg-gray-700/50 transition-all duration-300 text-gray-700 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-2 order-4">
          <Label htmlFor="category" className="text-gray-700 dark:text-gray-300 font-medium">Product Category</Label>
          <Select value={customsCategory} onValueChange={setCustomsCategory}>
            <SelectTrigger className="backdrop-blur-xl bg-white/30 dark:bg-gray-700/30 border border-white/40 dark:border-gray-600/40 hover:bg-white/40 dark:hover:bg-gray-700/40 transition-all duration-300">
              <SelectValue placeholder="Select product category" className="text-gray-700 dark:text-gray-300" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-white/40 dark:border-gray-600/40">
              {customsCategories?.map((category) => (
                <SelectItem key={category.name} value={category.name} className="text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20">
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
        className="w-full backdrop-blur-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 dark:from-primary/80 dark:to-primary/60 dark:hover:from-primary/90 dark:hover:to-primary/70 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/20 dark:border-primary/30"
      >
        {isCalculating ? "Calculating..." : "Calculate Estimate"}
      </Button>

      {estimate && (
        <Card className="backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/30 shadow-2xl">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-primary/80 dark:to-primary/40">
              Total Estimated Cost for {estimate.country}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Total Estimated Cost</span>
              <div className="font-bold text-3xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent dark:from-primary/80 dark:to-primary/40 mb-2">{formatAmount(estimate.finalTotal)}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
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
