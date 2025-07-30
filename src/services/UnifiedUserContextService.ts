/**
 * Unified User Context Service - Single Source of Truth for User Data
 * 
 * This service provides a unified interface for accessing and managing user context
 * across all iwishBag services. It consolidates customer profiles, preferences,
 * permissions, and activity data into a cohesive user experience.
 * 
 * Integrates with all major services to provide consistent user data access.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { currencyService } from '@/services/CurrencyService';
import type { CountrySettings } from '@/types/CountrySettings';

// ============================================================================
// UNIFIED USER CONTEXT TYPES
// ============================================================================

export interface UnifiedUserProfile {
  // Core identity
  id: string;
  email: string;
  full_name: string | null;
  display_name: string;
  avatar_url: string | null;
  
  // Authentication & roles
  role: 'user' | 'moderator' | 'admin';
  permissions: string[];
  is_authenticated: boolean;
  
  // Contact & preferences
  phone_number: string | null;
  country_code: string;
  preferred_language: string;
  timezone: string;
  
  // Business context
  customer_data: CustomerContext;
  package_forwarding: PackageForwardingContext;
  preferences: UserPreferences;
  
  // Activity & engagement
  activity_summary: ActivitySummary;
  
export interface CustomerContext {
  // Profile status
  profile_type: 'registered' | 'guest' | 'admin_created' | 'oauth';
  is_verified: boolean;
  verification_level: 'none' | 'email' | 'phone' | 'full';
  
  // Business metrics
  total_quotes: number;
  total_orders: number;
  total_spent_usd: number;
  lifetime_value: number;
  
  // Current context
  active_quotes: number;
  pending_payments: number;
  in_transit_orders: number;
  
  // Relationship data
  joined_date: string;
  last_order_date: string | null;
  customer_segment: 'new' | 'regular' | 'vip' | 'inactive';
}

export interface PackageForwardingContext {
  // Virtual addresses
  assigned_addresses: VirtualAddress[];
  default_address_id: string | null;
  
  // Package metrics
  total_packages_received: number;
  packages_in_warehouse: number;
  total_consolidations: number;
  
  // Financial context
  outstanding_storage_fees: number;
  total_shipping_spent: number;
  
  // Service preferences
  auto_consolidation_enabled: boolean;
  preferred_carrier: string | null;
  storage_alert_threshold: number;
}

export interface UserPreferences {
  // Display preferences
  currency_code: string;
  date_format: string;
  number_format: string;
  
  // Communication preferences
  email_
export interface ActivitySummary {
  // Recent activity
  last_login: string | null;
  login_count_30d: number;
  page_views_30d: number;
  
  // Engagement metrics
  quotes_created_30d: number;
  orders_placed_30d: number;
  support_tickets_30d: number;
  
  // Behavioral insights
  favorite_categories: string[];
  preferred_shopping_times: string[];
  average_order_value: number;
}

export interface NotificationPreferences {
  // Channel preferences
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  
  // Content preferences
  order_updates: boolean;
  promotional_offers: boolean;
  system_announcements: boolean;
  package_alerts: boolean;
  
  // Timing preferences
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: 'real_time' | 'daily' | 'weekly' | 'never';
}

export interface VirtualAddress {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  type: 'shipping' | 'billing';
  full_address: string;
  is_default: boolean;
  country_code: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last_four: string;
  is_default: boolean;
  is_verified: boolean;
}

// ============================================================================
// UNIFIED USER CONTEXT SERVICE
// ============================================================================

class UnifiedUserContextService {
  private static instance: UnifiedUserContextService;
  private userCache = new Map<string, { data: UnifiedUserProfile; expires: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): UnifiedUserContextService {
    if (!UnifiedUserContextService.instance) {
      UnifiedUserContextService.instance = new UnifiedUserContextService();
    }
    return UnifiedUserContextService.instance;
  }

  // ============================================================================
  // CORE USER CONTEXT METHODS
  // ============================================================================

  /**
   * Get complete unified user context
   */
  async getUserContext(userId?: string): Promise<UnifiedUserProfile | null> {
    try {
      // Get current user if not specified
      const targetUserId = userId || await this.getCurrentUserId();
      if (!targetUserId) return null;

      // Check cache first
      const cached = this.getCachedUser(targetUserId);
      if (cached) return cached;

      // Build unified profile
      const profile = await this.buildUnifiedProfile(targetUserId);
      
      // Cache the result
      if (profile) {
        this.cacheUser(targetUserId, profile);
      }

      return profile;
    } catch (error) {
      this.handleError('getUserContext', error, { userId });
      return null;
    }
  }

  /**
   * Get current authenticated user context
   */
  async getCurrentUserContext(): Promise<UnifiedUserProfile | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;
    return this.getUserContext(userId);
  }

  /**
   * Update user context with new data
   */
  async updateUserContext(
    userId: string,
    updates: Partial<UnifiedUserProfile>
  ): Promise<boolean> {
    try {
      // Update core profile
      if (updates.full_name || updates.phone_number || updates.country_code) {
        await this.updateCoreProfile(userId, updates);
      }

      // Update preferences
      if (updates.preferences) {
        await this.updateUserPreferences(userId, updates.preferences);
      }

            if (updates.notification_preferences) {
        await this.update      }

      // Invalidate cache
      this.invalidateUserCache(userId);

      // Activity tracking removed
      });

      return true;
    } catch (error) {
      this.handleError('updateUserContext', error, { userId, updates });
      return false;
    }
  }

  // ============================================================================
  // PROFILE BUILDING METHODS
  // ============================================================================

  private async buildUnifiedProfile(userId: string): Promise<UnifiedUserProfile | null> {
    try {
      // Get base user data
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) throw userError;

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get customer data
      const customerContext = await this.buildCustomerContext(userId);

      // Get package forwarding context
      const packageContext = await this.buildPackageForwardingContext(userId);

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      // Get activity summary
      const activitySummary = await this.buildActivitySummary(userId);

            const notificationPreferences = await this.get
      // Get addresses and payment methods
      const [addresses, paymentMethods] = await Promise.all([
        this.getDeliveryAddresses(userId),
        this.getUserPaymentMethods(userId)
      ]);

      // Get user permissions
      const permissions = await this.getUserPermissions(userId);

      // Build unified profile
      const unifiedProfile: UnifiedUserProfile = {
        // Core identity
        id: userId,
        email: user.user.email || '',
        full_name: profile?.full_name || null,
        display_name: this.getDisplayName(profile, user.user),
        avatar_url: profile?.avatar_url || null,

        // Authentication & roles
        role: profile?.role || 'user',
        permissions,
        is_authenticated: true,

        // Contact & preferences
        phone_number: profile?.phone_number || null,
        country_code: profile?.country_code || 'US',
        preferred_language: profile?.preferred_language || 'en',
        timezone: profile?.timezone || 'UTC',

        // Business context
        customer_data: customerContext,
        package_forwarding: packageContext,
        preferences,

        // Activity & engagement
        activity_summary: activitySummary,
        
        // Integration data
        addresses,
        payment_methods: paymentMethods,

        // Metadata
        created_at: profile?.created_at || user.user.created_at,
        updated_at: profile?.updated_at || new Date().toISOString(),
        last_active_at: profile?.last_active_at || new Date().toISOString()
      };

      return unifiedProfile;
    } catch (error) {
      this.handleError('buildUnifiedProfile', error, { userId });
      return null;
    }
  }

  private async buildCustomerContext(userId: string): Promise<CustomerContext> {
    try {
      // Get quote statistics
      const { data: quoteStats } = await supabase
        .from('quotes')
        .select('status, total_amount_usd, created_at')
        .eq('customer_id', userId);

      // Get order statistics
      const { data: orderStats } = await supabase
        .from('quotes')
        .select('status, total_amount_usd, created_at')
        .eq('customer_id', userId)
        .in('status', ['paid', 'ordered', 'shipped', 'completed']);

      const totalQuotes = quoteStats?.length || 0;
      const totalOrders = orderStats?.length || 0;
      const totalSpentUsd = orderStats?.reduce((sum, order) => sum + (order.total_amount_usd || 0), 0) || 0;

      const activeQuotes = quoteStats?.filter(q => ['pending', 'sent', 'approved'].includes(q.status)).length || 0;
      const pendingPayments = quoteStats?.filter(q => q.status === 'approved').length || 0;
      const inTransitOrders = quoteStats?.filter(q => ['ordered', 'shipped'].includes(q.status)).length || 0;

      const joinedDate = quoteStats?.[0]?.created_at || new Date().toISOString();
      const lastOrderDate = orderStats?.[0]?.created_at || null;

      // Determine customer segment
      let customerSegment: 'new' | 'regular' | 'vip' | 'inactive' = 'new';
      if (totalOrders === 0) customerSegment = 'new';
      else if (totalSpentUsd > 5000) customerSegment = 'vip';
      else if (totalOrders > 5) customerSegment = 'regular';
      else if (lastOrderDate && new Date(lastOrderDate) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
        customerSegment = 'inactive';
      }

      return {
        profile_type: 'registered',
        is_verified: true,
        verification_level: 'email',
        total_quotes: totalQuotes,
        total_orders: totalOrders,
        total_spent_usd: totalSpentUsd,
        lifetime_value: totalSpentUsd * 1.2, // Rough calculation
        active_quotes: activeQuotes,
        pending_payments: pendingPayments,
        in_transit_orders: inTransitOrders,
        joined_date: joinedDate,
        last_order_date: lastOrderDate,
        customer_segment: customerSegment
      };
    } catch (error) {
      logger.error('Failed to build customer context', { userId, error });
      return {
        profile_type: 'registered',
        is_verified: false,
        verification_level: 'none',
        total_quotes: 0,
        total_orders: 0,
        total_spent_usd: 0,
        lifetime_value: 0,
        active_quotes: 0,
        pending_payments: 0,
        in_transit_orders: 0,
        joined_date: new Date().toISOString(),
        last_order_date: null,
        customer_segment: 'new'
      };
    }
  }

  private async buildPackageForwardingContext(userId: string): Promise<PackageForwardingContext> {
    try {
      // Get virtual addresses
      const { data: addresses } = await supabase
        .from('virtual_addresses')
        .select('*')
        .eq('user_id', userId);

      // Get package statistics
      const { data: packages } = await supabase
        .from('received_packages')
        .select('status, created_at')
        .eq('user_id', userId);

      // Get consolidation statistics
      const { data: consolidations } = await supabase
        .from('consolidation_groups')
        .select('id')
        .eq('user_id', userId);

      // Get storage fees
      const { data: storageFees } = await supabase
        .from('storage_fees')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'pending');

      const totalPackagesReceived = packages?.length || 0;
      const packagesInWarehouse = packages?.filter(p => p.status === 'received').length || 0;
      const totalConsolidations = consolidations?.length || 0;
      const outstandingStorageFees = storageFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;

      return {
        assigned_addresses: addresses?.map(addr => ({
          id: addr.id,
          address_line_1: addr.address_line_1,
          address_line_2: addr.address_line_2,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
          is_default: addr.is_default,
          created_at: addr.created_at
        })) || [],
        default_address_id: addresses?.find(a => a.is_default)?.id || null,
        total_packages_received: totalPackagesReceived,
        packages_in_warehouse: packagesInWarehouse,
        total_consolidations: totalConsolidations,
        outstanding_storage_fees: outstandingStorageFees,
        total_shipping_spent: 0, // Calculate from shipping history
        auto_consolidation_enabled: false,
        preferred_carrier: null,
        storage_alert_threshold: 30, // 30 days default
      };
    } catch (error) {
      logger.error('Failed to build package forwarding context', { userId, error });
      return {
        assigned_addresses: [],
        default_address_id: null,
        total_packages_received: 0,
        packages_in_warehouse: 0,
        total_consolidations: 0,
        outstanding_storage_fees: 0,
        total_shipping_spent: 0,
        auto_consolidation_enabled: false,
        preferred_carrier: null,
        storage_alert_threshold: 30
      };
    }
  }

  private async buildActivitySummary(userId: string): Promise<ActivitySummary> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Activity tracking removed
      const loginCount30d = 0; // activities.filter(a => 
        a.activity_type === 'page:view' && 
        new Date(a.created_at) > thirtyDaysAgo
      ).length;

      const pageViews30d = activities.filter(a => 
        a.activity_type === 'page:view' && 
        new Date(a.created_at) > thirtyDaysAgo
      ).length;

      const quotesCreated30d = activities.filter(a => 
        a.activity_type === 'quote:create_complete' && 
        new Date(a.created_at) > thirtyDaysAgo
      ).length;

      return {
        last_login: activities.find(a => a.activity_type === 'page:view')?.created_at || null,
        login_count_30d: loginCount30d,
        page_views_30d: pageViews30d,
        quotes_created_30d: quotesCreated30d,
        orders_placed_30d: 0, // Calculate from orders
        support_tickets_30d: 0, // Calculate from support
        favorite_categories: [],
        preferred_shopping_times: [],
        average_order_value: 0
      };
    } catch (error) {
      logger.error('Failed to build activity summary', { userId, error });
      return {
        last_login: null,
        login_count_30d: 0,
        page_views_30d: 0,
        quotes_created_30d: 0,
        orders_placed_30d: 0,
        support_tickets_30d: 0,
        favorite_categories: [],
        preferred_shopping_times: [],
        average_order_value: 0
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      return null;
    }
  }

  private getDisplayName(profile: any, user: any): string {
    if (profile?.full_name) return profile.full_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const { data: permissions } = await supabase
        .rpc('get_user_permissions_new', { user_id: userId });
      return permissions || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get country settings for currency
    const { data: profile } = await supabase
      .from('profiles')
      .select('country_code, preferences')
      .eq('id', userId)
      .single();

    const countryCode = profile?.country_code || 'US';
    const currency = await currencyService.getCurrency(countryCode);

    return {
      currency_code: currency?.code || 'USD',
      date_format: 'MM/DD/YYYY',
      number_format: 'en-US',
      email_      sms_      push_      marketing_emails: true,
      auto_approve_quotes: false,
      default_shipping_method: null,
      profile_visibility: 'private',
      activity_tracking: true,
      data_sharing: false,
      ...profile?.preferences
    };
  }

  private async get  }

  private async getDeliveryAddresses(userId: string): Promise<Address[]> {
    const { data: addresses } = await supabase
      .from('warehouse_suite_addresses')
      .select('*')
      .eq('user_id', userId);

    return addresses?.map(addr => ({
      id: addr.id,
      type: addr.type,
      full_address: `${addr.address_line_1}, ${addr.city}, ${addr.country}`,
      is_default: addr.is_default,
      country_code: addr.country_code
    })) || [];
  }

  private async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // This would integrate with payment provider APIs
    return [];
  }

  private async updateCoreProfile(userId: string, updates: Partial<UnifiedUserProfile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone_number: updates.phone_number,
        country_code: updates.country_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  private async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  }

  private async update
    if (error) throw error;
  }

  // ============================================================================
  // CACHING METHODS
  // ============================================================================

  private getCachedUser(userId: string): UnifiedUserProfile | null {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  private cacheUser(userId: string, profile: UnifiedUserProfile): void {
    this.userCache.set(userId, {
      data: profile,
      expires: Date.now() + this.CACHE_DURATION
    });
  }

  private invalidateUserCache(userId?: string): void {
    if (userId) {
      this.userCache.delete(userId);
    } else {
      this.userCache.clear();
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleError(operation: string, error: any, context: any = {}): void {
    const transaction = typeof Sentry?.startTransaction === 'function'
      ? Sentry.startTransaction({
          name: `UnifiedUserContextService.${operation}`,
          op: 'user_context'
        })
      : null;

    if (transaction) {
      Sentry.captureException(error, {
        tags: {
          service: 'UnifiedUserContextService',
          operation
        },
        extra: context
      });
      transaction.finish();
    }

    logger.error(`UnifiedUserContextService.${operation} failed`, {
      error: error.message,
      context
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string, userId?: string): Promise<boolean> {
    const user = await this.getUserContext(userId);
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Check if user has specific role
   */
  async hasRole(role: 'user' | 'moderator' | 'admin', userId?: string): Promise<boolean> {
    const user = await this.getUserContext(userId);
    return user?.role === role || false;
  }

  /**
   * Get user's currency preferences
   */
  async getUserCurrency(userId?: string): Promise<CountrySettings | null> {
    const user = await this.getUserContext(userId);
    if (!user) return null;
    
    return currencyService.getCurrency(user.country_code);
  }

  /**
   * Refresh user context (invalidate cache and reload)
   */
  async refreshUserContext(userId?: string): Promise<UnifiedUserProfile | null> {
    const targetUserId = userId || await this.getCurrentUserId();
    if (!targetUserId) return null;

    this.invalidateUserCache(targetUserId);
    return this.getUserContext(targetUserId);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedUserContextService = UnifiedUserContextService.getInstance();
export default unifiedUserContextService;

// Export types
export type {
  UnifiedUserProfile,
  CustomerContext,
  PackageForwardingContext,
  UserPreferences,
  ActivitySummary,
  NotificationPreferences,
  VirtualAddress,
  Address,
  PaymentMethod
};