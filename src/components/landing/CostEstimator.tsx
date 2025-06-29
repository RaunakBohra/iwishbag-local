import { useState } from "react";
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
import { CountrySettings, calculateShippingQuotes } from "@/lib/quote-calculator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseCountries } from "@/hooks/usePurchaseCountries";
import { useCountryWithCurrency } from "@/hooks/useCountryWithCurrency";
import { useUserCurrency } from "@/hooks/useUserCurrency";

const CostEstimator = () => {
  const [destinationCountry, setDestinationCountry] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemWeight, setItemWeight] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: rawCountries, isLoading: isLoadingCountries } = usePurchaseCountries();
  const countries = useCountryWithCurrency(rawCountries);
  const { formatAmount } = useUserCurrency();

  const { data: allCountrySettings } = useQuery({
    queryKey: ['country_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('country_settings').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['customs-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customs_categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedCountryData = allCountrySettings?.find(c => c.code === destinationCountry);

  const handleCountryChange = (value: string) => {
    setDestinationCountry(value);
    setItemPrice("");
    setItemWeight("");
    setSelectedCategory("");
    setEstimatedCost(null);
    setError("");
  };

  const restrictTo2Decimals = (value: string) => {
    let sanitized = value.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]?.length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
    return sanitized;
  };

  const handleCalculate = () => {
    setError("");
    setEstimatedCost(null);
    
    if (!destinationCountry) {
      setError("Please select a destination country.");
      return;
    }
    
    const price = parseFloat(itemPrice);
    const weight = parseFloat(itemWeight);

    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid item price.");
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      setError("Please enter a valid item weight.");
      return;
    }
    if (!selectedCategory) {
      setError("Please select a product category.");
      return;
    }

    const settings = selectedCountryData;
    const category = categories?.find(c => c.name === selectedCategory);
    
    if (!settings || !category) {
      setError("Calculation settings are not available.");
      return;
    }
    
    const quote = calculateShippingQuotes(
      weight,
      price,
      0,
      0,
      category.duty_percent,
      0,
      0,
      0,
      0,
      settings as CountrySettings
    );

    setEstimatedCost(quote.finalTotal);
  };

  return (
    <section id="cost-estimator" className="py-10 md:py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="container px-2 md:px-0">
        <Card className="max-w-2xl mx-auto backdrop-blur-xl bg-white/20 border border-white/30 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Cost Estimator
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-700">
              Get a quick estimate of your total cost, including shipping and fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination-country" className="text-gray-700 font-medium">Country to Purchase From</Label>
                <Select onValueChange={handleCountryChange} value={destinationCountry} disabled={isLoadingCountries}>
                  <SelectTrigger id="destination-country" className="backdrop-blur-xl bg-white/30 border border-white/40 hover:bg-white/40 transition-all duration-300">
                    <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select a country first"} className="text-gray-700" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/90 border border-white/40">
                    {countries?.map((country) => (
                      <SelectItem key={country.code} value={country.code} className="text-gray-700 hover:bg-primary/10">
                        {country.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  Only countries where purchases are allowed are shown
                </p>
              </div>

              {selectedCountryData && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="item-price" className="text-gray-700 font-medium">
                      Item Price ({selectedCountryData.currency.toUpperCase()})
                    </Label>
                    <Input
                      id="item-price"
                      type="number"
                      className="text-sm md:text-base backdrop-blur-xl bg-white/30 border border-white/40 hover:bg-white/40 focus:bg-white/50 transition-all duration-300 text-gray-700 placeholder:text-gray-500"
                      placeholder={`e.g., 500 ${selectedCountryData.currency.toUpperCase()}`}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="item-weight" className="text-gray-700 font-medium">
                      Item Weight ({selectedCountryData.weight_unit})
                    </Label>
                    <Input
                      id="item-weight"
                      type="text"
                      className="text-sm md:text-base backdrop-blur-xl bg-white/30 border border-white/40 hover:bg-white/40 focus:bg-white/50 transition-all duration-300 text-gray-700 placeholder:text-gray-500"
                      placeholder={`e.g., 2.5 ${selectedCountryData.weight_unit}`}
                      value={itemWeight}
                      onChange={(e) => setItemWeight(restrictTo2Decimals(e.target.value))}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const numValue = parseFloat(restrictTo2Decimals(e.target.value));
                          if (!isNaN(numValue)) setItemWeight(numValue.toFixed(2));
                        }
                      }}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Product Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="backdrop-blur-xl bg-white/30 border border-white/40 hover:bg-white/40 transition-all duration-300">
                        <SelectValue placeholder="Select product category" className="text-gray-700" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-white/90 border border-white/40">
                        {categories?.map((category) => (
                          <SelectItem key={category.name} value={category.name} className="text-sm md:text-base text-gray-700 hover:bg-primary/10">
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Button 
              onClick={handleCalculate} 
              className="w-full py-3 md:py-4 text-base md:text-lg backdrop-blur-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/20"
              disabled={!destinationCountry || !itemPrice || !itemWeight || !selectedCategory}
            >
              Calculate Estimate
            </Button>
            
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            
            {estimatedCost !== null && (
              <div className="text-center pt-4">
                <p className="text-base md:text-lg font-semibold text-gray-800">Estimated Total Cost:</p>
                <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {formatAmount(estimatedCost)}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  This is an estimate. The final price will be provided in the official quote.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CostEstimator;
