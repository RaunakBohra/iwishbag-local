import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Activity types for consistent tracking
export const ACTIVITY_TYPES = {
  // Quote-related activities
  QUOTE_VIEW: 'quote:view',
  QUOTE_CREATE_START: 'quote:create_start',
  QUOTE_CREATE_COMPLETE: 'quote:create_complete',
  QUOTE_APPROVE: 'quote:approve',
  QUOTE_REJECT: 'quote:reject',
  QUOTE_EDIT: 'quote:edit',

  // Product-related activities
  PRODUCT_VIEW: 'product:view',
  PRODUCT_SEARCH: 'product:search',
  PRODUCT_ADD_TO_CART: 'product:add_to_cart',

  // Order-related activities
  ORDER_VIEW: 'order:view',
  ORDER_TRACK: 'order:track',
  ORDER_COMPLETE: 'order:complete',

  // Dashboard activities
  DASHBOARD_VIEW: 'dashboard:view',
  METRICS_CLICK: 'metrics:click',

  // Support activities
  SUPPORT_REQUEST: 'support:request',
  SUPPORT_MESSAGE: 'support:message',

  // Navigation activities
  PAGE_VIEW: 'page:view',
  LINK_CLICK: 'link:click',
  BUTTON_CLICK: 'button:click',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

interface UserActivityData {
  // Common fields
  page_url?: string;
  referrer?: string;

  // Quote-specific fields
  quote_id?: string;
  quote_status?: string;
  quote_value?: number;

  // Product-specific fields
  product_id?: string;
  product_name?: string;
  product_url?: string;
  product_price?: number;

  // Order-specific fields
  order_id?: string;
  order_status?: string;
  order_value?: number;

  // Search-specific fields
  search_query?: string;
  search_results_count?: number;

  // UI interaction fields
  element_id?: string;
  element_text?: string;
  element_type?: string;

  // Additional metadata
  [key: string]: any;
}

class UserActivityService {
  private sessionId: string;
  private initialized: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    // Generate a unique session ID that persists for the browser session
    let sessionId = sessionStorage.getItem('iwish_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('iwish_session_id', sessionId);
    }
    return sessionId;
  }

  private initialize(): void {
    if (this.initialized) return;

    // Track page views automatically
    this.trackPageView();

    // Listen for page navigation changes
    window.addEventListener('popstate', () => {
      this.trackPageView();
    });

    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.trackActivity(ACTIVITY_TYPES.PAGE_VIEW, {
        page_url: window.location.href,
        action: 'page_leave',
        session_duration: this.getSessionDuration(),
      });
    });

    this.initialized = true;
  }

  private getSessionDuration(): number {
    const sessionStart = sessionStorage.getItem('iwish_session_start');
    if (!sessionStart) {
      const now = Date.now();
      sessionStorage.setItem('iwish_session_start', now.toString());
      return 0;
    }
    return Date.now() - parseInt(sessionStart);
  }

  private trackPageView(): void {
    this.trackActivity(ACTIVITY_TYPES.PAGE_VIEW, {
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      action: 'page_enter',
    });
  }

  /**
   * Track a user activity with comprehensive metadata
   */
  async trackActivity(
    activityType: ActivityType,
    activityData: UserActivityData = {},
  ): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // For anonymous users, we could store in localStorage for later sync
        // For now, we'll skip tracking for unauthenticated users
        return;
      }

      // Enrich activity data with browser metadata
      const enrichedData = {
        ...activityData,
        page_url: activityData.page_url || window.location.href,
        referrer: activityData.referrer || document.referrer,
        timestamp: new Date().toISOString(),
        session_duration: this.getSessionDuration(),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        user_agent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Insert activity record
      const { error } = await supabase.from('user_activity_analytics').insert({
        user_id: user.id,
        activity_type: activityType,
        activity_data: enrichedData,
        session_id: this.sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      });

      if (error) {
        console.warn('Failed to track user activity:', {
          error,
          activityType,
          userId: user.id,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
        });
        // Don't throw error to avoid disrupting user experience
      }
    } catch (error) {
      console.warn('User activity tracking error:', error);
      // Silently fail to avoid disrupting user experience
    }
  }

  /**
   * Track quote-related activities
   */
  async trackQuoteActivity(
    activityType: ActivityType,
    quoteId: string,
    additionalData: UserActivityData = {},
  ): Promise<void> {
    return this.trackActivity(activityType, {
      quote_id: quoteId,
      ...additionalData,
    });
  }

  /**
   * Track product-related activities
   */
  async trackProductActivity(
    activityType: ActivityType,
    productData: {
      productId?: string;
      productName?: string;
      productUrl?: string;
      productPrice?: number;
    },
    additionalData: UserActivityData = {},
  ): Promise<void> {
    return this.trackActivity(activityType, {
      product_id: productData.productId,
      product_name: productData.productName,
      product_url: productData.productUrl,
      product_price: productData.productPrice,
      ...additionalData,
    });
  }

  /**
   * Track search activities with query and results
   */
  async trackSearchActivity(
    query: string,
    resultsCount: number,
    additionalData: UserActivityData = {},
  ): Promise<void> {
    return this.trackActivity(ACTIVITY_TYPES.PRODUCT_SEARCH, {
      search_query: query,
      search_results_count: resultsCount,
      ...additionalData,
    });
  }

  /**
   * Track UI interactions (button clicks, etc.)
   */
  async trackUIInteraction(
    elementId: string,
    elementType: string,
    elementText?: string,
    additionalData: UserActivityData = {},
  ): Promise<void> {
    return this.trackActivity(ACTIVITY_TYPES.BUTTON_CLICK, {
      element_id: elementId,
      element_type: elementType,
      element_text: elementText,
      ...additionalData,
    });
  }

  /**
   * Get user's recent activities for recommendations
   */
  async getRecentActivities(activityTypes?: ActivityType[], limit: number = 50): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('user_activity_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Failed to fetch recent activities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Get activity analytics for a time period
   */
  async getActivityAnalytics(
    startDate: Date,
    endDate: Date = new Date(),
  ): Promise<{ [key: string]: number }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from('user_activity_analytics')
        .select('activity_type')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.warn('Failed to fetch activity analytics:', error);
        return {};
      }

      // Count activities by type
      const analytics: { [key: string]: number } = {};
      data?.forEach((activity) => {
        analytics[activity.activity_type] = (analytics[activity.activity_type] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.warn('Error fetching activity analytics:', error);
      return {};
    }
  }
}

// Export singleton instance
export const userActivityService = new UserActivityService();

// Export types for use in other components
export type { UserActivityData, ActivityType };
