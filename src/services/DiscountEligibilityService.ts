import { supabase } from '@/integrations/supabase/client';
import { DiscountService, type ApplicableDiscount, type CountryDiscountRule } from './DiscountService';

export interface DiscountEligibilityResult {
  is_eligible: boolean;
  automatic_benefits: ApplicableDiscount[];
  available_codes: string[];
  applied_discounts: ApplicableDiscount[];
  total_potential_savings: number;
  eligibility_messages: string[];
  requirements_not_met: string[];
}

export interface CustomerContext {
  customer_id?: string;
  email?: string;
  country: string;
  is_first_order?: boolean;
  membership_tier?: string;
  order_total: number;
  applied_codes: string[];
}

export class DiscountEligibilityService {
  private static instance: DiscountEligibilityService;
  private discountService: DiscountService;

  constructor() {
    this.discountService = DiscountService.getInstance();
  }

  static getInstance(): DiscountEligibilityService {
    if (!DiscountEligibilityService.instance) {
      DiscountEligibilityService.instance = new DiscountEligibilityService();
    }
    return DiscountEligibilityService.instance;
  }

  /**
   * Get comprehensive discount eligibility for a customer
   */
  async getDiscountEligibility(context: CustomerContext): Promise<DiscountEligibilityResult> {
    try {
      const result: DiscountEligibilityResult = {
        is_eligible: false,
        automatic_benefits: [],
        available_codes: [],
        applied_discounts: [],
        total_potential_savings: 0,
        eligibility_messages: [],
        requirements_not_met: []
      };

      // Get automatic country benefits
      const automaticBenefits = await this.discountService.getAutomaticCountryBenefits(
        context.country, 
        context.order_total
      );
      result.automatic_benefits = automaticBenefits;

      // Get eligible code-based discounts
      const eligibleCodes = await this.discountService.getEligibleCodeBasedDiscounts(
        context.country, 
        context.order_total
      );
      result.available_codes = eligibleCodes.available_codes;

      // Get currently applied discounts
      if (context.applied_codes.length > 0) {
        const appliedDiscounts = await this.discountService.getCountrySpecificDiscounts(
          context.country,
          context.order_total,
          false, // Don't include automatic
          context.applied_codes
        );
        result.applied_discounts = appliedDiscounts;
      }

      // Calculate potential savings
      result.total_potential_savings = this.calculatePotentialSavings(
        [...result.automatic_benefits, ...result.applied_discounts],
        context.order_total
      );

      // Generate eligibility messages
      result.eligibility_messages = await this.generateEligibilityMessages(context, result);
      
      // Check if customer is eligible for any discounts
      result.is_eligible = result.automatic_benefits.length > 0 || 
                          result.available_codes.length > 0 || 
                          result.applied_discounts.length > 0;

      return result;
    } catch (error) {
      console.error('Error checking discount eligibility:', error);
      return {
        is_eligible: false,
        automatic_benefits: [],
        available_codes: [],
        applied_discounts: [],
        total_potential_savings: 0,
        eligibility_messages: ['Unable to check discount eligibility at this time'],
        requirements_not_met: []
      };
    }
  }

  /**
   * Check if customer meets requirements for specific discount rules
   */
  async validateDiscountRequirements(
    rules: CountryDiscountRule[],
    context: CustomerContext
  ): Promise<{ met: CountryDiscountRule[]; unmet: { rule: CountryDiscountRule; reason: string }[] }> {
    const met: CountryDiscountRule[] = [];
    const unmet: { rule: CountryDiscountRule; reason: string }[] = [];

    for (const rule of rules) {
      const validation = await this.validateSingleRule(rule, context);
      if (validation.is_valid) {
        met.push(rule);
      } else {
        unmet.push({ rule, reason: validation.reason });
      }
    }

    return { met, unmet };
  }

  /**
   * Validate a single discount rule against customer context
   */
  private async validateSingleRule(
    rule: CountryDiscountRule,
    context: CustomerContext
  ): Promise<{ is_valid: boolean; reason: string }> {
    // Check minimum order amount
    if (rule.min_order_amount && context.order_total < rule.min_order_amount) {
      return {
        is_valid: false,
        reason: `Minimum order amount of $${rule.min_order_amount} required`
      };
    }

    // Check country match
    if (rule.country_code !== context.country) {
      return {
        is_valid: false,
        reason: `This discount is only available for ${rule.country_code}`
      };
    }

    // Check if code is required and applied
    if (rule.requires_code && context.applied_codes.length === 0) {
      return {
        is_valid: false,
        reason: 'Discount code required'
      };
    }

    // Check customer usage limits
    if (rule.max_uses_per_customer && context.customer_id) {
      const usageCount = await this.getCustomerUsageCount(rule.id, context.customer_id);
      if (usageCount >= rule.max_uses_per_customer) {
        return {
          is_valid: false,
          reason: 'Usage limit reached for this discount'
        };
      }
    }

    // Check additional conditions if present
    if (rule.discount_conditions) {
      const conditionCheck = await this.validateDiscountConditions(rule.discount_conditions, context);
      if (!conditionCheck.is_valid) {
        return conditionCheck;
      }
    }

    return { is_valid: true, reason: '' };
  }

