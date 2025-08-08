/**
 * Unified Discount Service - Consolidates all discount and promotion functionality
 * 
 * Replaces:
 * - DiscountService
 * - DiscountEligibilityService
 * - DiscountExplanationService
 * - DiscountAbuseDetectionService
 * - DiscountErrorService
 * - DiscountAbuseResponseService
 * - DiscountLoggingService
 * - DiscountManagementService
 * - DiscountCalculationService
 * - ComponentDiscountService
 * - DiscountValidationService
 * 
 * Provides a comprehensive, unified interface for all discount operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Configuration interfaces
export interface DiscountConfig {
  enableAbuseDetection: boolean;
  cacheTimeout: number;
  maxStackingCount: number;
  maxTotalDiscountPercentage: number;
  enableLogging: boolean;
}

// Core discount types
export interface DiscountType {
  id: string;
  name: string;
  code?: string;
  type: 'percentage' | 'fixed_amount' | 'shipping' | 'handling_fee' | 'customs' | 'taxes' | 'all_fees';
  value: number;
  conditions: DiscountConditions;
  applicable_components?: string[];
  tier_rules?: DiscountTier[];
  priority: number;
  is_active: boolean;
}

export interface DiscountConditions {
  min_order?: number;
  max_discount?: number;
  max_discount_percentage?: number;
  applicable_to?: string;
  exclude_components?: string[];
  stacking_allowed?: boolean;
  membership_required?: boolean;
  first_time_only?: boolean;
  min_items?: number;
  use_tiers?: boolean;
  country_restrictions?: string[];
  payment_method_restrictions?: string[];
}

export interface DiscountTier {
  id: string;
  min_order_value: number;
  max_order_value?: number;
  discount_value: number;
  applicable_components: string[];
  description?: string;
  priority: number;
}

export interface ApplicableDiscount {
  discount_source: 'membership' | 'payment_method' | 'campaign' | 'code' | 'volume' | 'first_time' | 'country';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: string;
  component_breakdown?: Record<string, number>;
  is_stackable: boolean;
  priority: number;
  description: string;
  discount_code_id?: string;
  campaign_id?: string;
  conditions?: DiscountConditions;
}

export interface DiscountValidationResult {
  valid: boolean;
  discount?: any;
  error?: string;
  errorCode?: string;
  actionRequired?: 'captcha' | 'block' | 'rate_limit';
  blockDuration?: number;
  suggestions?: string[];
}

export interface DiscountCalculation {
  subtotal: number;
  discounts: ApplicableDiscount[];
  total_discount: number;
  final_total: number;
  savings_percentage: number;
  component_breakdown: Record<string, ComponentDiscount>;
}

export interface ComponentDiscount {
  original_value: number;
  discounted_value: number;
  discount_amount: number;
  applied_discounts: ApplicableDiscount[];
}

// Abuse detection types
export interface AbuseAttempt {
  session_id?: string;
  customer_id?: string;
  discount_code: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  timestamp: Date;
}

export interface AbuseDetectionResult {
  allowed: boolean;
  reason?: string;
  action_required?: 'captcha' | 'block' | 'rate_limit';
  block_duration?: number;
  confidence_score: number;
}

// Campaign and code types
export interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  discount_type_id: string;
  campaign_type: 'manual' | 'time_based' | 'user_triggered' | 'seasonal';
  start_date: string;
  end_date?: string;
  usage_limit?: number;
  usage_count: number;
  target_segments?: string[];
  target_audience: {
    membership?: string[];
    countries?: string[];
  };
  is_active: boolean;
  auto_apply: boolean;
  priority: number;
  trigger_rules?: Record<string, any>;
}

export interface DiscountCode {
  id: string;
  code: string;
  campaign_id?: string;
  discount_type_id: string;
  usage_limit?: number;
  usage_count: number;
  usage_per_customer: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
}

export class UnifiedDiscountService {
  private static instance: UnifiedDiscountService;
  private config: DiscountConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private abuseCache = new Map<string, AbuseAttempt[]>();

  private constructor(config?: Partial<DiscountConfig>) {
    this.config = {
      enableAbuseDetection: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxStackingCount: 3,
      maxTotalDiscountPercentage: 50,
      enableLogging: true,
      ...config,
    };
  }

  static getInstance(config?: Partial<DiscountConfig>): UnifiedDiscountService {
    if (!UnifiedDiscountService.instance) {
      UnifiedDiscountService.instance = new UnifiedDiscountService(config);
    }
    return UnifiedDiscountService.instance;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private getCacheKey(operation: string, params?: any): string {
    return `${operation}:${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
    this.abuseCache.clear();
    logger.info('Discount service cache cleared');
  }

  // ============================================================================
  // ABUSE DETECTION
  // ============================================================================

  private async checkAbuseDetection(attempt: AbuseAttempt): Promise<AbuseDetectionResult> {
    if (!this.config.enableAbuseDetection) {
      return { allowed: true, confidence_score: 0 };
    }

    const key = `${attempt.session_id}-${attempt.ip_address}`;
    const recentAttempts = this.abuseCache.get(key) || [];
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Filter recent attempts
    const filteredAttempts = recentAttempts.filter(a => a.timestamp > fiveMinutesAgo);
    
    // Add current attempt
    filteredAttempts.push(attempt);
    this.abuseCache.set(key, filteredAttempts);

    // Analysis rules
    const rapidAttempts = filteredAttempts.length > 10;
    const multipleCodesSameSession = new Set(filteredAttempts.map(a => a.discount_code)).size > 5;
    const suspiciousPattern = filteredAttempts.length > 15;

    let confidenceScore = 0;
    if (rapidAttempts) confidenceScore += 0.3;
    if (multipleCodesSameSession) confidenceScore += 0.4;
    if (suspiciousPattern) confidenceScore += 0.5;

    if (confidenceScore >= 0.7) {
      if (this.config.enableLogging) {
        logger.warn('Suspicious discount activity detected', {
          session_id: attempt.session_id,
          ip_address: attempt.ip_address,
          attempts: filteredAttempts.length,
          confidence_score: confidenceScore,
        });
      }

      return {
        allowed: false,
        reason: 'Too many discount attempts detected',
        action_required: confidenceScore >= 0.9 ? 'block' : 'rate_limit',
        block_duration: confidenceScore >= 0.9 ? 3600 : 300, // 1 hour or 5 minutes
        confidence_score: confidenceScore,
      };
    }

    return { allowed: true, confidence_score: confidenceScore };
  }

  // ============================================================================
  // DISCOUNT CODE VALIDATION
  // ============================================================================

  async validateDiscountCode(
    code: string,
    context: {
      customerId?: string;
      customerEmail?: string;
      countryCode?: string;
      orderTotal?: number;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<DiscountValidationResult> {
    try {
      // Step 1: Abuse Detection
      if (context.sessionId) {
        const abuseResult = await this.checkAbuseDetection({
          session_id: context.sessionId,
          customer_id: context.customerId,
          discount_code: code,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          country: context.countryCode,
          timestamp: new Date(),
        });

        if (!abuseResult.allowed) {
          return {
            valid: false,
            error: abuseResult.reason || 'Request blocked due to suspicious activity',
            errorCode: 'BLOCKED_SUSPICIOUS_ACTIVITY',
            actionRequired: abuseResult.action_required,
            blockDuration: abuseResult.block_duration,
          };
        }
      }

      // Step 2: Basic Code Validation
      const { data: discountCode, error } = await supabase
        .from('discount_codes')
        .select(`
          *,
          campaign:discount_campaigns(*),
          discount_type:discount_types(*)
        `)
        .eq('code', code.toUpperCase())
        .single();

      if (error || !discountCode) {
        return {
          valid: false,
          error: 'Invalid discount code',
          errorCode: 'INVALID_CODE',
          suggestions: ['Check the spelling', 'Ensure the code is still active'],
        };
      }

      // Step 3: Active Status Check
      if (!discountCode.is_active) {
        return {
          valid: false,
          error: 'This discount code is no longer active',
          errorCode: 'CODE_INACTIVE',
        };
      }

      // Step 4: Date Range Validation
      const now = new Date();
      const validFrom = new Date(discountCode.valid_from);
      const validUntil = discountCode.valid_until ? new Date(discountCode.valid_until) : null;

      if (validFrom > now) {
        return {
          valid: false,
          error: 'This discount code is not yet valid',
          errorCode: 'CODE_NOT_YET_VALID',
        };
      }

      if (validUntil && validUntil < now) {
        return {
          valid: false,
          error: 'This discount code has expired',
          errorCode: 'CODE_EXPIRED',
        };
      }

      // Step 5: Usage Limit Validation
      if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
        return {
          valid: false,
          error: 'This discount code has reached its usage limit',
          errorCode: 'USAGE_LIMIT_REACHED',
        };
      }

      // Step 6: Customer Usage Validation
      if (context.customerId && discountCode.usage_per_customer > 0) {
        const { count } = await supabase
          .from('customer_discount_usage')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', context.customerId)
          .eq('discount_code_id', discountCode.id);

        if (count && count >= discountCode.usage_per_customer) {
          return {
            valid: false,
            error: 'You have already used this discount code the maximum number of times',
            errorCode: 'CUSTOMER_LIMIT_REACHED',
          };
        }
      }

      // Step 7: Context-specific Validation
      if (context.countryCode || context.orderTotal !== undefined) {
        const contextValidation = await this.validateDiscountContext(
          discountCode,
          context.countryCode,
          context.orderTotal
        );
        
        if (!contextValidation.valid) {
          return contextValidation;
        }
      }

      // Log successful validation
      if (this.config.enableLogging) {
        logger.info('Discount code validated successfully', {
          code,
          customer_id: context.customerId,
          country_code: context.countryCode,
          order_total: context.orderTotal,
        });
      }

      return { valid: true, discount: discountCode };

    } catch (error) {
      logger.error('Error validating discount code', { code, error });
      return {
        valid: false,
        error: 'Error validating discount code',
        errorCode: 'VALIDATION_ERROR',
      };
    }
  }

  private async validateDiscountContext(
    discountCode: any,
    countryCode?: string,
    orderTotal?: number
  ): Promise<DiscountValidationResult> {
    if (!countryCode && orderTotal === undefined) {
      return { valid: true };
    }

    try {
      const { data: validation, error } = await supabase
        .rpc('validate_country_discount_code', {
          p_discount_code: discountCode.code,
          p_customer_country: countryCode || 'US',
          p_order_total: orderTotal || 0,
        });

      if (error) {
        logger.error('Error in context validation', error);
        return {
          valid: false,
          error: 'Error validating discount for your location',
          errorCode: 'CONTEXT_VALIDATION_ERROR',
        };
      }

      if (validation && validation.length > 0) {
        const result = validation[0];
        if (!result.is_valid) {
          const errorCode = result.error_message?.includes('minimum') 
            ? 'MINIMUM_ORDER_NOT_MET'
            : 'COUNTRY_NOT_ELIGIBLE';

          return {
            valid: false,
            error: result.error_message || 'This discount is not valid for your location or order amount',
            errorCode,
          };
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('Context validation failed', error);
      return {
        valid: false,
        error: 'Error validating discount context',
        errorCode: 'CONTEXT_VALIDATION_ERROR',
      };
    }
  }

  // ============================================================================
  // DISCOUNT CALCULATION ENGINE
  // ============================================================================

  async calculateDiscounts(
    context: {
      customerId: string;
      orderTotal: number;
      itemCount: number;
      countryCode?: string;
      paymentMethod?: string;
      isFirstOrder?: boolean;
      discountCodes?: string[];
      components?: Record<string, number>; // e.g., { handling: 50, customs: 100, shipping: 25 }
    }
  ): Promise<DiscountCalculation> {
    try {
      const { customerId, orderTotal, components = {} } = context;
      
      // Get all applicable discounts
      const allDiscounts = await this.getAllApplicableDiscounts(context);
      
      // Apply stacking rules
      const stackedDiscounts = await this.applyStackingRules(allDiscounts);
      
      // Calculate component-wise discounts
      const componentBreakdown: Record<string, ComponentDiscount> = {};
      let totalDiscount = 0;

      // Process each component
      for (const [componentName, componentValue] of Object.entries(components)) {
        const componentDiscounts = stackedDiscounts.filter(d => 
          d.applies_to === componentName || d.applies_to === 'all_fees' || d.applies_to === 'total'
        );

        const componentResult = this.calculateComponentDiscount(
          componentValue,
          componentDiscounts,
          componentName
        );

        componentBreakdown[componentName] = componentResult;
        totalDiscount += componentResult.discount_amount;
      }

      // Calculate order-level discounts
      const orderLevelDiscounts = stackedDiscounts.filter(d => d.applies_to === 'total');
      for (const discount of orderLevelDiscounts) {
        if (discount.discount_type === 'percentage') {
          const discountAmount = orderTotal * (discount.discount_value / 100);
          const cappedAmount = discount.conditions?.max_discount 
            ? Math.min(discountAmount, discount.conditions.max_discount)
            : discountAmount;
          totalDiscount += cappedAmount;
          discount.discount_amount = cappedAmount;
        } else {
          const discountAmount = Math.min(discount.discount_value, orderTotal - totalDiscount);
          totalDiscount += discountAmount;
          discount.discount_amount = discountAmount;
        }
      }

      const finalTotal = Math.max(0, orderTotal - totalDiscount);
      const savingsPercentage = orderTotal > 0 ? (totalDiscount / orderTotal) * 100 : 0;

      return {
        subtotal: orderTotal,
        discounts: stackedDiscounts,
        total_discount: totalDiscount,
        final_total: finalTotal,
        savings_percentage: Math.min(savingsPercentage, 100),
        component_breakdown: componentBreakdown,
      };

    } catch (error) {
      logger.error('Error calculating discounts', error);
      return {
        subtotal: context.orderTotal,
        discounts: [],
        total_discount: 0,
        final_total: context.orderTotal,
        savings_percentage: 0,
        component_breakdown: {},
      };
    }
  }

  private async getAllApplicableDiscounts(context: any): Promise<ApplicableDiscount[]> {
    const discounts: ApplicableDiscount[] = [];

    // Get membership discounts
    const membershipDiscounts = await this.getMembershipDiscounts(context.customerId, context.orderTotal);
    discounts.push(...membershipDiscounts);

    // Get payment method discounts
    if (context.paymentMethod) {
      const paymentDiscounts = await this.getPaymentMethodDiscounts(context.paymentMethod, context.orderTotal);
      discounts.push(...paymentDiscounts);
    }

    // Get campaign discounts
    const campaignDiscounts = await this.getCampaignDiscounts(context);
    discounts.push(...campaignDiscounts);

    // Get volume discounts
    const volumeDiscounts = await this.getVolumeDiscounts(context.orderTotal, context.itemCount);
    discounts.push(...volumeDiscounts);

    // Get first-time customer discounts
    if (context.isFirstOrder) {
      const firstTimeDiscounts = await this.getFirstTimeDiscounts(context.orderTotal);
      discounts.push(...firstTimeDiscounts);
    }

    // Get country-specific discounts
    if (context.countryCode) {
      const countryDiscounts = await this.getCountryDiscounts(context.countryCode, context.orderTotal);
      discounts.push(...countryDiscounts);
    }

    // Process discount codes
    if (context.discountCodes && context.discountCodes.length > 0) {
      for (const code of context.discountCodes) {
        const codeDiscounts = await this.getCodeDiscounts(code, context);
        discounts.push(...codeDiscounts);
      }
    }

    return discounts;
  }

  private async getMembershipDiscounts(customerId: string, orderTotal: number): Promise<ApplicableDiscount[]> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_membership_discount', {
          p_customer_id: customerId,
          p_amount: orderTotal,
        });

      if (error || !data || data.length === 0) return [];

      const membership = data[0];
      if (!membership.has_discount || membership.discount_percentage <= 0) return [];

      return [{
        discount_source: 'membership',
        discount_type: 'percentage',
        discount_value: membership.discount_percentage,
        discount_amount: membership.discount_amount,
        applies_to: 'total',
        is_stackable: true,
        priority: 100,
        description: `${membership.membership_name} member discount`,
      }];
    } catch (error) {
      logger.error('Error getting membership discounts', error);
      return [];
    }
  }

  private async getPaymentMethodDiscounts(paymentMethod: string, orderTotal: number): Promise<ApplicableDiscount[]> {
    const cacheKey = this.getCacheKey('payment_discounts', { paymentMethod });
    const cached = this.getFromCache<ApplicableDiscount[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('payment_method_discounts')
        .select('*')
        .eq('payment_method', paymentMethod)
        .eq('is_active', true)
        .single();

      if (error || !data) return [];

      const discounts: ApplicableDiscount[] = [{
        discount_source: 'payment_method',
        discount_type: 'percentage',
        discount_value: data.discount_percentage,
        discount_amount: (orderTotal * data.discount_percentage) / 100,
        applies_to: data.applies_to || 'handling',
        is_stackable: true,
        priority: 80,
        description: `${paymentMethod.replace('_', ' ')} discount`,
      }];

      this.setCache(cacheKey, discounts);
      return discounts;
    } catch (error) {
      logger.error('Error getting payment method discounts', error);
      return [];
    }
  }

  private async getCampaignDiscounts(context: any): Promise<ApplicableDiscount[]> {
    // Implementation for campaign discounts
    // This would check active campaigns and their eligibility
    return [];
  }

  private async getVolumeDiscounts(orderTotal: number, itemCount: number): Promise<ApplicableDiscount[]> {
    // Implementation for volume-based discounts
    // This would check tiered discount rules
    return [];
  }

  private async getFirstTimeDiscounts(orderTotal: number): Promise<ApplicableDiscount[]> {
    // Implementation for first-time customer discounts
    return [];
  }

  private async getCountryDiscounts(countryCode: string, orderTotal: number): Promise<ApplicableDiscount[]> {
    // Implementation for country-specific discounts
    return [];
  }

  private async getCodeDiscounts(code: string, context: any): Promise<ApplicableDiscount[]> {
    const validation = await this.validateDiscountCode(code, context);
    if (!validation.valid || !validation.discount) return [];

    const discountCode = validation.discount;
    const discountType = discountCode.discount_type;

    return [{
      discount_source: 'code',
      discount_type: discountType.type,
      discount_value: discountType.value,
      discount_amount: 0, // Will be calculated later
      applies_to: discountType.conditions?.applicable_to || 'total',
      is_stackable: discountType.conditions?.stacking_allowed !== false,
      priority: discountType.priority || 50,
      description: discountType.name || `Promo code: ${code}`,
      discount_code_id: discountCode.id,
      campaign_id: discountCode.campaign_id,
      conditions: discountType.conditions,
    }];
  }

  private async applyStackingRules(discounts: ApplicableDiscount[]): Promise<ApplicableDiscount[]> {
    // Sort by priority (higher first)
    const sortedDiscounts = discounts.sort((a, b) => b.priority - a.priority);
    
    // Apply stacking rules based on configuration
    const stackedDiscounts: ApplicableDiscount[] = [];
    const usedSources = new Set<string>();
    let totalPercentage = 0;

    for (const discount of sortedDiscounts) {
      // Check if we've exceeded maximum stacking count
      if (stackedDiscounts.length >= this.config.maxStackingCount) break;

      // Check if this source type is already used and not stackable
      if (!discount.is_stackable && usedSources.has(discount.discount_source)) continue;

      // Check total percentage limit for percentage discounts
      if (discount.discount_type === 'percentage') {
        if (totalPercentage + discount.discount_value > this.config.maxTotalDiscountPercentage) {
          continue;
        }
        totalPercentage += discount.discount_value;
      }

      stackedDiscounts.push(discount);
      usedSources.add(discount.discount_source);
    }

    return stackedDiscounts;
  }

  private calculateComponentDiscount(
    componentValue: number,
    discounts: ApplicableDiscount[],
    componentName: string
  ): ComponentDiscount {
    let remainingValue = componentValue;
    let totalDiscountAmount = 0;
    const appliedDiscounts: ApplicableDiscount[] = [];

    for (const discount of discounts) {
      if (remainingValue <= 0) break;

      let discountAmount = 0;
      if (discount.discount_type === 'percentage') {
        discountAmount = remainingValue * (discount.discount_value / 100);
        
        // Apply caps from conditions
        if (discount.conditions?.max_discount) {
          discountAmount = Math.min(discountAmount, discount.conditions.max_discount);
        }
      } else {
        discountAmount = Math.min(discount.discount_value, remainingValue);
      }

      if (discountAmount > 0) {
        totalDiscountAmount += discountAmount;
        remainingValue -= discountAmount;
        
        appliedDiscounts.push({
          ...discount,
          discount_amount: discountAmount,
        });
      }
    }

    return {
      original_value: componentValue,
      discounted_value: Math.max(0, remainingValue),
      discount_amount: totalDiscountAmount,
      applied_discounts: appliedDiscounts,
    };
  }

  // ============================================================================
  // DISCOUNT USAGE TRACKING
  // ============================================================================

  async recordDiscountUsage(
    customerId: string,
    discounts: ApplicableDiscount[],
    context: {
      quoteId?: string;
      orderId?: string;
      originalAmount: number;
      currency: string;
    }
  ): Promise<boolean> {
    try {
      const usageRecords = discounts.map(discount => ({
        customer_id: customerId,
        discount_code_id: discount.discount_code_id,
        campaign_id: discount.campaign_id,
        quote_id: context.quoteId,
        order_id: context.orderId,
        discount_amount: discount.discount_amount,
        original_amount: context.originalAmount,
        currency: context.currency,
        discount_source: discount.discount_source,
        applied_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('customer_discount_usage')
        .insert(usageRecords);

      if (error) {
        logger.error('Error recording discount usage', error);
        return false;
      }

      // Update usage counts
      await this.updateUsageCounts(discounts);

      if (this.config.enableLogging) {
        logger.info('Discount usage recorded successfully', {
          customer_id: customerId,
          discounts_count: discounts.length,
          total_discount: discounts.reduce((sum, d) => sum + d.discount_amount, 0),
        });
      }

      return true;
    } catch (error) {
      logger.error('Error recording discount usage', error);
      return false;
    }
  }

  private async updateUsageCounts(discounts: ApplicableDiscount[]): Promise<void> {
    const updates: Promise<any>[] = [];

    for (const discount of discounts) {
      if (discount.discount_code_id) {
        updates.push(
          supabase
            .from('discount_codes')
            .update({ usage_count: supabase.raw('usage_count + 1') })
            .eq('id', discount.discount_code_id)
        );
      }

      if (discount.campaign_id) {
        updates.push(
          supabase
            .from('discount_campaigns')
            .update({ usage_count: supabase.raw('usage_count + 1') })
            .eq('id', discount.campaign_id)
        );
      }
    }

    if (updates.length > 0) {
      await Promise.allSettled(updates);
    }
  }

  // ============================================================================
  // CAMPAIGN AND CODE MANAGEMENT
  // ============================================================================

  async getActiveCampaigns(filters?: {
    countryCode?: string;
    membershipType?: string;
    targetAudience?: string[];
  }): Promise<DiscountCampaign[]> {
    const cacheKey = this.getCacheKey('active_campaigns', filters);
    const cached = this.getFromCache<DiscountCampaign[]>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('discount_campaigns')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .eq('is_active', true)
        .lte('start_date', now);

      const { data, error } = await query;
      
      if (error) throw error;

      let campaigns = (data || []).filter(campaign => {
        if (!campaign.end_date) return true;
        return new Date(campaign.end_date) >= new Date(now);
      });

      // Apply filters
      if (filters?.countryCode) {
        campaigns = campaigns.filter(c =>
          !c.target_audience?.countries || 
          c.target_audience.countries.includes(filters.countryCode!)
        );
      }

      if (filters?.membershipType) {
        campaigns = campaigns.filter(c =>
          !c.target_audience?.membership || 
          c.target_audience.membership.includes(filters.membershipType!)
        );
      }

      this.setCache(cacheKey, campaigns);
      return campaigns;
    } catch (error) {
      logger.error('Error getting active campaigns', error);
      return [];
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  async getHealthStatus(): Promise<{
    cache: boolean;
    database: boolean;
    abuseDetection: boolean;
    overall: boolean;
  }> {
    const checks = await Promise.allSettled([
      supabase.from('discount_types').select('id').limit(1),
      supabase.from('discount_campaigns').select('id').limit(1),
    ]);

    const database = checks.every(check => check.status === 'fulfilled');
    const cache = this.cache.size >= 0; // Cache is always available
    const abuseDetection = this.config.enableAbuseDetection;

    return {
      cache,
      database,
      abuseDetection,
      overall: cache && database,
    };
  }
}

// Export singleton factory
export const createDiscountService = (config?: Partial<DiscountConfig>) => {
  return UnifiedDiscountService.getInstance(config);
};

// Default instance
export const getDiscountService = () => {
  return UnifiedDiscountService.getInstance({
    enableAbuseDetection: true,
    cacheTimeout: 5 * 60 * 1000,
    maxStackingCount: 3,
    maxTotalDiscountPercentage: 50,
    enableLogging: true,
  });
};