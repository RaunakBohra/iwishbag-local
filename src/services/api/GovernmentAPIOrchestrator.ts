/**
 * Government API Orchestrator
 * Unified interface for all government tax API services
 * Handles routing, fallbacks, and real-time rate updates
 */

import { hsnSecurity, HSNPermission, SecurityContext } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { indiaGSTService, IndiaGSTResponse, GSTRateQuery } from './IndiaGSTService';
import { nepalVATService, NepalVATResponse, NepalVATQuery } from './NepalVATService';
import { usTaxJarService, USTaxJarResponse, TaxJarQuery } from './USTaxJarService';

export interface UnifiedTaxQuery {
  destinationCountry: 'IN' | 'NP' | 'US';
  originCountry?: string;
  hsnCode: string;
  productCategory?: string;
  amount: number;
  shippingAmount?: number;

  // Location-specific data
  stateProvince?: string;
  city?: string;
  zipCode?: string;

  // Additional parameters
  businessType?: 'b2b' | 'b2c';
  checkMinimumValuation?: boolean;
}

export interface UnifiedTaxResponse {
  success: boolean;
  country: 'IN' | 'NP' | 'US';
  source: 'government_api' | 'local_database' | 'fallback';

  // Tax breakdown
  taxes: {
    primary_rate: number; // GST/VAT/Sales Tax
    primary_amount: number;
    secondary_rate?: number; // CESS/Additional taxes
    secondary_amount?: number;
    total_tax_rate: number;
    total_tax_amount: number;
  };

  // Country-specific data
  countrySpecific: {
    // India GST
    gst_rate?: number;
    cess_rate?: number;
    exemption_status?: 'exempt' | 'taxable' | 'nil_rated';

    // Nepal VAT
    vat_rate?: number;
    customs_duty?: number;
    minimum_valuation?: {
      amount: number;
      currency: string;
      applies: boolean;
    };

    // US Sales Tax
    state_tax_rate?: number;
    county_tax_rate?: number;
    city_tax_rate?: number;
    combined_rate?: number;
    location_details?: {
      state: string;
      county?: string;
      city?: string;
      zip?: string;
    };
  };

  // Metadata
  last_updated: string;
  cache_expiry: string;
  confidence_score: number;
  warnings?: string[];

  // Raw API response for debugging
  raw_response?: any;
}

export interface BatchTaxQuery extends UnifiedTaxQuery {
  item_id: string;
}

export interface BatchTaxResponse {
  success: boolean;
  total_items: number;
  successful_items: number;
  failed_items: number;

  results: Map<string, UnifiedTaxResponse>;
  errors: Array<{
    item_id: string;
    error: string;
  }>;

  summary: {
    total_tax_amount: number;
    average_tax_rate: number;
    api_calls_made: number;
    cache_hits: number;
    processing_time_ms: number;
  };
}

export class GovernmentAPIOrchestrator {
  private static instance: GovernmentAPIOrchestrator;
  private securityContext?: SecurityContext;

  // Service statistics
  private stats = {
    totalRequests: 0,
    apiCallsMade: 0,
    cacheHits: 0,
    fallbacksUsed: 0,
    errors: 0,
  };

  private constructor() {}

  public static getInstance(): GovernmentAPIOrchestrator {
    if (!GovernmentAPIOrchestrator.instance) {
      GovernmentAPIOrchestrator.instance = new GovernmentAPIOrchestrator();
    }
    return GovernmentAPIOrchestrator.instance;
  }

