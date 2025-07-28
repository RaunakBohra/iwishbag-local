/**
 * Package Forwarding Quote Integration Service
 * 
 * Bridges the package forwarding system with the existing iwishBag quote system.
 * Handles quote generation for consolidated packages, individual packages, and 
 * integrates forwarding fees with the payment system.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import {
  packageForwardingService,
  type ReceivedPackage,
  type ConsolidationGroup,
  type ConsolidationOption,
} from './PackageForwardingService';
import { warehouseManagementService } from './WarehouseManagementService';
import type {
  UnifiedQuote,
  QuoteItem,
  QuoteCalculationInput,
  QuoteCalculationResult,
  CalculationBreakdown,
  CalculationData,
  CustomerData,
  OperationalData,
  ShippingOption,
} from '@/types/unified-quote';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PackageForwardingQuoteRequest {
  type: 'individual_package' | 'consolidated_packages';
  customer_id: string;
  destination_country: string;
  destination_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  };
  
  // For individual package shipping
  package_id?: string;
  
  // For consolidated package shipping
  consolidation_group_id?: string;
  
  // Shipping preferences
  shipping_preferences?: {
    speed_priority: 'low' | 'medium' | 'high';
    cost_priority: 'low' | 'medium' | 'high';
    insurance_required?: boolean;
  };
}

export interface PackageForwardingQuoteResponse extends QuoteCalculationResult {
  forwarding_fees: {
    consolidation_fee: number;
    storage_fees: number;
    service_fees: number;
    photo_fees: number;
    total_forwarding_fees: number;
  };
  package_details: {
    total_packages: number;
    total_weight: number;
    total_declared_value: number;
    storage_duration_days: number;
  };
  estimated_savings?: number;
}

export interface PackageQuoteItem extends QuoteItem {
  // Additional fields specific to package forwarding
  package_id?: string;
  consolidation_group_id?: string;
  sender_store?: string;
  tracking_number?: string;
  received_date?: string;
  storage_location?: string;
  storage_fees_accrued?: number;
}

// ============================================================================
// PACKAGE FORWARDING QUOTE SERVICE
// ============================================================================

class PackageForwardingQuoteService {
  private static instance: PackageForwardingQuoteService;

  private constructor() {
    logger.info('📦💰 PackageForwardingQuoteService initialized');
  }

  static getInstance(): PackageForwardingQuoteService {
    if (!PackageForwardingQuoteService.instance) {
      PackageForwardingQuoteService.instance = new PackageForwardingQuoteService();
    }
    return PackageForwardingQuoteService.instance;
  }

  // ============================================================================
  // MAIN QUOTE GENERATION METHODS
  // ============================================================================

  /**
   * Generate shipping quote for package forwarding requests
   */
  async generateForwardingQuote(
    request: PackageForwardingQuoteRequest
  ): Promise<PackageForwardingQuoteResponse> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'PackageForwardingQuoteService.generateForwardingQuote',
          op: 'quote_generation',
        })
      : null;

    try {
      logger.info(`💰 Generating forwarding quote for type: ${request.type}`);

      if (request.type === 'individual_package') {
        return await this.generateIndividualPackageQuote(request);
      } else if (request.type === 'consolidated_packages') {
        return await this.generateConsolidatedPackageQuote(request);
      } else {
        throw new Error(`Unknown quote type: ${request.type}`);
      }

    } catch (error) {
      logger.error('❌ Failed to generate forwarding quote:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Generate quote for shipping an individual package
   */
  private async generateIndividualPackageQuote(
    request: PackageForwardingQuoteRequest
  ): Promise<PackageForwardingQuoteResponse> {
    if (!request.package_id) {
      throw new Error('Package ID is required for individual package quotes');
    }

    // Get package details
    const packages = await packageForwardingService.getCustomerPackages(request.customer_id);
    const package = packages.find(p => p.id === request.package_id);
    
    if (!package) {
      throw new Error(`Package not found: ${request.package_id}`);
    }

    // Convert package to quote item
    const quoteItem = this.convertPackageToQuoteItem(package);

    // Calculate forwarding fees
    const forwardingFees = this.calculateIndividualPackageForwardingFees(package);

    // Create quote calculation input
    const calculationInput: QuoteCalculationInput = {
      items: [quoteItem],
      origin_country: 'US', // Packages are shipped from US warehouse
      destination_country: request.destination_country,
      customer_data: await this.getCustomerData(request.customer_id, request.destination_address),
      shipping_preferences: request.shipping_preferences,
    };

    // Generate base quote using existing quote system
    const baseQuote = await this.generateBaseQuote(calculationInput);

    // Add package forwarding specific data
    const enhancedQuote = this.enhanceQuoteWithForwardingData(
      baseQuote.quote,
      [package],
      null,
      forwardingFees
    );

    return {
      ...baseQuote,
      quote: enhancedQuote,
      forwarding_fees: forwardingFees,
      package_details: {
        total_packages: 1,
        total_weight: package.weight_kg,
        total_declared_value: package.declared_value_usd || 0,
        storage_duration_days: this.calculateStorageDuration(package),
      },
    };
  }

  /**
   * Generate quote for shipping consolidated packages
   */
  private async generateConsolidatedPackageQuote(
    request: PackageForwardingQuoteRequest
  ): Promise<PackageForwardingQuoteResponse> {
    if (!request.consolidation_group_id) {
      throw new Error('Consolidation group ID is required for consolidated package quotes');
    }

    // Get consolidation group details
    const consolidationGroups = await packageForwardingService.getConsolidationGroups(request.customer_id);
    const consolidationGroup = consolidationGroups.find(g => g.id === request.consolidation_group_id);
    
    if (!consolidationGroup) {
      throw new Error(`Consolidation group not found: ${request.consolidation_group_id}`);
    }

    // Get individual packages in the consolidation group
    const allPackages = await packageForwardingService.getCustomerPackages(request.customer_id);
    const groupPackages = allPackages.filter(p => 
      consolidationGroup.original_package_ids.includes(p.id)
    );

    if (groupPackages.length === 0) {
      throw new Error('No packages found in consolidation group');
    }

    // Convert consolidation to a single consolidated item
    const consolidatedItem = this.convertConsolidationToQuoteItem(consolidationGroup, groupPackages);

    // Calculate forwarding fees including consolidation savings
    const forwardingFees = this.calculateConsolidatedPackageForwardingFees(
      consolidationGroup,
      groupPackages
    );

    // Create quote calculation input
    const calculationInput: QuoteCalculationInput = {
      items: [consolidatedItem],
      origin_country: 'US',
      destination_country: request.destination_country,
      customer_data: await this.getCustomerData(request.customer_id, request.destination_address),
      shipping_preferences: request.shipping_preferences,
    };

    // Generate base quote
    const baseQuote = await this.generateBaseQuote(calculationInput);

    // Add package forwarding specific data
    const enhancedQuote = this.enhanceQuoteWithForwardingData(
      baseQuote.quote,
      groupPackages,
      consolidationGroup,
      forwardingFees
    );

    // Calculate estimated savings from consolidation
    const individualShippingCosts = await this.calculateIndividualShippingCosts(
      groupPackages,
      request.destination_country
    );
    const estimatedSavings = Math.max(0, individualShippingCosts - baseQuote.quote.final_total_usd);

    return {
      ...baseQuote,
      quote: enhancedQuote,
      forwarding_fees: forwardingFees,
      package_details: {
        total_packages: groupPackages.length,
        total_weight: groupPackages.reduce((sum, pkg) => sum + pkg.weight_kg, 0),
        total_declared_value: groupPackages.reduce((sum, pkg) => sum + (pkg.declared_value_usd || 0), 0),
        storage_duration_days: Math.max(...groupPackages.map(pkg => this.calculateStorageDuration(pkg))),
      },
      estimated_savings: estimatedSavings,
    };
  }

  // ============================================================================
  // CONVERSION METHODS
  // ============================================================================

  /**
   * Convert a received package to a quote item
   */
  private convertPackageToQuoteItem(package: ReceivedPackage): PackageQuoteItem {
    return {
      id: package.id,
      name: `Package from ${package.sender_store || package.sender_name || 'Unknown Sender'}`,
      customer_notes: package.package_description || 'Package forwarding item',
      quantity: 1,
      costprice_origin: package.declared_value_usd || 0,
      weight: package.weight_kg,
      
      // Package forwarding specific fields
      package_id: package.id,
      sender_store: package.sender_store,
      tracking_number: package.tracking_number,
      received_date: package.received_date,
      storage_location: package.storage_location,
      storage_fees_accrued: this.calculateStorageFees(package),
      
      smart_data: {
        weight_confidence: 0.9, // High confidence as packages are physically received
        price_confidence: package.declared_value_usd ? 0.8 : 0.5,
        category_detected: 'package_forwarding',
        customs_suggestions: [
          'Package forwarding service',
          'Previously purchased items'
        ],
        optimization_hints: [
          'Consider consolidation for multiple packages',
          'Check storage fee optimization'
        ],
        weight_source: 'manual',
      },
    };
  }

  /**
   * Convert consolidation group to a single quote item
   */
  private convertConsolidationToQuoteItem(
    consolidationGroup: ConsolidationGroup,
    packages: ReceivedPackage[]
  ): PackageQuoteItem {
    const totalWeight = consolidationGroup.consolidated_weight_kg || 
      packages.reduce((sum, pkg) => sum + pkg.weight_kg, 0);
    
    const totalValue = packages.reduce((sum, pkg) => sum + (pkg.declared_value_usd || 0), 0);
    
    const senderStores = [...new Set(packages.map(pkg => pkg.sender_store).filter(Boolean))];
    const description = senderStores.length > 0 
      ? `Consolidated package from ${senderStores.join(', ')}`
      : `Consolidated package (${packages.length} items)`;

    return {
      id: consolidationGroup.id,
      name: consolidationGroup.group_name || 'Consolidated Package',
      customer_notes: description,
      quantity: 1,
      costprice_origin: totalValue,
      weight: totalWeight,
      
      // Package forwarding specific fields
      consolidation_group_id: consolidationGroup.id,
      
      smart_data: {
        weight_confidence: 0.95, // Very high confidence for consolidated packages
        price_confidence: 0.8,
        category_detected: 'consolidated_package',
        customs_suggestions: [
          'Consolidated package forwarding service',
          'Multiple previously purchased items'
        ],
        optimization_hints: [
          `Consolidation of ${packages.length} packages`,
          'Optimized for shipping efficiency'
        ],
        weight_source: 'manual',
      },
    };
  }

  // ============================================================================
  // FEE CALCULATION METHODS
  // ============================================================================

  /**
   * Calculate forwarding fees for individual package
   */
  private calculateIndividualPackageForwardingFees(package: ReceivedPackage) {
    const storageFees = this.calculateStorageFees(package);
    const serviceFees = 5.0; // Base service fee for individual packages
    const photoFees = (package.photos?.length || 0) * 2.0; // $2 per photo
    
    return {
      consolidation_fee: 0, // No consolidation for individual packages
      storage_fees: storageFees,
      service_fees: serviceFees,
      photo_fees: photoFees,
      total_forwarding_fees: storageFees + serviceFees + photoFees,
    };
  }

  /**
   * Calculate forwarding fees for consolidated packages
   */
  private calculateConsolidatedPackageForwardingFees(
    consolidationGroup: ConsolidationGroup,
    packages: ReceivedPackage[]
  ) {
    const consolidationFee = consolidationGroup.consolidation_fee_usd;
    const storageFees = consolidationGroup.storage_fees_usd;
    const serviceFees = consolidationGroup.service_fee_usd;
    
    // Calculate photo fees from all packages
    const photoFees = packages.reduce((sum, pkg) => {
      return sum + ((pkg.photos?.length || 0) * 2.0);
    }, 0);
    
    return {
      consolidation_fee: consolidationFee,
      storage_fees: storageFees,
      service_fees: serviceFees,
      photo_fees: photoFees,
      total_forwarding_fees: consolidationFee + storageFees + serviceFees + photoFees,
    };
  }

  /**
   * Calculate storage fees for a package
   */
  private calculateStorageFees(package: ReceivedPackage): number {
    const now = new Date();
    const exemptUntil = new Date(package.storage_fee_exempt_until);
    
    if (now <= exemptUntil) {
      return 0; // Still in free period
    }
    
    const daysStored = Math.ceil((now.getTime() - exemptUntil.getTime()) / (1000 * 60 * 60 * 24));
    return daysStored * 1.0; // $1 per day
  }

  /**
   * Calculate storage duration in days
   */
  private calculateStorageDuration(package: ReceivedPackage): number {
    const now = new Date();
    const receivedDate = new Date(package.received_date);
    return Math.ceil((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // QUOTE ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Enhance base quote with package forwarding specific data
   */
  private enhanceQuoteWithForwardingData(
    baseQuote: UnifiedQuote,
    packages: ReceivedPackage[],
    consolidationGroup: ConsolidationGroup | null,
    forwardingFees: ReturnType<typeof this.calculateIndividualPackageForwardingFees>
  ): UnifiedQuote {
    // Add forwarding fees to the calculation breakdown
    const enhancedCalculationData: CalculationData = {
      ...baseQuote.calculation_data,
      breakdown: {
        ...baseQuote.calculation_data.breakdown,
        // Add forwarding fees as handling charges
        handling: (baseQuote.calculation_data.breakdown.handling || 0) + forwardingFees.total_forwarding_fees,
      },
      // Add package forwarding specific metadata
      package_forwarding: {
        type: consolidationGroup ? 'consolidated' : 'individual',
        consolidation_group_id: consolidationGroup?.id,
        package_ids: packages.map(p => p.id),
        forwarding_fees: forwardingFees,
        warehouse_location: 'US', // iwishBag US warehouse
        total_packages: packages.length,
        total_storage_days: Math.max(...packages.map(pkg => this.calculateStorageDuration(pkg))),
      },
    };

    // Add package forwarding info to operational data
    const enhancedOperationalData: OperationalData = {
      ...baseQuote.operational_data,
      // Add package forwarding tracking info
      package_forwarding: {
        packages: packages.map(pkg => ({
          id: pkg.id,
          tracking_number: pkg.tracking_number,
          sender_store: pkg.sender_store,
          storage_location: pkg.storage_location,
          received_date: pkg.received_date,
        })),
        consolidation_group: consolidationGroup ? {
          id: consolidationGroup.id,
          name: consolidationGroup.group_name,
          status: consolidationGroup.status,
        } : null,
      },
    };

    return {
      ...baseQuote,
      // Update totals to include forwarding fees
      final_total_usd: baseQuote.final_total_usd + forwardingFees.total_forwarding_fees,
      calculation_data: enhancedCalculationData,
      operational_data: enhancedOperationalData,
      quote_source: 'package_forwarding',
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate base quote using existing quote system
   */
  private async generateBaseQuote(input: QuoteCalculationInput): Promise<QuoteCalculationResult> {
    // This would integrate with the existing quote calculation system
    // For now, we'll create a simplified quote structure
    
    const items = input.items;
    const totalWeight = items.reduce((sum, item) => sum + item.weight_kg, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0);
    
    // Basic shipping calculation (would be replaced with actual quote system)
    const baseShippingRate = 15; // $15 per kg
    const shippingCost = Math.max(25, totalWeight * baseShippingRate); // Minimum $25
    
    const calculationBreakdown: CalculationBreakdown = {
      items_total: totalValue,
      shipping: shippingCost,
      customs: totalValue * 0.1, // 10% customs duty estimate
      destination_tax: totalValue * 0.13, // 13% destination tax estimate
      fees: shippingCost * 0.029 + 0.30, // Payment gateway fees
      discount: 0,
    };

    const finalTotal = Object.values(calculationBreakdown).reduce((sum, val) => sum + (val || 0), 0);

    const quote: UnifiedQuote = {
      id: `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      display_id: `PF${Date.now().toString().slice(-6)}`,
      user_id: input.customer_data?.info?.email || undefined,
      status: 'calculated',
      origin_country: input.origin_country,
      destination_country: input.destination_country,
      items: items as QuoteItem[],
      costprice_total_usd: totalValue,
      final_total_usd: finalTotal,
      currency: 'USD',
      in_cart: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      calculation_data: {
        breakdown: calculationBreakdown,
        exchange_rate: {
          rate: 1.0,
          source: 'country_settings',
          confidence: 1.0,
        },
        smart_optimizations: [],
      },
      customer_data: input.customer_data || {
        info: {},
        shipping_address: {
          line1: '',
          city: '',
          state: '',
          postal: '',
          country: input.destination_country,
          locked: false,
        },
      },
      operational_data: {
        customs: {
          percentage: 10,
          tier_suggestions: [],
        },
        shipping: {
          method: 'package_forwarding',
          available_options: [],
          smart_recommendations: [],
        },
        payment: {
          amount_paid: 0,
          reminders_sent: 0,
          status: 'pending',
        },
        timeline: [{
          status: 'calculated',
          timestamp: new Date().toISOString(),
          auto: true,
        }],
        admin: {
          priority: 'normal',
          flags: ['package_forwarding'],
        },
      },
      smart_suggestions: [],
      weight_confidence: 0.9,
      optimization_score: 0.8,
      is_anonymous: false,
      quote_source: 'package_forwarding',
    };

    return {
      success: true,
      quote,
      smart_suggestions: [],
      shipping_options: [], // Would be populated by actual shipping service
    };
  }

  /**
   * Get customer data for quote generation
   */
  private async getCustomerData(
    customerId: string,
    destinationAddress?: PackageForwardingQuoteRequest['destination_address']
  ): Promise<CustomerData> {
    try {
      // Get user profile from auth.users
      const { data: user, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        logger.warn('Failed to get user data for quote generation:', error);
      }

      // Get customer virtual address
      const virtualAddress = await packageForwardingService.getCustomerAddress(customerId);

      return {
        info: {
          name: user?.user?.user_metadata?.name || '',
          email: user?.user?.email || '',
          phone: user?.user?.user_metadata?.phone || '',
        },
        shipping_address: destinationAddress ? {
          line1: destinationAddress.line1,
          line2: destinationAddress.line2,
          city: destinationAddress.city,
          state: destinationAddress.state,
          postal: destinationAddress.postal,
          country: destinationAddress.country,
          locked: false,
        } : {
          line1: '',
          city: '',
          state: '',
          postal: '',
          country: '',
          locked: false,
        },
        preferences: {
          delivery_priority: 'balance',
        },
        profile: {
          avatar_url: user?.user?.user_metadata?.avatar_url,
          virtual_address: virtualAddress?.full_address,
          suite_number: virtualAddress?.suite_number,
        },
      };
    } catch (error) {
      logger.error('Failed to get customer data:', error);
      return {
        info: {},
        shipping_address: {
          line1: '',
          city: '',
          state: '',
          postal: '',
          country: '',
          locked: false,
        },
      };
    }
  }

  /**
   * Calculate estimated individual shipping costs for comparison
   */
  private async calculateIndividualShippingCosts(
    packages: ReceivedPackage[],
    destinationCountry: string
  ): Promise<number> {
    let totalCost = 0;
    
    for (const pkg of packages) {
      // Simple shipping cost calculation for individual packages
      const baseRate = 15; // $15 per kg
      const shippingCost = Math.max(25, pkg.weight_kg * baseRate);
      const storageFees = this.calculateStorageFees(pkg);
      const serviceFees = 5.0;
      
      totalCost += shippingCost + storageFees + serviceFees;
    }
    
    return totalCost;
  }

  // ============================================================================
  // QUOTE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Create and save quote to database
   */
  async saveForwardingQuote(quote: UnifiedQuote): Promise<UnifiedQuote> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          id: quote.id,
          display_id: quote.display_id,
          user_id: quote.user_id,
          status: quote.status,
          origin_country: quote.origin_country,
          destination_country: quote.destination_country,
          items: quote.items,
          costprice_total_usd: quote.costprice_total_usd,
          final_total_usd: quote.final_total_usd,
          calculation_data: quote.calculation_data,
          customer_data: quote.customer_data,
          operational_data: quote.operational_data,
          currency: quote.currency,
          in_cart: quote.in_cart,
          smart_suggestions: quote.smart_suggestions,
          weight_confidence: quote.weight_confidence,
          optimization_score: quote.optimization_score,
          is_anonymous: quote.is_anonymous,
          quote_source: quote.quote_source,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save quote: ${error.message}`);
      }

      logger.info(`💰 Saved package forwarding quote: ${quote.id}`);
      return data;

    } catch (error) {
      logger.error('❌ Failed to save forwarding quote:', error);
      throw error;
    }
  }

  /**
   * Update consolidation group with quote ID
   */
  async linkConsolidationToQuote(consolidationGroupId: string, quoteId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('consolidation_groups')
        .update({ quote_id: quoteId })
        .eq('id', consolidationGroupId);

      if (error) {
        throw new Error(`Failed to link consolidation to quote: ${error.message}`);
      }

      logger.info(`🔗 Linked consolidation group ${consolidationGroupId} to quote ${quoteId}`);

    } catch (error) {
      logger.error('❌ Failed to link consolidation to quote:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const packageForwardingQuoteService = PackageForwardingQuoteService.getInstance();
export default packageForwardingQuoteService;