  /**
   * Validate additional discount conditions
   */
  private async validateDiscountConditions(
    conditions: any,
    context: CustomerContext
  ): Promise<{ is_valid: boolean; reason: string }> {
    // Check first-time customer requirement
    if (conditions.first_time_only && !context.is_first_order) {
      return {
        is_valid: false,
        reason: 'This discount is only for first-time customers'
      };
    }

    // Check membership requirement
    if (conditions.membership_required && !context.membership_tier) {
      return {
        is_valid: false,
        reason: 'Membership required for this discount'
      };
    }

    // Check minimum items (if we add item count to context later)
    if (conditions.min_items && conditions.min_items > 1) {
      return {
        is_valid: false,
        reason: `Minimum ${conditions.min_items} items required`
      };
    }

    return { is_valid: true, reason: '' };
  }

  /**
   * Get customer usage count for a specific rule
   */
  private async getCustomerUsageCount(ruleId: string, customerId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('discount_application_log')
        .select('*', { count: 'exact', head: true })
        .eq('country_rule_id', ruleId)
        .eq('customer_id', customerId);

      return count || 0;
    } catch (error) {
      console.error('Error getting customer usage count:', error);
      return 0;
    }
  }

  /**
   * Calculate potential savings from discounts
   */
  private calculatePotentialSavings(discounts: ApplicableDiscount[], orderTotal: number): number {
    let totalSavings = 0;

    // Group by component to avoid double-counting
    const componentDiscounts = new Map<string, number>();

    discounts.forEach(discount => {
      const component = discount.applies_to;
      const currentDiscount = componentDiscounts.get(component) || 0;
      
      // Use the higher discount if multiple apply to the same component
      if (discount.discount_value > currentDiscount) {
        componentDiscounts.set(component, discount.discount_value);
      }
    });

    // Calculate approximate savings (simplified calculation)
    componentDiscounts.forEach((percentage, component) => {
      let componentValue = 0;
      
      // Estimate component values based on typical order structure
      switch (component) {
        case 'shipping':
          componentValue = Math.min(orderTotal * 0.1, 50); // Estimate shipping as 10% of order, max $50
          break;
        case 'customs':
          componentValue = orderTotal * 0.15; // Estimate customs as 15%
          break;
        case 'handling':
          componentValue = Math.max(orderTotal * 0.02, 10); // Estimate handling as 2%, min $10
          break;
        case 'taxes':
          componentValue = orderTotal * 0.1; // Estimate taxes as 10%
          break;
        case 'total':
          componentValue = orderTotal;
          break;
        default:
          componentValue = orderTotal * 0.05; // Default estimate
      }
      
      totalSavings += componentValue * (percentage / 100);
    });

    return Math.round(totalSavings * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate user-friendly eligibility messages
   */
  private async generateEligibilityMessages(
    context: CustomerContext,
    result: DiscountEligibilityResult
  ): Promise<string[]> {
    const messages: string[] = [];

    // Automatic benefits messages
    if (result.automatic_benefits.length > 0) {
      const benefitDescriptions = result.automatic_benefits.map(benefit => 
        benefit.description || `${benefit.discount_value}% off ${benefit.applies_to}`
      );
      messages.push(`🎉 You're getting: ${benefitDescriptions.join(', ')}`);
    }

    // Available codes messages
    if (result.available_codes.length > 0) {
      messages.push(`💡 Try these codes: ${result.available_codes.slice(0, 3).join(', ')}`);
    }

    // Savings potential
    if (result.total_potential_savings > 0) {
      messages.push(`💰 Total savings: $${result.total_potential_savings.toFixed(2)}`);
    }

    // First-time customer check
    if (context.is_first_order) {
      messages.push(`🌟 First order? You may be eligible for additional discounts!`);
    }

    // Threshold messages (encourage larger orders)
    const nextThreshold = await this.getNextDiscountThreshold(context);
    if (nextThreshold) {
      const needed = nextThreshold.threshold - context.order_total;
      messages.push(`🎯 Add $${needed.toFixed(2)} more for ${nextThreshold.benefit}`);
    }

    return messages;
  }

  /**
   * Get the next discount threshold customer can reach
   */
  private async getNextDiscountThreshold(context: CustomerContext): Promise<{
    threshold: number;
    benefit: string;
  } | null> {
    try {
      const { data: rules, error } = await supabase
        .from('country_discount_rules')
        .select(`
          min_order_amount,
          description,
          component_discounts
        `)
        .eq('country_code', context.country)
        .gt('min_order_amount', context.order_total)
        .order('min_order_amount', { ascending: true })
        .limit(1);

      if (error || !rules || rules.length === 0) return null;

      const rule = rules[0];
      return {
        threshold: rule.min_order_amount,
        benefit: rule.description || 'additional discounts'
      };
    } catch (error) {
      console.error('Error getting next threshold:', error);
      return null;
    }
  }

  /**
   * Log discount application for analytics
   */
  async logDiscountApplication(
    quoteId: string,
    customerId: string,
    discounts: ApplicableDiscount[],
    context: CustomerContext
  ): Promise<void> {
    try {
      const logEntries = discounts.map(discount => ({
        quote_id: quoteId,
        customer_id: customerId,
        customer_country: context.country,
        discount_type_id: (discount as any).discount_type_id,
        country_rule_id: (discount as any).country_rule_id,
        application_type: discount.discount_source === 'code' ? 'code' : 'automatic',
        discount_amount: discount.discount_amount,
        component_breakdown: { [discount.applies_to]: discount.discount_amount },
        conditions_met: {
          order_total: context.order_total,
          country_match: true,
          code_applied: context.applied_codes.length > 0
        }
      }));

      const { error } = await supabase
        .from('discount_application_log')
        .insert(logEntries);

      if (error) {
        console.error('Error logging discount application:', error);
      }
    } catch (error) {
      console.error('Error in logDiscountApplication:', error);
    }
  }
}

export const discountEligibilityService = DiscountEligibilityService.getInstance();