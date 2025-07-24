// =============================================
// User Activity Analytics Hook
// =============================================
// React Query hook for efficient fetching and caching of user activity data
// for intelligent recommendations and personalization features.
// Created: 2025-07-24
// =============================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { userActivityService, ACTIVITY_TYPES } from '@/services/UserActivityService';

// Activity data interfaces
export interface ActivityRecord {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: {
    // Product-specific fields
    product_id?: string;
    product_name?: string;
    product_url?: string;
    product_price?: number;
    
    // Quote-specific fields
    quote_id?: string;
    quote_status?: string;
    quote_value?: number;
    quote_type?: string;
    products_count?: number;
    destination_country?: string;
    
    // Order-specific fields
    order_id?: string;
    order_status?: string;
    order_value?: number;
    
    // Category and classification
    category?: string;
    
    // Metadata
    page_url?: string;
    referrer?: string;
    timestamp?: string;
    [key: string]: any;
  };
  session_id: string;
  created_at: string;
  user_agent: string;
  referrer: string;
}

// Analyzed activity patterns for recommendations
export interface ActivityPattern {
  // Product viewing patterns
  recentlyViewedProducts: {
    product_name: string;
    product_url?: string;
    product_price?: number;
    category?: string;
    viewCount: number;
    lastViewed: string;
    confidence: number;
  }[];
  
  // Category preferences based on quotes/orders
  preferredCategories: {
    category: string;
    frequency: number;
    averageValue: number;
    confidence: number;
  }[];
  
  // Quote completion patterns
  quoteCompletionHistory: {
    product_name?: string;
    category?: string;
    value?: number;
    destination_country?: string;
    completion_date: string;
  }[];
  
  // Price range preferences
  priceRangePreference: {
    min: number;
    max: number;
    average: number;
    confidence: number;
  };
  
  // Shopping behavior insights
  shoppingBehavior: {
    averageQuotesPerMonth: number;
    preferredDestinations: string[];
    mostActiveTimeOfDay: string;
    sessionDurationAverage: number;
  };
}

