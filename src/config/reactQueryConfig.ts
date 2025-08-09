import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

/**
 * Enhanced React Query configuration with advanced caching and smart invalidation
 */
export function createQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error('[QueryCache] Error:', { 
        key: query.queryKey, 
        error 
      });
      
      // Track failed queries for smart invalidation
      trackQueryError(query.queryKey, error);
    },
    onSuccess: (data, query) => {
      if (import.meta.env.DEV) {
        console.log('[QueryCache] Success:', { 
          key: query.queryKey, 
          dataLength: Array.isArray(data) ? data.length : 'not-array' 
        });
      }
      
      // Track successful queries for performance metrics
      trackQuerySuccess(query.queryKey, data);
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('[MutationCache] Error:', { 
        mutationKey: mutation.options.mutationKey,
        error 
      });
    },
    onSuccess: (data, variables, context, mutation) => {
      // Smart invalidation based on mutation type
      smartInvalidateQueries(mutation.options.mutationKey, data, variables);
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Enhanced stale time with connection awareness
        staleTime: getOptimalStaleTime(),
        
        // Longer cache time for better offline experience
        gcTime: 60 * 60 * 1000, // 1 hour
        
        // Smarter refetch settings
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: (query) => {
          // Only refetch on mount if data is stale
          if (!query || !query.state) return true;
          return (query.state.dataUpdatedAt || 0) < Date.now() - getOptimalStaleTime();
        },
        
        // Enhanced retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx client errors
          if (error?.status >= 400 && error?.status < 500) return false;
          
          // Don't retry on network errors if offline
          if (!navigator.onLine) return false;
          
          // Progressive retry limits based on error type
          if (error?.status >= 500) return failureCount < 3; // Server errors
          return failureCount < 2; // Other errors
        },
        retryDelay: (attemptIndex, error) => {
          // Exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 10000);
          const jitter = Math.random() * 1000;
          return baseDelay + jitter;
        },
        
        // Enhanced network mode
        networkMode: 'offlineFirst',
        
        // Enable background refetching for better UX
        refetchInterval: (data, query) => {
          // Auto-refresh critical data every 5 minutes when focused
          if (query && document.hasFocus() && isCriticalQuery(query.queryKey)) {
            return 5 * 60 * 1000; // 5 minutes
          }
          return false;
        },
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // More aggressive retry for mutations
          if (error?.status >= 400 && error?.status < 500) return false;
          if (!navigator.onLine) return false;
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
        networkMode: 'offlineFirst',
        
        // Global mutation side effects
        onError: (error, variables, context) => {
          // Show user-friendly error notifications
          handleMutationError(error);
        },
        onSuccess: (data, variables, context) => {
          // Track successful mutations for analytics
          trackMutationSuccess(variables);
        },
      },
    },
  });
}

// Smart invalidation logic
function smartInvalidateQueries(mutationKey: any, data: any, variables: any): void {
  const queryClient = window.__REACT_QUERY_CLIENT__;
  if (!queryClient) return;

  const keyStr = Array.isArray(mutationKey) ? mutationKey[0] : mutationKey;
  
  // Define invalidation patterns
  const invalidationMap: Record<string, string[]> = {
    'createQuote': ['quotes', 'dashboard-stats'],
    'updateQuote': ['quotes', 'quote'],
    'deleteQuote': ['quotes', 'dashboard-stats'],
    'createOrder': ['orders', 'quotes', 'dashboard-stats'],
    'updateOrder': ['orders', 'order'],
    'updateProfile': ['profile', 'user'],
    'updateSettings': ['settings', 'countries', 'currencies'],
  };

  const keysToInvalidate = invalidationMap[keyStr] || [];
  
  keysToInvalidate.forEach((key) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
        return queryKey === key;
      },
    });
  });

  console.log(`🔄 Smart invalidation triggered for: ${keyStr} -> [${keysToInvalidate.join(', ')}]`);
}

// Connection-aware stale time
function getOptimalStaleTime(): number {
  if (typeof navigator === 'undefined') return 30 * 1000; // 30 seconds default

  const connection = (navigator as any).connection;
  if (!connection) return 30 * 1000;

  // Longer stale times for slower connections
  switch (connection.effectiveType) {
    case '4g':
      return 30 * 1000; // 30 seconds
    case '3g':
      return 60 * 1000; // 1 minute
    case '2g':
    case 'slow-2g':
      return 5 * 60 * 1000; // 5 minutes
    default:
      return 30 * 1000;
  }
}

// Check if query is critical and needs frequent updates
function isCriticalQuery(queryKey: unknown): boolean {
  const criticalQueries = ['quotes', 'orders', 'profile', 'dashboard-stats'];
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  return criticalQueries.includes(String(key));
}

// Performance tracking functions
function trackQueryError(queryKey: unknown, error: any): void {
  if (import.meta.env.DEV) {
    console.warn(`❌ Query failed: ${JSON.stringify(queryKey)}`, error);
  }
  
  // Could send to analytics here
}

function trackQuerySuccess(queryKey: unknown, data: any): void {
  // Track successful queries for performance insights
  if (typeof window !== 'undefined' && window.performance) {
    const mark = `query-success-${JSON.stringify(queryKey)}`;
    window.performance.mark(mark);
  }
}

function trackMutationSuccess(variables: any): void {
  // Track successful mutations for analytics
  if (import.meta.env.DEV) {
    console.log('✅ Mutation successful:', variables);
  }
}

function handleMutationError(error: any): void {
  // Could show toast notifications or handle specific error types
  console.error('❌ Mutation failed:', error);
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