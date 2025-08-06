/**
 * Usage Tracking Service
 * Handles discount usage recording, analytics, and customer usage limits
 * Decomposed from DiscountService for focused usage management
 * 
 * RESPONSIBILITIES:
 * - Recording discount usage in database
 * - Tracking customer usage patterns
 * - Usage limit enforcement
 * - Discount analytics and reporting
 * - Usage history management
 * - Customer eligibility tracking
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountUsageRecord {
  customer_id: string;
  discount_code_id?: string;
  campaign_id?: string;
  quote_id?: string;
  order_id?: string;
  discount_amount: number;
  original_amount: number;
  currency: string;
  discount_breakdown: { [component: string]: number };
  used_at: Date;
  discount_source: string;
  metadata?: any;
}

export interface UsageAnalytics {
  total_usage_count: number;
  total_discount_amount: number;
  unique_customers: number;
  average_discount: number;
  most_used_codes: Array<{
    code: string;
    usage_count: number;
    total_savings: number;
  }>;
  usage_by_country: { [country: string]: number };
  usage_trends: Array<{
    date: string;
    usage_count: number;
    total_amount: number;
  }>;
}

export interface CustomerUsageSummary {
  customer_id: string;
  total_discounts_used: number;
  total_savings: number;
  favorite_discount_type: string;
  last_usage: Date;
  remaining_limits: { [discount_id: string]: number };
}

export interface ApplicableDiscount {
  discount_source: string;
  discount_amount: number;
  discount_code_id?: string;
  campaign_id?: string;
}

export class UsageTrackingService {
  private static instance: UsageTrackingService;
  private usageCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes cache for usage data

  constructor() {
    logger.info('UsageTrackingService initialized');
  }

  static getInstance(): UsageTrackingService {
    if (!UsageTrackingService.instance) {
      UsageTrackingService.instance = new UsageTrackingService();
    }
    return UsageTrackingService.instance;
  }

  /**
   * Record discount usage in the database
   */
  async recordDiscountUsage(
    customerId: string,
    discounts: ApplicableDiscount[],
    quoteId?: string,
    orderId?: string,
    originalAmount?: number,
    currency?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!discounts || discounts.length === 0) {
        logger.debug('No discounts to record');
        return { success: true };
      }

      logger.info(`Recording ${discounts.length} discount usages for customer: ${customerId}`);

      // Convert email to actual customer ID if needed
      const actualCustomerId = await this.resolveCustomerId(customerId);
      if (!actualCustomerId) {
        logger.warn('Could not resolve customer ID, skipping usage tracking');
        return { success: true }; // Don't fail the whole process
      }

      const usageRecords = discounts.map(discount => ({
        customer_id: actualCustomerId,
        discount_code_id: discount.discount_source === 'code' ? discount.discount_code_id : null,
        campaign_id: discount.discount_source === 'campaign' ? discount.campaign_id : null,
        quote_id: quoteId,
        order_id: orderId,
        discount_amount: discount.discount_amount,
        original_amount: originalAmount || 0,
        currency: currency || 'USD',
        discount_breakdown: {
          [discount.discount_source]: discount.discount_amount
        },
        discount_source: discount.discount_source,
        used_at: new Date().toISOString(),
        metadata: {
          tracked_at: new Date().toISOString(),
          version: '2.0'
        }
      }));

      // Insert usage records
      const { error: insertError } = await supabase
        .from('customer_discount_usage')
        .insert(usageRecords);

      if (insertError) {
        logger.error('Failed to insert usage records:', insertError);
        return { success: false, error: 'Failed to record usage' };
      }

      // Update usage counts for discount codes and campaigns
      await this.updateUsageCounts(discounts);

      // Clear relevant caches
      this.clearCustomerCache(actualCustomerId);

      logger.info('Successfully recorded discount usage');
      return { success: true };

    } catch (error) {
      logger.error('Error recording discount usage:', error);
      return { success: false, error: 'Unexpected error during usage tracking' };
    }
  }

  /**
   * Track coupon usage (legacy method for backward compatibility)
   */
  async trackCouponUsage(
    customerId: string,
    quoteId: string,
    discountCodeId: string,
    discountAmount: number
  ): Promise<{ success: boolean; error?: string }> {
    return await this.recordDiscountUsage(
      customerId,
      [{
        discount_source: 'code',
        discount_amount: discountAmount,
        discount_code_id: discountCodeId
      }],
      quoteId,
      undefined,
      discountAmount
    );
  }

  /**
   * Get usage analytics for admin dashboard
   */
  async getUsageAnalytics(
    dateRange?: { start: Date; end: Date },
    countryCode?: string
  ): Promise<UsageAnalytics> {
    try {
      const cacheKey = this.createCacheKey('analytics', { dateRange, countryCode });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached usage analytics');
        return cached;
      }

      let query = supabase
        .from('customer_discount_usage')
        .select(`
          *,
          discount_code:discount_codes(code),
          customer:profiles(country)
        `);

      // Apply date range filter
      if (dateRange) {
        query = query
          .gte('used_at', dateRange.start.toISOString())
          .lte('used_at', dateRange.end.toISOString());
      }

      const { data: usageData, error } = await query;

      if (error) {
        logger.error('Failed to fetch usage analytics:', error);
        throw error;
      }

      const analytics = this.processUsageAnalytics(usageData || [], countryCode);
      
      this.setCache(cacheKey, analytics);
      logger.info('Generated usage analytics');
      return analytics;

    } catch (error) {
      logger.error('Error getting usage analytics:', error);
      return {
        total_usage_count: 0,
        total_discount_amount: 0,
        unique_customers: 0,
        average_discount: 0,
        most_used_codes: [],
        usage_by_country: {},
        usage_trends: []
      };
    }
  }

  /**
   * Get customer usage summary
   */
  async getCustomerUsageSummary(customerId: string): Promise<CustomerUsageSummary> {
    try {
      const actualCustomerId = await this.resolveCustomerId(customerId);
      if (!actualCustomerId) {
        throw new Error('Invalid customer ID');
      }

      const cacheKey = this.createCacheKey('customer_summary', { customerId: actualCustomerId });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached customer usage summary');
        return cached;
      }

      const { data: usageData, error } = await supabase
        .from('customer_discount_usage')
        .select(`
          *,
          discount_code:discount_codes(code, usage_per_customer)
        `)
        .eq('customer_id', actualCustomerId)
        .order('used_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch customer usage:', error);
        throw error;
      }

      const summary = this.processCustomerUsageSummary(actualCustomerId, usageData || []);
      
      this.setCache(cacheKey, summary);
      logger.info(`Generated usage summary for customer: ${customerId}`);
      return summary;

    } catch (error) {
      logger.error('Error getting customer usage summary:', error);
      return {
        customer_id: customerId,
        total_discounts_used: 0,
        total_savings: 0,
        favorite_discount_type: 'none',
        last_usage: new Date(),
        remaining_limits: {}
      };
    }
  }

  /**
   * Check if customer has reached usage limit for a discount
   */
  async checkCustomerUsageLimit(
    customerId: string,
    discountCodeId: string,
    usageLimit: number
  ): Promise<{ canUse: boolean; currentUsage: number; remainingUses: number }> {
    try {
      const actualCustomerId = await this.resolveCustomerId(customerId);
      if (!actualCustomerId) {
        return { canUse: false, currentUsage: 0, remainingUses: 0 };
      }

      const { count } = await supabase
        .from('customer_discount_usage')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', actualCustomerId)
        .eq('discount_code_id', discountCodeId);

      const currentUsage = count || 0;
      const remainingUses = Math.max(0, usageLimit - currentUsage);
      const canUse = remainingUses > 0;

      logger.debug(`Usage limit check for ${customerId}: ${currentUsage}/${usageLimit} (can use: ${canUse})`);
      
      return { canUse, currentUsage, remainingUses };

    } catch (error) {
      logger.error('Error checking customer usage limit:', error);
      return { canUse: false, currentUsage: 0, remainingUses: 0 };
    }
  }

  /**
   * Get top performing discounts
   */
  async getTopPerformingDiscounts(limit: number = 10): Promise<Array<{
    discount_id: string;
    discount_code?: string;
    campaign_name?: string;
    total_usage: number;
    total_savings: number;
    unique_customers: number;
    average_discount: number;
    conversion_rate?: number;
  }>> {
    try {
      const cacheKey = this.createCacheKey('top_discounts', { limit });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached top performing discounts');
        return cached;
      }

      const { data, error } = await supabase
        .rpc('get_top_performing_discounts', {
          p_limit: limit
        });

      if (error) {
        logger.error('Failed to fetch top performing discounts:', error);
        throw error;
      }

      const results = data || [];
      this.setCache(cacheKey, results);
      
      logger.info(`Retrieved top ${results.length} performing discounts`);
      return results;

    } catch (error) {
      logger.error('Error getting top performing discounts:', error);
      return [];
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    period: 'day' | 'week' | 'month' = 'day',
    days: number = 30
  ): Promise<Array<{
    period: string;
    usage_count: number;
    total_discount_amount: number;
    unique_customers: number;
  }>> {
    try {
      const cacheKey = this.createCacheKey('usage_trends', { period, days });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached usage trends');
        return cached;
      }

      const { data, error } = await supabase
        .rpc('get_discount_usage_trends', {
          p_period: period,
          p_days: days
        });

      if (error) {
        logger.error('Failed to fetch usage trends:', error);
        throw error;
      }

      const trends = data || [];
      this.setCache(cacheKey, trends);
      
      logger.info(`Retrieved usage trends for ${days} ${period}s`);
      return trends;

    } catch (error) {
      logger.error('Error getting usage trends:', error);
      return [];
    }
  }

  /**
   * Process usage analytics from raw data
   */
  private processUsageAnalytics(usageData: any[], countryFilter?: string): UsageAnalytics {
    // Filter by country if specified
    let filteredData = usageData;
    if (countryFilter) {
      filteredData = usageData.filter(item => 
        item.customer?.country === countryFilter
      );
    }

    const totalUsage = filteredData.length;
    const totalAmount = filteredData.reduce((sum, item) => sum + item.discount_amount, 0);
    const uniqueCustomers = new Set(filteredData.map(item => item.customer_id)).size;
    const averageDiscount = totalUsage > 0 ? totalAmount / totalUsage : 0;

    // Most used codes
    const codeUsage = new Map<string, { count: number; total: number }>();
    filteredData.forEach(item => {
      if (item.discount_code?.code) {
        const code = item.discount_code.code;
        const existing = codeUsage.get(code) || { count: 0, total: 0 };
        codeUsage.set(code, {
          count: existing.count + 1,
          total: existing.total + item.discount_amount
        });
      }
    });

    const mostUsedCodes = Array.from(codeUsage.entries())
      .map(([code, stats]) => ({
        code,
        usage_count: stats.count,
        total_savings: stats.total
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);

    // Usage by country
    const countryUsage: { [country: string]: number } = {};
    filteredData.forEach(item => {
      const country = item.customer?.country || 'Unknown';
      countryUsage[country] = (countryUsage[country] || 0) + 1;
    });

    // Usage trends (simplified - group by day)
    const trendMap = new Map<string, { count: number; amount: number }>();
    filteredData.forEach(item => {
      const date = new Date(item.used_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { count: 0, amount: 0 };
      trendMap.set(date, {
        count: existing.count + 1,
        amount: existing.amount + item.discount_amount
      });
    });

    const usageTrends = Array.from(trendMap.entries())
      .map(([date, stats]) => ({
        date,
        usage_count: stats.count,
        total_amount: stats.amount
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    return {
      total_usage_count: totalUsage,
      total_discount_amount: totalAmount,
      unique_customers: uniqueCustomers,
      average_discount: averageDiscount,
      most_used_codes: mostUsedCodes,
      usage_by_country: countryUsage,
      usage_trends: usageTrends
    };
  }

  /**
   * Process customer usage summary from raw data
   */
  private processCustomerUsageSummary(customerId: string, usageData: any[]): CustomerUsageSummary {
    const totalUsed = usageData.length;
    const totalSavings = usageData.reduce((sum, item) => sum + item.discount_amount, 0);
    
    // Find favorite discount type
    const typeCount = new Map<string, number>();
    usageData.forEach(item => {
      const source = item.discount_source || 'unknown';
      typeCount.set(source, (typeCount.get(source) || 0) + 1);
    });
    
    const favoriteType = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    const lastUsage = usageData.length > 0 ? 
      new Date(usageData[0].used_at) : 
      new Date();

    // Calculate remaining limits
    const remainingLimits: { [discount_id: string]: number } = {};
    const discountUsage = new Map<string, number>();
    
    usageData.forEach(item => {
      if (item.discount_code_id) {
        const id = item.discount_code_id;
        discountUsage.set(id, (discountUsage.get(id) || 0) + 1);
      }
    });

    // For each discount code with usage limits, calculate remaining
    usageData.forEach(item => {
      if (item.discount_code_id && item.discount_code?.usage_per_customer) {
        const id = item.discount_code_id;
        const limit = item.discount_code.usage_per_customer;
        const used = discountUsage.get(id) || 0;
        remainingLimits[id] = Math.max(0, limit - used);
      }
    });

    return {
      customer_id: customerId,
      total_discounts_used: totalUsed,
      total_savings: totalSavings,
      favorite_discount_type: favoriteType,
      last_usage: lastUsage,
      remaining_limits: remainingLimits
    };
  }

  /**
   * Resolve customer ID from email if needed
   */
  private async resolveCustomerId(customerId: string): Promise<string | null> {
    if (!customerId.includes('@')) {
      return customerId; // Already a UUID
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', customerId)
        .single();
      
      return profile?.id || null;
    } catch (error) {
      logger.warn('Failed to resolve customer email to ID:', error);
      return null;
    }
  }

  /**
   * Update usage counts for discounts
   */
  private async updateUsageCounts(discounts: ApplicableDiscount[]): Promise<void> {
    try {
      for (const discount of discounts) {
        if (discount.discount_code_id) {
          // Increment discount code usage count
          await supabase.rpc('increment_discount_usage', {
            p_discount_code_id: discount.discount_code_id
          });
        }
        
        if (discount.campaign_id) {
          // Increment campaign usage count
          await supabase.rpc('increment_campaign_usage', {
            p_campaign_id: discount.campaign_id
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to update some usage counts:', error);
      // Don't fail the whole process for count updates
    }
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        const value = params[key];
        keyParts.push(`${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.usageCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.usageCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.usageCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCustomerCache(customerId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.usageCache.keys()) {
      if (key.includes(`customerId:${customerId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.usageCache.delete(key));
  }

  /**
   * Clear usage cache
   */
  clearCache(): void {
    this.usageCache.clear();
    logger.info('Usage tracking cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.usageCache.size,
      entries: Array.from(this.usageCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.usageCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.usageCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired usage cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('UsageTrackingService disposed');
  }
}

export default UsageTrackingService;