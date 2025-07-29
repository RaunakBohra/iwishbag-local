/**
 * Integrated Package Forwarding Service - Full Ecosystem Integration
 * 
 * Enhanced version of PackageForwardingService that integrates with:
 * - Main customer profiles system
 * - UnifiedQuote system via SmartCalculationEngine
 * - Payment system integration
 * - Notification system
 * 
 * This service replaces the isolated PackageForwardingService with a fully
 * integrated solution that leverages all existing iwishBag services.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { smartCalculationEnginePackageForwardingExtension } from './SmartCalculationEnginePackageForwardingExtension';
import type {
  CustomerAddress,
  ReceivedPackage,
  ConsolidationGroup,
  ConsolidationOption,
  PackageReceivingData,
  ServiceFeeBreakdown,
} from './PackageForwardingService';

// ============================================================================
// ENHANCED TYPE DEFINITIONS
// ============================================================================

export interface IntegratedCustomerProfile {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  // Virtual address information
  virtual_address?: CustomerAddress | null;
  // Package forwarding preferences
  preferences?: {
    default_consolidation_preference: 'individual' | 'consolidate_always' | 'ask';
    notification_preferences: {
      package_received: boolean;
      consolidation_ready: boolean;
      quote_available: boolean;
      storage_fees_due: boolean;
    };
    shipping_preferences: {
      speed_priority: 'low' | 'medium' | 'high';
      cost_priority: 'low' | 'medium' | 'high';
      insurance_required: boolean;
    };
  };
}

export interface IntegratedPackageData extends ReceivedPackage {
  // Enhanced fields from integration
  customer_profile?: IntegratedCustomerProfile;
  customer_display_data?: ReturnType<typeof customerDisplayUtils.getCustomerDisplayData>;
  quote_id?: string;
  storage_fees_accrued?: number;
  estimated_shipping_cost?: number;
  package_photos?: Array<{
    id: string;
    photo_url: string;
    photo_type: string;
    caption?: string;
    created_at: string;
  }>;
}

export interface PackageForwardingQuoteRequest {
  type: 'individual_package' | 'consolidated_packages' | 'storage_fees_only';
  package_ids?: string[];
  consolidation_group_id?: string;
  destination_country: string;
  shipping_preferences?: {
    speed_priority: 'low' | 'medium' | 'high';
    cost_priority: 'low' | 'medium' | 'high';
    insurance_required: boolean;
  };
}

// ============================================================================
// INTEGRATED PACKAGE FORWARDING SERVICE
// ============================================================================

class IntegratedPackageForwardingService {
  private static instance: IntegratedPackageForwardingService;
  private readonly WAREHOUSE_ADDRESS_BASE = `iwishBag Forwarding
1234 Warehouse Street
New York, NY 10001
United States`;

  private constructor() {
    logger.info('🔄 IntegratedPackageForwardingService initialized');
  }

  static getInstance(): IntegratedPackageForwardingService {
    if (!IntegratedPackageForwardingService.instance) {
      IntegratedPackageForwardingService.instance = new IntegratedPackageForwardingService();
    }
    return IntegratedPackageForwardingService.instance;
  }

  // ============================================================================
  // INTEGRATED CUSTOMER PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Get customer profile with virtual address and preferences
   * Integrates with main profiles system
   */
  async getIntegratedCustomerProfile(userId: string): Promise<IntegratedCustomerProfile | null> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Get virtual address information
      const { data: virtualAddress, error: addressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (addressError && addressError.code !== 'PGRST116') {
        logger.warn('Could not fetch virtual address:', addressError);
      }

      // Get user preferences from database
      const { data: preferences, error: prefsError } = await supabase
        .rpc('get_or_create_customer_preferences', { p_user_id: userId });

      if (prefsError) {
        logger.warn('Could not fetch customer preferences:', prefsError);
      }

      const userPreferences = preferences ? {
        default_consolidation_preference: preferences.default_consolidation_preference,
        notification_preferences: preferences.notification_preferences,
        shipping_preferences: preferences.shipping_preferences,
      } : {
        default_consolidation_preference: 'ask' as const,
        notification_preferences: {
          package_received: true,
          consolidation_ready: true,
          quote_available: true,
          storage_fees_due: true,
        },
        shipping_preferences: {
          speed_priority: 'medium' as const,
          cost_priority: 'high' as const,
          insurance_required: false,
        },
      };

      return {
        id: profile?.id || userId,
        user_id: userId,
        full_name: profile?.full_name,
        email: profile?.email,
        phone: profile?.phone,
        avatar_url: profile?.avatar_url,
        virtual_address: virtualAddress || null,
        preferences: userPreferences,
      };

    } catch (error) {
      logger.error('❌ Failed to get integrated customer profile:', error);
      throw error;
    }
  }

  /**
   * Assign virtual address using integrated customer profile
   */
  async assignIntegratedVirtualAddress(userId: string): Promise<CustomerAddress> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'IntegratedPackageForwardingService.assignVirtualAddress',
          op: 'integrated_address_assignment',
        })
      : null;

    try {
      // Get customer profile first
      const customerProfile = await this.getIntegratedCustomerProfile(userId);
      
      if (!customerProfile) {
        throw new Error('Customer profile not found. Please ensure user is properly registered.');
      }

      // Ensure profile exists in database
      const { data: profileId, error: profileError } = await supabase
        .rpc('ensure_profile_exists', { user_id: userId });
      
      if (profileError) {
        logger.error('Failed to ensure profile exists:', profileError);
        throw new Error('Failed to create user profile');
      }

      // Check if virtual address already exists
      if (customerProfile.virtual_address?.status === 'active') {
        logger.info(`📮 Returning existing integrated address for user ${userId}`);
        transaction?.setStatus('ok');
        return customerProfile.virtual_address;
      }

      // Generate new suite number
      const { data: suiteData, error: suiteError } = await supabase
        .rpc('generate_suite_number');

      if (suiteError) {
        throw new Error(`Failed to generate suite number: ${suiteError.message}`);
      }

      const suiteNumber = suiteData as string;
      const fullAddress = this.buildWarehouseAddress(suiteNumber, customerProfile);

      // Create new address record with profile integration
      const { data: newAddress, error: insertError } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: userId,
          profile_id: customerProfile.id, // Link to profiles table
          suite_number: suiteNumber,
          full_address: fullAddress,
          address_type: 'standard',
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create integrated address: ${insertError.message}`);
      }

      logger.info(`📮 New integrated virtual address assigned: ${suiteNumber} for ${customerProfile.full_name || customerProfile.email}`);

      // Send welcome notification using integrated customer data
      await this.sendIntegratedWelcomeNotification(customerProfile, newAddress);

      transaction?.setStatus('ok');
      return newAddress;

    } catch (error) {
      logger.error('❌ Failed to assign integrated virtual address:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Get customer packages with integrated profile data
   */
  async getCustomerPackagesIntegrated(userId: string): Promise<IntegratedPackageData[]> {
    try {
      // Get customer profile
      const customerProfile = await this.getIntegratedCustomerProfile(userId);
      
      if (!customerProfile?.virtual_address) {
        return []; // No virtual address = no packages
      }

      // Get packages with enhanced data including photos
      const { data: packages, error } = await supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            id,
            user_id,
            suite_number,
            full_address
          ),
          package_photos(
            id,
            photo_url,
            photo_type,
            caption,
            created_at
          )
        `)
        .eq('customer_addresses.user_id', userId)
        .order('received_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch integrated packages: ${error.message}`);
      }

      // Enhance packages with integrated data
      const enhancedPackages: IntegratedPackageData[] = await Promise.all(
        (packages || []).map(async (pkg) => {
          // Get customer display data using existing utility
          const customerDisplayData = customerDisplayUtils.getCustomerDisplayData(
            { profiles: customerProfile },
            customerProfile
          );

          // Calculate storage fees if applicable
          const { data: storageFees } = await supabase
            .from('storage_fees')
            .select('total_fee_usd')
            .eq('package_id', pkg.id)
            .eq('is_paid', false)
            .single();

          return {
            ...pkg,
            customer_profile: customerProfile,
            customer_display_data: customerDisplayData,
            storage_fees_accrued: storageFees?.total_fee_usd || 0,
            package_photos: pkg.package_photos || [],
          };
        })
      );

      return enhancedPackages;

    } catch (error) {
      logger.error('❌ Failed to get integrated customer packages:', error);
      throw error;
    }
  }

  // ============================================================================
  // INTEGRATED QUOTE SYSTEM
  // ============================================================================

  /**
   * Create package forwarding quote using enhanced SmartCalculationEngine
   * This ensures package forwarding quotes get full calculation pipeline
   */
  async createIntegratedQuote(
    userId: string,
    request: PackageForwardingQuoteRequest
  ): Promise<string> {
    try {
      // Get customer profile
      const customerProfile = await this.getIntegratedCustomerProfile(userId);
      
      if (!customerProfile) {
        throw new Error('Customer profile required for integrated quotes');
      }

      // Get customer display data
      const customerDisplayData = customerDisplayUtils.getCustomerDisplayData(
        { profiles: customerProfile },
        customerProfile
      );

      // Build customer data object for quote
      const customerData = {
        info: {
          name: customerDisplayData.name,
          email: customerDisplayData.email,
          phone: customerDisplayData.phone,
        },
        shipping_address: {
          // Will be filled by customer during quote process
          country: request.destination_country,
        },
        preferences: customerProfile.preferences?.shipping_preferences,
      };

      let quoteId: string;

      switch (request.type) {
        case 'individual_package':
          if (!request.package_ids?.[0]) {
            throw new Error('Package ID required for individual package quote');
          }
          quoteId = await this.createIndividualPackageQuoteEnhanced(
            request.package_ids[0],
            request.destination_country,
            customerData,
            request.shipping_preferences
          );
          break;

        case 'consolidated_packages':
          if (!request.consolidation_group_id) {
            throw new Error('Consolidation group ID required for consolidated quote');
          }
          quoteId = await this.createConsolidationQuoteEnhanced(
            request.consolidation_group_id,
            request.destination_country,
            customerData,
            request.shipping_preferences
          );
          break;

        case 'storage_fees_only':
          quoteId = await this.createStorageFeesQuote(userId, customerData);
          break;

        default:
          throw new Error(`Unsupported quote type: ${request.type}`);
      }

      logger.info(`📋 Created enhanced integrated quote ${quoteId} for ${customerDisplayData.displayName}`);
      return quoteId;

    } catch (error) {
      logger.error('❌ Failed to create integrated quote:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENHANCED QUOTE CREATION METHODS
  // ============================================================================

  /**
   * Create individual package quote using enhanced SmartCalculationEngine
   */
  private async createIndividualPackageQuoteEnhanced(
    packageId: string,
    destinationCountry: string,
    customerData: any,
    shippingPreferences?: any
  ): Promise<string> {
    try {
      // First create basic quote in database using existing function
      const { data: quoteId, error } = await supabase
        .rpc('create_package_forwarding_quote', {
          p_package_id: packageId,
          p_destination_country: destinationCountry,
          p_customer_data: customerData,
        });

      if (error || !quoteId) {
        throw new Error(`Failed to create base quote: ${error?.message}`);
      }

      // Get the created quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        throw new Error(`Failed to fetch created quote: ${quoteError?.message}`);
      }

      // Process through enhanced SmartCalculationEngine
      const calculationInput = {
        quote: quote,
        preferences: {
          speed_priority: shippingPreferences?.speed_priority || 'medium',
          cost_priority: shippingPreferences?.cost_priority || 'high',
          show_all_options: true,
        },
        package_forwarding_data: {
          package_ids: [packageId],
        }
      };

      const calculationResult = await smartCalculationEnginePackageForwardingExtension
        .calculateEnhancedWithPackageForwarding(calculationInput);

      if (!calculationResult.success) {
        throw new Error(`Enhanced calculation failed: ${calculationResult.error}`);
      }

      // Update quote with enhanced calculation results
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          items: calculationResult.updated_quote.items,
          costprice_total_usd: calculationResult.updated_quote.costprice_total_usd,
          final_total_usd: calculationResult.updated_quote.final_total_usd,
          calculation_data: calculationResult.updated_quote.calculation_data,
          smart_suggestions: calculationResult.smart_recommendations,
        })
        .eq('id', quoteId);

      if (updateError) {
        logger.warn('Failed to update quote with enhanced calculations:', updateError);
      }

      logger.info(`📦⚡ Enhanced individual package quote created: ${quoteId}`);
      return quoteId;

    } catch (error) {
      logger.error('Failed to create enhanced individual package quote:', error);
      throw error;
    }
  }

  /**
   * Create consolidation quote using enhanced SmartCalculationEngine
   */
  private async createConsolidationQuoteEnhanced(
    consolidationGroupId: string,
    destinationCountry: string,
    customerData: any,
    shippingPreferences?: any
  ): Promise<string> {
    try {
      // First create basic quote using existing function
      const { data: quoteId, error } = await supabase
        .rpc('create_consolidation_quote', {
          p_consolidation_group_id: consolidationGroupId,
          p_destination_country: destinationCountry,
          p_customer_data: customerData,
        });

      if (error || !quoteId) {
        throw new Error(`Failed to create base consolidation quote: ${error?.message}`);
      }

      // Get the created quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        throw new Error(`Failed to fetch created consolidation quote: ${quoteError?.message}`);
      }

      // Process through enhanced SmartCalculationEngine
      const calculationInput = {
        quote: quote,
        preferences: {
          speed_priority: shippingPreferences?.speed_priority || 'medium',
          cost_priority: shippingPreferences?.cost_priority || 'high',
          show_all_options: true,
        },
        package_forwarding_data: {
          consolidation_group_id: consolidationGroupId,
        }
      };

      const calculationResult = await smartCalculationEnginePackageForwardingExtension
        .calculateEnhancedWithPackageForwarding(calculationInput);

      if (!calculationResult.success) {
        throw new Error(`Enhanced consolidation calculation failed: ${calculationResult.error}`);
      }

      // Update quote with enhanced calculation results
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          items: calculationResult.updated_quote.items,
          costprice_total_usd: calculationResult.updated_quote.costprice_total_usd,
          final_total_usd: calculationResult.updated_quote.final_total_usd,
          calculation_data: calculationResult.updated_quote.calculation_data,
          smart_suggestions: calculationResult.smart_recommendations,
        })
        .eq('id', quoteId);

      if (updateError) {
        logger.warn('Failed to update consolidation quote with enhanced calculations:', updateError);
      }

      logger.info(`📦🔗⚡ Enhanced consolidation quote created: ${quoteId}`);
      return quoteId;

    } catch (error) {
      logger.error('Failed to create enhanced consolidation quote:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private buildWarehouseAddress(suiteNumber: string, customerProfile?: IntegratedCustomerProfile): string {
    const customerName = customerProfile?.full_name || 'iwishBag Customer';
    return `${customerName}
c/o iwishBag Forwarding
Suite ${suiteNumber}
1234 Warehouse Street
New York, NY 10001
United States

IMPORTANT: Please include Suite ${suiteNumber} in all shipments`;
  }

  private async sendIntegratedWelcomeNotification(
    customerProfile: IntegratedCustomerProfile,
    address: CustomerAddress
  ): Promise<void> {
    try {
      // This would integrate with your existing notification system
      logger.info(`📧 Sending welcome notification to ${customerProfile.email} for suite ${address.suite_number}`);
      
      // TODO: Integrate with existing notification service
      // await notificationService.sendPackageForwardingWelcome(customerProfile, address);
      
    } catch (error) {
      logger.warn('Failed to send welcome notification:', error);
    }
  }

  private async createIndividualPackageQuote(
    packageId: string,
    destinationCountry: string,
    customerData: any
  ): Promise<string> {
    // Call the database function we created in the migration
    const { data: quoteId, error } = await supabase
      .rpc('create_package_forwarding_quote', {
        p_package_id: packageId,
        p_destination_country: destinationCountry,
        p_customer_data: customerData,
      });

    if (error) {
      throw new Error(`Failed to create individual package quote: ${error.message}`);
    }

    return quoteId;
  }

  private async createConsolidationQuote(
    consolidationGroupId: string,
    destinationCountry: string,
    customerData: any
  ): Promise<string> {
    // Call the database function we created in the migration
    const { data: quoteId, error } = await supabase
      .rpc('create_consolidation_quote', {
        p_consolidation_group_id: consolidationGroupId,
        p_destination_country: destinationCountry,
        p_customer_data: customerData,
      });

    if (error) {
      throw new Error(`Failed to create consolidation quote: ${error.message}`);
    }

    return quoteId;
  }

  private async createStorageFeesQuote(
    userId: string,
    customerData: any
  ): Promise<string> {
    // Create a simple quote for storage fees only
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        user_id: userId,
        status: 'pending',
        origin_country: 'US',
        destination_country: customerData.shipping_address?.country || 'US',
        items: [],
        costprice_total_usd: 0,
        final_total_usd: 0,
        customer_data: customerData,
        forwarding_type: 'storage_fees',
        storage_fees_included: true,
        quote_source: 'package_forwarding',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create storage fees quote: ${error.message}`);
    }

    // Add storage fees to the quote
    await supabase.rpc('add_storage_fees_to_quote', {
      p_user_id: userId,
      p_quote_id: quote.id,
    });

    return quote.id;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const integratedPackageForwardingService = IntegratedPackageForwardingService.getInstance();
export default integratedPackageForwardingService;