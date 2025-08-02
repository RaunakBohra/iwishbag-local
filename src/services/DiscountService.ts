import { supabase } from '@/integrations/supabase/client';
import { MembershipService } from './MembershipService';

export interface DiscountType {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'shipping' | 'handling_fee' | 'customs' | 'taxes' | 'all_fees';
  value: number;
  conditions: {
    min_order?: number;
    max_discount?: number;
    max_discount_percentage?: number;
    applicable_to?: 'total' | 'handling' | 'shipping' | 'customs' | 'taxes' | 'insurance' | 'delivery' | 'all_fees';
    exclude_components?: string[];
    stacking_allowed?: boolean;
    membership_required?: boolean;
    first_time_only?: boolean;
    min_items?: number;
    use_tiers?: boolean;
  };
  applicable_components?: string[];
  tier_rules?: DiscountTier[];
  priority?: number;
  is_active: boolean;
}

export interface DiscountTier {
  id: string;
  min_order_value: number;
  max_order_value?: number;
  discount_value: number;
  applicable_components: string[];
}

export interface CountryDiscountRule {
  id: string;
  discount_type_id: string;
  country_code: string;
  component_discounts: { [component: string]: number };
  min_order_amount?: number;
  max_uses_per_customer?: number;
  requires_code?: boolean;
  auto_apply?: boolean;
  description?: string;
  priority?: number;
  discount_conditions?: any;
}

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
  trigger_rules?: {
    happy_hour?: {
      days: number[];
      hours: number[];
    };
    birthday?: boolean;
  };
  discount_type?: DiscountType;
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
  campaign?: DiscountCampaign;
  discount_type?: DiscountType;
}

export interface ApplicableDiscount {
  discount_source: 'membership' | 'payment_method' | 'campaign' | 'code' | 'volume' | 'first_time';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: 'total' | 'handling' | 'shipping' | 'customs' | 'taxes' | 'insurance' | 'delivery' | 'all_fees';
  component_breakdown?: { [component: string]: number }; // e.g., {"customs": 25, "handling": 10}
  is_stackable: boolean;
  priority?: number;
  description?: string;
  discount_code_id?: string;
  campaign_id?: string;
  conditions?: any; // Contains max_discount and other conditions
}

export interface DiscountCalculation {
  subtotal: number;
  discounts: ApplicableDiscount[];
  total_discount: number;
  final_total: number;
  savings_percentage: number;
}

class DiscountServiceClass {
  private static instance: DiscountServiceClass;
  private discountCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DiscountServiceClass {
    if (!DiscountServiceClass.instance) {
      DiscountServiceClass.instance = new DiscountServiceClass();
    }
    return DiscountServiceClass.instance;
  }

