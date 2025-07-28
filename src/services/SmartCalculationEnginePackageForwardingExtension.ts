/**
 * Smart Calculation Engine - Package Forwarding Extension
 * 
 * Extends the SmartCalculationEngine to handle package forwarding quotes.
 * Ensures package forwarding quotes go through the same sophisticated
 * calculation pipeline as regular quotes with proper customs, taxes, and shipping.
 * 
 * INTEGRATION FEATURES:
 * - Converts received packages to proper QuoteItem format
 * - Handles consolidation group calculations
 * - Integrates storage fees into calculation breakdown
 * - Applies proper HSN codes and customs calculations
 * - Maintains consistency with existing calculation pipeline
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { SmartCalculationEngine } from './SmartCalculationEngine';
import type {
  UnifiedQuote,
  QuoteItem,
  CalculationBreakdown,
  EnhancedCalculationInput,
  EnhancedCalculationResult,
} from '@/types/unified-quote';

// ============================================================================
// PACKAGE FORWARDING CALCULATION TYPES
// ============================================================================

export interface PackageForwardingCalculationInput extends EnhancedCalculationInput {
  package_forwarding_data?: {
    package_ids?: string[];
    consolidation_group_id?: string;
    storage_fees_usd?: number;
    consolidation_fees_usd?: number;
    service_fees_usd?: number;
  };
}

export interface ExtendedCalculationBreakdown extends CalculationBreakdown {
  // Package forwarding specific fees
  storage_fees?: number;
  consolidation_fees?: number;
  service_fees?: number;
  warehouse_handling?: number;
}

// ============================================================================
// SMART CALCULATION ENGINE EXTENSION
// ============================================================================

export class SmartCalculationEnginePackageForwardingExtension {
  private static instance: SmartCalculationEnginePackageForwardingExtension;
  private smartCalculationEngine: SmartCalculationEngine;

  private constructor() {
    this.smartCalculationEngine = SmartCalculationEngine.getInstance();
    logger.info('📦⚡ SmartCalculationEngine Package Forwarding Extension initialized');
  }

  static getInstance(): SmartCalculationEnginePackageForwardingExtension {
    if (!SmartCalculationEnginePackageForwardingExtension.instance) {
      SmartCalculationEnginePackageForwardingExtension.instance = 
        new SmartCalculationEnginePackageForwardingExtension();
    }
    return SmartCalculationEnginePackageForwardingExtension.instance;
  }

  /**
   * Enhanced calculation method that handles both regular and package forwarding quotes
   */
  async calculateEnhancedWithPackageForwarding(
    input: PackageForwardingCalculationInput
  ): Promise<EnhancedCalculationResult> {
    try {
      // Detect if this is a package forwarding quote
      const isPackageForwardingQuote = this.isPackageForwardingQuote(input.quote);
      
      if (!isPackageForwardingQuote) {
        // Regular quote - use standard calculation engine
        return await this.smartCalculationEngine.calculateWithShippingOptions(input);
      }

      logger.info(`📦⚡ Processing package forwarding quote: ${input.quote.id}`);

      // Package forwarding quote - enhance and process
      const enhancedInput = await this.enhancePackageForwardingInput(input);
      
      // Process through standard calculation engine with enhanced data
      const result = await this.smartCalculationEngine.calculateWithShippingOptions(enhancedInput);
      
      // Post-process to include package forwarding specific data
      const enhancedResult = await this.enhancePackageForwardingResult(result, input);
      
      return enhancedResult;

    } catch (error) {
      logger.error('❌ Package forwarding calculation failed:', error);
      
      return {
        success: false,
        updated_quote: input.quote,
        shipping_options: [],
        smart_recommendations: [],
        optimization_suggestions: [],
        error: `Package forwarding calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Detect if a quote is a package forwarding quote
   */
  private isPackageForwardingQuote(quote: UnifiedQuote): boolean {
    return !!(
      quote.forwarding_type && 
      ['individual_package', 'consolidation', 'storage_fees'].includes(quote.forwarding_type)
    );
  }

  /**
   * Enhance input for package forwarding calculation
   */
  private async enhancePackageForwardingInput(
    input: PackageForwardingCalculationInput
  ): Promise<EnhancedCalculationInput> {
    const { quote } = input;

    try {
      // Get package forwarding data
      const packageForwardingData = await this.getPackageForwardingData(quote);
      
      // Transform packages to proper QuoteItems if needed
      let enhancedItems = quote.items;
      if (packageForwardingData.packages.length > 0) {
        enhancedItems = await this.transformPackagesToQuoteItems(packageForwardingData.packages);
      }

      // Enhance the quote with proper package forwarding data
      const enhancedQuote: UnifiedQuote = {
        ...quote,
        items: enhancedItems,
        origin_country: 'US', // Always from US warehouse
        costprice_total_usd: enhancedItems.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0),
        calculation_data: {
          ...quote.calculation_data,
          package_forwarding: {
            storage_fees_usd: packageForwardingData.storage_fees,
            consolidation_fees_usd: packageForwardingData.consolidation_fees,
            service_fees_usd: packageForwardingData.service_fees,
            packages_count: packageForwardingData.packages.length,
          }
        }
      };

      return {
        ...input,
        quote: enhancedQuote,
        package_forwarding_data: {
          storage_fees_usd: packageForwardingData.storage_fees,
          consolidation_fees_usd: packageForwardingData.consolidation_fees,
          service_fees_usd: packageForwardingData.service_fees,
        }
      };

    } catch (error) {
      logger.error('Failed to enhance package forwarding input:', error);
      return input; // Fall back to original input
    }
  }

  /**
   * Get package forwarding data from database
   */
  private async getPackageForwardingData(quote: UnifiedQuote): Promise<{
    packages: any[];
    storage_fees: number;
    consolidation_fees: number;
    service_fees: number;
  }> {
    let packages: any[] = [];
    let storage_fees = 0;
    let consolidation_fees = 0;
    let service_fees = 0;

    try {
      // Extract fees from forwarding_data if available
      if (quote.forwarding_data) {
        storage_fees = quote.forwarding_data.storage_fees_usd || 0;
        consolidation_fees = quote.forwarding_data.consolidation_fee_usd || 0;
        service_fees = quote.forwarding_data.service_fee_usd || 0;
      }

      // Get package data based on quote type
      if (quote.forwarding_type === 'individual_package' && quote.package_ids?.length) {
        const { data: packageData, error } = await supabase
          .from('received_packages')
          .select('*')
          .in('id', quote.package_ids);

        if (!error && packageData) {
          packages = packageData;
        }
      } else if (quote.forwarding_type === 'consolidation' && quote.consolidation_group_id) {
        const { data: groupData, error: groupError } = await supabase
          .from('consolidation_groups')
          .select('*')
          .eq('id', quote.consolidation_group_id)
          .single();

        if (!groupError && groupData) {
          // Get packages in consolidation group
          const { data: packageData, error: packageError } = await supabase
            .from('received_packages')
            .select('*')
            .eq('consolidation_group_id', quote.consolidation_group_id);

          if (!packageError && packageData) {
            packages = packageData;
          }

          // Update fees from consolidation group data
          consolidation_fees = groupData.consolidation_fee_usd;
          storage_fees = groupData.storage_fees_usd;
          service_fees = groupData.service_fee_usd;
        }
      }

      // Get storage fees from database if quote includes them
      if (quote.storage_fees_included) {
        const { data: storageFeeData, error: storageFeeError } = await supabase
          .from('storage_fees')
          .select('total_fee_usd')
          .eq('quote_id', quote.id)
          .eq('is_paid', false);

        if (!storageFeeError && storageFeeData) {
          const totalStorageFees = storageFeeData.reduce((sum, fee) => sum + (fee.total_fee_usd || 0), 0);
          if (totalStorageFees > 0) {
            storage_fees = totalStorageFees;
          }
        }
      }

    } catch (error) {
      logger.warn('Failed to get package forwarding data:', error);
    }

    return {
      packages,
      storage_fees,
      consolidation_fees,
      service_fees,
    };
  }

  /**
   * Transform received packages to QuoteItem format
   */
  private async transformPackagesToQuoteItems(packages: any[]): Promise<QuoteItem[]> {
    const quoteItems: QuoteItem[] = [];

    for (const pkg of packages) {
      try {
        // Determine HSN code based on package contents
        const hsnCode = await this.determineHSNCodeForPackage(pkg);
        
        // Create QuoteItem from package data
        const quoteItem: QuoteItem = {
          id: pkg.id,
          name: pkg.package_description || `Package from ${pkg.sender_store || pkg.sender_name || 'Unknown Sender'}`,
          url: `package://${pkg.id}`, // Special URL format for packages
          quantity: 1,
          costprice_origin: pkg.declared_value_usd || 0,
          weight: pkg.weight_kg || 0,
          hsn_code: hsnCode,
          category: this.getCategoryFromHSN(hsnCode),
          smart_data: {
            weight_confidence: 0.95, // Package weights are typically accurate
            price_confidence: 0.8,   // Declared values may vary
            category_detected: this.getCategoryFromHSN(hsnCode),
            customs_suggestions: ['Package forwarding item'],
            optimization_hints: [
              'Weight verified at warehouse',
              'Value declared by sender',
              'Package forwarding service'
            ],
            weight_source: 'manual', // Warehouse staff weighed
            weight_suggestions: {
              hsn_weight: pkg.weight_kg,
              hsn_confidence: 0.95,
            }
          }
        };

        // Add dimensions if available
        if (pkg.dimensions) {
          quoteItem.dimensions = pkg.dimensions;
        }

        quoteItems.push(quoteItem);

      } catch (error) {
        logger.warn(`Failed to transform package ${pkg.id} to QuoteItem:`, error);
        
        // Create fallback QuoteItem
        quoteItems.push({
          id: pkg.id,
          name: 'Package Forwarding Item',
          quantity: 1,
          costprice_origin: pkg.declared_value_usd || 0,
          weight: pkg.weight_kg || 0,
          smart_data: {
            weight_confidence: 0.5,
            price_confidence: 0.5,
            category_detected: 'general',
            customs_suggestions: [],
            optimization_hints: ['Fallback package item'],
          }
        });
      }
    }

    return quoteItems;
  }

  /**
   * Determine HSN code for a package based on its contents
   */
  private async determineHSNCodeForPackage(pkg: any): Promise<string> {
    try {
      // Try to auto-classify based on package description
      if (pkg.package_description) {
        // Use existing auto-classification service
        const { autoProductClassifier } = require('./AutoProductClassifier');
        const classification = await autoProductClassifier.classifyProduct({
          name: pkg.package_description,
          description: pkg.contents_list?.join(', ') || '',
        });
        
        if (classification?.hsn_code) {
          return classification.hsn_code;
        }
      }

      // Fallback HSN codes based on common package forwarding items
      const description = (pkg.package_description || '').toLowerCase();
      
      if (description.includes('electronic') || description.includes('gadget')) {
        return '8517'; // Electronics
      } else if (description.includes('clothing') || description.includes('apparel')) {
        return '6204'; // Clothing
      } else if (description.includes('book') || description.includes('media')) {
        return '4901'; // Books/Media
      } else if (description.includes('cosmetic') || description.includes('beauty')) {
        return '3304'; // Cosmetics
      } else {
        return '9999'; // General goods fallback
      }

    } catch (error) {
      logger.warn('Failed to determine HSN code for package:', error);
      return '9999'; // General goods fallback
    }
  }

  /**
   * Get category from HSN code
   */
  private getCategoryFromHSN(hsnCode: string): string {
    const hsnToCategory: Record<string, string> = {
      '8517': 'electronics',
      '6204': 'clothing',
      '4901': 'books',
      '3304': 'cosmetics',
      '9999': 'general',
    };

    return hsnToCategory[hsnCode] || 'general';
  }

  /**
   * Enhance calculation result with package forwarding specific data
   */
  private async enhancePackageForwardingResult(
    result: EnhancedCalculationResult,
    originalInput: PackageForwardingCalculationInput
  ): Promise<EnhancedCalculationResult> {
    try {
      if (!result.success || !result.updated_quote) {
        return result;
      }

      // Enhance calculation breakdown with package forwarding fees
      const originalBreakdown = result.updated_quote.calculation_data?.breakdown || {};
      const packageForwardingData = originalInput.package_forwarding_data;

      const enhancedBreakdown: ExtendedCalculationBreakdown = {
        ...originalBreakdown,
        storage_fees: packageForwardingData?.storage_fees_usd || 0,
        consolidation_fees: packageForwardingData?.consolidation_fees_usd || 0,
        service_fees: packageForwardingData?.service_fees_usd || 0,
      };

      // Add package forwarding fees to final total
      const forwardingFeesTotal = (enhancedBreakdown.storage_fees || 0) + 
                                 (enhancedBreakdown.consolidation_fees || 0) + 
                                 (enhancedBreakdown.service_fees || 0);

      const enhancedQuote: UnifiedQuote = {
        ...result.updated_quote,
        final_total_usd: (result.updated_quote.final_total_usd || 0) + forwardingFeesTotal,
        calculation_data: {
          ...result.updated_quote.calculation_data,
          breakdown: enhancedBreakdown,
          package_forwarding_enhanced: true,
        }
      };

      // Add package forwarding specific recommendations
      const packageForwardingRecommendations = [
        {
          type: 'package_forwarding' as const,
          title: 'Package Forwarding Service',
          description: 'Your packages are being processed through our US warehouse',
          savings_potential: 0,
          confidence: 1.0,
        }
      ];

      if (enhancedBreakdown.consolidation_fees && enhancedBreakdown.consolidation_fees > 0) {
        packageForwardingRecommendations.push({
          type: 'consolidation' as const,
          title: 'Package Consolidation Applied',
          description: 'Multiple packages consolidated to save on shipping costs',
          savings_potential: 15, // Estimated savings percentage
          confidence: 0.8,
        });
      }

      return {
        ...result,
        updated_quote: enhancedQuote,
        smart_recommendations: [
          ...result.smart_recommendations,
          ...packageForwardingRecommendations,
        ],
        optimization_suggestions: [
          ...result.optimization_suggestions,
          {
            type: 'package_forwarding',
            suggestion: 'Package forwarding quotes include warehouse processing and storage fees',
            potential_savings: forwardingFeesTotal,
            confidence: 1.0,
          }
        ]
      };

    } catch (error) {
      logger.error('Failed to enhance package forwarding result:', error);
      return result; // Return original result if enhancement fails
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const smartCalculationEnginePackageForwardingExtension = 
  SmartCalculationEnginePackageForwardingExtension.getInstance();