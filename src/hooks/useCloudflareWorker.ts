/**
 * Hook for Cloudflare Worker API integration
 * 
 * Provides React Query integration for Worker endpoints
 * with caching, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cloudflareWorkerService } from '@/services/CloudflareWorkerService';
import { useToast } from '@/components/ui/use-toast';

// Query keys
const QUERY_KEYS = {
  exchangeRates: (currency?: string) => ['exchange-rates', currency],
  hsnLookup: (code: string) => ['hsn-lookup', code],
  hsnSearch: (query: string) => ['hsn-search', query],
  popularProducts: (category?: string, limit?: number) => ['popular-products', category, limit],
  health: ['worker-health'],
} as const;

/**
 * Hook for currency conversion
 */
export function useCurrencyConversion() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ amount, from, to }: { amount: number; from: string; to: string }) =>
      cloudflareWorkerService.convertCurrency(amount, from, to),
    onError: (error) => {
      toast({
        title: 'Conversion failed',
        description: 'Unable to convert currency. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for exchange rates
 */
export function useExchangeRates(currency?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.exchangeRates(currency),
    queryFn: () => cloudflareWorkerService.getExchangeRates(currency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for quote calculation
 */
export function useQuoteCalculation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cloudflareWorkerService.calculateQuote,
    onSuccess: (data) => {
      // Cache the result for future use
      queryClient.setQueryData(['quote-calculation', data], data);
    },
    onError: (error) => {
      toast({
        title: 'Calculation failed',
        description: 'Unable to calculate quote. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for HSN code lookup
 */
export function useHSNLookup(code: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.hsnLookup(code),
    queryFn: () => cloudflareWorkerService.lookupHSN(code),
    enabled: enabled && !!code,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for HSN search
 */
export function useHSNSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.hsnSearch(query),
    queryFn: () => cloudflareWorkerService.searchHSN(query),
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for product classification
 */
export function useProductClassification() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ product, origin, destination }: {
      product: string;
      origin?: string;
      destination?: string;
    }) => cloudflareWorkerService.classifyProduct(product, origin, destination),
    onError: (error) => {
      toast({
        title: 'Classification failed',
        description: 'Unable to classify product. Using default values.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for popular products
 */
export function usePopularProducts(category?: string, limit = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.popularProducts(category, limit),
    queryFn: () => cloudflareWorkerService.getPopularProducts(category, limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for Worker health check
 */
export function useWorkerHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: () => cloudflareWorkerService.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check every minute
  });
}

/**
 * Hook for batch currency conversions
 */
export function useBatchCurrencyConversion() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: cloudflareWorkerService.batchConvertCurrencies,
    onError: (error) => {
      toast({
        title: 'Batch conversion failed',
        description: 'Some conversions may have failed. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get edge location info
 */
export function useEdgeInfo() {
  return useQuery({
    queryKey: ['edge-info'],
    queryFn: () => cloudflareWorkerService.getEdgeInfo(),
    staleTime: Infinity, // Edge location doesn't change
  });
}

/**
 * Prefetch popular data on mount
 */
export function usePrefetchWorkerData() {
  const queryClient = useQueryClient();
  
  // Prefetch exchange rates
  queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.exchangeRates(),
    queryFn: () => cloudflareWorkerService.getExchangeRates(),
  });
  
  // Prefetch popular products
  queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.popularProducts(),
    queryFn: () => cloudflareWorkerService.getPopularProducts(),
  });
}

/**
 * Combined hook for quote item with HSN lookup
 */
export function useQuoteItemWithHSN(itemName: string) {
  const { mutateAsync: classifyProduct } = useProductClassification();
  
  return useMutation({
    mutationFn: async (item: { name: string; origin: string; destination: string }) => {
      // First classify the product
      const classification = await classifyProduct({
        product: item.name,
        origin: item.origin,
        destination: item.destination,
      });
      
      // Then lookup HSN details if we have a code
      if (classification.classification.hsn_code) {
        const hsnDetails = await cloudflareWorkerService.lookupHSN(
          classification.classification.hsn_code
        );
        
        return {
          ...classification,
          hsnDetails,
        };
      }
      
      return classification;
    },
  });
}