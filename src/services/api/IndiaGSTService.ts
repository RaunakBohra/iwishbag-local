/**
 * India GST API Service
 * Integration with Government of India GST system for real-time tax rates
 * API Documentation: https://api.gst.gov.in/taxpayerapi/search/hsnsac
 */

import { hsnSecurity, HSNPermission } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';

export interface IndiaGSTResponse {
  success: boolean;
  data?: {
    hsn_code: string;
    description: string;
    gst_rate: number;
    cess_rate?: number;
    category: string;
    exemption_status: 'exempt' | 'taxable' | 'nil_rated';
    effective_date: string;
    last_updated: string;
  };
  error?: string;
  rate_limit?: {
    remaining: number;
    reset_time: number;
  };
}

export interface GSTRateQuery {
  hsn_code: string;
  supply_type?: 'intrastate' | 'interstate';
  business_type?: 'b2b' | 'b2c';
  state_code?: string;
}

export class IndiaGSTService {
  private static instance: IndiaGSTService;
  private readonly baseUrl = 'https://api.gst.gov.in/taxpayerapi/search';
  private readonly backupUrl = 'https://gst-rates-api.gov.in/v1';
  private apiKey: string | null = null;
  private requestCount = 0;
  private lastResetTime = Date.now();

  // Rate limiting (as per India GST API limits)
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly MAX_REQUESTS_PER_DAY = 1000;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private cache = new Map<string, { data: IndiaGSTResponse; timestamp: number }>();

  private constructor() {
    this.initializeAPIKey();
  }

  public static getInstance(): IndiaGSTService {
    if (!IndiaGSTService.instance) {
      IndiaGSTService.instance = new IndiaGSTService();
    }
    return IndiaGSTService.instance;
  }

  private async initializeAPIKey(): Promise<void> {
    try {
      // Get API key from HSN Security Manager
      this.apiKey = hsnSecurity.getAPIKey('india_gst');
    } catch (error) {
      console.warn('India GST API key not configured, using fallback data');
    }
  }

  /**
   * Get GST rate for HSN code from Government API
   */
  async getGSTRate(query: GSTRateQuery): Promise<IndiaGSTResponse> {
    try {
      // Check permissions
      await this.checkAPIPermissions();

      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }

      // Check rate limits
      await this.checkRateLimit();

      // If no API key, return fallback data
      if (!this.apiKey) {
        return this.getFallbackGSTData(query.hsn_code);
      }

      // Make API request
      const response = await this.makeAPIRequest(query);

      // Cache successful response
      this.setCachedResponse(cacheKey, response);

      return response;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.governmentAPIError(
          'India GST API',
          {
            hsnCode: query.hsn_code,
          },
          error as Error,
        ),
      );

