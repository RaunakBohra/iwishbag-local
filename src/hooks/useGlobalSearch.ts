// =============================================
// Global Search Hook
// =============================================
// React Query hook for efficient global search with caching, debouncing,
// and comprehensive search capabilities across the iwishBag platform.
// Created: 2025-07-24
// =============================================

import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  searchService,
  SearchResult,
  SearchSuggestion,
  QuickAction,
} from '@/services/SearchService';
import { useUserRoles } from '@/hooks/useUserRoles';

// Query keys for consistent cache management
export const globalSearchKeys = {
  all: ['globalSearch'] as const,
  searches: () => [...globalSearchKeys.all, 'search'] as const,
  search: (query: string, userId?: string) =>
    [...globalSearchKeys.searches(), query, userId] as const,
  suggestions: () => [...globalSearchKeys.all, 'suggestions'] as const,
  suggestion: (query: string, userId?: string) =>
    [...globalSearchKeys.suggestions(), query, userId] as const,
  quickActions: () => [...globalSearchKeys.all, 'quickActions'] as const,
};

/**
 * Hook for global search with debouncing and caching
 */
export const useGlobalSearch = (
  query: string,
  options: {
    enabled?: boolean;
    limit?: number;
    debounceMs?: number;
    enableCache?: boolean;
  } = {},
) => {
  const { user } = useAuth();
  const { enabled = true, limit = 20, debounceMs = 300, enableCache = true } = options;

  // Debounce the search query to avoid excessive API calls
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  return useQuery({
    queryKey: globalSearchKeys.search(debouncedQuery, user?.id),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length === 0) {
        return [];
      }

      return searchService.globalSearch(debouncedQuery, {
        limit,
        enableCache,
        userId: user?.id,
      });
    },
    enabled: enabled && !!user && debouncedQuery.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - search results can be relatively fresh
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry on certain errors
      if (error?.message?.includes('RLS') || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for search suggestions/autocomplete
 */
export const useSearchSuggestions = (
  query: string,
  options: {
    enabled?: boolean;
    limit?: number;
    debounceMs?: number;
    minQueryLength?: number;
  } = {},
) => {
  const { user } = useAuth();
  const { enabled = true, limit = 8, debounceMs = 200, minQueryLength = 2 } = options;

  // Debounce with shorter delay for suggestions
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  return useQuery({
    queryKey: globalSearchKeys.suggestion(debouncedQuery, user?.id),
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length < minQueryLength) {
        return [];
      }

      return searchService.getSearchSuggestions(debouncedQuery, {
        limit,
        enableCache: true,
        userId: user?.id,
      });
    },
    enabled: enabled && !!user && debouncedQuery.trim().length >= minQueryLength,
    staleTime: 5 * 60 * 1000, // 5 minutes - suggestions can be cached longer
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1, // Minimal retry for suggestions
  });
};

/**
 * Hook for quick actions based on user role
 */
export const useQuickActions = (
  options: {
    enabled?: boolean;
  } = {},
) => {
  const { enabled = true } = options;
  const { roles, primaryRole } = useUserRoles();

  const quickActions = useMemo(() => {
    return searchService.getQuickActions(primaryRole);
  }, [primaryRole]);

  return useQuery({
    queryKey: globalSearchKeys.quickActions(),
    queryFn: async (): Promise<QuickAction[]> => {
      return quickActions;
    },
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes - quick actions rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    initialData: quickActions, // Provide immediate data
  });
};

/**
 * Hook for combined search results and quick actions
 */
export const useCommandPaletteData = (
  query: string,
  options: {
    enabled?: boolean;
    searchLimit?: number;
    debounceMs?: number;
    showQuickActions?: boolean;
  } = {},
) => {
  const { enabled = true, searchLimit = 15, debounceMs = 300, showQuickActions = true } = options;

  // Get search results
  const searchQuery = useGlobalSearch(query, {
    enabled: enabled && query.trim().length > 0,
    limit: searchLimit,
    debounceMs,
  });

  // Get quick actions
  const quickActionsQuery = useQuickActions({
    enabled: enabled && showQuickActions,
  });

  // Get search suggestions
  const suggestionsQuery = useSearchSuggestions(query, {
    enabled: enabled && query.trim().length > 0 && query.trim().length < 10,
    debounceMs: debounceMs / 2, // Faster suggestions
  });

  // Filter quick actions based on search query when searching
  const filteredQuickActions = useMemo(() => {
    if (!query.trim() || !quickActionsQuery.data) {
      return quickActionsQuery.data || [];
    }

    const searchLower = query.toLowerCase();
    return quickActionsQuery.data.filter(
      (action) =>
        action.title.toLowerCase().includes(searchLower) ||
        action.description.toLowerCase().includes(searchLower),
    );
  }, [query, quickActionsQuery.data]);

  return {
    // Search results
    searchResults: searchQuery.data || [],
    isSearching: searchQuery.isLoading,
    searchError: searchQuery.error,

    // Quick actions
    quickActions: filteredQuickActions,
    isLoadingQuickActions: quickActionsQuery.isLoading,
    quickActionsError: quickActionsQuery.error,

    // Suggestions
    suggestions: suggestionsQuery.data || [],
    isLoadingSuggestions: suggestionsQuery.isLoading,
    suggestionsError: suggestionsQuery.error,

    // Combined loading state
    isLoading: searchQuery.isLoading || quickActionsQuery.isLoading,
    hasError: !!searchQuery.error || !!quickActionsQuery.error,

    // Utility functions
    refetchSearch: searchQuery.refetch,
    refetchQuickActions: quickActionsQuery.refetch,
  };
};

/**
 * Hook for logging search interactions
 */
export const useSearchAnalytics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logSearchSelection = async (query: string, selectedResult: SearchResult) => {
    if (!user?.id) return;

    try {
      await searchService.logSearchSelection(user.id, query, selectedResult);

      // Optionally invalidate analytics queries if they exist
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'search'],
      });
    } catch (error) {
      console.error('Error logging search selection:', error);
    }
  };

  const clearSearchCache = () => {
    searchService.clearCache();
    queryClient.invalidateQueries({
      queryKey: globalSearchKeys.all,
    });
  };

  const getSearchCacheStats = () => {
    return searchService.getCacheStats();
  };

  return {
    logSearchSelection,
    clearSearchCache,
    getSearchCacheStats,
  };
};

/**
 * Custom hook for debounced values
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Re-export for convenience
export { searchService, type SearchResult, type SearchSuggestion, type QuickAction };
