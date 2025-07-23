// ============================================================================
// CUSTOMER QUOTE DISPLAY CURRENCY HOOK
// Provides customer-friendly currency display for quotes using unified system
// Handles destination country currency preferences and exchange rates
// ============================================================================

import { useMemo } from 'react';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface QuoteDisplayCurrencyResult {
  displayCurrency: string;
  exchangeRate: number;
  formatPrice: (amount: number) => string;
  formatPriceWithUSD: (amount: number) => string;
  isLoadingCurrency: boolean;
}

/**
 * Customer-focused hook for displaying quote prices in their preferred currency
 * Automatically detects user preference or falls back to destination country currency
 */
export function useQuoteDisplayCurrency(quote: UnifiedQuote): QuoteDisplayCurrencyResult {
  const { user } = useAuth();
  
  // Get user's preferred currency from profile
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_display_currency')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.warn('Failed to fetch user currency preference:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Determine display currency priority:
  // 1. User's preferred currency from profile
  // 2. Quote's destination currency  
  // 3. Destination country's default currency
  // 4. USD as fallback
  const displayCurrency = useMemo(() => {
    if (userProfile?.preferred_display_currency) {
      return userProfile.preferred_display_currency;
    }
    
    // Check if quote has explicit destination currency
    if (quote.currency && quote.currency !== 'USD') {
      return quote.currency;
    }
    
    // Fallback to destination country currency from the quote
    // This will be resolved by the useCurrency hook
    return quote.destination_country ? quote.destination_country : 'USD';
  }, [userProfile?.preferred_display_currency, quote.currency, quote.destination_country]);

  // Get currency formatting and exchange rate
  const currency = useQuoteCurrency({
    origin_country: quote.origin_country,
    destination_country: quote.destination_country,
    destination_currency: displayCurrency === quote.destination_country 
      ? undefined // Let useCurrency resolve from country
      : displayCurrency,
    exchange_rate: quote.calculation_data?.exchange_rate?.rate
  });

  // Format price in customer's preferred currency
  const formatPrice = useMemo(() => {
    return (amount: number): string => {
      if (amount === 0) return currency.formatAmount(0);
      if (!amount || isNaN(amount)) return 'N/A';
      
      return currency.formatAmount(amount);
    };
  }, [currency]);

  // Format price with USD equivalent for transparency
  const formatPriceWithUSD = useMemo(() => {
    return (amount: number): string => {
      if (amount === 0) return currency.formatAmount(0);
      if (!amount || isNaN(amount)) return 'N/A';
      
      const localFormatted = currency.formatAmount(amount);
      
      // If already in USD, don't show equivalent
      if (currency.currency === 'USD') {
        return localFormatted;
      }
      
      // Show local currency with USD equivalent
      const usdFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      
      return `${localFormatted} (≈ ${usdFormatted})`;
    };
  }, [currency]);

  return {
    displayCurrency: currency.currency,
    exchangeRate: currency.exchangeRate,
    formatPrice,
    formatPriceWithUSD,
    isLoadingCurrency: isLoadingProfile,
  };
}

/**
 * Simplified version for components that don't need user profile integration
 */
export function useSimpleQuoteDisplayCurrency(
  quote: UnifiedQuote,
  preferredCurrency?: string
): QuoteDisplayCurrencyResult {
  const targetCurrency = preferredCurrency || quote.currency || 'USD';
  
  const currency = useQuoteCurrency({
    origin_country: quote.origin_country,
    destination_country: quote.destination_country,
    destination_currency: targetCurrency,
    exchange_rate: quote.calculation_data?.exchange_rate?.rate
  });

  const formatPrice = useMemo(() => {
    return (amount: number): string => {
      if (amount === 0) return currency.formatAmount(0);
      if (!amount || isNaN(amount)) return 'N/A';
      
      return currency.formatAmount(amount);
    };
  }, [currency]);

  const formatPriceWithUSD = useMemo(() => {
    return (amount: number): string => {
      if (amount === 0) return currency.formatAmount(0);
      if (!amount || isNaN(amount)) return 'N/A';
      
      const localFormatted = currency.formatAmount(amount);
      
      if (currency.currency === 'USD') {
        return localFormatted;
      }
      
      const usdFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      
      return `${localFormatted} (≈ ${usdFormatted})`;
    };
  }, [currency]);

  return {
    displayCurrency: currency.currency,
    exchangeRate: currency.exchangeRate,
    formatPrice,
    formatPriceWithUSD,
    isLoadingCurrency: false,
  };
}