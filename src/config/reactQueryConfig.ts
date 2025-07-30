import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

/**
 * Global React Query configuration with timing fixes
 */
export function createQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error('[QueryCache] Error:', { 
        key: query.queryKey, 
        error 
      });
    },
    onSuccess: (data, query) => {
      console.log('[QueryCache] Success:', { 
        key: query.queryKey, 
        dataLength: Array.isArray(data) ? data.length : 'not-array' 
      });
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('[MutationCache] Error:', { 
        mutationKey: mutation.options.mutationKey,
        error 
      });
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Always wait a bit before considering data stale
        staleTime: 10 * 1000, // 10 seconds
        
        // Keep data in cache longer
        gcTime: 30 * 60 * 1000, // 30 minutes
        
        // Refetch settings
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: true,
        
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
        
        // Network mode
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
        networkMode: 'offlineFirst',
      },
    },
  });
}

/**
 * Global query defaults for common queries
 */
export const QUERY_DEFAULTS = {
  countries: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  profile: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  currencies: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;