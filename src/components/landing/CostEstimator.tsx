
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
    <section id="cost-estimator" className="py-16 bg-gray-50 dark:bg-gray-900/20">
      <div className="container">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Cost Estimator</CardTitle>
            <CardDescription>
              Get a quick estimate of your total cost, including shipping and fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination-country">Country to Purchase From</Label>
                <Select onValueChange={handleCountryChange} value={destinationCountry} disabled={isLoadingCountries}>
                  <SelectTrigger id="destination-country">
                    <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select a country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries?.map((country) => (
                      <SelectItem key={country.code} value={country.code}>{country.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only countries where purchases are allowed are shown
                </p>
              </div>

              {selectedCountryData && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="item-price">
                      Item Price ({selectedCountryData.currency.toUpperCase()})
                    </Label>
                    <Input
                      id="item-price"
                      type="number"
                      placeholder={`e.g., 500 ${selectedCountryData.currency.toUpperCase()}`}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="item-weight">
                      Item Weight ({selectedCountryData.weight_unit})
                    </Label>
                    <Input
                      id="item-weight"
                      type="number"
                      placeholder={`e.g., 2.5 ${selectedCountryData.weight_unit}`}
                      value={itemWeight}
                      onChange={(e) => setItemWeight(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Product Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.name} value={category.name}>
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
              className="w-full"
              disabled={!destinationCountry || !itemPrice || !itemWeight || !selectedCategory}
            >
              Calculate Estimate
            </Button>
            
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            
            {estimatedCost !== null && (
              <div className="text-center pt-4">
                <p className="text-lg font-semibold">Estimated Total Cost:</p>
                <p className="text-4xl font-bold text-primary">
                  {formatAmount(estimatedCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
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