  private getCacheKey(operation: string, params?: any): string {
    return `${operation}:${JSON.stringify(params || {})}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.discountCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.discountCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.discountCache.set(key, { data, timestamp: Date.now() });
  }

  async validateDiscountCode(code: string, customerId?: string): Promise<{
    valid: boolean;
    discount?: DiscountCode;
    error?: string;
  }> {
    try {
      // Get discount code
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
        return { valid: false, error: 'Invalid discount code' };
      }

      // Check if active
      if (!discountCode.is_active) {
        return { valid: false, error: 'This discount code is no longer active' };
      }

      // Check validity dates
      const now = new Date();
      if (new Date(discountCode.valid_from) > now) {
        return { valid: false, error: 'This discount code is not yet valid' };
      }
      if (discountCode.valid_until && new Date(discountCode.valid_until) < now) {
        return { valid: false, error: 'This discount code has expired' };
      }

      // Check usage limits
      if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
        return { valid: false, error: 'This discount code has reached its usage limit' };
      }

      // Check customer usage limit if customerId provided
      if (customerId && discountCode.usage_per_customer) {
        // First, try to find the customer by email
        let actualCustomerId = customerId;
        
        // Check if customerId is an email
        if (customerId.includes('@')) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', customerId)
            .single();
          
          if (profile) {
            actualCustomerId = profile.id;
          } else {
            // If no profile found, skip usage check for now
            console.log('No profile found for email:', customerId);
            return { valid: true, discount: discountCode };
          }
        }

        const { count } = await supabase
          .from('customer_discount_usage')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', actualCustomerId)
          .eq('discount_code_id', discountCode.id);

        if (count && count >= discountCode.usage_per_customer) {
          return { valid: false, error: 'You have already used this discount code' };
        }
      }

      return { valid: true, discount: discountCode };
    } catch (error) {
      console.error('Error validating discount code:', error);
      return { valid: false, error: 'Error validating discount code' };
    }
  }

  async getApplicableDiscounts(
    customerId: string,
    quoteTotal: number,
    handlingFee: number,
    paymentMethod?: string,
    countryCode?: string,
    discountCode?: string
  ): Promise<ApplicableDiscount[]> {
    try {
      const discounts: ApplicableDiscount[] = [];

      // Get discounts from RPC function
      const { data: autoDiscounts, error } = await supabase
        .rpc('calculate_applicable_discounts', {
          p_customer_id: customerId,
          p_quote_total: quoteTotal,
          p_handling_fee: handlingFee,
          p_payment_method: paymentMethod,
          p_country_code: countryCode
        });

      if (error) throw error;

      // Add auto-applied discounts
      if (autoDiscounts && autoDiscounts.length > 0) {
        for (const discount of autoDiscounts) {
          // Map RPC response to ApplicableDiscount format
          discounts.push({
            discount_source: 'payment_method',
            discount_type: discount.discount_type as 'percentage' | 'fixed_amount',
            discount_value: Number(discount.value),
            discount_amount: Number(discount.discount_amount),
            applies_to: 'handling',
            is_stackable: true,
            description: `${paymentMethod?.replace('_', ' ')} discount: ${discount.value}% off handling fee`
          });
        }
      }

      // Check for membership discounts
      try {
        const { data: membershipDiscount, error: membershipError } = await supabase
          .rpc('calculate_membership_discount', {
            p_customer_id: customerId,
            p_amount: quoteTotal
          });

        if (!membershipError && membershipDiscount && membershipDiscount.length > 0) {
          const md = membershipDiscount[0];
          if (md.has_discount && md.discount_percentage > 0) {
            discounts.push({
              discount_source: 'membership',
              discount_type: 'percentage',
              discount_value: md.discount_percentage,
              discount_amount: Number(md.discount_amount),
              applies_to: 'total',
              is_stackable: true,
              description: `${md.membership_name} membership: ${md.discount_percentage}% off`
            });
          }
        }
      } catch (error) {
        console.warn('Could not check membership discount:', error);
      }

      // Add manual discount code if provided
      if (discountCode) {
        const validation = await this.validateDiscountCode(discountCode, customerId);
        if (validation.valid && validation.discount) {
          const discount = validation.discount;
          const discountType = discount.discount_type!;
          
          // Check if this is a component-specific discount
          if (discountType.applicable_components && discountType.applicable_components.length > 0) {
            // Component-specific discount - add for each component
            discountType.applicable_components.forEach((component: string) => {
              discounts.push({
                discount_source: 'code',
                discount_type: discountType.type as 'percentage' | 'fixed_amount',
                discount_value: discountType.value,
                discount_amount: 0, // Will be calculated by component
                applies_to: component as any,
                is_stackable: discountType.conditions?.stacking_allowed !== false,
                priority: discount.priority || discountType.priority || 100,
                description: discountType.name || `Promo Code: ${discountCode}`,
                discount_code_id: discount.id,
                campaign_id: discount.campaign_id || undefined,
                conditions: discountType.conditions // Pass through conditions including max_discount
              });
            });
          } else {
            // Traditional order-level discount (applies to total)
            let discountAmount = 0;
            let appliesTo = 'total';
            
            // Calculate discount amount for order-level discounts
            if (discountType.type === 'percentage') {
              discountAmount = quoteTotal * (discountType.value / 100);
              // Apply max discount cap if exists
              if (discountType.conditions?.max_discount) {
                discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
              }
            } else {
              discountAmount = Math.min(discountType.value, quoteTotal);
            }

            discounts.push({
              discount_source: 'code',
              discount_type: discountType.type as 'percentage' | 'fixed_amount',
              discount_value: discountType.value,
              discount_amount: discountAmount,
              applies_to: appliesTo as 'total' | 'handling' | 'shipping',
              is_stackable: discountType.conditions?.stacking_allowed !== false,
              priority: discount.priority || discountType.priority || 0,
              description: discountType.name || `Promo Code: ${discountCode}`,
              discount_code_id: discount.id,
              campaign_id: discount.campaign_id || undefined,
              conditions: discountType.conditions
            });
          }
        }
      }

      return discounts;
    } catch (error) {
      console.error('Error getting applicable discounts:', error);
      return [];
    }
  }

  private getDiscountDescription(discount: any): string {
    switch (discount.discount_source) {
      case 'membership':
        return 'iwishBag Plus Member Discount';
      case 'payment_method':
        return 'Payment Method Discount';
      case 'campaign':
        return 'Special Offer';
      default:
        return 'Discount';
    }
  }

  async calculateDiscounts(
    customerId: string,
    quoteTotal: number,
    handlingFee: number,
    paymentMethod?: string,
    countryCode?: string,
    discountCodes?: string[]
  ): Promise<DiscountCalculation> {
    try {
      const applicableDiscounts: ApplicableDiscount[] = [];

      // Get auto-applied discounts
      const autoDiscounts = await this.getApplicableDiscounts(
        customerId,
        quoteTotal,
        handlingFee,
        paymentMethod,
        countryCode
      );
      applicableDiscounts.push(...autoDiscounts);

      // Add manual discount codes
      if (discountCodes && discountCodes.length > 0) {
        for (const code of discountCodes) {
          const codeDiscounts = await this.getApplicableDiscounts(
            customerId,
            quoteTotal,
            handlingFee,
            paymentMethod,
            countryCode,
            code
          );
          applicableDiscounts.push(...codeDiscounts.filter(d => d.discount_source === 'code'));
        }
      }

      // Apply stacking rules
      const stackedDiscounts = await this.applyStackingRules(applicableDiscounts);

      // Calculate total discount
      const totalDiscount = stackedDiscounts.reduce((sum, d) => sum + d.discount_amount, 0);
      const finalTotal = quoteTotal - totalDiscount;
      const savingsPercentage = (totalDiscount / quoteTotal) * 100;

      return {
        subtotal: quoteTotal,
        discounts: stackedDiscounts,
        total_discount: totalDiscount,
        final_total: Math.max(0, finalTotal),
        savings_percentage: Math.min(savingsPercentage, 100)
      };
    } catch (error) {
      console.error('Error calculating discounts:', error);
      return {
        subtotal: quoteTotal,
        discounts: [],
        total_discount: 0,
        final_total: quoteTotal,
        savings_percentage: 0
      };
    }
  }

  private async applyStackingRules(discounts: ApplicableDiscount[]): Promise<ApplicableDiscount[]> {
    try {
      // Get active stacking rules
      const { data: rules, error } = await supabase
        .from('discount_stacking_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      if (error || !rules) {
        // Default rule: allow up to 3 stackable discounts
        return discounts.filter(d => d.is_stackable).slice(0, 3);
      }

      // Filter by allowed combinations
      const allowedCombinations = rules.allowed_combinations || ['membership', 'payment_method', 'campaign'];
      const filteredDiscounts = discounts.filter(d => 
        d.is_stackable && allowedCombinations.includes(d.discount_source)
      );

      // Apply max stack count
      const maxCount = rules.max_stack_count || 3;
      const stackedDiscounts = filteredDiscounts.slice(0, maxCount);

      // Check max total discount percentage
      const maxPercentage = rules.max_total_discount_percentage || 30;
      let totalPercentage = 0;
      const finalDiscounts: ApplicableDiscount[] = [];

      for (const discount of stackedDiscounts) {
        if (discount.discount_type === 'percentage') {
          if (totalPercentage + discount.discount_value <= maxPercentage) {
            finalDiscounts.push(discount);
            totalPercentage += discount.discount_value;
          }
        } else {
          finalDiscounts.push(discount);
        }
      }

      return finalDiscounts;
    } catch (error) {
      console.error('Error applying stacking rules:', error);
      // Default: return first 3 stackable discounts
      return discounts.filter(d => d.is_stackable).slice(0, 3);
    }
  }

  async recordDiscountUsage(
    customerId: string,
    discounts: ApplicableDiscount[],
    quoteId?: string,
    orderId?: string,
    originalAmount?: number,
    currency?: string
  ): Promise<boolean> {
    try {
      const usageRecords = discounts.map(discount => ({
        customer_id: customerId,
        discount_code_id: discount.discount_source === 'code' ? discount.discount_source : null,
        campaign_id: discount.discount_source === 'campaign' ? discount.discount_source : null,
        quote_id: quoteId,
        order_id: orderId,
        discount_amount: discount.discount_amount,
        original_amount: originalAmount || 0,
        currency: currency || 'USD',
        discount_breakdown: {
          [discount.discount_source]: discount.discount_amount
        }
      }));

      const { error } = await supabase
        .from('customer_discount_usage')
        .insert(usageRecords);

      if (error) throw error;

      // Update usage counts for discount codes
      for (const discount of discounts) {
        if (discount.discount_source === 'code') {
          // Increment usage count
          await supabase.rpc('increment', {
            table_name: 'discount_codes',
            column_name: 'usage_count',
            row_id: discount.discount_source
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error recording discount usage:', error);
      return false;
    }
  }

  async getActiveCampaigns(
    countryCode?: string,
    membershipType?: string
  ): Promise<DiscountCampaign[]> {
    try {
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

      if (error) throw error;

      // Filter by end_date after fetching (to handle null end_date properly)
      let campaigns = (data || []).filter(campaign => {
        if (!campaign.end_date) return true; // No end date means ongoing
        return new Date(campaign.end_date) >= new Date(now);
      });
      
      if (countryCode) {
        campaigns = campaigns.filter(c => 
          !c.target_audience?.countries || 
          c.target_audience.countries.includes(countryCode)
        );
      }

      if (membershipType) {
        campaigns = campaigns.filter(c => 
          !c.target_audience?.membership || 
          c.target_audience.membership.includes(membershipType)
        );
      }

      return campaigns;
    } catch (error) {
      console.error('Error getting active campaigns:', error);
      return [];
    }
  }

  async getAllCampaigns(): Promise<DiscountCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting all campaigns:', error);
      return [];
    }
  }

  async getPaymentMethodDiscounts(): Promise<{
    [method: string]: number;
  }> {
    const cacheKey = this.getCacheKey('payment_discounts');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('payment_method_discounts')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const discounts: { [method: string]: number } = {};
      (data || []).forEach(d => {
        discounts[d.payment_method] = d.discount_percentage;
      });

      this.setCache(cacheKey, discounts);
      return discounts;
    } catch (error) {
      console.error('Error getting payment method discounts:', error);
      return {};
    }
  }

  async trackCouponUsage(
    customerId: string,
    quoteId: string,
    discountCodeId: string,
    discountAmount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert email to actual customer ID if needed
      let actualCustomerId = customerId;
      
      if (customerId.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', customerId)
          .single();
        
        if (profile) {
          actualCustomerId = profile.id;
        } else {
          // Create a placeholder profile or skip tracking
          console.log('No profile found for email:', customerId);
          return { success: true }; // Skip tracking for now
        }
      }

      // Record the usage
      const { error: usageError } = await supabase
        .from('customer_discount_usage')
        .insert({
          customer_id: actualCustomerId,
          quote_id: quoteId,
          discount_code_id: discountCodeId,
          discount_amount: discountAmount,
          used_at: new Date().toISOString()
        });

      if (usageError) {
        console.error('Error tracking coupon usage:', usageError);
        return { success: false, error: 'Failed to track coupon usage' };
      }

      // Increment usage count on the discount code
      const { error: incrementError } = await supabase
        .rpc('increment_discount_usage', {
          p_discount_code_id: discountCodeId
        });

      if (incrementError) {
        console.error('Error incrementing usage count:', incrementError);
        // Don't fail the whole operation if increment fails
      }

      // Clear cache for this discount code
      this.discountCache.clear();

      return { success: true };
    } catch (error) {
      console.error('Error in trackCouponUsage:', error);
      return { success: false, error: 'Unexpected error tracking coupon usage' };
    }
  }

  clearCache(): void {
    this.discountCache.clear();
  }

  async getComponentDiscounts(
    customerId: string,
    orderTotal: number,
    countryCode: string,
    isFirstOrder: boolean = false,
    itemCount: number = 1,
    discountCodes: string[] = []
  ): Promise<Map<string, ApplicableDiscount[]>> {
    const componentDiscounts = new Map<string, ApplicableDiscount[]>();
    
    try {
      // Get all applicable discounts
      const allDiscounts = await this.getApplicableDiscounts(
        customerId,
        orderTotal,
        0, // We'll calculate handling separately
        undefined,
        countryCode,
        discountCodes[0] // For now, just use first code
      );

      // Get volume discounts
      const volumeDiscounts = await this.getVolumeDiscounts(orderTotal, itemCount);
      
      // Get first-time customer discounts
      if (isFirstOrder) {
        const firstTimeDiscounts = await this.getFirstTimeDiscounts(orderTotal);
        allDiscounts.push(...firstTimeDiscounts);
      }

      // Get country-specific discounts (both automatic and code-based)
      const countryDiscounts = await this.getCountrySpecificDiscounts(countryCode, orderTotal, true, discountCodes);
      allDiscounts.push(...countryDiscounts);

      // Group discounts by component
      [...allDiscounts, ...volumeDiscounts].forEach(discount => {
        const components = this.getDiscountComponents(discount);
        components.forEach(component => {
          if (!componentDiscounts.has(component)) {
            componentDiscounts.set(component, []);
          }
          componentDiscounts.get(component)!.push(discount);
        });
      });

      return componentDiscounts;
    } catch (error) {
      console.error('Error getting component discounts:', error);
      return componentDiscounts;
    }
  }

  private getDiscountComponents(discount: ApplicableDiscount): string[] {
    if (discount.applies_to === 'all_fees') {
      return ['customs', 'handling', 'taxes', 'delivery'];
    }
    return [discount.applies_to];
  }

  async getVolumeDiscounts(orderTotal: number, itemCount: number): Promise<ApplicableDiscount[]> {
    try {
      const { data: volumeDiscounts, error } = await supabase
        .from('discount_types')
        .select(`
          *,
          tiers:discount_tiers(*)
        `)
        .eq('is_active', true)
        .eq('conditions->use_tiers', true);

      if (error || !volumeDiscounts) return [];

      const applicableDiscounts: ApplicableDiscount[] = [];

      volumeDiscounts.forEach(discount => {
        if (!discount.tiers || discount.tiers.length === 0) return;

        // Find applicable tier
        const applicableTier = discount.tiers
          .sort((a, b) => b.min_order_value - a.min_order_value)
          .find(tier => 
            orderTotal >= tier.min_order_value && 
            (!tier.max_order_value || orderTotal <= tier.max_order_value)
          );

        if (applicableTier) {
          applicableTier.applicable_components.forEach(component => {
            applicableDiscounts.push({
              discount_source: 'volume',
              discount_type: 'percentage',
              discount_value: applicableTier.discount_value,
              discount_amount: 0, // Will be calculated later
              applies_to: component as any,
              is_stackable: discount.conditions?.stacking_allowed !== false,
              priority: discount.priority || 100,
              description: `Volume discount: ${applicableTier.discount_value}% off ${component}`
            });
          });
        }
      });

      return applicableDiscounts;
    } catch (error) {
      console.error('Error getting volume discounts:', error);
      return [];
    }
  }

  async getFirstTimeDiscounts(orderTotal: number): Promise<ApplicableDiscount[]> {
    try {
      const { data: firstTimeDiscounts, error } = await supabase
        .from('discount_types')
        .select('*')
        .eq('is_active', true)
        .eq('conditions->first_time_only', true)
        .or(`conditions->min_order.is.null,conditions->min_order.lte.${orderTotal}`);

      if (error || !firstTimeDiscounts) return [];

      return firstTimeDiscounts.map(discount => ({
        discount_source: 'first_time' as const,
        discount_type: discount.type.includes('percentage') ? 'percentage' : 'fixed_amount' as const,
        discount_value: discount.value,
        discount_amount: 0,
        applies_to: (discount.conditions?.applicable_to || 'total') as any,
        is_stackable: discount.conditions?.stacking_allowed !== false,
        priority: discount.priority || 100,
        description: discount.name
      }));
    } catch (error) {
      console.error('Error getting first-time discounts:', error);
      return [];
    }
  }

  async getCountrySpecificDiscounts(
    countryCode: string, 
    orderTotal: number, 
    includeAutomatic: boolean = true,
    appliedCodes: string[] = []
  ): Promise<ApplicableDiscount[]> {
    try {
      const { data: countryRules, error } = await supabase
        .from('country_discount_rules')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .eq('country_code', countryCode)
        .or(`min_order_amount.is.null,min_order_amount.lte.${orderTotal}`)
        .order('priority', { ascending: false });

      if (error || !countryRules) return [];

      const discounts: ApplicableDiscount[] = [];
      
      for (const rule of countryRules) {
        if (!rule.discount_type?.is_active) continue;
        
        // Determine if this rule should be applied
        let shouldApply = false;
        let discountSource: 'campaign' | 'code' = 'campaign';
        
        if (rule.auto_apply && !rule.requires_code && includeAutomatic) {
          // Automatic discount - apply if conditions are met
          shouldApply = true;
          discountSource = 'campaign';
        } else if (rule.requires_code && appliedCodes.length > 0) {
          // Code-based discount - check if matching code is applied
          const hasMatchingCode = await this.checkCodeMatchesRule(rule, appliedCodes);
          if (hasMatchingCode) {
            shouldApply = true;
            discountSource = 'code';
          }
        }
        
        if (shouldApply) {
          // Apply component-specific discounts
          Object.entries(rule.component_discounts).forEach(([component, value]) => {
            discounts.push({
              discount_source: discountSource,
              discount_type: 'percentage',
              discount_value: value as number,
              discount_amount: 0,
              applies_to: component as any,
              is_stackable: rule.discount_type.conditions?.stacking_allowed !== false,
              priority: rule.priority || rule.discount_type.priority || 100,
              description: rule.description || `${countryCode} special: ${value}% off ${component}`,
              conditions: rule.discount_type.conditions
            });
          });
        }
      }
      
      return discounts;
    } catch (error) {
      console.error('Error getting country-specific discounts:', error);
      return [];
    }
  }

  private async checkCodeMatchesRule(rule: CountryDiscountRule, appliedCodes: string[]): Promise<boolean> {
    try {
      // Check if any of the applied codes match the discount type for this rule
      const { data: matchingCodes, error } = await supabase
        .from('discount_codes')
        .select('code')
        .eq('discount_type_id', rule.discount_type_id)
        .in('code', appliedCodes)
        .eq('is_active', true);

      return !error && matchingCodes && matchingCodes.length > 0;
    } catch (error) {
      console.error('Error checking code match:', error);
      return false;
    }
  }

  // Separate method to get only automatic discounts for UI display
  async getAutomaticCountryBenefits(countryCode: string, orderTotal: number): Promise<ApplicableDiscount[]> {
    return this.getCountrySpecificDiscounts(countryCode, orderTotal, true, []);
  }

  // Method to get eligible discounts that require codes (for notifications)
  async getEligibleCodeBasedDiscounts(countryCode: string, orderTotal: number): Promise<{
    available_codes: string[];
    discount_descriptions: string[];
  }> {
    try {
      const { data: eligibleRules, error } = await supabase
        .from('country_discount_rules')
        .select(`
          *,
          discount_type:discount_types(
            *,
            discount_codes(code, is_active)
          )
        `)
        .eq('country_code', countryCode)
        .eq('requires_code', true)
        .or(`min_order_amount.is.null,min_order_amount.lte.${orderTotal}`);

      if (error || !eligibleRules) return { available_codes: [], discount_descriptions: [] };

      const availableCodes: string[] = [];
      const descriptions: string[] = [];

      eligibleRules.forEach(rule => {
        if (rule.discount_type?.is_active && rule.discount_type.discount_codes) {
          rule.discount_type.discount_codes.forEach((codeObj: any) => {
            if (codeObj.is_active) {
              availableCodes.push(codeObj.code);
              descriptions.push(rule.description || `Use code ${codeObj.code} for discount`);
            }
          });
        }
      });

      return {
        available_codes: [...new Set(availableCodes)],
        discount_descriptions: [...new Set(descriptions)]
      };
    } catch (error) {
      console.error('Error getting eligible code-based discounts:', error);
      return { available_codes: [], discount_descriptions: [] };
    }
  }

  calculateComponentDiscount(
    componentValue: number,
    discounts: ApplicableDiscount[],
    componentName: string
  ): { finalValue: number; totalDiscount: number; appliedDiscounts: ApplicableDiscount[] } {
    // Sort by priority (higher priority first)
    const sortedDiscounts = discounts.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    let remainingValue = componentValue;
    let totalDiscount = 0;
    const appliedDiscounts: ApplicableDiscount[] = [];

    for (const discount of sortedDiscounts) {
      if (!discount.is_stackable && appliedDiscounts.length > 0) continue;

      let discountAmount = 0;
      if (discount.discount_type === 'percentage') {
        discountAmount = remainingValue * (discount.discount_value / 100);
        
        // Apply max discount limits
        const conditions = (discount as any).conditions;
        if (conditions?.max_discount) {
          discountAmount = Math.min(discountAmount, conditions.max_discount);
        }
        if (conditions?.max_discount_percentage) {
          const maxAllowed = componentValue * (conditions.max_discount_percentage / 100);
          discountAmount = Math.min(discountAmount, maxAllowed);
        }
      } else {
        discountAmount = Math.min(discount.discount_value, remainingValue);
      }

      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        remainingValue -= discountAmount;
        appliedDiscounts.push({
          ...discount,
          discount_amount: discountAmount
        });

        // If this discount brings the value to 0, stop
        if (remainingValue <= 0) break;
      }
    }

    return {
      finalValue: Math.max(0, remainingValue),
      totalDiscount,
      appliedDiscounts
    };
  }
}

export const DiscountService = DiscountServiceClass.getInstance();