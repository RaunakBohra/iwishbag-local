import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Control, FieldValues, Path } from 'react-hook-form';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useShippingCountries } from '@/hooks/useShippingCountries';
import { useCountryWithCurrency } from '@/hooks/useCountryWithCurrency';

interface CountryFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  isLoading: boolean;
  filter?: 'purchase' | 'shipping';
  name?: Path<TFieldValues>;
  label?: string;
}

export const CountryField = <TFieldValues extends FieldValues = FieldValues>({
  control,
  isLoading,
  filter,
  name = 'countryCode' as Path<TFieldValues>,
  label,
}: CountryFieldProps<TFieldValues>) => {
  const { data: purchaseCountries, isLoading: purchaseLoading } = usePurchaseCountries();
  const { data: shippingCountries, isLoading: shippingLoading } = useShippingCountries();

  const rawCountries = filter === 'shipping' ? shippingCountries : purchaseCountries;
  const countriesLoading = filter === 'shipping' ? shippingLoading : purchaseLoading;

  const { countries } = useCountryWithCurrency();
  
  // Filter countries based on the filter type if needed
  const filteredCountries = rawCountries && Array.isArray(rawCountries) 
    ? countries.filter(country => rawCountries.some(rc => rc.code === country.code))
    : countries;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label || (filter === 'shipping' ? 'Shipping Country' : 'Purchase Country')}
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || ''}
            disabled={isLoading || countriesLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    countriesLoading
                      ? 'Loading countries...'
                      : filter === 'shipping'
                        ? 'Select shipping destination'
                        : 'Select your country'
                  }
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {filteredCountries?.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
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
