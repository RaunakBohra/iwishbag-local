import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unifiedConfigService } from '@/services/UnifiedConfigurationService';

/**
 * Simplified currency hook with minimal fallbacks
 * 
 * @param currencyCode - The 3-letter currency code (e.g., 'USD', 'INR', 'NPR')
 */
export function useCurrency(currencyCode: string = 'USD') {
  // Get all countries with their configurations
  const { data: countries } = useQuery({
    queryKey: ['unified_config_service', 'all_countries'],
    queryFn: () => unifiedConfigService.getAllCountries(),
    staleTime: 30 * 60 * 1000, // 30 minutes - country data is stable
  });

  // Get the specific country config for the currency
  const countryWithCurrency = useMemo(() => {
    if (!countries) return null;
    return Object.entries(countries).find(([_, config]) => config.currency === currencyCode)?.[1];
  }, [countries, currencyCode]);

  // Simple exchange rate - no complex fallbacks
  const exchangeRate = useMemo(() => {
    if (currencyCode === 'USD') return 1;
    return countryWithCurrency?.rate_from_usd || 1;
  }, [currencyCode, countryWithCurrency]);

  // Simple currency symbol - fallback to USD symbol
  const symbol = useMemo(() => {
    return countryWithCurrency?.symbol || '$';
  }, [countryWithCurrency]);

  // Format amount in the specified currency
  const formatAmount = useMemo(() => {
    return (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'N/A';
      }

      // Convert from USD to target currency
      const convertedAmount = amount * exchangeRate;

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(convertedAmount);
    };
  }, [currencyCode, exchangeRate]);

  // Format amount without currency symbol (for calculations)
  const formatNumber = useMemo(() => {
    return (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '0';
      }

      const convertedAmount = amount * exchangeRate;
      return convertedAmount.toFixed(2);
    };
  }, [exchangeRate]);

  return {
    currency: currencyCode,
    symbol,
    exchangeRate,
    formatAmount,
    formatNumber,
    // Simple helper - no complex fallbacks
    isSupported: () => !!countryWithCurrency,
  };
}

/**
 * Simplified hook for quote display
 * Uses quote's stored currency and exchange rate
 */
export function useQuoteCurrency(quote?: {
  destination_currency?: string;
  exchange_rate?: number;
}) {
  const destinationCurrency = quote?.destination_currency || 'USD';
  const currency = useCurrency(destinationCurrency);

  // Use the quote's stored exchange rate if available, otherwise use calculated rate
  const finalExchangeRate = quote?.exchange_rate || currency.exchangeRate;

  const formatAmount = useMemo(() => {
    return (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'N/A';
      }

      // Amount is in USD, convert using the quote's exchange rate
      const convertedAmount = amount * finalExchangeRate;

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: destinationCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(convertedAmount);
    };
  }, [destinationCurrency, finalExchangeRate]);

  return {
    ...currency,
    exchangeRate: finalExchangeRate,
    formatAmount,
  };
}

/**
 * Simplified hook for dual currency display (admin views)
 * Shows both USD and local currency
 */
export function useDualCurrency(currencyCode: string = 'USD') {
  const localCurrency = useCurrency(currencyCode);
  const usdCurrency = useCurrency('USD');

  const formatDualAmount = useMemo(() => {
    return (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'N/A';
      }

      const usdFormatted = usdCurrency.formatAmount(amount);

      if (currencyCode === 'USD') {
        return usdFormatted;
      }

      const localFormatted = localCurrency.formatAmount(amount);
      return `${usdFormatted} / ${localFormatted}`;
    };
  }, [usdCurrency, localCurrency, currencyCode]);

  return {
    usd: usdCurrency,
    local: localCurrency,
    formatDualAmount,
  };
}
