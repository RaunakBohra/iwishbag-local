
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { usePurchaseCountries } from "@/hooks/usePurchaseCountries";
import { useShippingCountries } from "@/hooks/useShippingCountries";
import { useCountryWithCurrency } from "@/hooks/useCountryWithCurrency";

interface CountryFieldProps {
  control: Control<any>;
  isLoading: boolean;
  filter?: 'purchase' | 'shipping';
}

export const CountryField = ({ control, isLoading, filter }: CountryFieldProps) => {
  const { data: purchaseCountries, isLoading: purchaseLoading } = usePurchaseCountries();
  const { data: shippingCountries, isLoading: shippingLoading } = useShippingCountries();
  
  const rawCountries = filter === 'shipping' ? shippingCountries : purchaseCountries;
  const countriesLoading = filter === 'shipping' ? shippingLoading : purchaseLoading;
  
  const countries = useCountryWithCurrency(rawCountries);

  return (
    <FormField
      control={control}
      name="countryCode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {filter === 'shipping' ? 'Shipping Country' : 'Purchase Country'}
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading || countriesLoading}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={
                  countriesLoading 
                    ? "Loading countries..." 
                    : filter === 'shipping' 
                      ? "Select shipping destination" 
                      : "Select your country"
                } />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {countries?.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter === 'purchase' && (
            <p className="text-xs text-muted-foreground">
              Only countries where purchases are allowed are shown
            </p>
          )}
          {filter === 'shipping' && (
            <p className="text-xs text-muted-foreground">
              Only countries where shipping is available are shown
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
