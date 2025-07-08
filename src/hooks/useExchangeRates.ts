import { useQuery } from '@tanstack/react-query';
import { getExchangeRate, ExchangeRateResult } from '@/lib/currencyUtils';

export interface ExchangeRateKey {
  fromCountry: string;
  toCountry: string;
}

export function useExchangeRate(fromCountry: string, toCountry: string) {
  return useQuery<ExchangeRateResult, Error>({
    queryKey: ['exchangeRate', fromCountry, toCountry],
    queryFn: () => getExchangeRate(fromCountry, toCountry),
    enabled: !!fromCountry && !!toCountry,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useMultipleExchangeRates(pairs: ExchangeRateKey[]) {
  return useQuery<Record<string, ExchangeRateResult>, Error>({
    queryKey: ['exchangeRates', pairs],
    queryFn: async () => {
      const results: Record<string, ExchangeRateResult> = {};
      
      await Promise.all(
        pairs.map(async (pair) => {
          const key = `${pair.fromCountry}-${pair.toCountry}`;
          try {
            results[key] = await getExchangeRate(pair.fromCountry, pair.toCountry);
          } catch (error) {
            console.error(`Failed to fetch exchange rate for ${key}:`, error);
            results[key] = {
              rate: 1,
              source: 'fallback',
              confidence: 'low',
              warning: 'Failed to fetch exchange rate'
            };
          }
        })
      );
      
      return results;
    },
    enabled: pairs.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

// Hook to prefetch commonly used exchange rates
export function usePrefetchExchangeRates() {
  const commonPairs: ExchangeRateKey[] = [
    { fromCountry: 'US', toCountry: 'IN' },
    { fromCountry: 'US', toCountry: 'NP' },
    { fromCountry: 'US', toCountry: 'CA' },
    { fromCountry: 'US', toCountry: 'AU' },
    { fromCountry: 'IN', toCountry: 'US' },
    { fromCountry: 'NP', toCountry: 'US' },
    { fromCountry: 'CA', toCountry: 'US' },
    { fromCountry: 'AU', toCountry: 'US' }
  ];

  return useMultipleExchangeRates(commonPairs);
}

// Hook for getting exchange rates with caching
export function useExchangeRateWithCache(fromCountry: string, toCountry: string) {
  const { data: exchangeRateData, isLoading, error } = useExchangeRate(fromCountry, toCountry);

  return {
    exchangeRate: exchangeRateData?.rate || 1,
    exchangeRateSource: exchangeRateData?.source || 'fallback',
    exchangeRateConfidence: exchangeRateData?.confidence || 'low',
    exchangeRateWarning: exchangeRateData?.warning,
    isLoading,
    error
  };
}