// Query keys for consistent cache management
export const activityKeys = {
  all: ['userActivity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (userId: string, filters?: any) => [...activityKeys.lists(), userId, filters] as const,
  patterns: () => [...activityKeys.all, 'patterns'] as const,
  pattern: (userId: string) => [...activityKeys.patterns(), userId] as const,
};

/**
 * Hook for fetching recent user activities with React Query caching
 */
export const useUserActivities = (
  activityTypes?: string[],
  options: {
    limit?: number;
    enabled?: boolean;
    staleTime?: number;
  } = {}
) => {
  const { user } = useAuth();
  const {
    limit = 50,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  return useQuery({
    queryKey: activityKeys.list(user?.id || '', { activityTypes, limit }),
    queryFn: async (): Promise<ActivityRecord[]> => {
      if (!user?.id) return [];
      
      try {
        const activities = await userActivityService.getRecentActivities(activityTypes, limit);
        return activities as ActivityRecord[];
      } catch (error) {
        console.warn('User activity data not available yet:', error);
        return [];
      }
    },
    enabled: enabled && !!user?.id,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for analyzing user activity patterns for recommendations
 */
export const useActivityPatterns = (options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const { enabled = true } = options;

  return useQuery({
    queryKey: activityKeys.pattern(user?.id || ''),
    queryFn: async (): Promise<ActivityPattern> => {
      if (!user?.id) {
        return {
          recentlyViewedProducts: [],
          preferredCategories: [],
          quoteCompletionHistory: [],
          priceRangePreference: { min: 0, max: 1000, average: 100, confidence: 0 },
          shoppingBehavior: {
            averageQuotesPerMonth: 0,
            preferredDestinations: [],
            mostActiveTimeOfDay: 'morning',
            sessionDurationAverage: 0,
          },
        };
      }

      try {
        // Fetch comprehensive activity data
        const allActivities = await userActivityService.getRecentActivities(undefined, 200);
        
        return analyzeActivityPatterns(allActivities as ActivityRecord[]);
      } catch (error) {
        console.warn('User activity analytics not available yet, using fallback data:', error);
        
        // Return default pattern for new users when table doesn't exist
        return {
          recentlyViewedProducts: [],
          preferredCategories: [],
          quoteCompletionHistory: [],
          priceRangePreference: { min: 50, max: 500, average: 150, confidence: 0 },
          shoppingBehavior: {
            averageQuotesPerMonth: 0,
            preferredDestinations: [],
            mostActiveTimeOfDay: 'afternoon',
            sessionDurationAverage: 0,
          },
        };
      }
    },
    enabled: enabled && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - patterns change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook for product view activities specifically
 */
export const useRecentProductViews = (limit: number = 20) => {
  return useUserActivities([ACTIVITY_TYPES.PRODUCT_VIEW], { limit });
};

/**
 * Hook for quote completion activities
 */
export const useQuoteHistory = (limit: number = 50) => {
  return useUserActivities([
    ACTIVITY_TYPES.QUOTE_CREATE_COMPLETE,
    ACTIVITY_TYPES.QUOTE_APPROVE,
  ], { limit });
};

/**
 * Hook for order completion activities
 */
export const useOrderHistory = (limit: number = 50) => {
  return useUserActivities([ACTIVITY_TYPES.ORDER_COMPLETE], { limit });
};

/**
 * Analyze raw activity data to extract patterns for recommendations
 */
function analyzeActivityPatterns(activities: ActivityRecord[]): ActivityPattern {
  // 1. Recently viewed products analysis
  const productViews = activities.filter(a => a.activity_type === ACTIVITY_TYPES.PRODUCT_VIEW);
  const productViewMap = new Map<string, {
    product_name: string;
    product_url?: string;
    product_price?: number;
    category?: string;
    viewCount: number;
    lastViewed: string;
  }>();

  productViews.forEach(view => {
    const { product_name, product_url, product_price, category } = view.activity_data;
    if (!product_name) return;

    const key = product_name.toLowerCase();
    const existing = productViewMap.get(key);
    
    if (existing) {
      existing.viewCount++;
      if (new Date(view.created_at) > new Date(existing.lastViewed)) {
        existing.lastViewed = view.created_at;
      }
    } else {
      productViewMap.set(key, {
        product_name,
        product_url,
        product_price,
        category: category || 'Uncategorized',
        viewCount: 1,
        lastViewed: view.created_at,
      });
    }
  });

  const recentlyViewedProducts = Array.from(productViewMap.values())
    .sort((a, b) => new Date(b.lastViewed).getTime() - new Date(a.lastViewed).getTime())
    .slice(0, 10)
    .map(product => ({
      ...product,
      confidence: Math.min(95, 60 + (product.viewCount * 10)), // Higher confidence for repeated views
    }));

  // 2. Category preferences from quotes and orders
  const categoryMap = new Map<string, { frequency: number; totalValue: number; }>();
  
  const quoteActivities = activities.filter(a => 
    a.activity_type === ACTIVITY_TYPES.QUOTE_CREATE_COMPLETE ||
    a.activity_type === ACTIVITY_TYPES.QUOTE_APPROVE
  );
  
  quoteActivities.forEach(activity => {
    const { category, quote_value, product_price, products_count } = activity.activity_data;
    const activityCategory = category || inferCategoryFromProductName(activity.activity_data.product_name) || 'General';
    const value = quote_value || (product_price * (products_count || 1)) || 0;
    
    const existing = categoryMap.get(activityCategory);
    if (existing) {
      existing.frequency++;
      existing.totalValue += value;
    } else {
      categoryMap.set(activityCategory, { frequency: 1, totalValue: value });
    }
  });

  const preferredCategories = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      frequency: data.frequency,
      averageValue: data.totalValue / data.frequency,
      confidence: Math.min(90, 40 + (data.frequency * 15)), // Higher confidence for frequent categories
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // 3. Quote completion history
  const quoteCompletionHistory = quoteActivities
    .map(activity => ({
      product_name: activity.activity_data.product_name,
      category: activity.activity_data.category || inferCategoryFromProductName(activity.activity_data.product_name),
      value: activity.activity_data.quote_value || activity.activity_data.product_price,
      destination_country: activity.activity_data.destination_country,
      completion_date: activity.created_at,
    }))
    .sort((a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime())
    .slice(0, 20);

  // 4. Price range analysis
  const pricePoints = activities
    .map(a => a.activity_data.product_price || a.activity_data.quote_value)
    .filter(price => price && price > 0);
    
  const priceRangePreference = {
    min: pricePoints.length > 0 ? Math.min(...pricePoints) : 0,
    max: pricePoints.length > 0 ? Math.max(...pricePoints) : 1000,
    average: pricePoints.length > 0 ? pricePoints.reduce((a, b) => a + b, 0) / pricePoints.length : 100,
    confidence: Math.min(80, pricePoints.length * 5), // Higher confidence with more data points
  };

  // 5. Shopping behavior insights
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentQuotes = quoteActivities.filter(a => 
    new Date(a.created_at) > thirtyDaysAgo
  );
  
  const destinations = activities
    .map(a => a.activity_data.destination_country)
    .filter(Boolean);
    
  const destinationCounts = destinations.reduce((acc, dest) => {
    acc[dest] = (acc[dest] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const preferredDestinations = Object.entries(destinationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([dest]) => dest);

  const shoppingBehavior = {
    averageQuotesPerMonth: recentQuotes.length,
    preferredDestinations,
    mostActiveTimeOfDay: 'afternoon', // Could be calculated from timestamps
    sessionDurationAverage: 15, // Could be calculated from session data
  };

  return {
    recentlyViewedProducts,
    preferredCategories,
    quoteCompletionHistory,
    priceRangePreference,
    shoppingBehavior,
  };
}

/**
 * Infer product category from product name using keyword matching
 */
function inferCategoryFromProductName(productName?: string): string | null {
  if (!productName) return null;
  
  const name = productName.toLowerCase();
  
  // Category mapping based on keywords
  const categoryKeywords = {
    'Electronics': [
      'iphone', 'ipad', 'macbook', 'laptop', 'computer', 'phone', 'smartphone',
      'headphones', 'earbuds', 'speaker', 'camera', 'tablet', 'monitor',
      'keyboard', 'mouse', 'gaming', 'console', 'tv', 'watch', 'fitbit'
    ],
    'Fashion': [
      'shirt', 't-shirt', 'dress', 'jeans', 'pants', 'shoes', 'sneakers',
      'jacket', 'coat', 'hoodie', 'sweater', 'blouse', 'skirt', 'shorts',
      'boots', 'sandals', 'handbag', 'wallet', 'belt', 'jewelry', 'watch'
    ],
    'Home & Garden': [
      'furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'curtains',
      'kitchen', 'cookware', 'dishes', 'plant', 'garden', 'tools', 'decor'
    ],
    'Sports & Outdoors': [
      'fitness', 'gym', 'exercise', 'running', 'cycling', 'swimming',
      'outdoor', 'camping', 'hiking', 'sports', 'ball', 'equipment'
    ],
    'Beauty & Health': [
      'skincare', 'makeup', 'cosmetics', 'perfume', 'shampoo', 'lotion',
      'cream', 'serum', 'health', 'vitamins', 'supplements'
    ],
    'Books & Media': [
      'book', 'novel', 'textbook', 'ebook', 'magazine', 'dvd', 'blu-ray',
      'music', 'vinyl', 'game', 'board game'
    ]
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

// Export utility functions
export { analyzeActivityPatterns, inferCategoryFromProductName };