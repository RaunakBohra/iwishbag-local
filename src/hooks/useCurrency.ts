import { useMemo, useCallback } from 'react';
import { useAllCountries } from '@/hooks/useAllCountries';
import { currencyService } from '@/services/CurrencyService';

/**
 * Simplified unified currency hook
 * Replaces all previous currency hooks with a single, simple interface
 * 
 * @param currencyCode - The 3-letter currency code (e.g., 'USD', 'INR', 'NPR')
 * @param originCountry - Optional origin country for exchange rate calculation
 * @param destinationCountry - Optional destination country for exchange rate calculation
 */
export function useCurrency(
  currencyCode: string = 'USD',
  originCountry?: string,
  destinationCountry?: string
) {
  const { data: countries } = useAllCountries();

  // Get exchange rate using simplified 2-tier system
  const exchangeRate = useMemo(() => {
    if (!currencyCode || currencyCode === 'USD') return 1;

    // For immediate display purposes, use country settings rate_from_usd
    // The async CurrencyService.getExchangeRate() should be used for critical business operations
    const country = countries?.find((c) => c.currency === currencyCode);
    return country?.rate_from_usd || 1;
  }, [currencyCode, countries]);

  // Get currency symbol
  const symbol = useMemo(() => {
    return currencyService.getCurrencySymbol(currencyCode);
  }, [currencyCode]);

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
    // Helper function to get country currency
    getCountryCurrency: (countryCode: string) => {
      const country = countries?.find((c) => c.code === countryCode);
      return country?.currency || 'USD';
    },
    // Helper function to check if currency is supported
    isSupported: () => {
      return currencyService.getCurrencySymbol(currencyCode) !== currencyCode;
    },
    // Helper function for business-critical operations requiring exact exchange rates
    getExactExchangeRate: useCallback(async (originCountry: string, destinationCountry: string) => {
      try {
        return await currencyService.getExchangeRate(originCountry, destinationCountry);
      } catch (error) {
        console.error('Failed to get exact exchange rate:', error);
        throw error;
      }
    }, [])
  };
}

/**
 * Specialized hook for quote display
 * Handles the business logic for displaying quotes in customer's preferred currency
 */
export function useQuoteCurrency(quote?: {
  origin_country?: string;
  destination_country?: string;
  destination_currency?: string;
  exchange_rate?: number;
}) {
  const destinationCurrency = quote?.destination_currency || 'USD';
  const originCountry = quote?.origin_country;
  const destinationCountry = quote?.destination_country;

  const currency = useCurrency(destinationCurrency, originCountry, destinationCountry);

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
 * Hook for dual currency display (admin views)
 * Shows both USD and local currency
 */
export function useDualCurrency(
  currencyCode: string = 'USD',
  originCountry?: string,
  destinationCountry?: string
) {
  const localCurrency = useCurrency(currencyCode, originCountry, destinationCountry);
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