/**
 * Storage Fee Service - Package Storage Billing & Management
 * 
 * Handles storage fee calculations, billing cycles, and payment integration.
 * Integrates with existing payment system for seamless fee collection.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { currencyService } from './CurrencyService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StorageFee {
  id: string;
  package_id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  days_stored: number;
  daily_rate_usd: number;
  total_fee_usd: number;
  is_paid: boolean;
  payment_date?: string;
  quote_id?: string;
  created_at: string;
}

export interface StorageFeeCalculation {
  package_id: string;
  suite_number: string;
  sender_store?: string;
  package_description?: string;
  storage_start_date: string;
  storage_fee_exempt_until: string;
  days_free_remaining: number;
  days_billable: number;
  daily_rate_usd: number;
  current_fee_usd: number;
  projected_monthly_fee_usd: number;
  storage_location?: string;
  photos_count: number;
}

export interface StorageFeeOverview {
  total_packages: number;
  packages_in_free_period: number;
  packages_accruing_fees: number;
  total_unpaid_fees_usd: number;
  total_paid_fees_usd: number;
  estimated_monthly_revenue_usd: number;
  average_storage_days: number;
}

export interface CustomerStorageOverview {
  user_id: string;
  total_packages: number;
  packages_in_storage: number;
  total_unpaid_fees_usd: number;
  total_unpaid_fees_display: string;
  upcoming_fees_7_days_usd: number;
  upcoming_fees_7_days_display: string;
  packages_with_fees: StorageFeeCalculation[];
  currency: string;
}

// ============================================================================
// STORAGE FEE SERVICE
// ============================================================================

class StorageFeeService {
  private static instance: StorageFeeService;
  private readonly DAILY_RATE_USD = 1.00; // $1 per day
  private readonly FREE_STORAGE_DAYS = 30; // 30 days free

  private constructor() {
    logger.info('💰 StorageFeeService initialized');
  }

  static getInstance(): StorageFeeService {
    if (!StorageFeeService.instance) {
      StorageFeeService.instance = new StorageFeeService();
    }
    return StorageFeeService.instance;
  }

  // ============================================================================
  // STORAGE FEE CALCULATIONS
  // ============================================================================

  /**
   * Calculate current storage fees for all packages of a user
   */
  async calculateCustomerStorageFees(userId: string, destinationCountry?: string): Promise<CustomerStorageOverview> {
    try {
      // Get user's currency
      const currency = await currencyService.getCurrency(destinationCountry || 'US');

      // Fetch user's packages in storage
      const { data: packages, error } = await supabase
        .from('received_packages')
        .select(`
          id,
          customer_address_id,
          storage_start_date,
          storage_fee_exempt_until,
          package_description,
          sender_store,
          storage_location,
          photos,
          customer_addresses!inner(
            user_id,
            suite_number
          )
        `)
        .eq('customer_addresses.user_id', userId)
        .in('status', ['received', 'processing', 'ready_to_ship']);

      if (error) {
        throw new Error(`Failed to fetch packages: ${error.message}`);
      }

      const packagesData = packages || [];
      const now = new Date();
      
      let totalUnpaidFeesUsd = 0;
      let upcomingFees7DaysUsd = 0;
      const packagesWithFees: StorageFeeCalculation[] = [];

      for (const pkg of packagesData) {
        const feeCalc = this.calculatePackageStorageFee(pkg, now);
        packagesWithFees.push(feeCalc);

        totalUnpaidFeesUsd += feeCalc.current_fee_usd;

        // Calculate fees that will accrue in next 7 days
        if (feeCalc.days_free_remaining <= 7) {
          const daysToCharge = Math.max(0, 7 - feeCalc.days_free_remaining);
          upcomingFees7DaysUsd += daysToCharge * this.DAILY_RATE_USD;
        }
      }

      // Convert to display currency
      const totalUnpaidDisplay = await this.currencyService.formatAmount(
        totalUnpaidFeesUsd, 
        currency.currency
      );
      const upcomingFeesDisplay = await this.currencyService.formatAmount(
        upcomingFees7DaysUsd, 
        currency.currency
      );

      return {
        user_id: userId,
        total_packages: packagesData.length,
        packages_in_storage: packagesData.length,
        total_unpaid_fees_usd: totalUnpaidFeesUsd,
        total_unpaid_fees_display: totalUnpaidDisplay,
        upcoming_fees_7_days_usd: upcomingFees7DaysUsd,
        upcoming_fees_7_days_display: upcomingFeesDisplay,
        packages_with_fees: packagesWithFees,
        currency: currency.currency
      };

    } catch (error) {
      logger.error('❌ Failed to calculate customer storage fees:', error);
      throw error;
    }
  }

  /**
   * Calculate storage fee for a single package
   */
  private calculatePackageStorageFee(packageData: any, currentDate: Date = new Date()): StorageFeeCalculation {
    const storageStart = new Date(packageData.storage_start_date);
    const exemptUntil = new Date(packageData.storage_fee_exempt_until);
    
    const totalDaysStored = Math.floor((currentDate.getTime() - storageStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysFreeRemaining = Math.max(0, Math.floor((exemptUntil.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysBillable = Math.max(0, totalDaysStored - this.FREE_STORAGE_DAYS);
    
    const currentFee = daysBillable * this.DAILY_RATE_USD;
    const projectedMonthlyFee = currentFee > 0 ? 30 * this.DAILY_RATE_USD : 0;

    return {
      package_id: packageData.id,
      suite_number: packageData.customer_addresses?.suite_number || '',
      sender_store: packageData.sender_store,
      package_description: packageData.package_description,
      storage_start_date: packageData.storage_start_date,
      storage_fee_exempt_until: packageData.storage_fee_exempt_until,
      days_free_remaining: daysFreeRemaining,
      days_billable: daysBillable,
      daily_rate_usd: this.DAILY_RATE_USD,
      current_fee_usd: currentFee,
      projected_monthly_fee_usd: projectedMonthlyFee,
      storage_location: packageData.storage_location,
      photos_count: packageData.photos?.length || 0
    };
  }

  /**
   * Get admin overview of all storage fees
   */
  async getAdminStorageFeeOverview(): Promise<StorageFeeOverview> {
    try {
      // Get all packages in storage
      const { data: packages, error: packagesError } = await supabase
        .from('received_packages')
        .select('id, storage_start_date, storage_fee_exempt_until')
        .in('status', ['received', 'processing', 'ready_to_ship']);

      if (packagesError) {
        throw new Error(`Failed to fetch packages: ${packagesError.message}`);
      }

      // Get paid fees
      const { data: paidFees, error: paidError } = await supabase
        .from('storage_fees')
        .select('total_fee_usd')
        .eq('is_paid', true);

      if (paidError) {
        logger.warn('Could not fetch paid fees:', paidError);
      }

      // Get unpaid fees
      const { data: unpaidFees, error: unpaidError } = await supabase
        .from('storage_fees')
        .select('total_fee_usd')
        .eq('is_paid', false);

      if (unpaidError) {
        logger.warn('Could not fetch unpaid fees:', unpaidError);
      }

      const packagesData = packages || [];
      const now = new Date();
      
      let packagesInFreePeriod = 0;
      let packagesAccruingFees = 0;
      let totalDaysStored = 0;
      let estimatedMonthlyRevenue = 0;

      for (const pkg of packagesData) {
        const exemptUntil = new Date(pkg.storage_fee_exempt_until);
        const storageStart = new Date(pkg.storage_start_date);
        const daysStored = Math.floor((now.getTime() - storageStart.getTime()) / (1000 * 60 * 60 * 24));
        
        totalDaysStored += daysStored;

        if (now <= exemptUntil) {
          packagesInFreePeriod++;
        } else {
          packagesAccruingFees++;
          estimatedMonthlyRevenue += 30 * this.DAILY_RATE_USD; // $30 per month per package
        }
      }

      const totalPaidFeesUsd = paidFees?.reduce((sum, fee) => sum + (fee.total_fee_usd || 0), 0) || 0;
      const totalUnpaidFeesUsd = unpaidFees?.reduce((sum, fee) => sum + (fee.total_fee_usd || 0), 0) || 0;
      const averageStorageDays = packagesData.length > 0 ? totalDaysStored / packagesData.length : 0;

      return {
        total_packages: packagesData.length,
        packages_in_free_period: packagesInFreePeriod,
        packages_accruing_fees: packagesAccruingFees,
        total_unpaid_fees_usd: totalUnpaidFeesUsd,
        total_paid_fees_usd: totalPaidFeesUsd,
        estimated_monthly_revenue_usd: estimatedMonthlyRevenue,
        average_storage_days: averageStorageDays
      };

    } catch (error) {
      logger.error('❌ Failed to get admin storage fee overview:', error);
      throw error;
    }
  }

  // ============================================================================
  // STORAGE FEE MANAGEMENT
  // ============================================================================

  /**
   * Create storage fee records for packages that have exceeded free period
   */
  async generateStorageFeeRecords(): Promise<{ created: number; updated: number }> {
    try {
      // Get packages that have exceeded free storage period
      const { data: packages, error } = await supabase
        .from('received_packages')
        .select(`
          id,
          customer_addresses!inner(user_id),
          storage_start_date,
          storage_fee_exempt_until
        `)
        .in('status', ['received', 'processing', 'ready_to_ship'])
        .lt('storage_fee_exempt_until', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to fetch packages: ${error.message}`);
      }

      let created = 0;
      let updated = 0;

      for (const pkg of packages || []) {
        // Check if fee record already exists
        const { data: existingFee, error: checkError } = await supabase
          .from('storage_fees')
          .select('id, total_fee_usd')
          .eq('package_id', pkg.id)
          .eq('is_paid', false)
          .single();

        const currentFee = this.calculatePackageStorageFee(pkg).current_fee_usd;

        if (checkError && checkError.code === 'PGRST116') {
          // No existing fee record, create new one
          if (currentFee > 0) {
            const { error: insertError } = await supabase
              .from('storage_fees')
              .insert({
                package_id: pkg.id,
                user_id: pkg.customer_addresses.user_id,
                start_date: new Date(pkg.storage_fee_exempt_until).toISOString().split('T')[0],
                days_stored: Math.floor((new Date().getTime() - new Date(pkg.storage_fee_exempt_until).getTime()) / (1000 * 60 * 60 * 24)),
                daily_rate_usd: this.DAILY_RATE_USD,
                total_fee_usd: currentFee,
                is_paid: false
              });

            if (!insertError) created++;
          }
        } else if (existingFee && existingFee.total_fee_usd !== currentFee) {
          // Update existing fee record
          const { error: updateError } = await supabase
            .from('storage_fees')
            .update({
              total_fee_usd: currentFee,
              days_stored: Math.floor((new Date().getTime() - new Date(pkg.storage_fee_exempt_until).getTime()) / (1000 * 60 * 60 * 24))
            })
            .eq('id', existingFee.id);

          if (!updateError) updated++;
        }
      }

      logger.info(`💰 Storage fees: ${created} created, ${updated} updated`);
      return { created, updated };

    } catch (error) {
      logger.error('❌ Failed to generate storage fee records:', error);
      throw error;
    }
  }

  /**
   * Mark storage fees as paid (called from payment system)
   */
  async markStorageFeesAsPaid(userIds: string[], packageIds?: string[]): Promise<void> {
    try {
      let query = supabase
        .from('storage_fees')
        .update({
          is_paid: true,
          payment_date: new Date().toISOString()
        })
        .eq('is_paid', false);

      if (packageIds && packageIds.length > 0) {
        query = query.in('package_id', packageIds);
      } else {
        query = query.in('user_id', userIds);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to mark storage fees as paid: ${error.message}`);
      }

      logger.info(`💰 Marked storage fees as paid for users: ${userIds.join(', ')}`);

    } catch (error) {
      logger.error('❌ Failed to mark storage fees as paid:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT INTEGRATION
  // ============================================================================

  /**
   * Add storage fees to a quote (integrates with existing quote system)
   */
  async addStorageFeesToQuote(userId: string, quoteId: string): Promise<number> {
    try {
      const storageOverview = await this.calculateCustomerStorageFees(userId);
      
      if (storageOverview.total_unpaid_fees_usd > 0) {
        // Mark fees as associated with this quote
        const { error } = await supabase
          .from('storage_fees')
          .update({ quote_id: quoteId })
          .eq('user_id', userId)
          .eq('is_paid', false);

        if (error) {
          throw new Error(`Failed to associate storage fees with quote: ${error.message}`);
        }

        logger.info(`💰 Added $${storageOverview.total_unpaid_fees_usd} storage fees to quote ${quoteId}`);
      }

      return storageOverview.total_unpaid_fees_usd;

    } catch (error) {
      logger.error('❌ Failed to add storage fees to quote:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const storageFeeService = StorageFeeService.getInstance();
export default storageFeeService;