/**
 * Currency Context Provider
 * 
 * Provides centralized currency management for origin and destination currencies
 * throughout the application. This reduces prop drilling and ensures consistent
 * currency handling across components.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { currencyService } from '@/services/CurrencyService';

interface CurrencyState {
  originCountry: string;
  originCurrency: string;
  destinationCountry: string;
  destinationCurrency: string;
  exchangeRate?: number;
}

interface CurrencyContextValue extends CurrencyState {
  // Formatting functions
  formatOriginAmount: (amount: number) => string;
  formatDestinationAmount: (amount: number) => string;
  formatDualAmount: (amount: number) => string; // Shows both currencies
  
  // Currency symbols
  originSymbol: string;
  destinationSymbol: string;
  
  // Conversion utilities
  convertToDestination: (amount: number) => number;
  convertToOrigin: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: React.ReactNode;
  state: CurrencyState;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ 
  children, 
  state 
}) => {
  // currencyService is already imported as instance

  const value = useMemo<CurrencyContextValue>(() => {
    // Get currency symbols
    const originSymbol = currencyService.getCurrencySymbol(state.originCurrency);
    const destinationSymbol = currencyService.getCurrencySymbol(state.destinationCurrency);
    
    // Exchange rate (origin -> destination)
    const exchangeRate = state.exchangeRate || 1;

    return {
      ...state,
      originSymbol,
      destinationSymbol,
      
      formatOriginAmount: (amount: number) => 
        currencyService.formatAmount(amount, state.originCurrency),
      
      formatDestinationAmount: (amount: number) => 
        currencyService.formatAmount(amount, state.destinationCurrency),
      
      formatDualAmount: (amount: number) => {
        const originFormatted = currencyService.formatAmount(amount, state.originCurrency);
        if (state.originCurrency === state.destinationCurrency) {
          return originFormatted;
        }
        const convertedAmount = amount * exchangeRate;
        const destinationFormatted = currencyService.formatAmount(convertedAmount, state.destinationCurrency);
        return `${originFormatted} / ${destinationFormatted}`;
      },
      
      convertToDestination: (amount: number) => amount * exchangeRate,
      
      convertToOrigin: (amount: number) => amount / exchangeRate,
    };
  }, [state, currencyService]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

/**
 * Hook to use currency context
 * @throws Error if used outside CurrencyProvider
 */
export const useCurrencyContext = (): CurrencyContextValue => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
};

/**
 * Hook for components that only need origin currency formatting
 */
export const useOriginCurrency = () => {
  const { formatOriginAmount, originCurrency, originSymbol } = useCurrencyContext();
  return { formatOriginAmount, originCurrency, originSymbol };
};

/**
 * Hook for components that only need destination currency formatting
 */
export const useDestinationCurrency = () => {
  const { formatDestinationAmount, destinationCurrency, destinationSymbol } = useCurrencyContext();
  return { formatDestinationAmount, destinationCurrency, destinationSymbol };
};

/**
 * Hook for admin components that need dual currency display
 */
export const useDualCurrencyDisplay = () => {
  const { formatDualAmount, formatOriginAmount, formatDestinationAmount } = useCurrencyContext();
  return { formatDualAmount, formatOriginAmount, formatDestinationAmount };
};