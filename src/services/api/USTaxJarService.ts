/**
 * US TaxJar API Service
 * Integration with TaxJar API for US sales tax calculations
 * API Documentation: https://developers.taxjar.com/api/reference/
 */

import { hsnSecurity, HSNPermission } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';

export interface USTaxJarResponse {
  success: boolean;
  data?: {
    total_sales_tax: number;
    state_tax_rate: number;
    county_tax_rate: number;
    city_tax_rate: number;
    special_district_rate: number;
    combined_rate: number;
    state: string;
    county: string;
    city: string;
    zip: string;
    product_category: string;
    exemption_type?: 'clothing' | 'food' | 'prescription' | 'non_prescription';
    last_updated: string;
  };
  error?: string;
  rate_limit?: {
    remaining: number;
    reset_time: number;
  };
}

export interface TaxJarQuery {
  from_zip?: string;
  from_state?: string;
  to_zip: string;
  to_state: string;
  to_city?: string;
  to_country: 'US';
  amount: number;
  shipping: number;
  product_tax_code?: string; // TaxJar product category
  line_items?: Array<{
    id: string;
    quantity: number;
    product_tax_code?: string;
    unit_price: number;
    discount?: number;
  }>;
}

export class USTaxJarService {
  private static instance: USTaxJarService;
  private readonly baseUrl = 'https://api.taxjar.com/v2';
  private apiKey: string | null = null;
  private requestCount = 0;
  private lastResetTime = Date.now();

  // TaxJar API limits (varies by plan)
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Free tier limit
  private readonly MAX_REQUESTS_PER_MONTH = 200; // Free tier limit
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  private cache = new Map<string, { data: USTaxJarResponse; timestamp: number }>();

  // TaxJar product tax codes mapping from HSN codes
  private readonly hsnToTaxJarMapping = new Map<string, string>([
    // Electronics
    ['8517', '30070'], // Mobile phones → Communication Equipment
    ['8471', '31000'], // Computers → Computer Equipment
    ['8518', '30070'], // Audio equipment → Communication Equipment

    // Clothing
    ['6109', '20010'], // T-shirts → Clothing
    ['6204', '20010'], // Dresses → Clothing
    ['6203', '20010'], // Men's suits → Clothing

    // Books
    ['4901', '81100'], // Books → Books/Textbooks
    ['4902', '81100'], // Newspapers → Books/Textbooks

    // Food items (varies by state)
    ['1901', '40030'], // Food preparations → Food & Groceries
    ['2202', '40050'], // Soft drinks → Soft Drinks
  ]);

  // US state tax exemptions
  private readonly stateExemptions = new Map<
    string,
    {
      clothing_limit?: number; // Amount under which clothing is exempt
      food_exempt: boolean;
      prescription_exempt: boolean;
    }
  >([
    ['NY', { clothing_limit: 110, food_exempt: true, prescription_exempt: true }],
    ['NJ', { clothing_limit: 110, food_exempt: true, prescription_exempt: true }],
    ['PA', { clothing_limit: 0, food_exempt: true, prescription_exempt: true }],
    ['CA', { food_exempt: true, prescription_exempt: true }],
    ['TX', { food_exempt: false, prescription_exempt: true }],
    ['FL', { food_exempt: true, prescription_exempt: true }],
    // Add more states as needed
  ]);

  private constructor() {
    this.initializeAPIKey();
  }

  public static getInstance(): USTaxJarService {
    if (!USTaxJarService.instance) {
      USTaxJarService.instance = new USTaxJarService();
    }
    return USTaxJarService.instance;
  }

  private async initializeAPIKey(): Promise<void> {
    try {
      this.apiKey = hsnSecurity.getAPIKey('taxjar_us');
    } catch (error) {
      console.warn('TaxJar API key not configured, using fallback data');
    }
  }

  /**
   * Calculate US sales tax using TaxJar API
   */
  async calculateSalesTax(query: TaxJarQuery): Promise<USTaxJarResponse> {
    try {
      // Check rate limits
      await this.checkRateLimit();

      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }

      // If no API key, return fallback calculation
      if (!this.apiKey) {
        return this.getFallbackTaxCalculation(query);
      }

      // Make API request
      const response = await this.makeAPIRequest(query);

      // Cache successful response
      this.setCachedResponse(cacheKey, response);

      return response;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.governmentAPIError(
          'TaxJar API',
          {
            route: `${query.from_state || 'Unknown'} → ${query.to_state}`,
          },
          error as Error,
        ),
      );

