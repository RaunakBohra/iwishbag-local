// =============================================
// Global Search Service
// =============================================
// Comprehensive search service for the iwishBag platform that provides
// global search capabilities across quotes, users, support tickets, and more.
// Created: 2025-07-24
// =============================================

import { supabase } from '@/integrations/supabase/client';
import { userActivityService } from './UserActivityService';

// Search result interfaces
export interface SearchResult {
  id: string;
  type: 'quote' | 'user' | 'support_ticket' | 'product' | 'order';
  title: string;
  description: string;
  url: string;
  metadata: Record<string, unknown>;
  relevance_score: number;
  created_at: string;
}

export interface SearchSuggestion {
  suggestion: string;
  type: 'quote' | 'customer' | 'user' | 'product';
  count: number;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  shortcut?: string;
  category: 'navigation' | 'creation' | 'management';
}

// Search configuration
interface SearchConfig {
  debounceMs: number;
  maxResults: number;
  maxSuggestions: number;
  enableAnalytics: boolean;
}

const DEFAULT_CONFIG: SearchConfig = {
  debounceMs: 300,
  maxResults: 20,
  maxSuggestions: 8,
  enableAnalytics: true,
};

class SearchService {
  private config: SearchConfig;
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private suggestionCache: Map<string, { suggestions: SearchSuggestion[]; timestamp: number }> =
    new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform global search across all data types
   */
  async globalSearch(
    query: string,
    options: {
      limit?: number;
      enableCache?: boolean;
      userId?: string;
    } = {},
  ): Promise<SearchResult[]> {
    try {
      const { limit = this.config.maxResults, enableCache = true, userId } = options;

      // Return empty results for empty queries
      if (!query || query.trim().length === 0) {
        return [];
      }

      const cacheKey = `${query.toLowerCase()}_${limit}_${userId || 'anonymous'}`;

      // Check cache first
      if (enableCache && this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.results;
        }
      }

      // Get current user for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const searchUserId = userId || user?.id;

      // Call Supabase RPC function
      const { data, error } = await supabase.rpc('search_global', {
        search_query: query.trim(),
        user_id: searchUserId,
        result_limit: limit,
      });

      if (error) {
        console.error('Global search error:', {
          error,
          query,
          userId: searchUserId,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details
        });
        // Return fallback results instead of throwing to prevent UI crashes
        return this.getFallbackResults(query);
      }

      const results: SearchResult[] = data || [];

      // Cache the results
      if (enableCache) {
        this.searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
        });
      }

      // Log search activity for analytics
      if (this.config.enableAnalytics && searchUserId) {
        await this.logSearchActivity(searchUserId, query, results.length);
      }

      return results;
    } catch (error) {
      console.error('Error performing global search:', error);

      // Return fallback results or empty array
      return this.getFallbackResults(query);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(
    query: string,
    options: {
      limit?: number;
      enableCache?: boolean;
      userId?: string;
    } = {},
  ): Promise<SearchSuggestion[]> {
    try {
      const { limit = this.config.maxSuggestions, enableCache = true, userId } = options;

      // Return empty suggestions for very short queries
      if (!query || query.trim().length < 2) {
        return [];
      }

      const cacheKey = `suggestions_${query.toLowerCase()}_${limit}_${userId || 'anonymous'}`;

      // Check cache first
      if (enableCache && this.suggestionCache.has(cacheKey)) {
        const cached = this.suggestionCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.suggestions;
        }
      }

      // Get current user for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const searchUserId = userId || user?.id;

      // Call Supabase RPC function
      const { data, error } = await supabase.rpc('get_search_suggestions', {
        search_query: query.trim(),
        user_id: searchUserId,
        suggestion_limit: limit,
      });

      if (error) {
        console.error('Search suggestions error:', {
          error,
          query,
          userId: searchUserId,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details
        });
        return [];
      }

      const suggestions: SearchSuggestion[] = data || [];

      // Cache the suggestions
      if (enableCache) {
        this.suggestionCache.set(cacheKey, {
          suggestions,
          timestamp: Date.now(),
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get predefined quick actions
   */
  getQuickActions(userRole?: string): QuickAction[] {
    const baseActions: QuickAction[] = [
      {
        id: 'new_quote',
        title: 'Request New Quote',
        description: 'Create a new quote request',
        url: '/quote',
        icon: 'Plus',
        shortcut: 'N',
        category: 'creation',
      },
      {
        id: 'my_quotes',
        title: 'View My Quotes',
        description: 'See all my quote requests',
        url: '/quotes',
        icon: 'FileText',
        category: 'navigation',
      },
      {
        id: 'my_orders',
        title: 'View My Orders',
        description: 'Check order status and tracking',
        url: '/orders',
        icon: 'Package',
        category: 'navigation',
      },
      {
        id: 'track_order',
        title: 'Track Order',
        description: 'Track an order by tracking ID',
        url: '/track',
        icon: 'MapPin',
        category: 'navigation',
      },
      {
        id: 'support',
        title: 'Get Support',
        description: 'Contact customer support',
        url: '/support',
        icon: 'HelpCircle',
        category: 'navigation',
      },
      {
        id: 'profile',
        title: 'My Profile',
        description: 'Manage account settings',
        url: '/profile',
        icon: 'User',
        category: 'management',
      },
    ];

    // Add admin-specific actions
    if (userRole === 'admin' || userRole === 'moderator') {
      baseActions.push(
        {
          id: 'admin_dashboard',
          title: 'Admin Dashboard',
          description: 'Access admin dashboard',
          url: '/admin',
          icon: 'BarChart3',
          category: 'management',
        },
        {
          id: 'admin_quotes',
          title: 'Manage Quotes',
          description: 'Manage all quote requests',
          url: '/admin/quotes',
          icon: 'FileText',
          category: 'management',
        },
        {
          id: 'admin_users',
          title: 'Manage Users',
          description: 'User management and roles',
          url: '/admin/users',
          icon: 'Users',
          category: 'management',
        },
        {
          id: 'admin_support',
          title: 'Support Center',
          description: 'Manage support tickets',
          url: '/admin/support',
          icon: 'MessageSquare',
          category: 'management',
        },
      );
    }

    return baseActions;
  }

  /**
   * Log search result selection
   */
  async logSearchSelection(
    userId: string,
    query: string,
    selectedResult: SearchResult,
  ): Promise<void> {
    try {
      if (!this.config.enableAnalytics) return;

      // Call Supabase RPC function to log the selection
      await supabase.rpc('log_search_activity', {
        user_id: userId,
        search_query: query,
        result_count: 1,
        selected_result_id: selectedResult.id,
        selected_result_type: selectedResult.type,
      });
    } catch (error) {
      console.error('Error logging search selection:', error);
    }
  }

  /**
   * Log search activity for analytics
   */
  private async logSearchActivity(
    userId: string,
    query: string,
    resultCount: number,
  ): Promise<void> {
    try {
      // Use both UserActivityService and RPC function for comprehensive tracking
      await Promise.all([
        userActivityService.trackSearchActivity(query, resultCount, {
          search_source: 'command_palette',
          search_context: 'global_search',
        }),
        supabase.rpc('log_search_activity', {
          user_id: userId,
          search_query: query,
          result_count: resultCount,
        }),
      ]);
    } catch (error) {
      console.error('Error logging search activity:', error);
    }
  }

  /**
   * Get fallback results when search fails
   */
  private getFallbackResults(query: string): SearchResult[] {
    // Provide helpful fallback suggestions based on query patterns
    const fallbackResults: SearchResult[] = [];

    // Check if query looks like a quote ID
    if (/^Q\d+$/.test(query.toUpperCase()) || /^\d+$/.test(query)) {
      fallbackResults.push({
        id: 'fallback_quote_search',
        type: 'quote',
        title: `Search for Quote "${query}"`,
        description: 'Could not find this quote. Try checking the quote ID or browse all quotes.',
        url: '/quotes',
        metadata: { fallback: true, original_query: query },
        relevance_score: 0,
        created_at: new Date().toISOString(),
      });
    }

    // Check if query looks like an email
    if (query.includes('@')) {
      fallbackResults.push({
        id: 'fallback_customer_search',
        type: 'user',
        title: `Search for Customer "${query}"`,
        description:
          'Could not find this customer. Try browsing all customers or checking the email address.',
        url: '/admin/users',
        metadata: { fallback: true, original_query: query },
        relevance_score: 0,
        created_at: new Date().toISOString(),
      });
    }

    return fallbackResults;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.suggestionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { searchCacheSize: number; suggestionCacheSize: number } {
    return {
      searchCacheSize: this.searchCache.size,
      suggestionCacheSize: this.suggestionCache.size,
    };
  }
}

// Export singleton instance
export const searchService = new SearchService();

// Export types for use in components
export type { SearchResult, SearchSuggestion, QuickAction, SearchConfig };