  public setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
  }

  /**
   * Get unified tax rate for any supported country
   */
  async getTaxRate(query: UnifiedTaxQuery): Promise<UnifiedTaxResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Security check
      if (this.securityContext) {
        hsnSecurity.checkPermission(this.securityContext, HSNPermission.USE_GOVERNMENT_APIS);
      }

      console.log(
        `🌐 [GOV-API] Getting tax rate for ${query.destinationCountry} - HSN ${query.hsnCode}`,
      );

      let response: UnifiedTaxResponse;

      switch (query.destinationCountry) {
        case 'IN':
          response = await this.getIndiaTaxRate(query);
          break;
        case 'NP':
          response = await this.getNepalTaxRate(query);
          break;
        case 'US':
          response = await this.getUSTaxRate(query);
          break;
        default:
          throw new Error(`Unsupported country: ${query.destinationCountry}`);
      }

      // Add processing metadata
      response.cache_expiry = new Date(
        Date.now() + this.getCacheExpiryDuration(query.destinationCountry),
      ).toISOString();
      response.confidence_score = this.calculateConfidenceScore(response);

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ [GOV-API] Tax rate retrieved in ${processingTime}ms - ${response.taxes.total_tax_rate}% (${response.source})`,
      );

      return response;
    } catch (error) {
      this.stats.errors++;

      await hsnErrorHandler.handleError(
        HSNErrors.governmentAPIError(
          `${query.destinationCountry} Tax API`,
          {
            hsnCode: query.hsnCode,
            route: `${query.originCountry || 'Unknown'} → ${query.destinationCountry}`,
          },
          error as Error,
        ),
      );

      // Return fallback response
      return this.getFallbackTaxResponse(query);
    }
  }

  /**
   * Get India GST rate
   */
  private async getIndiaTaxRate(query: UnifiedTaxQuery): Promise<UnifiedTaxResponse> {
    const gstQuery: GSTRateQuery = {
      hsn_code: query.hsnCode,
      supply_type: query.originCountry === 'IN' ? 'intrastate' : 'interstate',
      business_type: query.businessType || 'b2c',
    };

    const gstResponse: IndiaGSTResponse = await indiaGSTService.getGSTRate(gstQuery);

    if (!gstResponse.success || !gstResponse.data) {
      this.stats.fallbacksUsed++;
      throw new Error('India GST API failed');
    }

    this.stats.apiCallsMade++;

    const primaryAmount = (query.amount * gstResponse.data.gst_rate) / 100;
    const cessAmount = gstResponse.data.cess_rate
      ? (query.amount * gstResponse.data.cess_rate) / 100
      : 0;
    const totalAmount = primaryAmount + cessAmount;

    return {
      success: true,
      country: 'IN',
      source: 'government_api',
      taxes: {
        primary_rate: gstResponse.data.gst_rate,
        primary_amount: primaryAmount,
        secondary_rate: gstResponse.data.cess_rate,
        secondary_amount: cessAmount,
        total_tax_rate: gstResponse.data.gst_rate + (gstResponse.data.cess_rate || 0),
        total_tax_amount: totalAmount,
      },
      countrySpecific: {
        gst_rate: gstResponse.data.gst_rate,
        cess_rate: gstResponse.data.cess_rate,
        exemption_status: gstResponse.data.exemption_status,
      },
      last_updated: gstResponse.data.last_updated,
      cache_expiry: '', // Will be set by caller
      confidence_score: 0, // Will be calculated by caller
      raw_response: gstResponse,
    };
  }

  /**
   * Get Nepal VAT rate
   */
  private async getNepalTaxRate(query: UnifiedTaxQuery): Promise<UnifiedTaxResponse> {
    const vatQuery: NepalVATQuery = {
      hsn_code: query.hsnCode,
      import_value_usd: query.amount,
      product_category: query.productCategory,
      check_minimum_valuation: query.checkMinimumValuation,
    };

    const vatResponse: NepalVATResponse = await nepalVATService.getVATRate(vatQuery);

    if (!vatResponse.success || !vatResponse.data) {
      this.stats.fallbacksUsed++;
      throw new Error('Nepal VAT service failed');
    }

    if (vatResponse.data.source === 'api') {
      this.stats.apiCallsMade++;
    } else {
      this.stats.cacheHits++;
    }

    // Calculate tax on appropriate base (minimum valuation vs actual value)
    let taxBase = query.amount;
    let minimumValuationApplies = false;

    if (vatResponse.data.minimum_valuation && query.checkMinimumValuation) {
      const minValUSD =
        vatResponse.data.minimum_valuation.currency === 'USD'
          ? vatResponse.data.minimum_valuation.amount
          : vatResponse.data.minimum_valuation.amount * 0.0075; // NPR to USD conversion

      if (minValUSD > query.amount) {
        taxBase = minValUSD;
        minimumValuationApplies = true;
      }
    }

    const vatAmount = (taxBase * vatResponse.data.vat_rate) / 100;
    const customsAmount = (taxBase * vatResponse.data.customs_duty) / 100;
    const totalAmount = vatAmount + customsAmount;

    const warnings = [];
    if (minimumValuationApplies) {
      warnings.push(
        `Minimum valuation of $${taxBase} applied (higher than actual value $${query.amount})`,
      );
    }

    return {
      success: true,
      country: 'NP',
      source: vatResponse.data.source === 'api' ? 'government_api' : 'local_database',
      taxes: {
        primary_rate: vatResponse.data.vat_rate,
        primary_amount: vatAmount,
        secondary_rate: vatResponse.data.customs_duty,
        secondary_amount: customsAmount,
        total_tax_rate: vatResponse.data.vat_rate + vatResponse.data.customs_duty,
        total_tax_amount: totalAmount,
      },
      countrySpecific: {
        vat_rate: vatResponse.data.vat_rate,
        customs_duty: vatResponse.data.customs_duty,
        minimum_valuation: vatResponse.data.minimum_valuation
          ? {
              amount: vatResponse.data.minimum_valuation.amount,
              currency: vatResponse.data.minimum_valuation.currency,
              applies: minimumValuationApplies,
            }
          : undefined,
      },
      last_updated: vatResponse.data.last_updated,
      cache_expiry: '',
      confidence_score: 0,
      warnings,
      raw_response: vatResponse,
    };
  }

  /**
   * Get US sales tax rate
   */
  private async getUSTaxRate(query: UnifiedTaxQuery): Promise<UnifiedTaxResponse> {
    if (!query.stateProvince || !query.zipCode) {
      throw new Error('US tax calculation requires state and zip code');
    }

    const taxJarQuery: TaxJarQuery = {
      to_country: 'US',
      to_state: query.stateProvince,
      to_zip: query.zipCode,
      to_city: query.city,
      amount: query.amount,
      shipping: query.shippingAmount || 0,
      product_tax_code: usTaxJarService.convertHSNToTaxJarCode(
        query.hsnCode,
        query.productCategory,
      ),
    };

    const taxJarResponse: USTaxJarResponse = await usTaxJarService.calculateSalesTax(taxJarQuery);

    if (!taxJarResponse.success || !taxJarResponse.data) {
      this.stats.fallbacksUsed++;
      throw new Error('US TaxJar API failed');
    }

    this.stats.apiCallsMade++;

    return {
      success: true,
      country: 'US',
      source: 'government_api',
      taxes: {
        primary_rate: taxJarResponse.data.combined_rate,
        primary_amount: taxJarResponse.data.total_sales_tax,
        total_tax_rate: taxJarResponse.data.combined_rate,
        total_tax_amount: taxJarResponse.data.total_sales_tax,
      },
      countrySpecific: {
        state_tax_rate: taxJarResponse.data.state_tax_rate,
        county_tax_rate: taxJarResponse.data.county_tax_rate,
        city_tax_rate: taxJarResponse.data.city_tax_rate,
        combined_rate: taxJarResponse.data.combined_rate,
        location_details: {
          state: taxJarResponse.data.state,
          county: taxJarResponse.data.county,
          city: taxJarResponse.data.city,
          zip: taxJarResponse.data.zip,
        },
      },
      last_updated: taxJarResponse.data.last_updated,
      cache_expiry: '',
      confidence_score: 0,
      raw_response: taxJarResponse,
    };
  }

  /**
   * Batch process multiple tax queries
   */
  async batchGetTaxRates(queries: BatchTaxQuery[]): Promise<BatchTaxResponse> {
    const startTime = Date.now();
    const results = new Map<string, UnifiedTaxResponse>();
    const errors: Array<{ item_id: string; error: string }> = [];

    console.log(`🔄 [GOV-API-BATCH] Processing ${queries.length} tax queries`);

    // Group queries by country for efficient processing
    const queriesByCountry = {
      IN: queries.filter((q) => q.destinationCountry === 'IN'),
      NP: queries.filter((q) => q.destinationCountry === 'NP'),
      US: queries.filter((q) => q.destinationCountry === 'US'),
    };

    // Process each country's queries
    for (const [country, countryQueries] of Object.entries(queriesByCountry)) {
      if (countryQueries.length === 0) continue;

      try {
        const promises = countryQueries.map(async (query) => {
          try {
            const result = await this.getTaxRate(query);
            return { item_id: query.item_id, result };
          } catch (error) {
            return {
              item_id: query.item_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        const countryResults = await Promise.allSettled(promises);

        countryResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if ('result' in result.value) {
              results.set(result.value.item_id, result.value.result);
            } else {
              errors.push({ item_id: result.value.item_id, error: result.value.error });
            }
          } else {
            errors.push({ item_id: 'unknown', error: result.reason });
          }
        });
      } catch (error) {
        console.error(`Error processing ${country} queries:`, error);
        countryQueries.forEach((query) => {
          errors.push({
            item_id: query.item_id,
            error: `${country} batch processing failed`,
          });
        });
      }
    }

    // Calculate summary statistics
    const totalTaxAmount = Array.from(results.values()).reduce(
      (sum, result) => sum + result.taxes.total_tax_amount,
      0,
    );

    const averageTaxRate =
      results.size > 0
        ? Array.from(results.values()).reduce(
            (sum, result) => sum + result.taxes.total_tax_rate,
            0,
          ) / results.size
        : 0;

    const processingTime = Date.now() - startTime;

    console.log(
      `✅ [GOV-API-BATCH] Completed: ${results.size}/${queries.length} successful in ${processingTime}ms`,
    );

    return {
      success: errors.length < queries.length,
      total_items: queries.length,
      successful_items: results.size,
      failed_items: errors.length,
      results,
      errors,
      summary: {
        total_tax_amount: totalTaxAmount,
        average_tax_rate: averageTaxRate,
        api_calls_made: this.stats.apiCallsMade,
        cache_hits: this.stats.cacheHits,
        processing_time_ms: processingTime,
      },
    };
  }

  /**
   * Get system status for all government APIs
   */
  async getSystemStatus(): Promise<{
    overall_status: 'healthy' | 'degraded' | 'down';
    services: {
      india_gst: { status: string; stats: any };
      nepal_vat: { status: string; stats: any };
      us_taxjar: { status: string; stats: any };
    };
    orchestrator_stats: typeof this.stats;
  }> {
    try {
      const [indiaStats, nepalStats, usStats] = await Promise.allSettled([
        Promise.resolve(indiaGSTService.getServiceStats()),
        Promise.resolve(nepalVATService.getServiceStats()),
        Promise.resolve(usTaxJarService.getServiceStats()),
      ]);

      const services = {
        india_gst: {
          status: indiaStats.status === 'fulfilled' ? 'online' : 'error',
          stats: indiaStats.status === 'fulfilled' ? indiaStats.value : {},
        },
        nepal_vat: {
          status: nepalStats.status === 'fulfilled' ? 'online' : 'error',
          stats: nepalStats.status === 'fulfilled' ? nepalStats.value : {},
        },
        us_taxjar: {
          status: usStats.status === 'fulfilled' ? 'online' : 'error',
          stats: usStats.status === 'fulfilled' ? usStats.value : {},
        },
      };

      const onlineServices = Object.values(services).filter((s) => s.status === 'online').length;
      const overall_status =
        onlineServices === 3 ? 'healthy' : onlineServices >= 1 ? 'degraded' : 'down';

      return {
        overall_status,
        services,
        orchestrator_stats: { ...this.stats },
      };
    } catch (error) {
      return {
        overall_status: 'down',
        services: {
          india_gst: { status: 'error', stats: {} },
          nepal_vat: { status: 'error', stats: {} },
          us_taxjar: { status: 'error', stats: {} },
        },
        orchestrator_stats: { ...this.stats },
      };
    }
  }

  /**
   * Clear all service caches
   */
  clearAllCaches(): void {
    indiaGSTService.clearCache();
    nepalVATService.clearCache();
    usTaxJarService.clearCache();
    console.log('🧹 [GOV-API] All government API caches cleared');
  }

  // Private helper methods
  private getFallbackTaxResponse(query: UnifiedTaxQuery): UnifiedTaxResponse {
    // Basic fallback rates by country
    const fallbackRates = {
      IN: 18, // Standard GST rate
      NP: 13, // Standard VAT rate
      US: 8.88, // Average US sales tax rate
    };

    const rate = fallbackRates[query.destinationCountry];
    const amount = (query.amount * rate) / 100;

    return {
      success: true,
      country: query.destinationCountry,
      source: 'fallback',
      taxes: {
        primary_rate: rate,
        primary_amount: amount,
        total_tax_rate: rate,
        total_tax_amount: amount,
      },
      countrySpecific: {},
      last_updated: new Date().toISOString(),
      cache_expiry: new Date(Date.now() + 60000).toISOString(), // 1 minute expiry for fallbacks
      confidence_score: 0.3, // Low confidence for fallback data
      warnings: ['Using fallback tax rates - API unavailable'],
    };
  }

  private getCacheExpiryDuration(country: 'IN' | 'NP' | 'US'): number {
    // Different cache durations based on data volatility
    const durations = {
      IN: 6 * 60 * 60 * 1000, // 6 hours - GST rates change infrequently
      NP: 24 * 60 * 60 * 1000, // 24 hours - VAT rates very stable
      US: 1 * 60 * 60 * 1000, // 1 hour - Sales tax rates vary by location
    };

    return durations[country];
  }

  private calculateConfidenceScore(response: UnifiedTaxResponse): number {
    let score = 0.5; // Base score

    // Higher confidence for government API sources
    if (response.source === 'government_api') score += 0.4;
    else if (response.source === 'local_database') score += 0.2;

    // Lower confidence for fallback data
    if (response.source === 'fallback') score = 0.3;

    // Adjust for warnings
    if (response.warnings && response.warnings.length > 0) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }
}

// Export singleton instance
export const governmentAPIOrchestrator = GovernmentAPIOrchestrator.getInstance();
