import { useState, useEffect, useCallback } from 'react';
import {
  priceFormatter,
  PriceOptions,
  DualPriceOptions,
  PriceResult,
  DualPriceResult,
} from '@/lib/PriceFormatter';
import { useUserProfile } from './useUserProfile';

export interface UsePriceOptions {
  originCountry: string;
  destinationCountry?: string;
  userPreferredCurrency?: string;
  exchangeRate?: number;
  showWarnings?: boolean;
}

export interface UsePriceResult {
  formatPrice: (amount: number | null | undefined) => Promise<PriceResult>;
  formatDualPrice: (amount: number | null | undefined) => Promise<DualPriceResult>;
  isLoading: boolean;
  error: string | null;
}

export function usePrice(options: UsePriceOptions): UsePriceResult {
  const { data: userProfile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use user's preferred currency if not explicitly provided
  const effectiveOptions: PriceOptions = {
    ...options,
    userPreferredCurrency: options.userPreferredCurrency || userProfile?.preferred_display_currency,
  };

  const formatPrice = useCallback(
    async (amount: number | null | undefined): Promise<PriceResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await priceFormatter.formatPrice(amount, effectiveOptions);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format price';
        setError(errorMessage);

        // Return fallback result
        return {
          formatted: 'N/A',
          currency: 'USD',
          amount: 0,
          warning: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [
      effectiveOptions.originCountry,
      effectiveOptions.destinationCountry,
      effectiveOptions.userPreferredCurrency,
      effectiveOptions.exchangeRate,
    ],
  );

  const formatDualPrice = useCallback(
    async (amount: number | null | undefined): Promise<DualPriceResult> => {
      if (!options.destinationCountry) {
        throw new Error('destinationCountry is required for dual price formatting');
      }

      setIsLoading(true);
      setError(null);

      try {
        const dualOptions: DualPriceOptions = {
          originCountry: options.originCountry,
          destinationCountry: options.destinationCountry,
          exchangeRate: options.exchangeRate,
          showWarnings: options.showWarnings,
        };

        const result = await priceFormatter.formatDualPrice(amount, dualOptions);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format dual price';
        setError(errorMessage);

        // Return fallback result
        return {
          origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
          destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
          display: 'N/A',
          warning: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [options.originCountry, options.destinationCountry, options.exchangeRate, options.showWarnings],
  );

  return {
    formatPrice,
    formatDualPrice,
    isLoading,
    error,
  };
}

// Simplified hook for common use cases
export interface UseSimplePriceOptions {
  originCountry: string;
  destinationCountry?: string;
}

export function useSimplePrice(options: UseSimplePriceOptions) {
  const { data: userProfile } = useUserProfile();
  const [formattedAmount, setFormattedAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const formatAmount = useCallback(
    async (amount: number | null | undefined): Promise<string> => {
      if (!amount) return 'N/A';

      setIsLoading(true);

      try {
        const result = await priceFormatter.formatPrice(amount, {
          originCountry: options.originCountry,
          destinationCountry: options.destinationCountry,
          userPreferredCurrency: userProfile?.preferred_display_currency,
        });

        setFormattedAmount(result.formatted);
        return result.formatted;
      } catch (error) {
        console.error('Error formatting price:', error);
        const fallback = `$${amount.toLocaleString()}`;
        setFormattedAmount(fallback);
        return fallback;
      } finally {
        setIsLoading(false);
      }
    },
    [options.originCountry, options.destinationCountry, userProfile?.preferred_display_currency],
  );

  return {
    formatAmount,
    formattedAmount,
    isLoading,
  };
}

// Hook for admin dual currency display
export function useAdminPrice(options: { originCountry: string; destinationCountry: string }) {
  const [dualPrice, setDualPrice] = useState<DualPriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAdminPrice = useCallback(
    async (amount: number | null | undefined): Promise<DualPriceResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await priceFormatter.formatDualPrice(amount, {
          originCountry: options.originCountry,
          destinationCountry: options.destinationCountry,
          showWarnings: true, // Admins should see warnings
        });

        setDualPrice(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format admin price';
        setError(errorMessage);

        // Return fallback result
        const fallback: DualPriceResult = {
          origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
          destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
          display: 'N/A',
          warning: errorMessage,
        };

        setDualPrice(fallback);
        return fallback;
      } finally {
        setIsLoading(false);
      }
    },
    [options.originCountry, options.destinationCountry],
  );

  return {
    formatAdminPrice,
    dualPrice,
    isLoading,
    error,
  };
}
