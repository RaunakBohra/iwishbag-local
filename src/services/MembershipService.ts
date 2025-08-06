import { supabase } from '@/integrations/supabase/client';
import { currencyService } from './CurrencyService';
import { logger } from '@/utils/logger';

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  pricing: Record<string, number>;
  warehouse_benefits: {
    free_storage_days: number;
    discount_percentage_after_free: number;
  };
  duration_days: number;
  is_active: boolean;
}

export interface CustomerMembership {
  id: string;
  customer_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_method?: string;
  plan?: MembershipPlan;
}

export interface MembershipStatus {
  has_membership: boolean;
  membership_type?: string;
  expires_at?: string;
  benefits?: string[];
  warehouse_benefits?: {
    free_storage_days: number;
    discount_percentage_after_free: number;
  };
}

export interface StorageFeeCalculation {
  base_fee: number;
  discount_percentage: number;
  final_fee: number;
  free_days_used: number;
}

class MembershipServiceClass {
  private static instance: MembershipServiceClass;
  private membershipCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): MembershipServiceClass {
    if (!MembershipServiceClass.instance) {
      MembershipServiceClass.instance = new MembershipServiceClass();
    }
    return MembershipServiceClass.instance;
  }

  private getCacheKey(operation: string, params?: any): string {
    return `${operation}:${JSON.stringify(params || {})}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.membershipCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.membershipCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.membershipCache.set(key, { data, timestamp: Date.now() });
  }

  async getActivePlans(): Promise<MembershipPlan[]> {
    const cacheKey = this.getCacheKey('plans');
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      return [];
    }
  }

  async getPlanBySlug(slug: string): Promise<MembershipPlan | null> {
    const plans = await this.getActivePlans();
    return plans.find(plan => plan.slug === slug) || null;
  }

  async getCustomerMembership(customerId: string): Promise<CustomerMembership | null> {
    if (!customerId) return null;

    const cacheKey = this.getCacheKey('membership', { customerId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          plan:membership_plans(*)
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching customer membership:', error);
      return null;
    }
  }

  async checkMembershipStatus(customerId: string): Promise<MembershipStatus> {
    if (!customerId) {
      return { has_membership: false };
    }

    try {
      const { data, error } = await supabase
        .rpc('check_customer_membership', { p_customer_id: customerId });

      if (error) throw error;

      if (data && data.length > 0) {
        const membership = data[0];
        return {
          has_membership: membership.has_membership,
          membership_type: membership.membership_type,
          expires_at: membership.expires_at,
          benefits: membership.benefits,
          warehouse_benefits: membership.warehouse_benefits
        };
      }

      return { has_membership: false };
    } catch (error) {
      console.error('Error checking membership status:', error);
      return { has_membership: false };
    }
  }

  async calculateMembershipPrice(planSlug: string, currencyCode: string): Promise<number> {
    const plan = await this.getPlanBySlug(planSlug);
    if (!plan) return 0;

    // Check if we have a specific price for this currency
    if (plan.pricing[currencyCode]) {
      return plan.pricing[currencyCode];
    }

    // Otherwise, convert from USD
    const usdPrice = plan.pricing['USD'] || 0;
    return await currencyService.convertAmount(usdPrice, 'USD', currencyCode);
  }

  async createMembership(
    customerId: string,
    planId: string,
    paymentMethod: string,
    paymentId?: string
  ): Promise<CustomerMembership | null> {
    try {
      // First get the plan to know the duration
      const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('duration_days')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        console.error('Error fetching plan:', planError);
        return null;
      }

      // Calculate dates
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan.duration_days || 365));

      const { data, error } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: customerId,
          plan_id: planId,
          payment_method: paymentMethod,
          last_payment_id: paymentId,
          status: 'active',
          auto_renew: true,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select(`
          *,
          plan:membership_plans(*)
        `)
        .single();

      if (error) throw error;

      // Clear cache
      this.membershipCache.delete(this.getCacheKey('membership', { customerId }));

      return data;
    } catch (error) {
      console.error('Error creating membership:', error);
      return null;
    }
  }

  async updateMembershipStatus(
    membershipId: string,
    status: 'active' | 'cancelled' | 'expired' | 'paused',
    customerId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customer_memberships')
        .update({ status })
        .eq('id', membershipId);

      if (error) throw error;

      // Clear cache if customerId provided
      if (customerId) {
        this.membershipCache.delete(this.getCacheKey('membership', { customerId }));
      }

      return true;
    } catch (error) {
      console.error('Error updating membership status:', error);
      return false;
    }
  }

  async calculateStorageFees(
    customerId: string,
    packageId: string,
    storageDays: number
  ): Promise<StorageFeeCalculation> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_storage_fees', {
          p_customer_id: customerId,
          p_package_id: packageId,
          p_storage_days: storageDays
        });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      }

      // Default calculation if RPC fails
      return {
        base_fee: storageDays * 0.5,
        discount_percentage: 0,
        final_fee: storageDays * 0.5,
        free_days_used: 0
      };
    } catch (error) {
      console.error('Error calculating storage fees:', error);
      // Fallback calculation
      return {
        base_fee: storageDays * 0.5,
        discount_percentage: 0,
        final_fee: storageDays * 0.5,
        free_days_used: 0
      };
    }
  }

  async getMembershipUsageStats(customerId: string): Promise<{
    total_orders: number;
    total_savings: number;
    storage_days_saved: number;
    member_since?: string;
  }> {
    try {
      // Get membership start date
      const membership = await this.getCustomerMembership(customerId);
      
      // Calculate usage stats (would need actual implementation based on your order/discount tables)
      const stats = {
        total_orders: 0,
        total_savings: 0,
        storage_days_saved: 0,
        member_since: membership?.started_at
      };

      // Implement actual calculation queries for membership benefits
      if (membership) {
        const memberSince = new Date(membership.started_at);
        
        // Calculate total orders since membership started
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_amount, created_at, discount_amount')
          .eq('user_id', customerId)
          .gte('created_at', memberSince.toISOString());

        if (!ordersError && orders) {
          stats.total_orders = orders.length;
          
          // Calculate total savings from member discounts
          stats.total_savings = orders.reduce((total, order) => {
            return total + (order.discount_amount || 0);
          }, 0);
        }

        // Calculate storage days saved (if package forwarding is used)
        const { data: packages, error: packagesError } = await supabase
          .from('received_packages')
          .select('consolidation_date, created_at')
          .eq('user_id', customerId)
          .gte('created_at', memberSince.toISOString())
          .not('consolidation_date', 'is', null);

        if (!packagesError && packages) {
          stats.storage_days_saved = packages.reduce((totalDays, pkg) => {
            if (pkg.consolidation_date) {
              const received = new Date(pkg.created_at);
              const consolidated = new Date(pkg.consolidation_date);
              const daysSaved = Math.max(0, Math.floor((consolidated.getTime() - received.getTime()) / (1000 * 60 * 60 * 24)));
              return totalDays + daysSaved;
            }
            return totalDays;
          }, 0);
        }

        logger.info('Calculated membership usage stats', {
          customerId,
          memberSince: membership.started_at,
          totalOrders: stats.total_orders,
          totalSavings: stats.total_savings,
          storageDaysSaved: stats.storage_days_saved
        });
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting membership usage stats:', error);
      return {
        total_orders: 0,
        total_savings: 0,
        storage_days_saved: 0
      };
    }
  }

  async checkExpiringMemberships(daysBeforeExpiry: number = 7): Promise<CustomerMembership[]> {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          plan:membership_plans(*),
          customer:profiles(email, full_name)
        `)
        .eq('status', 'active')
        .eq('auto_renew', false)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', expiryDate.toISOString());

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error checking expiring memberships:', error);
      return [];
    }
  }

  clearCache(): void {
    this.membershipCache.clear();
  }
}

export const MembershipService = MembershipServiceClass.getInstance();