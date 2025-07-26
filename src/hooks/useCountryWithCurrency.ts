import { useAllCountries } from '@/hooks/useAllCountries';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';

/**
 * Hook to get country information with currency details
 * Replacement for deleted hook after currency system simplification
 */
export const useCountryWithCurrency = () => {
  const { data: countries, isLoading } = useAllCountries();

  const getCountryWithCurrency = (countryCode: string) => {
    const country = countries?.find((c) => c.code === countryCode);
    if (!country) return null;

    return {
      ...country,
      currency: country.currency || 'USD',
      currencySymbol: optimizedCurrencyService.getCurrencySymbol(country.currency || 'USD'),
    };
  };

  return {
    getCountryWithCurrency,
    countries: countries || [],
    isLoading,
  };
};
