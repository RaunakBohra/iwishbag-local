/**
 * Unified Currency Hook - Consolidates all currency-related functionality
 * 
 * Replaces:
 * - useDisplayCurrency
 * - useCurrency  
 * - useAdminCurrencyDisplay
 * - useCountryWithCurrency
 * - useAdminQuoteCurrency
 * 
 * Provides a single, powerful interface for all currency operations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { currencyService } from '@/services/CurrencyService';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

// Types
interface CurrencyContext {
  quote?: any;
  country?: string;
  userOverride?: string;
}

interface CurrencyHookReturn {
  // Current State
  displayCurrency: string;
  isLoading: boolean;
  error?: string;
  
  // Formatting Functions
  formatAmount: (amount: number, currency?: string) => string;
  formatAmountWithConversion: (amount: number, fromCurrency?: string) => Promise<string>;
  formatAmountSync: (amount: number, currency?: string) => string;
  
  // Currency Operations  
  convertAmount: (amount: number, from: string, to: string) => Promise<number>;
  getExchangeRate: (from: string, to: string) => Promise<number>;
  
  // Currency Info
  getCurrencyInfo: (code: string) => Promise<any>;
  getCurrencyForCountry: (country: string) => Promise<string>;
  getSourceCurrency: (quote?: any) => string;
  
  // Admin Functions
  formatForAdmin: (amount: number, quote?: any) => string;
  getAdminDisplayInfo: (quote?: any) => AdminCurrencyInfo;
  
  // Validation
  isValidAmount: (amount: number, currency: string) => boolean;
  getMinimumAmount: (currency: string) => number;
  
  // Multi-currency Support
  formatGroup: (amounts: Array<{amount: number, currency: string}>) => string[];
  convertGroup: (amounts: Array<{amount: number, from: string}>, to: string) => Promise<number[]>;
}

interface AdminCurrencyInfo {
  displayCurrency: string;
  sourceCurrency: string;
  conversionRate?: number;
  showBothCurrencies: boolean;
  adminNote?: string;
}

export function useCurrency(context?: CurrencyContext): CurrencyHookReturn {
  const { user } = useAuth();
  const [error, setError] = useState<string>();
  
  // Determine display currency based on context
  const displayCurrency = useMemo(() => {
    // Priority: userOverride → user profile → quote currency → country currency → USD
    if (context?.userOverride) return context.userOverride;
    if (user?.profile?.preferred_display_currency) return user.profile.preferred_display_currency;
    if (context?.quote?.customer_currency) return context.quote.customer_currency;
    if (context?.country) {
      return currencyService.getCurrencyForCountrySync(context.country);
    }
    return 'USD';
  }, [context, user]);
  
  // Load currency info
  const { data: currencyInfo, isLoading } = useQuery({
    queryKey: ['currency_info', displayCurrency],
    queryFn: () => currencyService.getCurrency(displayCurrency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!displayCurrency,
  });
  
  // Formatting functions
  const formatAmount = useCallback((amount: number, currency?: string) => {
    const targetCurrency = currency || displayCurrency;
    return currencyService.formatAmount(amount, targetCurrency);
  }, [displayCurrency]);
  
  const formatAmountSync = useCallback((amount: number, currency?: string) => {
    const targetCurrency = currency || displayCurrency;
    return currencyService.formatAmount(amount, targetCurrency);
  }, [displayCurrency]);
  
  const formatAmountWithConversion = useCallback(async (amount: number, fromCurrency?: string) => {
    if (!fromCurrency || fromCurrency === displayCurrency) {
      return formatAmount(amount, displayCurrency);
    }
    
    try {
      const converted = await currencyService.convertAmount(amount, fromCurrency, displayCurrency);
      return formatAmount(converted, displayCurrency);
    } catch (error) {
      logger.error('Currency conversion failed in formatAmountWithConversion', { 
        amount, fromCurrency, displayCurrency, error 
      });
      setError(`Failed to convert ${fromCurrency} to ${displayCurrency}`);
      return formatAmount(amount, fromCurrency); // Fallback
    }
  }, [displayCurrency, formatAmount]);
  
  // Currency operations
  const convertAmount = useCallback(async (amount: number, from: string, to: string) => {
    try {
      return await currencyService.convertAmount(amount, from, to);
    } catch (error) {
      logger.error('Currency conversion failed', { amount, from, to, error });
      throw error;
    }
  }, []);
  
  const getExchangeRate = useCallback(async (from: string, to: string) => {
    try {
      return await currencyService.getExchangeRateByCurrency(from, to);
    } catch (error) {
      logger.error('Exchange rate fetch failed', { from, to, error });
      throw error;
    }
  }, []);
  
  // Currency info functions
  const getCurrencyInfo = useCallback(async (code: string) => {
    return await currencyService.getCurrency(code);
  }, []);
  
  const getCurrencyForCountry = useCallback(async (country: string) => {
    return await currencyService.getCurrencyForCountry(country);
  }, []);
  
  const getSourceCurrency = useCallback((quote?: any) => {
    if (!quote) return displayCurrency;
    
    // Priority: customer_currency → origin country currency → destination country currency → USD
    if (quote.customer_currency) return quote.customer_currency;
    if (quote.origin_country) {
      return currencyService.getCurrencyForCountrySync(quote.origin_country);
    }
    if (quote.destination_country) {
      return currencyService.getCurrencyForCountrySync(quote.destination_country);  
    }
    return 'USD';
  }, [displayCurrency]);
  
  // Admin functions
  const formatForAdmin = useCallback((amount: number, quote?: any) => {
    const sourceCurrency = getSourceCurrency(quote);
    const sourceFormatted = formatAmount(amount, sourceCurrency);
    
    if (sourceCurrency === displayCurrency) {
      return sourceFormatted;
    }
    
    // Show both currencies for admin
    return `${sourceFormatted} (${displayCurrency})`;
  }, [displayCurrency, formatAmount, getSourceCurrency]);
  
  const getAdminDisplayInfo = useCallback((quote?: any): AdminCurrencyInfo => {
    const sourceCurrency = getSourceCurrency(quote);
    const showBoth = sourceCurrency !== displayCurrency;
    
    return {
      displayCurrency,
      sourceCurrency,
      showBothCurrencies: showBoth,
      adminNote: showBoth ? `Displaying in ${displayCurrency}, source is ${sourceCurrency}` : undefined
    };
  }, [displayCurrency, getSourceCurrency]);
  
  // Validation functions
  const isValidAmount = useCallback((amount: number, currency: string) => {
    return currencyService.isValidPaymentAmountSync(amount, currency);
  }, []);
  
  const getMinimumAmount = useCallback((currency: string) => {
    return currencyService.getMinimumPaymentAmountSync(currency);
  }, []);
  
  // Multi-currency functions
  const formatGroup = useCallback((amounts: Array<{amount: number, currency: string}>) => {
    return amounts.map(({ amount, currency }) => formatAmount(amount, currency));
  }, [formatAmount]);
  
  const convertGroup = useCallback(async (
    amounts: Array<{amount: number, from: string}>, 
    to: string
  ) => {
    const conversions = amounts.map(({ amount, from }) => 
      convertAmount(amount, from, to)
    );
    return Promise.all(conversions);
  }, [convertAmount]);
  
  return {
    // Current State
    displayCurrency,
    isLoading,
    error,
    
    // Formatting Functions
    formatAmount,
    formatAmountWithConversion,
    formatAmountSync,
    
    // Currency Operations
    convertAmount,
    getExchangeRate,
    
    // Currency Info
    getCurrencyInfo,
    getCurrencyForCountry,
    getSourceCurrency,
    
    // Admin Functions
    formatForAdmin,
    getAdminDisplayInfo,
    
    // Validation
    isValidAmount,
    getMinimumAmount,
    
    // Multi-currency Support
    formatGroup,
    convertGroup,
  };
}

// Specialized hooks for specific use cases
export function useDisplayCurrency(quote?: any) {
  return useCurrency({ quote });
}

export function useAdminCurrency(quote?: any) {
  const currency = useCurrency({ quote });
  
  return {
    ...currency,
    formatForAdmin: currency.formatForAdmin,
    getDisplayInfo: currency.getAdminDisplayInfo,
  };
}

export function useCountryCurrency(country: string) {
  return useCurrency({ country });
}