      // Return fallback calculation on error
      return this.getFallbackTaxCalculation(query);
    }
  }

  /**
   * Make actual API request to TaxJar
   */
  private async makeAPIRequest(query: TaxJarQuery): Promise<USTaxJarResponse> {
    const url = `${this.baseUrl}/taxes`;

    // Prepare request body
    const requestBody = {
      from_country: 'US',
      from_zip: query.from_zip || '10001', // Default to NYC if not provided
      from_state: query.from_state || 'NY',
      to_country: query.to_country,
      to_zip: query.to_zip,
      to_state: query.to_state,
      to_city: query.to_city,
      amount: query.amount,
      shipping: query.shipping,
      line_items: query.line_items || [],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'iwishBag-HSN-Service/1.0',
        },
        body: JSON.stringify(requestBody),
        timeout: 10000,
      });

      this.requestCount++;

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('TaxJar API rate limit exceeded');
        }
        throw new Error(`TaxJar API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          total_sales_tax: data.tax.amount_to_collect || 0,
          state_tax_rate: data.tax.rate || 0,
          county_tax_rate: data.tax.county_tax_rate || 0,
          city_tax_rate: data.tax.city_tax_rate || 0,
          special_district_rate: data.tax.special_district_tax_rate || 0,
          combined_rate: data.tax.rate || 0,
          state: query.to_state,
          county: data.tax.county || '',
          city: query.to_city || '',
          zip: query.to_zip,
          product_category: query.product_tax_code || 'general',
          last_updated: new Date().toISOString(),
        },
        rate_limit: {
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '100'),
          reset_time: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        },
      };
    } catch (error) {
      console.error('TaxJar API request failed:', error);
      throw error;
    }
  }

  /**
   * Get fallback tax calculation when API is unavailable
   */
  private getFallbackTaxCalculation(query: TaxJarQuery): USTaxJarResponse {
    // US state sales tax rates (approximate - should be updated regularly)
    const stateTaxRates: Record<string, number> = {
      AL: 4.0,
      AK: 0.0,
      AZ: 5.6,
      AR: 6.5,
      CA: 7.25,
      CO: 2.9,
      CT: 6.35,
      DE: 0.0,
      FL: 6.0,
      GA: 4.0,
      HI: 4.17,
      ID: 6.0,
      IL: 6.25,
      IN: 7.0,
      IA: 6.0,
      KS: 6.5,
      KY: 6.0,
      LA: 4.45,
      ME: 5.5,
      MD: 6.0,
      MA: 6.25,
      MI: 6.0,
      MN: 6.88,
      MS: 7.0,
      MO: 4.23,
      MT: 0.0,
      NE: 5.5,
      NV: 6.85,
      NH: 0.0,
      NJ: 6.63,
      NM: 5.13,
      NY: 8.0,
      NC: 4.75,
      ND: 5.0,
      OH: 5.75,
      OK: 4.5,
      OR: 0.0,
      PA: 6.0,
      RI: 7.0,
      SC: 6.0,
      SD: 4.5,
      TN: 7.0,
      TX: 6.25,
      UT: 4.85,
      VT: 6.0,
      VA: 5.3,
      WA: 6.5,
      WV: 6.0,
      WI: 5.0,
      WY: 4.0,
    };

    const stateRate = stateTaxRates[query.to_state] || 5.0; // Default 5% if state not found

    // Apply exemptions
    const exemptions = this.stateExemptions.get(query.to_state);
    let effectiveRate = stateRate;

    if (exemptions && query.product_tax_code) {
      // Check for clothing exemption
      if (
        query.product_tax_code === '20010' &&
        exemptions.clothing_limit &&
        query.amount < exemptions.clothing_limit
      ) {
        effectiveRate = 0;
      }

      // Check for food exemption
      if (query.product_tax_code === '40030' && exemptions.food_exempt) {
        effectiveRate = 0;
      }
    }

    const totalTax = (query.amount + query.shipping) * (effectiveRate / 100);

    return {
      success: true,
      data: {
        total_sales_tax: totalTax,
        state_tax_rate: stateRate,
        county_tax_rate: 0, // Can't determine without API
        city_tax_rate: 0,
        special_district_rate: 0,
        combined_rate: stateRate,
        state: query.to_state,
        county: '',
        city: query.to_city || '',
        zip: query.to_zip,
        product_category: query.product_tax_code || 'general',
        last_updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Get tax rates for a specific location (no transaction)
   */
  async getTaxRatesForLocation(
    zip: string,
    state: string,
    city?: string,
  ): Promise<USTaxJarResponse> {
    try {
      if (!this.apiKey) {
        return this.getFallbackTaxCalculation({
          to_zip: zip,
          to_state: state,
          to_city: city,
          to_country: 'US',
          amount: 0,
          shipping: 0,
        });
      }

      const url = `${this.baseUrl}/rates/${zip}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': 'iwishBag-HSN-Service/1.0',
        },
        timeout: 8000,
      });

      if (!response.ok) {
        throw new Error(`TaxJar rates API returned ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          total_sales_tax: 0,
          state_tax_rate: data.rate.state_rate || 0,
          county_tax_rate: data.rate.county_rate || 0,
          city_tax_rate: data.rate.city_rate || 0,
          special_district_rate: data.rate.combined_district_rate || 0,
          combined_rate: data.rate.combined_rate || 0,
          state: data.rate.state,
          county: data.rate.county || '',
          city: data.rate.city || city || '',
          zip: zip,
          product_category: 'general',
          last_updated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('TaxJar rates API failed:', error);
      return this.getFallbackTaxCalculation({
        to_zip: zip,
        to_state: state,
        to_city: city,
        to_country: 'US',
        amount: 0,
        shipping: 0,
      });
    }
  }

  /**
   * Convert HSN code to TaxJar product tax code
   */
  convertHSNToTaxJarCode(hsnCode: string, category?: string): string {
    // Try exact HSN match first
    if (this.hsnToTaxJarMapping.has(hsnCode)) {
      return this.hsnToTaxJarMapping.get(hsnCode)!;
    }

    // Try category-based mapping
    const categoryMappings: Record<string, string> = {
      electronics: '30070',
      clothing: '20010',
      books: '81100',
      food: '40030',
      luxury: '31000',
    };

    if (category && categoryMappings[category]) {
      return categoryMappings[category];
    }

    // Default general merchandise
    return '00000';
  }

  /**
   * Batch calculate taxes for multiple items
   */
  async batchCalculateTaxes(queries: TaxJarQuery[]): Promise<Map<string, USTaxJarResponse>> {
    const results = new Map<string, USTaxJarResponse>();

    // Process in small batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      const batchPromises = batch.map(async (query, index) => {
        const key = `${query.to_state}_${query.to_zip}_${i + index}`;
        const result = await this.calculateSalesTax(query);
        return [key, result] as const;
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const key = `${batch[index].to_state}_${batch[index].to_zip}_${i + index}`;
        if (result.status === 'fulfilled') {
          results.set(key, result.value[1]);
        } else {
          results.set(key, this.getFallbackTaxCalculation(batch[index]));
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < queries.length) {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // 6 second delay
      }
    }

    return results;
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    requestCount: number;
    cacheSize: number;
    hasValidAPIKey: boolean;
    rateLimitStatus: string;
    supportedStates: number;
  } {
    return {
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
      hasValidAPIKey: !!this.apiKey,
      rateLimitStatus: this.requestCount < this.MAX_REQUESTS_PER_MINUTE ? 'OK' : 'LIMITED',
      supportedStates: 50, // All US states
    };
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter every minute
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new HSNSystemError(
        'API_RATE_LIMIT_EXCEEDED' as any,
        'TaxJar API rate limit exceeded',
        'MEDIUM' as any,
        { timestamp: new Date() },
      );
    }
  }

  private generateCacheKey(query: TaxJarQuery): string {
    return `taxjar_${query.to_state}_${query.to_zip}_${query.amount}_${query.shipping}_${query.product_tax_code || 'general'}`;
  }

  private getCachedResponse(key: string): USTaxJarResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedResponse(key: string, response: USTaxJarResponse): void {
    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const usTaxJarService = USTaxJarService.getInstance();
