import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { format, differenceInDays, addDays, startOfDay, endOfDay } from 'date-fns';

export interface StorageFeeConfig {
  freeDays: number;
  dailyRateUSD: number;
  warningDaysBeforeFees: number;
  lateFeeThresholdDays: number;
  lateFeeRateUSD: number;
}

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
  fee_type: 'storage' | 'handling' | 'late' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PackageWithFees {
  id: string;
  tracking_number: string;
  sender_name?: string;
  received_date: string;
  storage_start_date: string;
  storage_fee_exempt_until: string;
  status: string;
  user_id: string;
  current_storage_fee?: number;
  days_in_storage: number;
  days_until_fees: number;
  is_accruing_fees: boolean;
}

class StorageFeeAutomationService {
  private static instance: StorageFeeAutomationService;
  
  // Default configuration
  private config: StorageFeeConfig = {
    freeDays: 30,
    dailyRateUSD: 1.00,
    warningDaysBeforeFees: 7,
    lateFeeThresholdDays: 90,
    lateFeeRateUSD: 2.00,
  };

  private constructor() {}

  static getInstance(): StorageFeeAutomationService {
    if (!this.instance) {
      this.instance = new StorageFeeAutomationService();
    }
    return this.instance;
  }

  /**
   * Get current storage fee configuration
   */
  async getConfiguration(): Promise<StorageFeeConfig> {
    try {
      const { data, error } = await supabase
        .from('unified_configuration')
        .select('*')
        .eq('config_key', 'storage_fees')
        .eq('config_type', 'system')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.config_data) {
        this.config = {
          ...this.config,
          ...data.config_data,
        };
      }

      return this.config;
    } catch (error) {
      logger.error('Failed to fetch storage fee configuration', error);
      return this.config;
    }
  }

  /**
   * Update storage fee configuration
   */
  async updateConfiguration(updates: Partial<StorageFeeConfig>): Promise<void> {
    try {
      const newConfig = { ...this.config, ...updates };

      const { error } = await supabase
        .from('unified_configuration')
        .upsert({
          config_type: 'system',
          config_key: 'storage_fees',
          config_data: newConfig,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      this.config = newConfig;
      logger.info('Storage fee configuration updated', newConfig);
    } catch (error) {
      logger.error('Failed to update storage fee configuration', error);
      throw error;
    }
  }

  /**
   * Calculate storage fees for all packages
   * This is the main function that should run daily
   */
  async calculateDailyStorageFees(): Promise<{
    processed: number;
    newFees: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let newFees = 0;

    try {
      await this.getConfiguration();

      // Get all packages that might need fee calculation
      const { data: packages, error: fetchError } = await supabase
        .from('received_packages')
        .select(`
          id,
          user_id,
          tracking_number,
          received_date,
          storage_start_date,
          storage_fee_exempt_until,
          status,
          customer_addresses!inner(
            user_id
          )
        `)
        .in('status', ['received', 'processing', 'ready_to_ship'])
        .lte('storage_fee_exempt_until', new Date().toISOString());

      if (fetchError) throw fetchError;

      logger.info(`Processing ${packages?.length || 0} packages for storage fees`);

      for (const pkg of packages || []) {
        try {
          processed++;
          
          // Calculate fees for this package
          const result = await this.calculatePackageStorageFee(pkg.id);
          
          if (result.feeCreated) {
            newFees++;
          }
        } catch (error) {
          const errorMsg = `Failed to process package ${pkg.id}: ${error}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      logger.info(`Storage fee calculation completed: ${processed} processed, ${newFees} new fees`);

      return { processed, newFees, errors };
    } catch (error) {
      logger.error('Failed to calculate daily storage fees', error);
      throw error;
    }
  }

  /**
   * Calculate and create storage fee for a specific package
   */
  async calculatePackageStorageFee(packageId: string): Promise<{
    fee: StorageFee | null;
    feeCreated: boolean;
  }> {
    try {
      // Get package details
      const { data: pkg, error: pkgError } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            user_id
          )
        `)
        .eq('id', packageId)
        .single();

      if (pkgError) throw pkgError;

      const today = startOfDay(new Date());
      const exemptUntil = startOfDay(new Date(pkg.storage_fee_exempt_until));
      
      // If still in free period, no fees
      if (today <= exemptUntil) {
        return { fee: null, feeCreated: false };
      }

      // Check if fee already exists for today
      const { data: existingFee, error: feeError } = await supabase
        .from('storage_fees')
        .select('*')
        .eq('package_id', packageId)
        .eq('end_date', format(today, 'yyyy-MM-dd'))
        .single();

      if (feeError && feeError.code !== 'PGRST116') {
        throw feeError;
      }

      if (existingFee) {
        return { fee: existingFee, feeCreated: false };
      }

      // Calculate fee details
      const startDate = addDays(exemptUntil, 1);
      const daysStored = differenceInDays(today, startDate) + 1;
      const isLateFee = daysStored > this.config.lateFeeThresholdDays;
      const dailyRate = isLateFee ? this.config.lateFeeRateUSD : this.config.dailyRateUSD;
      const totalFee = daysStored * dailyRate;

      // Create new fee record
      const { data: newFee, error: createError } = await supabase
        .from('storage_fees')
        .insert({
          package_id: packageId,
          user_id: pkg.customer_addresses.user_id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(today, 'yyyy-MM-dd'),
          days_stored: daysStored,
          daily_rate_usd: dailyRate,
          total_fee_usd: totalFee,
          fee_type: isLateFee ? 'late' : 'storage',
          notes: isLateFee 
            ? `Late storage fee applied after ${this.config.lateFeeThresholdDays} days`
            : `Standard storage fee after ${this.config.freeDays} day free period`,
        })
        .select()
        .single();

      if (createError) throw createError;

      logger.info(`Created storage fee for package ${packageId}: $${totalFee} for ${daysStored} days`);

      return { fee: newFee, feeCreated: true };
    } catch (error) {
      logger.error(`Failed to calculate storage fee for package ${packageId}`, error);
      throw error;
    }
  }

  /**
   * Get packages approaching storage fees
   */
  async getPackagesApproachingFees(): Promise<PackageWithFees[]> {
    try {
      const warningDate = addDays(new Date(), this.config.warningDaysBeforeFees);

      const { data: packages, error } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            user_id
          )
        `)
        .in('status', ['received', 'processing', 'ready_to_ship'])
        .gte('storage_fee_exempt_until', new Date().toISOString())
        .lte('storage_fee_exempt_until', warningDate.toISOString());

      if (error) throw error;

      return (packages || []).map(pkg => {
        const today = new Date();
        const exemptUntil = new Date(pkg.storage_fee_exempt_until);
        const daysUntilFees = Math.max(0, differenceInDays(exemptUntil, today));
        const daysInStorage = differenceInDays(today, new Date(pkg.received_date));

        return {
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          sender_name: pkg.sender_name,
          received_date: pkg.received_date,
          storage_start_date: pkg.storage_start_date,
          storage_fee_exempt_until: pkg.storage_fee_exempt_until,
          status: pkg.status,
          user_id: pkg.customer_addresses.user_id,
          days_in_storage: daysInStorage,
          days_until_fees: daysUntilFees,
          is_accruing_fees: today > exemptUntil,
        };
      });
    } catch (error) {
      logger.error('Failed to get packages approaching fees', error);
      throw error;
    }
  }

  /**
   * Get unpaid storage fees for a user
   */
  async getUserUnpaidFees(userId: string): Promise<{
    fees: StorageFee[];
    totalAmount: number;
  }> {
    try {
      const { data: fees, error } = await supabase
        .from('storage_fees')
        .select('*')
        .eq('user_id', userId)
        .eq('is_paid', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalAmount = fees?.reduce((sum, fee) => sum + Number(fee.total_fee_usd), 0) || 0;

      return {
        fees: fees || [],
        totalAmount,
      };
    } catch (error) {
      logger.error('Failed to get user unpaid fees', error);
      throw error;
    }
  }

  /**
   * Add storage fees to a quote
   */
  async addStorageFeesToQuote(
    quoteId: string,
    packageIds: string[]
  ): Promise<{
    feesAdded: number;
    totalAmount: number;
  }> {
    try {
      // Get unpaid fees for these packages
      const { data: unpaidFees, error: feeError } = await supabase
        .from('storage_fees')
        .select('*')
        .in('package_id', packageIds)
        .eq('is_paid', false);

      if (feeError) throw feeError;

      if (!unpaidFees || unpaidFees.length === 0) {
        return { feesAdded: 0, totalAmount: 0 };
      }

      // Link fees to quote
      const feeIds = unpaidFees.map(fee => fee.id);
      const { error: updateError } = await supabase
        .from('storage_fees')
        .update({ quote_id: quoteId })
        .in('id', feeIds);

      if (updateError) throw updateError;

      const totalAmount = unpaidFees.reduce((sum, fee) => sum + Number(fee.total_fee_usd), 0);

      logger.info(`Added ${unpaidFees.length} storage fees totaling $${totalAmount} to quote ${quoteId}`);

      return {
        feesAdded: unpaidFees.length,
        totalAmount,
      };
    } catch (error) {
      logger.error('Failed to add storage fees to quote', error);
      throw error;
    }
  }

  /**
   * Waive storage fees for a package
   */
  async waiveStorageFees(
    packageId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      // Update all unpaid fees for this package
      const { error } = await supabase
        .from('storage_fees')
        .update({
          is_paid: true,
          payment_date: new Date().toISOString(),
          notes: `Waived by admin: ${reason}`,
        })
        .eq('package_id', packageId)
        .eq('is_paid', false);

      if (error) throw error;

      logger.info(`Storage fees waived for package ${packageId} by admin ${adminId}`);
    } catch (error) {
      logger.error('Failed to waive storage fees', error);
      throw error;
    }
  }

  /**
   * Get storage fee analytics
   */
  async getStorageFeeAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    unpaidFees: number;
    averageDaysStored: number;
    packageCount: number;
    feesByType: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('storage_fees')
        .select('*');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: fees, error } = await query;

      if (error) throw error;

      const analytics = {
        totalRevenue: 0,
        unpaidFees: 0,
        averageDaysStored: 0,
        packageCount: new Set<string>(),
        feesByType: {} as Record<string, number>,
      };

      let totalDays = 0;

      fees?.forEach(fee => {
        if (fee.is_paid) {
          analytics.totalRevenue += Number(fee.total_fee_usd);
        } else {
          analytics.unpaidFees += Number(fee.total_fee_usd);
        }

        totalDays += fee.days_stored || 0;
        analytics.packageCount.add(fee.package_id);

        const feeType = fee.fee_type || 'storage';
        analytics.feesByType[feeType] = (analytics.feesByType[feeType] || 0) + Number(fee.total_fee_usd);
      });

      return {
        totalRevenue: analytics.totalRevenue,
        unpaidFees: analytics.unpaidFees,
        averageDaysStored: fees?.length ? totalDays / fees.length : 0,
        packageCount: analytics.packageCount.size,
        feesByType: analytics.feesByType,
      };
    } catch (error) {
      logger.error('Failed to get storage fee analytics', error);
      throw error;
    }
  }

  /**
   * Bulk waive storage fees for multiple packages
   */
  async bulkWaiveStorageFees(
    packageIds: string[],
    reason: string,
    adminId: string
  ): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      for (const packageId of packageIds) {
        try {
          await this.waiveStorageFees(packageId, reason, adminId);
          processed++;
        } catch (error) {
          const errorMsg = `Failed to waive fees for package ${packageId}: ${error}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      logger.info(`Bulk waive completed: ${processed} processed, ${errors.length} errors`);

      return { processed, errors };
    } catch (error) {
      logger.error('Failed to bulk waive storage fees', error);
      throw error;
    }
  }

  /**
   * Bulk extend storage exemptions for multiple packages
   */
  async bulkExtendStorageExemptions(
    packageIds: string[],
    additionalDays: number,
    reason: string,
    adminId: string
  ): Promise<{
    processed: number;
    errors: string[];
    results: { packageId: string; newExemptDate: string }[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    const results: { packageId: string; newExemptDate: string }[] = [];

    try {
      for (const packageId of packageIds) {
        try {
          const { data, error } = await supabase.rpc('extend_storage_exemption', {
            p_package_id: packageId,
            p_additional_days: additionalDays,
            p_reason: reason,
            p_admin_id: adminId,
          });

          if (error) throw error;

          results.push({
            packageId,
            newExemptDate: data,
          });
          processed++;
        } catch (error) {
          const errorMsg = `Failed to extend exemption for package ${packageId}: ${error}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      logger.info(`Bulk extension completed: ${processed} processed, ${errors.length} errors`);

      return { processed, errors, results };
    } catch (error) {
      logger.error('Failed to bulk extend storage exemptions', error);
      throw error;
    }
  }

  /**
   * Get packages with storage fees for bulk operations
   */
  async getPackagesWithStorageFees(filters?: {
    hasUnpaidFees?: boolean;
    approachingFees?: boolean;
    packageIds?: string[];
  }): Promise<PackageWithFees[]> {
    try {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            user_id
          ),
          storage_fees(
            id,
            total_fee_usd,
            is_paid,
            created_at
          )
        `);

      if (filters?.packageIds && filters.packageIds.length > 0) {
        query = query.in('id', filters.packageIds);
      }

      if (filters?.hasUnpaidFees) {
        // This would need to be refined based on your exact schema
        query = query.not('storage_fees', 'is', null);
      }

      if (filters?.approachingFees) {
        const warningDate = addDays(new Date(), this.config.warningDaysBeforeFees);
        query = query
          .gte('storage_fee_exempt_until', new Date().toISOString())
          .lte('storage_fee_exempt_until', warningDate.toISOString());
      }

      const { data: packages, error } = await query;

      if (error) throw error;

      return (packages || []).map(pkg => {
        const today = new Date();
        const exemptUntil = new Date(pkg.storage_fee_exempt_until);
        const daysUntilFees = Math.max(0, differenceInDays(exemptUntil, today));
        const daysInStorage = differenceInDays(today, new Date(pkg.received_date));
        const unpaidFees = pkg.storage_fees?.filter(fee => !fee.is_paid) || [];
        const currentStorageFee = unpaidFees.reduce((sum, fee) => sum + Number(fee.total_fee_usd), 0);

        return {
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          sender_name: pkg.sender_name,
          received_date: pkg.received_date,
          storage_start_date: pkg.storage_start_date,
          storage_fee_exempt_until: pkg.storage_fee_exempt_until,
          status: pkg.status,
          user_id: pkg.customer_addresses.user_id,
          current_storage_fee: currentStorageFee,
          days_in_storage: daysInStorage,
          days_until_fees: daysUntilFees,
          is_accruing_fees: today > exemptUntil,
        };
      });
    } catch (error) {
      logger.error('Failed to get packages with storage fees', error);
      throw error;
    }
  }

  /**
   * Export storage fee data for selected packages
   */
  async exportStorageFeeData(packageIds: string[]): Promise<{
    data: any[];
    filename: string;
  }> {
    try {
      const packages = await this.getPackagesWithStorageFees({ packageIds });

      const exportData = packages.map(pkg => ({
        tracking_number: pkg.tracking_number,
        sender_name: pkg.sender_name || 'Unknown',
        received_date: format(new Date(pkg.received_date), 'yyyy-MM-dd'),
        days_in_storage: pkg.days_in_storage,
        days_until_fees: pkg.days_until_fees,
        current_storage_fee: pkg.current_storage_fee?.toFixed(2) || '0.00',
        status: pkg.status,
        is_accruing_fees: pkg.is_accruing_fees ? 'Yes' : 'No',
      }));

      const filename = `storage-fees-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;

      return {
        data: exportData,
        filename,
      };
    } catch (error) {
      logger.error('Failed to export storage fee data', error);
      throw error;
    }
  }
}

export const storageFeeAutomationService = StorageFeeAutomationService.getInstance();