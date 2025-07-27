/**
 * Simplified Calculator API Service
 * 
 * Provides essential API endpoints for shipping cost estimation.
 * Focused on the 95% use case: basic cost estimation and rate lookup.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CalculatorItem {
  name: string;
  price_usd: number;
  quantity: number;
  weight?: number;
  category?: string;
}

interface CalculationRequest {
  items: CalculatorItem[];
  shipping_country: string;
  currency?: string;
}

interface CalculationEstimate {
  total_estimate: number;
  breakdown: {
    item_cost: number;
    shipping_fee: number;
    customs_duty: number;
    tax_amount: number;
    service_fee: number;
  };
  currency: string;
  delivery_estimate: string;
}

class CalculatorAPIService {
  private static instance: CalculatorAPIService;

  private constructor() {}

  static getInstance(): CalculatorAPIService {
    if (!CalculatorAPIService.instance) {
      CalculatorAPIService.instance = new CalculatorAPIService();
    }
    return CalculatorAPIService.instance;
  }

  /**
   * Calculate shipping estimate - the core API function
   */
  async calculateEstimate(request: CalculationRequest): Promise<CalculationEstimate> {
    try {
      const { data, error } = await supabase.rpc('calculate_shipping_estimate', {
        p_items: request.items,
        p_shipping_country: request.shipping_country,
        p_currency: request.currency || 'USD',
      });

      if (error) {
        logger.error('Calculator estimate failed:', error);
        throw new Error(`Calculation failed: ${error.message}`);
      }

      return {
        total_estimate: data.total_estimate,
        breakdown: data.breakdown,
        currency: data.currency || request.currency || 'USD',
        delivery_estimate: data.delivery_estimate || '7-10 business days',
      };
    } catch (error) {
      logger.error('Calculator estimate error:', error);
      throw error;
    }
  }


  /**
   * Get shipping rates and tax information for a country
   */
  async getShippingRates(toCountry: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_shipping_rates', {
        p_to_country: toCountry,
      });

      if (error) {
        logger.error('Get shipping rates failed:', error);
        throw new Error(`Failed to get rates: ${error.message}`);
      }

      return {
        shipping_rates: data.shipping_rates,
        tax_rates: data.tax_rates,
        currency: data.currency || 'USD',
      };
    } catch (error) {
      logger.error('Get shipping rates error:', error);
      throw error;
    }
  }


  /**
   * Validate calculation request
   */
  private validateCalculationRequest(request: CalculationRequest): string[] {
    const errors: string[] = [];

    if (!request.items || request.items.length === 0) {
      errors.push('Items array is required and cannot be empty');
    }

    if (request.items && request.items.length > 20) {
      errors.push('Maximum 20 items allowed per calculation');
    }

    if (!request.shipping_country || !/^[A-Z]{2}$/.test(request.shipping_country)) {
      errors.push('Valid shipping_country (ISO 3166-1 alpha-2) is required');
    }

    request.items?.forEach((item, index) => {
      if (!item.name || item.name.length > 100) {
        errors.push(`Item ${index + 1}: name is required and must be ≤ 100 characters`);
      }

      if (!item.price_usd || item.price_usd <= 0) {
        errors.push(`Item ${index + 1}: price_usd must be greater than 0`);
      }

      if (!item.quantity || item.quantity < 1 || item.quantity > 50) {
        errors.push(`Item ${index + 1}: quantity must be between 1 and 50`);
      }

      if (item.weight && item.weight < 0) {
        errors.push(`Item ${index + 1}: weight cannot be negative`);
      }
    });

    return errors;
  }

  /**
   * Simplified API endpoint handler - only estimate and rates
   */
  async handleCalculatorRequest(
    endpoint: string,
    method: string,
    params: any,
    headers: Record<string, string>
  ): Promise<any> {
    // Rate limiting check
    const isRateLimited = await this.checkRateLimit(headers);
    if (isRateLimited) {
      throw new Error('Rate limit exceeded');
    }

    switch (endpoint) {
      case 'estimate':
        if (method !== 'POST') throw new Error('Method not allowed');
        const estimateErrors = this.validateCalculationRequest(params);
        if (estimateErrors.length > 0) {
          throw new Error(`Validation errors: ${estimateErrors.join(', ')}`);
        }
        return this.calculateEstimate(params);

      case 'rates':
        if (method !== 'GET') throw new Error('Method not allowed');
        if (!params.to_country) throw new Error('to_country parameter is required');
        return this.getShippingRates(params.to_country);

      default:
        throw new Error('Endpoint not found');
    }
  }

  private async checkRateLimit(headers: Record<string, string>): Promise<boolean> {
    // Implementation would check rate limits based on API key or IP
    // For now, return false (not rate limited)
    return false;
  }

}

// Export singleton instance
export const calculatorAPIService = CalculatorAPIService.getInstance();
export default CalculatorAPIService;