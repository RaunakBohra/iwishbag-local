/**
 * Nepal VAT API Service
 * Integration with Nepal Department of Customs for VAT rates and minimum valuations
 * Note: Nepal doesn't have a public API, so this service uses local data with periodic updates
 */

import { hsnSecurity, HSNPermission } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';

export interface NepalVATResponse {
  success: boolean;
  data?: {
    hsn_code: string;
    description: string;
    vat_rate: number;
    customs_duty: number;
    minimum_valuation?: {
      amount: number;
      currency: 'NPR' | 'USD';
      effective_date: string;
    };
    category: string;
    exemption_status: 'exempt' | 'taxable' | 'restricted';
    last_updated: string;
    source: 'api' | 'local_database' | 'manual_entry';
  };
  error?: string;
}

export interface NepalVATQuery {
  hsn_code: string;
  import_value_usd?: number;
  product_category?: string;
  check_minimum_valuation?: boolean;
}

export class NepalVATService {
  private static instance: NepalVATService;

  // Nepal-specific tax data (updated periodically from official sources)
  private readonly nepalTaxData = new Map<
    string,
    {
      vat_rate: number;
      customs_duty: number;
      minimum_valuation?: { amount: number; currency: 'NPR' | 'USD' };
      category: string;
      last_updated: string;
    }
  >([
    // Electronics
    [
      '8517',
      {
        vat_rate: 13,
        customs_duty: 15,
        category: 'electronics',
        last_updated: '2024-12-01',
      },
    ],
    [
      '8471',
      {
        vat_rate: 13,
        customs_duty: 10,
        category: 'electronics',
        last_updated: '2024-12-01',
      },
    ],

    // Clothing - with minimum valuation rules
    [
      '6109',
      {
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 10, currency: 'USD' }, // Nepal kurta example
        category: 'clothing',
        last_updated: '2024-12-01',
      },
    ],
    [
      '6204',
      {
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 15, currency: 'USD' },
        category: 'clothing',
        last_updated: '2024-12-01',
      },
    ],
    [
      '6203',
      {
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 20, currency: 'USD' },
        category: 'clothing',
        last_updated: '2024-12-01',
      },
    ],

    // Books - exempt from VAT
    [
      '4901',
      {
        vat_rate: 0,
        customs_duty: 0,
        category: 'books',
        last_updated: '2024-12-01',
      },
    ],

    // Food items
    [
      '1901',
      {
        vat_rate: 13,
        customs_duty: 25,
        category: 'food',
        last_updated: '2024-12-01',
      },
    ],

    // Luxury items - higher rates
    [
      '9101',
      {
        // Watches
        vat_rate: 13,
        customs_duty: 30,
        minimum_valuation: { amount: 50, currency: 'USD' },
        category: 'luxury',
        last_updated: '2024-12-01',
      },
    ],
  ]);

  // Category-based fallback rates
  private readonly categoryFallbacks = new Map<
    string,
    {
      vat_rate: number;
      customs_duty: number;
      minimum_valuation?: { amount: number; currency: 'NPR' | 'USD' };
    }
  >([
    ['electronics', { vat_rate: 13, customs_duty: 15 }],
    [
      'clothing',
      {
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 10, currency: 'USD' },
      },
    ],
    ['books', { vat_rate: 0, customs_duty: 0 }],
    ['food', { vat_rate: 13, customs_duty: 25 }],
    [
      'luxury',
      {
        vat_rate: 13,
        customs_duty: 30,
        minimum_valuation: { amount: 50, currency: 'USD' },
      },
    ],
    ['general', { vat_rate: 13, customs_duty: 15 }],
  ]);

  private cache = new Map<string, { data: NepalVATResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  private constructor() {}

  public static getInstance(): NepalVATService {
    if (!NepalVATService.instance) {
      NepalVATService.instance = new NepalVATService();
    }
    return NepalVATService.instance;
  }

  /**
   * Get VAT rate and customs duty for HSN code
   */
  async getVATRate(query: NepalVATQuery): Promise<NepalVATResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }

      // Get tax data from local database
      const response = await this.getLocalVATData(query);

      // Apply minimum valuation logic if requested
      if (
        query.check_minimum_valuation &&
        response.data?.minimum_valuation &&
        query.import_value_usd
      ) {
        response.data = {
          ...response.data,
          minimum_valuation: {
            ...response.data.minimum_valuation,
            applies_to_current_value:
              query.import_value_usd <
              this.convertToUSD(
                response.data.minimum_valuation.amount,
                response.data.minimum_valuation.currency,
              ),
          } as any,
        };
      }

      // Cache the response
      this.setCachedResponse(cacheKey, response);

      return response;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.governmentAPIError(
          'Nepal VAT System',
          {
            hsnCode: query.hsn_code,
          },
          error as Error,
        ),
      );

      // Return fallback data
      return this.getFallbackVATData(query.hsn_code, query.product_category);
    }
  }

  /**
   * Get tax data from local Nepal database
   */
  private async getLocalVATData(query: NepalVATQuery): Promise<NepalVATResponse> {
    // Check exact HSN match first
    const exactMatch = this.nepalTaxData.get(query.hsn_code);

    if (exactMatch) {
      return {
        success: true,
        data: {
          hsn_code: query.hsn_code,
          description: `Nepal tax data for HSN ${query.hsn_code}`,
          vat_rate: exactMatch.vat_rate,
          customs_duty: exactMatch.customs_duty,
          minimum_valuation: exactMatch.minimum_valuation,
          category: exactMatch.category,
          exemption_status: exactMatch.vat_rate === 0 ? 'exempt' : 'taxable',
          last_updated: exactMatch.last_updated,
          source: 'local_database',
        },
      };
    }

    // Try HSN prefix matching (4-digit, 2-digit)
    for (const prefixLength of [4, 2]) {
      const prefix = query.hsn_code.substring(0, prefixLength);
      for (const [hsnCode, data] of this.nepalTaxData) {
        if (hsnCode.startsWith(prefix)) {
          return {
            success: true,
            data: {
              hsn_code: query.hsn_code,
              description: `Nepal tax data (matched prefix ${prefix})`,
              vat_rate: data.vat_rate,
              customs_duty: data.customs_duty,
              minimum_valuation: data.minimum_valuation,
              category: data.category,
              exemption_status: data.vat_rate === 0 ? 'exempt' : 'taxable',
              last_updated: data.last_updated,
              source: 'local_database',
            },
          };
        }
      }
    }

    // Use category fallback if available
    if (query.product_category) {
      return this.getFallbackVATData(query.hsn_code, query.product_category);
    }

    // Default Nepal rates
    return this.getFallbackVATData(query.hsn_code, 'general');
  }

  /**
   * Get fallback VAT data based on category
   */
  private getFallbackVATData(hsnCode: string, category?: string): NepalVATResponse {
    const fallbackData =
      this.categoryFallbacks.get(category || 'general') || this.categoryFallbacks.get('general')!;

    return {
      success: true,
      data: {
        hsn_code: hsnCode,
        description: `Nepal fallback rates for ${category || 'general'} category`,
        vat_rate: fallbackData.vat_rate,
        customs_duty: fallbackData.customs_duty,
        minimum_valuation: fallbackData.minimum_valuation,
        category: category || 'general',
        exemption_status: fallbackData.vat_rate === 0 ? 'exempt' : 'taxable',
        last_updated: new Date().toISOString(),
        source: 'manual_entry',
      },
    };
  }

  /**
   * Check if minimum valuation applies
   */
  async checkMinimumValuation(
    hsnCode: string,
    importValueUSD: number,
    category?: string,
  ): Promise<{
    applies: boolean;
    minimumValueUSD: number;
    actualValueUSD: number;
    useMinimumForTax: boolean;
    description: string;
  }> {
    const vatData = await this.getVATRate({
      hsn_code: hsnCode,
      import_value_usd: importValueUSD,
      product_category: category,
      check_minimum_valuation: true,
    });

    if (!vatData.data?.minimum_valuation) {
      return {
        applies: false,
        minimumValueUSD: 0,
        actualValueUSD: importValueUSD,
        useMinimumForTax: false,
        description: 'No minimum valuation rule for this product',
      };
    }

    const minimumValueUSD = this.convertToUSD(
      vatData.data.minimum_valuation.amount,
      vatData.data.minimum_valuation.currency,
    );

    const useMinimumForTax = minimumValueUSD > importValueUSD;

    return {
      applies: true,
      minimumValueUSD,
      actualValueUSD: importValueUSD,
      useMinimumForTax,
      description: useMinimumForTax
        ? `Minimum valuation of $${minimumValueUSD} applies (higher than actual value $${importValueUSD})`
        : `Actual value $${importValueUSD} is higher than minimum valuation $${minimumValueUSD}`,
    };
  }

  /**
   * Batch lookup multiple HSN codes
   */
  async batchGetVATRates(queries: NepalVATQuery[]): Promise<Map<string, NepalVATResponse>> {
    const results = new Map<string, NepalVATResponse>();

    // Nepal service is local, so we can process all at once
    const promises = queries.map(async (query) => {
      const result = await this.getVATRate(query);
      return [query.hsn_code, result] as const;
    });

    const results_array = await Promise.allSettled(promises);

    results_array.forEach((result, index) => {
      const hsnCode = queries[index].hsn_code;
      if (result.status === 'fulfilled') {
        results.set(hsnCode, result.value[1]);
      } else {
        results.set(hsnCode, this.getFallbackVATData(hsnCode, queries[index].product_category));
      }
    });

    return results;
  }

  /**
   * Update Nepal tax data (admin function)
   */
  async updateTaxData(
    updates: Array<{
      hsn_code: string;
      vat_rate: number;
      customs_duty: number;
      minimum_valuation?: { amount: number; currency: 'NPR' | 'USD' };
      category: string;
    }>,
  ): Promise<{ success: boolean; updated: number }> {
    try {
      let updated = 0;

      for (const update of updates) {
        this.nepalTaxData.set(update.hsn_code, {
          vat_rate: update.vat_rate,
          customs_duty: update.customs_duty,
          minimum_valuation: update.minimum_valuation,
          category: update.category,
          last_updated: new Date().toISOString(),
        });
        updated++;
      }

      // Clear cache to force refresh
      this.clearCache();

      return { success: true, updated };
    } catch (error) {
      console.error('Failed to update Nepal tax data:', error);
      return { success: false, updated: 0 };
    }
  }

  /**
   * Get all minimum valuation rules
   */
  getMinimumValuationRules(): Array<{
    hsn_code: string;
    category: string;
    minimum_value_usd: number;
    description: string;
  }> {
    const rules = [];

    for (const [hsnCode, data] of this.nepalTaxData) {
      if (data.minimum_valuation) {
        rules.push({
          hsn_code: hsnCode,
          category: data.category,
          minimum_value_usd: this.convertToUSD(
            data.minimum_valuation.amount,
            data.minimum_valuation.currency,
          ),
          description: `${data.category} products have minimum valuation of $${this.convertToUSD(
            data.minimum_valuation.amount,
            data.minimum_valuation.currency,
          )}`,
        });
      }
    }

    return rules;
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    localDataEntries: number;
    cacheSize: number;
    categoriesSupported: number;
    minimumValuationRules: number;
  } {
    return {
      localDataEntries: this.nepalTaxData.size,
      cacheSize: this.cache.size,
      categoriesSupported: this.categoryFallbacks.size,
      minimumValuationRules: Array.from(this.nepalTaxData.values()).filter(
        (data) => data.minimum_valuation,
      ).length,
    };
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods
  private convertToUSD(amount: number, currency: 'NPR' | 'USD'): number {
    if (currency === 'USD') return amount;
    // NPR to USD conversion (approximate rate, should be updated regularly)
    const NPR_TO_USD_RATE = 0.0075; // 1 NPR = 0.0075 USD (approximate)
    return amount * NPR_TO_USD_RATE;
  }

  private generateCacheKey(query: NepalVATQuery): string {
    return `nepal_vat_${query.hsn_code}_${query.product_category || 'general'}_${query.check_minimum_valuation || false}`;
  }

  private getCachedResponse(key: string): NepalVATResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedResponse(key: string, response: NepalVATResponse): void {
    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const nepalVATService = NepalVATService.getInstance();
