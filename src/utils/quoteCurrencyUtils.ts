/**
 * Quote Currency Utils - Extracted from ShopifyStyleQuoteView
 * 
 * These are the EXACT same functions that work perfectly on the quote page.
 * Using them everywhere ensures consistent currency display across the entire app.
 * 
 * Shopify/Amazon approach: One currency function, used everywhere.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDestinationCurrency } from '@/utils/originCurrency';
import { currencyService } from '@/services/CurrencyService';

/**
 * Get user profile for currency preferences
 * EXACT same logic from quote page
 */
export function useUserProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/**
 * Get display currency - EXACT same function from quote page
 * Priority: User profile preference → Destination country → USD
 * 
 * This is the function that works perfectly on quote page!
 */
export function useDisplayCurrency(quote?: any) {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  
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

  return getDisplayCurrency();
}

/**
 * Currency conversion with financial precision - EXACT same from quote page
 */
export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const converted = await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    
    // Debug logging for currency conversion
    if (isNaN(converted)) {
      console.warn(`[Currency] NaN detected in conversion:`, {
        amount,
        fromCurrency,
        toCurrency,
        converted,
        stackTrace: new Error().stack
      });
    }
    
    // FINANCIAL PRECISION: Same as quote page
    const result = Math.round(converted * 100) / 100;
    
    // Final NaN check
    if (isNaN(result)) {
      console.warn(`[Currency] NaN detected in final result:`, {
        amount,
        fromCurrency,
        toCurrency,
        converted,
        result
      });
      return 0; // Fallback to 0 instead of NaN
    }
    
    return result;
  } catch (error) {
    console.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
    return amount;
  }
};

/**
 * Format amount with simple financial precision (2 decimals) like quote page
 * Avoids CurrencyService's smart rounding that can show 0 decimals for large amounts
 */
export const formatAmountWithFinancialPrecision = (amount: number, currencyCode: string): string => {
  const currency = currencyService.getCurrencySymbol(currencyCode);
  
  // Debug logging for NaN issues
  if (amount !== amount || isNaN(amount) || amount == null) {
    console.warn(`[Currency] Invalid amount detected:`, { 
      amount, 
      type: typeof amount, 
      isNaN: isNaN(amount),
      currencyCode,
      stackTrace: new Error().stack 
    });
  }
  
  // Handle null, undefined, or NaN values
  const safeAmount = amount == null || isNaN(amount) ? 0 : amount;
  
  // Apply simple 2-decimal precision like quote page (no smart rounding)
  const preciseAmount = Math.round(safeAmount * 100) / 100;
  
  // Format with thousands separators but keep exactly 2 decimal places
  const formatted = preciseAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
  
  return `${currency}${formatted}`;
};

/**
 * Format amount with conversion - EXACT same logic from quote page
 * Uses simple 2-decimal financial precision like quote page (not smart rounding)
 */
export function useFormatAmountWithConversion(displayCurrency: string) {
  const formatAmountWithConversion = useCallback(async (
    amount: number, 
    sourceCurrency?: string
  ): Promise<string> => {
    const fromCurrency = sourceCurrency || 'USD';
    
    if (fromCurrency === displayCurrency) {
      // Use simple financial precision formatting instead of smart rounding
      return formatAmountWithFinancialPrecision(amount, displayCurrency);
    }
    
    try {
      const convertedAmount = await convertCurrency(amount, fromCurrency, displayCurrency);
      // Use simple financial precision formatting instead of smart rounding  
      return formatAmountWithFinancialPrecision(convertedAmount, displayCurrency);
    } catch (error) {
      console.warn('Currency formatting failed, using original:', error);
      return formatAmountWithFinancialPrecision(amount, fromCurrency);
    }
  }, [displayCurrency]);

  return formatAmountWithConversion;
}

/**
 * Quote price formatter - EXACT same logic from quote page
 * Uses simple financial precision to match quote page display
 */
export function useQuotePriceFormatter(quote: any, displayCurrency: string) {
  const formatItemQuotePrice = useCallback(async (itemQuotePrice: number): Promise<string> => {
    try {
      const sourceCurrency = quote.origin_country ? 
        (await import('@/utils/originCurrency')).getOriginCurrency(quote.origin_country) : 'USD';
      
      if (sourceCurrency === displayCurrency) {
        return formatAmountWithFinancialPrecision(itemQuotePrice, displayCurrency);
      }
      
      const convertedPrice = await convertCurrency(itemQuotePrice, sourceCurrency, displayCurrency);
      return formatAmountWithFinancialPrecision(convertedPrice, displayCurrency);
    } catch (error) {
      console.warn('Failed to convert item quote price:', error);
      const fallbackCurrency = quote.origin_country ? 
        (await import('@/utils/originCurrency')).getOriginCurrency(quote.origin_country) : 'USD';
      return formatAmountWithFinancialPrecision(itemQuotePrice, fallbackCurrency);
    }
  }, [quote, displayCurrency]);

  return formatItemQuotePrice;
}

/**
 * Hook that provides all quote currency functions
 * Use this in cart/checkout components instead of useCartCurrency
 */
export function useQuoteCurrency(quote?: any) {
  const displayCurrency = useDisplayCurrency(quote);
  const formatAmountWithConversion = useFormatAmountWithConversion(displayCurrency);
  const formatItemQuotePrice = useQuotePriceFormatter(quote, displayCurrency);
  
  return {
    displayCurrency,
    formatAmountWithConversion,
    formatItemQuotePrice,
    convertCurrency
  };
}