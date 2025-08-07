import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getDestinationCurrency, getOriginCurrency } from '@/utils/originCurrency';
import { formatCurrency } from '@/lib/utils';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';

/**
 * Hook for display currency logic - replicates the exact same logic from ShopifyStyleQuoteView
 * This ensures consistent currency display across cart, checkout, and quote pages
 */
export const useDisplayCurrency = (quote?: any) => {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();

  // Exact same logic as ShopifyStyleQuoteView
  const getDisplayCurrency = useCallback(() => {
    // For authenticated users, check profile preference first
    if (user?.id && userProfile?.preferred_display_currency) {
      return userProfile.preferred_display_currency;
    }
    // Fall back to destination country currency (customer's country)
    if (quote?.destination_country) {
      return getDestinationCurrency(quote.destination_country);
    }
    return 'USD';
  }, [user?.id, userProfile?.preferred_display_currency, quote?.destination_country]);

  // Currency conversion function - exact same as ShopifyStyleQuoteView
  const convertCurrency = useCallback(async (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      const { currencyService } = await import('@/services/CurrencyService');
      return await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    } catch (error) {
      console.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
      return amount; // Return original amount if conversion fails
    }
  }, []);

  // Enhanced formatCurrency function that handles currency conversion
  const formatAmountWithConversion = useCallback(async (amount: number, fromCurrency?: string) => {
    const displayCurrency = getDisplayCurrency();
    
    // Get the actual origin currency from quote data
    let sourceCurrency = fromCurrency;
    if (!sourceCurrency && quote) {
      // ALWAYS prioritize origin_country mapping over everything else
      if (quote.origin_country) {
        const { getOriginCurrency } = await import('@/utils/originCurrency');
        sourceCurrency = getOriginCurrency(quote.origin_country);
      }
      // Get from calculation_data.origin_currency (new quotes)
      else if (quote.calculation_data?.origin_currency) {
        sourceCurrency = quote.calculation_data.origin_currency;
      } 
      // Last resort: Use legacy detection
      else {
        sourceCurrency = getBreakdownSourceCurrency(quote);
      }
    }
    
    // Final fallback
    if (!sourceCurrency) {
      sourceCurrency = 'USD';
    }
    
    if (sourceCurrency === displayCurrency) {
      return formatCurrency(amount, displayCurrency);
    }
    
    try {
      const convertedAmount = await convertCurrency(amount, sourceCurrency, displayCurrency);
      return formatCurrency(convertedAmount, displayCurrency);
    } catch (error) {
      console.warn('Currency conversion failed, using original:', error);
      return formatCurrency(amount, sourceCurrency);
    }
  }, [quote, convertCurrency, getDisplayCurrency]);

  // Synchronous version for immediate display (without conversion)
  const formatAmountSync = useCallback((amount: number, currency?: string) => {
    const displayCurrency = currency || getDisplayCurrency();
    return formatCurrency(amount, displayCurrency);
  }, [getDisplayCurrency]);

  const displayCurrency = getDisplayCurrency();

  return {
    displayCurrency,
    getDisplayCurrency,
    convertCurrency,
    formatAmountWithConversion,
    formatAmountSync,
    // Helper to get source currency for a quote
    getSourceCurrency: (quoteData?: any) => {
      if (!quoteData) {
        return 'USD';
      }
      
      // ALWAYS prioritize origin_country mapping over everything else  
      if (quoteData.origin_country) {
        return getOriginCurrency(quoteData.origin_country);
      }
      
      // Second try: Get from calculation_data.origin_currency (new quotes)
      if (quoteData.calculation_data?.origin_currency) {
        return quoteData.calculation_data.origin_currency;
      }
      
      // Last resort: Use legacy detection
      return getBreakdownSourceCurrency(quoteData);
    }
  };
};