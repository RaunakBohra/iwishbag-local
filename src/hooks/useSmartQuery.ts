import { 
  useQuery, 
  UseQueryOptions, 
  UseQueryResult,
  QueryKey 
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface SmartQueryOptions<TData> extends UseQueryOptions<TData> {
  // Minimum time to wait before considering data "ready"
  minReadyDelay?: number;
  // Dependencies that must be loaded before this query
  waitFor?: Array<{ data: any; isLoading: boolean }>;
  // Transform function to ensure data structure
  ensureStructure?: (data: any) => TData;
}

/**
 * Enhanced useQuery that automatically handles timing issues
 * Use this instead of regular useQuery throughout the app
 */
export function useSmartQuery<TData = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: SmartQueryOptions<TData>
): UseQueryResult<TData> & { isReady: boolean } {
  const [isReady, setIsReady] = useState(false);
  const [hasDelayPassed, setHasDelayPassed] = useState(!options?.minReadyDelay);
  
  // Check if dependencies are ready
  const dependenciesReady = !options?.waitFor || 
    options.waitFor.every(dep => !dep.isLoading && dep.data);
  
  // Only run query when dependencies are ready
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      
      // Apply structure transformation if provided
      if (options?.ensureStructure) {
        return options.ensureStructure(data);
      }
      
      return data;
    },
    ...options,
    enabled: (options?.enabled ?? true) && dependenciesReady,
  });
  
  // Handle minimum ready delay
  useEffect(() => {
    if (options?.minReadyDelay && !hasDelayPassed) {
      const timer = setTimeout(() => {
        setHasDelayPassed(true);
      }, options.minReadyDelay);
      return () => clearTimeout(timer);
    }
  }, [options?.minReadyDelay]);
  
  // Determine if data is ready
  useEffect(() => {
    const dataLoaded = !query.isLoading && query.data !== undefined;
    const allReady = dataLoaded && hasDelayPassed && dependenciesReady;
    setIsReady(allReady);
  }, [query.isLoading, query.data, hasDelayPassed, dependenciesReady]);
  
  return {
    ...query,
    isReady,
  };
}

/**
 * Hook for country data with automatic timing handling
 */
export function useSmartCountries() {
  return useSmartQuery(
    ['country_settings_smart', 'all'],
    async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      minReadyDelay: 100,
      staleTime: 30 * 60 * 1000, // 30 minutes
      ensureStructure: (data) => Array.isArray(data) ? data : [],
    }
  );
}

/**
 * Hook for user profile with automatic timing handling
 */
export function useSmartProfile(userId?: string) {
  return useSmartQuery(
    ['profile_smart', userId],
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    {
      enabled: !!userId,
      minReadyDelay: 50,
    }
  );
}

// Import at the component level
import { supabase } from '@/integrations/supabase/client';