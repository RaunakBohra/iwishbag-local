/**
 * Campaign Management Service
 * Handles discount campaigns, membership discounts, and promotional offers
 * Decomposed from DiscountService for focused campaign management
 * 
 * RESPONSIBILITIES:
 * - Active campaign retrieval and filtering
 * - Membership-based discount calculation
 * - Campaign targeting and audience filtering
 * - Promotional offer management
 * - Campaign analytics and tracking
 * - Country and membership-based campaign filtering
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  target_audience?: {
    countries?: string[];
    membership?: string[];
    customer_segments?: string[];
    min_order_value?: number;
    first_time_only?: boolean;
  };
  discount_type?: {
    id: string;
    name: string;
    type: string;
    value: number;
    conditions?: any;
    applicable_components?: string[];
  };
  priority?: number;
  usage_limit?: number;
  usage_count?: number;
}

export interface MembershipDiscount {
  has_discount: boolean;
  discount_percentage: number;
  discount_amount: number;
  membership_name: string;
  membership_tier: string;
}

export interface ApplicableDiscount {
  discount_source: 'membership' | 'campaign' | 'code' | 'payment_method' | 'volume' | 'first_time';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: 'total' | 'handling' | 'shipping' | 'customs' | 'delivery' | 'taxes' | 'all_fees';
  is_stackable: boolean;
  priority?: number;
  description: string;
  discount_code_id?: string;
  campaign_id?: string;
  conditions?: any;
}

export interface CampaignFilter {
  countryCode?: string;
  membershipType?: string;
  customerSegment?: string;
  orderValue?: number;
  isFirstOrder?: boolean;
  includeInactive?: boolean;
}

export class CampaignManagementService {
  private static instance: CampaignManagementService;
  private campaignCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes cache for campaigns

  constructor() {
    logger.info('CampaignManagementService initialized');
  }

  static getInstance(): CampaignManagementService {
    if (!CampaignManagementService.instance) {
      CampaignManagementService.instance = new CampaignManagementService();
    }
    return CampaignManagementService.instance;
  }

  /**
   * Get active campaigns with optional filtering
   */
  async getActiveCampaigns(filter: CampaignFilter = {}): Promise<DiscountCampaign[]> {
    try {
      const cacheKey = this.createCacheKey('active_campaigns', filter);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached active campaigns');
        return cached;
      }

      const now = new Date().toISOString();
      
      let query = supabase
        .from('discount_campaigns')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .eq('is_active', true)
        .lte('start_date', now); // Start date should be in the past or now

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching active campaigns:', error);
        throw error;
      }

      // Filter by end_date after fetching (to handle null end_date properly)
      let campaigns = (data || []).filter(campaign => {
        if (!campaign.end_date) return true; // No end date means ongoing
        return new Date(campaign.end_date) >= new Date(now);
      });
      
      // Apply additional filters
      campaigns = this.applyCampaignFilters(campaigns, filter);

      // Sort by priority (higher priority first)
      campaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      this.setCache(cacheKey, campaigns);
      logger.info(`Found ${campaigns.length} active campaigns`);
      return campaigns;

    } catch (error) {
      logger.error('Error getting active campaigns:', error);
      return [];
    }
  }

  /**
   * Get all campaigns (including inactive)
   */
  async getAllCampaigns(): Promise<DiscountCampaign[]> {
    try {
      const cacheKey = 'all_campaigns';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached all campaigns');
        return cached;
      }

      const { data, error } = await supabase
        .from('discount_campaigns')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all campaigns:', error);
        throw error;
      }

      const campaigns = data || [];
      this.setCache(cacheKey, campaigns);
      
      logger.info(`Retrieved ${campaigns.length} total campaigns`);
      return campaigns;

    } catch (error) {
      logger.error('Error getting all campaigns:', error);
      return [];
    }
  }

  /**
   * Get membership-based discounts for a customer
   */
  async getMembershipDiscounts(customerId: string, orderAmount: number): Promise<ApplicableDiscount[]> {
    try {
      if (!customerId || customerId.includes('@')) {
        logger.debug('Skipping membership discount check for guest/email customer');
        return [];
      }

      const cacheKey = this.createCacheKey('membership_discount', { customerId, orderAmount });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached membership discounts');
        return cached;
      }

      const { data: membershipDiscount, error } = await supabase
        .rpc('calculate_membership_discount', {
          p_customer_id: customerId,
          p_amount: orderAmount
        });

      if (error) {
        logger.warn('Could not check membership discount:', error);
        return [];
      }

      const discounts: ApplicableDiscount[] = [];

      if (membershipDiscount && membershipDiscount.length > 0) {
        const md = membershipDiscount[0];
        if (md.has_discount && md.discount_percentage > 0) {
          discounts.push({
            discount_source: 'membership',
            discount_type: 'percentage',
            discount_value: md.discount_percentage,
            discount_amount: Number(md.discount_amount),
            applies_to: 'total',
            is_stackable: true,
            description: `${md.membership_name} membership: ${md.discount_percentage}% off`,
            priority: 200 // High priority for membership discounts
          });
        }
      }

      this.setCache(cacheKey, discounts);
      logger.info(`Found ${discounts.length} membership discounts for customer`);
      return discounts;

    } catch (error) {
      logger.error('Error getting membership discounts:', error);
      return [];
    }
  }

  /**
   * Get campaign-based discounts
   */
  async getCampaignDiscounts(filter: CampaignFilter): Promise<ApplicableDiscount[]> {
    try {
      const campaigns = await this.getActiveCampaigns(filter);
      const discounts: ApplicableDiscount[] = [];

      for (const campaign of campaigns) {
        if (!campaign.discount_type || !campaign.discount_type.is_active) {
          continue;
        }

        const discountType = campaign.discount_type;
        
        // Check if campaign has usage limits
        if (campaign.usage_limit && campaign.usage_count >= campaign.usage_limit) {
          logger.debug(`Campaign ${campaign.name} has reached usage limit`);
          continue;
        }

        // Check campaign-specific conditions
        if (!this.validateCampaignConditions(campaign, filter)) {
          continue;
        }

        // Create discount entries for applicable components
        if (discountType.applicable_components && discountType.applicable_components.length > 0) {
          // Component-specific campaign discounts
          for (const component of discountType.applicable_components) {
            discounts.push({
              discount_source: 'campaign',
              discount_type: discountType.type as 'percentage' | 'fixed_amount',
              discount_value: discountType.value,
              discount_amount: 0, // Will be calculated by component
              applies_to: component as any,
              is_stackable: discountType.conditions?.stacking_allowed !== false,
              priority: campaign.priority || discountType.priority || 150,
              description: campaign.name || discountType.name,
              campaign_id: campaign.id,
              conditions: discountType.conditions
            });
          }
        } else {
          // Order-level campaign discount
          let discountAmount = 0;
          
          if (filter.orderValue) {
            if (discountType.type === 'percentage') {
              discountAmount = filter.orderValue * (discountType.value / 100);
              // Apply max discount cap if exists
              if (discountType.conditions?.max_discount) {
                discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
              }
            } else {
              discountAmount = Math.min(discountType.value, filter.orderValue);
            }
          }

          discounts.push({
            discount_source: 'campaign',
            discount_type: discountType.type as 'percentage' | 'fixed_amount',
            discount_value: discountType.value,
            discount_amount: discountAmount,
            applies_to: 'total',
            is_stackable: discountType.conditions?.stacking_allowed !== false,
            priority: campaign.priority || discountType.priority || 150,
            description: campaign.name || discountType.name,
            campaign_id: campaign.id,
            conditions: discountType.conditions
          });
        }
      }

      logger.info(`Generated ${discounts.length} campaign-based discounts`);
      return discounts;

    } catch (error) {
      logger.error('Error getting campaign discounts:', error);
      return [];
    }
  }

  /**
   * Get payment method discounts
   */
  async getPaymentMethodDiscounts(): Promise<{ [method: string]: number }> {
    try {
      const cacheKey = 'payment_method_discounts';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached payment method discounts');
        return cached;
      }

      const { data, error } = await supabase
        .from('payment_method_discounts')
        .select('*')
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching payment method discounts:', error);
        throw error;
      }

      const discounts: { [method: string]: number } = {};
      (data || []).forEach(d => {
        discounts[d.payment_method] = d.discount_percentage;
      });

      this.setCache(cacheKey, discounts);
      logger.info(`Retrieved payment method discounts for ${Object.keys(discounts).length} methods`);
      return discounts;

    } catch (error) {
      logger.error('Error getting payment method discounts:', error);
      return {};
    }
  }

  /**
   * Create campaign-based discount from payment method
   */
  createPaymentMethodDiscount(
    paymentMethod: string,
    discountPercentage: number,
    orderTotal: number,
    handlingFee: number
  ): ApplicableDiscount | null {
    if (discountPercentage <= 0) return null;

    const discountAmount = handlingFee * (discountPercentage / 100);

    return {
      discount_source: 'payment_method',
      discount_type: 'percentage',
      discount_value: discountPercentage,
      discount_amount: discountAmount,
      applies_to: 'handling',
      is_stackable: true,
      priority: 100,
      description: `${paymentMethod?.replace('_', ' ')} discount: ${discountPercentage}% off handling fee`
    };
  }

  /**
   * Validate campaign conditions
   */
  private validateCampaignConditions(campaign: DiscountCampaign, filter: CampaignFilter): boolean {
    const targetAudience = campaign.target_audience;
    if (!targetAudience) return true;

    // Check country restriction
    if (targetAudience.countries && filter.countryCode) {
      if (!targetAudience.countries.includes(filter.countryCode)) {
        return false;
      }
    }

    // Check membership restriction
    if (targetAudience.membership && filter.membershipType) {
      if (!targetAudience.membership.includes(filter.membershipType)) {
        return false;
      }
    }

    // Check minimum order value
    if (targetAudience.min_order_value && filter.orderValue) {
      if (filter.orderValue < targetAudience.min_order_value) {
        return false;
      }
    }

    // Check first-time only restriction
    if (targetAudience.first_time_only && !filter.isFirstOrder) {
      return false;
    }

    // Check customer segments
    if (targetAudience.customer_segments && filter.customerSegment) {
      if (!targetAudience.customer_segments.includes(filter.customerSegment)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply campaign filters
   */
  private applyCampaignFilters(campaigns: DiscountCampaign[], filter: CampaignFilter): DiscountCampaign[] {
    let filtered = campaigns;

    // Filter by country
    if (filter.countryCode) {
      filtered = filtered.filter(c => 
        !c.target_audience?.countries || 
        c.target_audience.countries.includes(filter.countryCode!)
      );
    }

    // Filter by membership
    if (filter.membershipType) {
      filtered = filtered.filter(c => 
        !c.target_audience?.membership || 
        c.target_audience.membership.includes(filter.membershipType!)
      );
    }

    // Filter by customer segment
    if (filter.customerSegment) {
      filtered = filtered.filter(c => 
        !c.target_audience?.customer_segments || 
        c.target_audience.customer_segments.includes(filter.customerSegment!)
      );
    }

    // Filter by order value
    if (filter.orderValue) {
      filtered = filtered.filter(c => 
        !c.target_audience?.min_order_value || 
        filter.orderValue! >= c.target_audience.min_order_value
      );
    }

    // Filter by first-time status
    if (filter.isFirstOrder !== undefined) {
      filtered = filtered.filter(c => 
        !c.target_audience?.first_time_only || 
        c.target_audience.first_time_only === filter.isFirstOrder
      );
    }

    return filtered;
  }

  /**
   * Get campaign performance analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<{
    total_usage: number;
    unique_customers: number;
    total_discount_amount: number;
    average_discount: number;
    conversion_rate?: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_analytics', {
          p_campaign_id: campaignId
        });

      if (error) {
        logger.error('Error fetching campaign analytics:', error);
        throw error;
      }

      return data || {
        total_usage: 0,
        unique_customers: 0,
        total_discount_amount: 0,
        average_discount: 0
      };

    } catch (error) {
      logger.error('Error getting campaign analytics:', error);
      return {
        total_usage: 0,
        unique_customers: 0,
        total_discount_amount: 0,
        average_discount: 0
      };
    }
  }

  /**
   * Get trending campaigns
   */
  async getTrendingCampaigns(limit: number = 10): Promise<DiscountCampaign[]> {
    try {
      const campaigns = await this.getActiveCampaigns();
      
      // Get usage data for each campaign
      const campaignMetrics = await Promise.all(
        campaigns.map(async (campaign) => {
          const analytics = await this.getCampaignAnalytics(campaign.id);
          return {
            campaign,
            score: analytics.total_usage + (analytics.unique_customers * 2) // Simple trending score
          };
        })
      );

      // Sort by score and return top campaigns
      return campaignMetrics
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.campaign);

    } catch (error) {
      logger.error('Error getting trending campaigns:', error);
      return [];
    }
  }

  /**
   * Check if customer is eligible for campaigns
   */
  async checkCustomerCampaignEligibility(
    customerId: string,
    filter: CampaignFilter
  ): Promise<{
    eligible_campaigns: DiscountCampaign[];
    blocked_reasons: { [campaignId: string]: string };
  }> {
    try {
      const allCampaigns = await this.getActiveCampaigns(filter);
      const eligibleCampaigns: DiscountCampaign[] = [];
      const blockedReasons: { [campaignId: string]: string } = {};

      for (const campaign of allCampaigns) {
        // Check if customer has already used this campaign
        const { count } = await supabase
          .from('customer_discount_usage')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('campaign_id', campaign.id);

        if (count && count > 0 && campaign.target_audience?.first_time_only) {
          blockedReasons[campaign.id] = 'Already used this campaign';
          continue;
        }

        // Check other campaign conditions
        if (this.validateCampaignConditions(campaign, filter)) {
          eligibleCampaigns.push(campaign);
        } else {
          blockedReasons[campaign.id] = 'Does not meet campaign conditions';
        }
      }

      return { eligible_campaigns: eligibleCampaigns, blocked_reasons: blockedReasons };

    } catch (error) {
      logger.error('Error checking customer campaign eligibility:', error);
      return { eligible_campaigns: [], blocked_reasons: {} };
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
        keyParts.push(`${key}:${params[key]}`);
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.campaignCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.campaignCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.campaignCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear campaign cache
   */
  clearCache(): void {
    this.campaignCache.clear();
    logger.info('Campaign management cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.campaignCache.size,
      entries: Array.from(this.campaignCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.campaignCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.campaignCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired campaign cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('CampaignManagementService disposed');
  }
}

export default CampaignManagementService;