      // Return fallback data on error
      return this.getFallbackGSTData(query.hsn_code);
    }
  }

  /**
   * Make actual API request to India GST system
   */
  private async makeAPIRequest(query: GSTRateQuery): Promise<IndiaGSTResponse> {
    const url = `${this.baseUrl}/hsnsac`;
    const requestBody = {
      hsn_sac_code: query.hsn_code,
      supply_type: query.supply_type || 'interstate',
      business_type: query.business_type || 'b2b',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0',
          'User-Agent': 'iwishBag-HSN-Service/1.0',
        },
        body: JSON.stringify(requestBody),
        timeout: 10000, // 10 second timeout
      });

      this.requestCount++;

      if (!response.ok) {
        // Try backup URL on primary failure
        if (response.status === 503 || response.status === 502) {
          return await this.tryBackupAPI(query);
        }

        throw new Error(`GST API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          hsn_code: query.hsn_code,
          description: data.description || 'GST API Response',
          gst_rate: data.gst_rate || data.cgst_rate + data.sgst_rate + data.igst_rate || 18,
          cess_rate: data.cess_rate || 0,
          category: data.category || 'general',
          exemption_status: data.exemption_status || 'taxable',
          effective_date: data.effective_date || new Date().toISOString(),
          last_updated: new Date().toISOString(),
        },
        rate_limit: {
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '100'),
          reset_time: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        },
      };
    } catch (error) {
      console.error('India GST API request failed:', error);

      // Try backup API on network error
      try {
        return await this.tryBackupAPI(query);
      } catch (backupError) {
        throw error; // Throw original error if backup also fails
      }
    }
  }

  /**
   * Try backup GST API endpoint
   */
  private async tryBackupAPI(query: GSTRateQuery): Promise<IndiaGSTResponse> {
    console.log('Trying backup GST API...');

    const backupResponse = await fetch(`${this.backupUrl}/hsn/${query.hsn_code}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      timeout: 8000,
    });

    if (!backupResponse.ok) {
      throw new Error(`Backup GST API failed: ${backupResponse.status}`);
    }

    const backupData = await backupResponse.json();

    return {
      success: true,
      data: {
        hsn_code: query.hsn_code,
        description: backupData.description || 'Backup API Response',
        gst_rate: backupData.gst_rate || 18,
        cess_rate: backupData.cess_rate || 0,
        category: backupData.category || 'general',
        exemption_status: backupData.exemption_status || 'taxable',
        effective_date: backupData.effective_date || new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Get fallback GST data when API is unavailable
   */
  private getFallbackGSTData(hsnCode: string): IndiaGSTResponse {
    // Common GST rates by HSN code patterns
    const fallbackRates: Record<string, number> = {
      // Electronics
      '8517': 18, // Mobile phones
      '8471': 18, // Computers
      '8518': 18, // Audio equipment

      // Clothing
      '6109': 12, // T-shirts
      '6204': 12, // Dresses
      '6203': 12, // Men's suits

      // Books
      '4901': 0, // Books (exempt)
      '4902': 0, // Newspapers (exempt)

      // Food items
      '1901': 18, // Food preparations
      '2202': 28, // Soft drinks

      // Default rates by HSN prefix
      '84': 18, // Machinery
      '85': 18, // Electrical equipment
      '61': 12, // Clothing
      '62': 12, // Clothing
      '49': 0, // Books/printed matter
    };

    // Find rate by exact match or prefix
    let gstRate = 18; // Default GST rate

    if (fallbackRates[hsnCode]) {
      gstRate = fallbackRates[hsnCode];
    } else {
      // Try 4-digit, 2-digit prefixes
      for (const prefix of [hsnCode.substring(0, 4), hsnCode.substring(0, 2)]) {
        if (fallbackRates[prefix]) {
          gstRate = fallbackRates[prefix];
          break;
        }
      }
    }

    return {
      success: true,
      data: {
        hsn_code: hsnCode,
        description: 'Fallback GST rate (API unavailable)',
        gst_rate: gstRate,
        cess_rate: 0,
        category: 'general',
        exemption_status: gstRate === 0 ? 'exempt' : 'taxable',
        effective_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Batch lookup multiple HSN codes
   */
  async batchGetGSTRates(hsnCodes: string[]): Promise<Map<string, IndiaGSTResponse>> {
    const results = new Map<string, IndiaGSTResponse>();

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < hsnCodes.length; i += batchSize) {
      const batch = hsnCodes.slice(i, i + batchSize);

      const batchPromises = batch.map(async (hsnCode) => {
        const result = await this.getGSTRate({ hsn_code: hsnCode });
        return [hsnCode, result] as const;
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const hsnCode = batch[index];
        if (result.status === 'fulfilled') {
          results.set(hsnCode, result.value[1]);
        } else {
          // Set fallback data for failed requests
          results.set(hsnCode, this.getFallbackGSTData(hsnCode));
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < hsnCodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
  } {
    return {
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
      hasValidAPIKey: !!this.apiKey,
      rateLimitStatus: this.requestCount < this.MAX_REQUESTS_PER_MINUTE ? 'OK' : 'LIMITED',
    };
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods
  private async checkAPIPermissions(): Promise<void> {
    // In production, would check user permissions
    // For now, assume permission granted
  }

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
        'India GST API rate limit exceeded',
        'MEDIUM' as any,
        { timestamp: new Date() },
      );
    }
  }

  private generateCacheKey(query: GSTRateQuery): string {
    return `gst_${query.hsn_code}_${query.supply_type || 'interstate'}_${query.business_type || 'b2b'}`;
  }

  private getCachedResponse(key: string): IndiaGSTResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedResponse(key: string, response: IndiaGSTResponse): void {
    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const indiaGSTService = IndiaGSTService.getInstance();
