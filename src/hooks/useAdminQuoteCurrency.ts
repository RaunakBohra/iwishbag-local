/**
 * Centralized currency display logic for admin quote interfaces
 * Ensures consistent dual currency display across all admin components
 */

import { useMemo, useState, useEffect } from 'react';
import { currencyService } from '@/services/CurrencyService';
// SIMPLIFIED: Use CurrencyService directly instead of utility functions
import type { UnifiedQuote } from '@/types/unified-quote';

export interface AdminCurrencyDisplay {
  originCurrency: string;
  destinationCurrency: string;
  originCountry: string;
  destinationCountry: string;
  exchangeRate: number;
  exchangeRateSource: 'quote_cached' | 'shipping_route' | 'country_settings' | 'fetching' | 'error';
  exchangeRateTimestamp?: string;
  isLoadingRate: boolean;
  formatDualAmount: (amount: number) => { origin: string; destination: string; short: string };
  formatSingleAmount: (amount: number, currency?: 'origin' | 'destination') => string;
  currencySymbols: {
    origin: string;
    destination: string;
  };
  refreshExchangeRate: () => Promise<void>;
}

/**
 * Hook for consistent admin quote currency display with live exchange rates
 * Follows CLAUDE.md dual currency standard: "USD / Customer Currency"
 * Features: Live rate fetching, 3-tier caching, graceful fallbacks
 */
