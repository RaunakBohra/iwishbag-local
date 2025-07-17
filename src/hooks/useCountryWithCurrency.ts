import { useMemo } from 'react';

interface Country {
  code: string;
  name: string;
  currency: string;
}

export const useCountryWithCurrency = (countries: Country[] | undefined) => {
  return useMemo(() => {
    if (!countries) return [];

    return countries.map((country) => ({
      ...country,
      displayName: `${country.name} (${country.currency?.toUpperCase() || 'USD'})`,
      currencyCode: country.currency || 'USD',
    }));
  }, [countries]);
};
