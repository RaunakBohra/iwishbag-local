import { useQuery } from 'react-query';
import { logger } from '@/lib/logger';

// Edge API URL - can be configured via environment variable
const EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || 'https://iwishbag-edge-api.rnkbohra.workers.dev';

/**
 * Custom hook for fetching data from D1 edge cache
 * Falls back to Supabase if edge API fails
 */
export function useD1Cache<T>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    fallbackToSupabase?: boolean;
  }
) {
  const queryKey = Array.isArray(key) ? key : [key];
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    fallbackToSupabase = true,
  } = options || {};

  return useQuery(
    queryKey,
    async () => {
      try {
        // Build the edge API URL based on the key
        const endpoint = buildEndpoint(queryKey);
        
        if (endpoint) {
          const response = await fetch(`${EDGE_API_URL}${endpoint}`);
          
          if (response.ok) {
            const data = await response.json();
            logger.info('D1 cache hit', { key: queryKey });
            return extractData(queryKey, data) as T;
          }
        }
      } catch (error) {
        logger.warn('D1 cache error, falling back', { error, key: queryKey });
      }

      // Fallback to Supabase
      if (fallbackToSupabase) {
        logger.info('Using Supabase fallback', { key: queryKey });
        return fetcher();
      }

      throw new Error('D1 cache miss and fallback disabled');
    },
    {
      staleTime,
      cacheTime,
      retry: fallbackToSupabase ? 2 : 0,
    }
  );
}

/**
 * Build edge API endpoint from query key
 */
function buildEndpoint(key: string[]): string | null {
  const [type, ...params] = key;

  switch (type) {
    case 'country':
      return params[0] ? `/api/countries/${params[0]}` : '/api/countries';
    
    case 'exchange-rate':
      return `/api/currency/rates?from=${params[0]}&to=${params[1]}`;
    
    case 'currency-rates':
      return '/api/currency/rates';
    
    case 'popular-products':
      return `/api/products/popular?limit=${params[0] || 10}`;
    
    case 'hsn-tax':
      return `/api/hsn/tax?hsn=${params[0]}&origin=${params[1]}&destination=${params[2]}`;
    
    default:
      return null;
  }
}

/**
 * Extract data from edge API response
 */
function extractData(key: string[], response: any): any {
  const [type] = key;

  switch (type) {
    case 'country':
      return response.country || response.countries;
    
    case 'exchange-rate':
      return response.rate;
    
    case 'currency-rates':
      return response;
    
    case 'popular-products':
      return response.products;
    
    case 'hsn-tax':
      return response.taxRates;
    
    default:
      return response;
  }
}

/**
 * Hook for tracking product access
 */
export function useTrackProductAccess() {
  return async (productId: string, action: 'search' | 'purchase' = 'search') => {
    try {
      await fetch(`${EDGE_API_URL}/api/products/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action }),
      });
    } catch (error) {
      logger.warn('Failed to track product access', { error, productId, action });
    }
  };
}