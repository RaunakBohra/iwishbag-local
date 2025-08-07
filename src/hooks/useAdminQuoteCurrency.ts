/**
 * Admin Quote Currency Hook
 * 
 * Provides admin-specific currency formatting and conversion utilities
 * for displaying quotes with dual currency support (origin → destination).
 * 
 * Key Features:
 * - Dual currency display for admin interfaces
 * - Origin and destination currency formatting
 * - Exchange rate calculations
 * - Admin-friendly currency labels and symbols
 * - Backward compatibility with legacy quote data
 */

import { useMemo } from 'react';
import { getOriginCurrency, getDestinationCurrency, getCurrencySymbol } from '@/utils/originCurrency';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { currencyService } from '@/services/CurrencyService';

export interface AdminQuoteCurrency {
  // Currency codes
  originCurrency: string;
  destinationCurrency: string;
  
  // Exchange rate information
  exchangeRate: number;
  
  // Formatting functions
  formatSingleAmount: (amount: number, target: 'origin' | 'destination') => string;
  formatDualAmount: (amount: number) => string;
  formatOriginAmount: (amount: number) => string;
  formatDestinationAmount: (amount: number) => string;
  
  // Currency symbols
  originSymbol: string;
  destinationSymbol: string;
  
  // Utility flags
  isDualCurrency: boolean;
  
  // Labels for admin UI
  originLabel: string;
  destinationLabel: string;
}

export function useAdminQuoteCurrency(quote: any): AdminQuoteCurrency {
  // Determine currencies
  const originCurrency = useMemo(() => {
    return getOriginCurrency(quote.origin_country);
  }, [quote.origin_country]);

  const destinationCurrency = useMemo(() => {
    return getDestinationCurrency(quote.destination_country);
  }, [quote.destination_country]);

  // Get exchange rate (for admin display, we often need USD as intermediate)
  const exchangeRate = useMemo(() => {
    // For admin views, we typically show conversion from origin to destination
    // For now, use a simplified rate - this could be enhanced with real-time rates
    return quote.calculation_data?.exchange_rate || 1;
  }, [quote.calculation_data?.exchange_rate]);

  // Currency symbols
  const originSymbol = useMemo(() => {
    return getCurrencySymbol(originCurrency);
  }, [originCurrency]);

  const destinationSymbol = useMemo(() => {
    return getCurrencySymbol(destinationCurrency);
  }, [destinationCurrency]);

  // Check if dual currency display is needed
  const isDualCurrency = useMemo(() => {
    return originCurrency !== destinationCurrency;
  }, [originCurrency, destinationCurrency]);

  // Create formatting functions
  const formatSingleAmount = useMemo(() => {
    return (amount: number, target: 'origin' | 'destination'): string => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'N/A';
      }

      const currency = target === 'origin' ? originCurrency : destinationCurrency;
      
      // For admin views, we typically want to show amounts in their stored currency
      // The breakdown amounts are stored in origin currency according to our new system
      let displayAmount = amount;
      
      // If we're displaying in destination currency and it's different, convert
      if (target === 'destination' && isDualCurrency) {
        // This would need proper currency conversion - for now use exchange rate
        displayAmount = amount * exchangeRate;
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(displayAmount);
    };
  }, [originCurrency, destinationCurrency, exchangeRate, isDualCurrency]);

  const formatDualAmount = useMemo(() => {
    return (amount: number): string => {
      if (!isDualCurrency) {
        return formatSingleAmount(amount, 'origin');
      }

      const originFormatted = formatSingleAmount(amount, 'origin');
      const destinationFormatted = formatSingleAmount(amount, 'destination');
      
      return `${originFormatted} → ${destinationFormatted}`;
    };
  }, [formatSingleAmount, isDualCurrency]);

  const formatOriginAmount = useMemo(() => {
    return (amount: number): string => {
      return formatSingleAmount(amount, 'origin');
    };
  }, [formatSingleAmount]);

  const formatDestinationAmount = useMemo(() => {
    return (amount: number): string => {
      return formatSingleAmount(amount, 'destination');
    };
  }, [formatSingleAmount]);

  // Admin-friendly labels
  const originLabel = useMemo(() => {
    return `Origin (${quote.origin_country} - ${originCurrency})`;
  }, [quote.origin_country, originCurrency]);

  const destinationLabel = useMemo(() => {
    return `Destination (${quote.destination_country} - ${destinationCurrency})`;
  }, [quote.destination_country, destinationCurrency]);

  return {
    // Currency codes
    originCurrency,
    destinationCurrency,
    
    // Exchange rate
    exchangeRate,
    
    // Formatting functions
    formatSingleAmount,
    formatDualAmount,
    formatOriginAmount,
    formatDestinationAmount,
    
    // Currency symbols  
    originSymbol,
    destinationSymbol,
    
    // Utility flags
    isDualCurrency,
    
    // Admin labels
    originLabel,
    destinationLabel,
  };
}

/**
 * Simplified admin hook for components that just need basic formatting
 */
export function useAdminCurrencyFormatter(quote: any) {
  const currency = useAdminQuoteCurrency(quote);
  
  return {
    format: currency.formatOriginAmount,
    formatDual: currency.formatDualAmount,
    symbol: currency.originSymbol,
    currency: currency.originCurrency,
  };
}