export const useAdminQuoteCurrency = (
  quote: UnifiedQuote | null | undefined,
): AdminCurrencyDisplay => {
  const [liveExchangeRate, setLiveExchangeRate] = useState<number | null>(null);
  const [exchangeRateSource, setExchangeRateSource] = useState<AdminCurrencyDisplay['exchangeRateSource']>('quote_cached');
  const [exchangeRateTimestamp, setExchangeRateTimestamp] = useState<string | undefined>();
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Extract countries from quote (stable values for effect dependencies)
  const originCountry = quote?.origin_country || 'US';
  const destinationCountry = quote?.destination_country || 'US';
  
  // Get cached exchange rate from quote data as fallback
  const cachedExchangeRate = quote?.calculation_data?.exchange_rate?.rate || quote?.exchange_rate || 1;

  // Fetch live exchange rate
  const fetchLiveExchangeRate = async () => {
    console.log(`[useAdminQuoteCurrency] fetchLiveExchangeRate called:`, {
      originCountry,
      destinationCountry,
      originCurrency: currencyService.getCurrencyForCountrySync(originCountry),
      destinationCurrency: currencyService.getCurrencyForCountrySync(destinationCountry),
      areSameCountries: originCountry === destinationCountry
    });
    
    if (originCountry === destinationCountry) {
      console.log(`[useAdminQuoteCurrency] Same countries, setting rate to 1`);
      setLiveExchangeRate(1);
      setExchangeRateSource('quote_cached');
      return;
    }

    try {
      setIsLoadingRate(true);
      setExchangeRateSource('fetching');
      
      // Clear cache for this specific rate to force fresh fetch
      const cacheKey = `iwishbag_currency_rate_${originCountry}_${destinationCountry}`;
      try {
        localStorage.removeItem(cacheKey);
        console.log(`[useAdminQuoteCurrency] Cleared cache for ${cacheKey}`);
      } catch (e) {
        // Ignore cache clear errors
      }
      
      const rate = await currencyService.getExchangeRate(originCountry, destinationCountry);
      
      setLiveExchangeRate(rate);
      setExchangeRateTimestamp(new Date().toISOString());
      
      // Determine source (OptimizedCurrencyService handles the tier priority internally)
      // For now, we'll assume it's from the best available source
      setExchangeRateSource(rate !== 1 ? 'shipping_route' : 'country_settings');
      
      console.log(`[useAdminQuoteCurrency] Live exchange rate fetched: ${originCountry}→${destinationCountry} = ${rate}`, {
        rate,
        source: 'currencyService',
        timestamp: new Date().toISOString(),
        originCountry,
        destinationCountry
      });
    } catch (error) {
      console.warn('[useAdminQuoteCurrency] Failed to fetch live exchange rate, using cached:', error);
      setExchangeRateSource('error');
      setLiveExchangeRate(cachedExchangeRate);
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Fetch live rate on mount and when countries change
  useEffect(() => {
    if (originCountry && destinationCountry) {
      fetchLiveExchangeRate();
    }
  }, [originCountry, destinationCountry]);

  return useMemo(() => {
    // Default fallback values
    if (!quote) {
      return {
        originCurrency: 'USD',
        destinationCurrency: 'USD',
        originCountry: 'US',
        destinationCountry: 'US',
        exchangeRate: 1,
        exchangeRateSource: 'quote_cached' as const,
        isLoadingRate: false,
        formatDualAmount: (amount: number) => ({
          origin: `$${amount.toFixed(2)}`,
          destination: `$${amount.toFixed(2)}`,
          short: `$${amount.toFixed(2)}`,
        }),
        formatSingleAmount: (amount: number) => `$${amount.toFixed(2)}`,
        currencySymbols: { origin: '$', destination: '$' },
        refreshExchangeRate: async () => {},
      };
    }

    // Get currencies for countries (sync versions for consistency)
    const originCurrency = currencyService.getCurrencyForCountrySync(originCountry);
    const destinationCurrency = currencyService.getCurrencyForCountrySync(destinationCountry);

    // Use live exchange rate if available, otherwise fall back to cached
    const exchangeRate = liveExchangeRate !== null ? liveExchangeRate : cachedExchangeRate;

    // Get currency symbols
    const originSymbol = currencyService.getCurrencySymbolSync(originCurrency);
    const destinationSymbol = currencyService.getCurrencySymbolSync(destinationCurrency);

    // Format dual amount function with CurrencyService for consistent symbols
    const formatDualAmount = (amount: number) => {
      // Format in origin currency using OptimizedCurrencyService
      const originFormatted = currencyService.formatAmount(amount, originCurrency);

      // Convert and format in destination currency if different
      if (exchangeRate && exchangeRate !== 1) {
        const convertedAmount = amount * exchangeRate;
        const destinationFormatted = currencyService.formatAmount(
          convertedAmount,
          destinationCurrency,
        );

        return {
          origin: originFormatted,
          destination: destinationFormatted,
          short: `${originFormatted}/${destinationFormatted}`,
        };
      }

      // Same currency or no exchange rate
      return {
        origin: originFormatted,
        destination: originFormatted,
        short: originFormatted,
      };
    };

    // Format single amount in specified currency using OptimizedCurrencyService
    const formatSingleAmount = (
      amount: number,
      currency: 'origin' | 'destination' = 'destination',
    ) => {
      if (currency === 'origin') {
        return currencyService.formatAmount(amount, originCurrency);
      } else {
        const convertedAmount = exchangeRate !== 1 ? amount * exchangeRate : amount;
        return currencyService.formatAmount(convertedAmount, destinationCurrency);
      }
    };

    return {
      originCurrency,
      destinationCurrency,
      originCountry,
      destinationCountry,
      exchangeRate,
      exchangeRateSource,
      exchangeRateTimestamp,
      isLoadingRate,
      formatDualAmount,
      formatSingleAmount,
      currencySymbols: {
        origin: originSymbol,
        destination: destinationSymbol,
      },
      refreshExchangeRate: fetchLiveExchangeRate,
    };
  }, [
    quote,
    originCountry,
    destinationCountry,
    liveExchangeRate,
    cachedExchangeRate,
    exchangeRateSource,
    exchangeRateTimestamp,
    isLoadingRate,
  ]);
};

/**
 * Legacy compatibility - simplified version
 * @deprecated Use useAdminQuoteCurrency instead
 */
export const useAdminCurrencyDisplay = (quote: UnifiedQuote | null | undefined) => {
  console.warn('useAdminCurrencyDisplay is deprecated, use useAdminQuoteCurrency instead');
  return useAdminQuoteCurrency(quote);
};
