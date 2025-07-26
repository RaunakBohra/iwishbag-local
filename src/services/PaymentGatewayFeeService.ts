// ============================================================================
// PAYMENT GATEWAY FEE SERVICE - Centralized Fee Management
// Replaces all hardcoded fees and provides single source of truth
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { unifiedConfigService } from './UnifiedConfigurationService';
import * as Sentry from '@sentry/react';

export interface PaymentGatewayFees {
  fixedFee: number; // Fixed fee in USD
  percentFee: number; // Percentage fee (e.g., 2.9 for 2.9%)
  source: 'gateway' | 'country' | 'default';
  gateway?: string; // Gateway name if gateway-specific
  currency: string; // Currency the fees are in
}

export interface GatewayFeeCalculation {
  fees: PaymentGatewayFees;
  calculatedAmount: number;
  breakdown: {
    baseAmount: number;
    percentageFee: number;
    fixedFee: number;
    totalFee: number;
  };
}

/**
 * PAYMENT GATEWAY FEE SERVICE - Single Source of Truth
 *
 * Priority order for fee resolution:
 * 1. Gateway-specific fees (if gateway specified)
 * 2. Country-specific fees (destination country)
 * 3. System defaults (fallback)
 */
class PaymentGatewayFeeService {
  private static instance: PaymentGatewayFeeService;
  private cache = new Map<string, { data: PaymentGatewayFees; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    console.log('💳 PaymentGatewayFeeService initialized');
  }

  static getInstance(): PaymentGatewayFeeService {
    if (!PaymentGatewayFeeService.instance) {
      PaymentGatewayFeeService.instance = new PaymentGatewayFeeService();
    }
    return PaymentGatewayFeeService.instance;
  }

  // ============================================================================
  // MAIN API: Get Payment Gateway Fees
  // ============================================================================

  /**
   * Get payment gateway fees with intelligent fallback
   * @param destinationCountry - Customer's country (determines applicable fees)
   * @param gateway - Specific gateway (optional, for gateway-specific fees)
   * @returns Payment gateway fees with source information
   */
  async getPaymentGatewayFees(
    destinationCountry: string,
    gateway?: string,
  ): Promise<PaymentGatewayFees> {
    const transaction = Sentry.startTransaction({
      name: 'PaymentGatewayFeeService.getPaymentGatewayFees',
      op: 'payment_fee_lookup',
    });

    try {
      const cacheKey = `${destinationCountry}:${gateway || 'default'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        transaction.setStatus('ok');
        return cached;
      }

      console.log('💳 [DEBUG] Resolving payment gateway fees:', {
        destinationCountry,
        gateway,
        priority: gateway ? 'gateway-specific → country → default' : 'country → default',
      });

      let fees: PaymentGatewayFees | null = null;

      // Priority 1: Gateway-specific fees (if gateway specified)
      if (gateway) {
        fees = await this.getGatewaySpecificFees(gateway, destinationCountry);
        if (fees) {
          console.log('✅ [DEBUG] Using gateway-specific fees:', {
            gateway,
            fixedFee: fees.fixedFee,
            percentFee: fees.percentFee,
            source: fees.source,
          });
          this.setCache(cacheKey, fees);
          transaction.setStatus('ok');
          return fees;
        }
      }

      // Priority 2: Country-specific fees
      fees = await this.getCountrySpecificFees(destinationCountry);
      if (fees) {
        console.log('✅ [DEBUG] Using country-specific fees:', {
          destinationCountry,
          fixedFee: fees.fixedFee,
          percentFee: fees.percentFee,
          source: fees.source,
        });
        this.setCache(cacheKey, fees);
        transaction.setStatus('ok');
        return fees;
      }

      // Priority 3: System defaults (fallback)
      fees = this.getDefaultFees();
      console.log('⚠️ [DEBUG] Using default fallback fees:', {
        destinationCountry,
        gateway,
        fixedFee: fees.fixedFee,
        percentFee: fees.percentFee,
        source: fees.source,
        warning: 'Consider configuring country or gateway-specific fees',
      });

      this.setCache(cacheKey, fees);
      transaction.setStatus('ok');
      return fees;
    } catch (error) {
      console.error('❌ Error getting payment gateway fees:', error);
      Sentry.captureException(error);
      transaction.setStatus('internal_error');

      // Return safe defaults on error
      return this.getDefaultFees();
    } finally {
      transaction.finish();
    }
  }

  /**
   * Calculate payment gateway fee for a given amount
   * @param amount - Base amount to calculate fee on (in USD)
   * @param destinationCountry - Customer's country
   * @param gateway - Specific gateway (optional)
   * @returns Complete fee calculation breakdown
   */
  async calculatePaymentGatewayFee(
    amount: number,
    destinationCountry: string,
    gateway?: string,
  ): Promise<GatewayFeeCalculation> {
    const fees = await this.getPaymentGatewayFees(destinationCountry, gateway);

    const percentageFee = amount * (fees.percentFee / 100);
    const fixedFee = fees.fixedFee;
    const totalFee = percentageFee + fixedFee;

    console.log('💰 [DEBUG] Payment gateway fee calculation:', {
      baseAmount: amount,
      percentageFee: `${amount} × ${fees.percentFee}% = ${percentageFee}`,
      fixedFee: fixedFee,
      totalFee: totalFee,
      fees: fees,
      formula: `(${amount} × ${fees.percentFee}/100) + ${fixedFee} = ${totalFee}`,
    });

    return {
      fees,
      calculatedAmount: Math.round(totalFee * 100) / 100,
      breakdown: {
        baseAmount: amount,
        percentageFee: Math.round(percentageFee * 100) / 100,
        fixedFee: Math.round(fixedFee * 100) / 100,
        totalFee: Math.round(totalFee * 100) / 100,
      },
    };
  }

  // ============================================================================
  // INTERNAL METHODS: Fee Resolution Logic
  // ============================================================================

  /**
   * Get gateway-specific fees from unified configuration
   */
  private async getGatewaySpecificFees(
    gateway: string,
    destinationCountry: string,
  ): Promise<PaymentGatewayFees | null> {
    try {
      const gatewayConfig = await unifiedConfigService.getGatewayConfig(gateway);

      if (!gatewayConfig || !gatewayConfig.fees) {
        console.log(`🔍 [DEBUG] No gateway config found for: ${gateway}`);
        return null;
      }

      // Check if gateway supports the destination country
      if (
        gatewayConfig.supported_countries &&
        !gatewayConfig.supported_countries.includes(destinationCountry)
      ) {
        console.log(`⚠️ [DEBUG] Gateway ${gateway} doesn't support ${destinationCountry}`);
        return null;
      }

      return {
        fixedFee: gatewayConfig.fees.fixed_fee || 0,
        percentFee: gatewayConfig.fees.percent_fee || 0,
        source: 'gateway',
        gateway: gateway,
        currency: 'USD', // Gateway fees are standardized in USD
      };
    } catch (error) {
      console.error(`❌ Error getting gateway fees for ${gateway}:`, error);
      return null;
    }
  }

  /**
   * Get country-specific fees from multiple sources
   */
  private async getCountrySpecificFees(
    destinationCountry: string,
  ): Promise<PaymentGatewayFees | null> {
    try {
      // Try unified configuration first
      const countryConfig = await unifiedConfigService.getCountryConfig(destinationCountry);
      if (
        countryConfig &&
        countryConfig.payment_gateway_fixed_fee !== undefined &&
        countryConfig.payment_gateway_percent_fee !== undefined
      ) {
        console.log('💎 [DEBUG] Found country config in unified system:', {
          destinationCountry,
          fixedFee: countryConfig.payment_gateway_fixed_fee,
          percentFee: countryConfig.payment_gateway_percent_fee,
        });

        return {
          fixedFee: countryConfig.payment_gateway_fixed_fee,
          percentFee: countryConfig.payment_gateway_percent_fee,
          source: 'country',
          currency: countryConfig.currency || 'USD',
        };
      }

      // Fallback to legacy country_settings table
      const { data: countrySettings, error } = await supabase
        .from('country_settings')
        .select('payment_gateway_fixed_fee, payment_gateway_percent_fee, currency')
        .eq('code', destinationCountry)
        .single();

      if (error || !countrySettings) {
        console.log(`🔍 [DEBUG] No country settings found for: ${destinationCountry}`);
        return null;
      }

      if (
        countrySettings.payment_gateway_fixed_fee !== null &&
        countrySettings.payment_gateway_percent_fee !== null
      ) {
        console.log('🏛️ [DEBUG] Found country fees in legacy table:', {
          destinationCountry,
          fixedFee: countrySettings.payment_gateway_fixed_fee,
          percentFee: countrySettings.payment_gateway_percent_fee,
        });

        return {
          fixedFee: countrySettings.payment_gateway_fixed_fee,
          percentFee: countrySettings.payment_gateway_percent_fee,
          source: 'country',
          currency: countrySettings.currency || 'USD',
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting country fees for ${destinationCountry}:`, error);
      return null;
    }
  }

  /**
   * Get system default fees (fallback)
   */
  private getDefaultFees(): PaymentGatewayFees {
    return {
      fixedFee: 0.3, // $0.30 USD
      percentFee: 2.9, // 2.9%
      source: 'default',
      currency: 'USD',
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get available payment gateways for a country
   */
  async getAvailableGateways(destinationCountry: string): Promise<string[]> {
    try {
      const gateways = await unifiedConfigService.getActiveGateways(destinationCountry);
      return gateways.map((g: any) => g.config.gateway_name).filter(Boolean);
    } catch (error) {
      console.error(`❌ Error getting available gateways for ${destinationCountry}:`, error);
      return ['stripe', 'paypal']; // Safe defaults
    }
  }

  /**
   * Get recommended gateway for a country (based on lowest fees)
   */
  async getRecommendedGateway(
    destinationCountry: string,
    amount: number,
  ): Promise<{ gateway: string; totalFee: number } | null> {
    try {
      const availableGateways = await this.getAvailableGateways(destinationCountry);

      if (availableGateways.length === 0) {
        return null;
      }

      const calculations = await Promise.all(
        availableGateways.map(async (gateway) => {
          const calc = await this.calculatePaymentGatewayFee(amount, destinationCountry, gateway);
          return {
            gateway,
            totalFee: calc.calculatedAmount,
            calculation: calc,
          };
        }),
      );

      // Sort by lowest fee
      calculations.sort((a, b) => a.totalFee - b.totalFee);

      const recommended = calculations[0];
      console.log('🎯 [DEBUG] Recommended gateway:', {
        destinationCountry,
        amount,
        recommended: recommended.gateway,
        totalFee: recommended.totalFee,
        allOptions: calculations.map((c) => ({
          gateway: c.gateway,
          fee: c.totalFee,
        })),
      });

      return {
        gateway: recommended.gateway,
        totalFee: recommended.totalFee,
      };
    } catch (error) {
      console.error(`❌ Error getting recommended gateway for ${destinationCountry}:`, error);
      return null;
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private getFromCache(key: string): PaymentGatewayFees | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Payment gateway fee cache hit: ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: PaymentGatewayFees): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache for specific country or gateway
   */
  clearCache(destinationCountry?: string, gateway?: string): void {
    if (destinationCountry || gateway) {
      const pattern = `${destinationCountry || ''}:${gateway || ''}`;
      Array.from(this.cache.keys())
        .filter((key) => key.includes(pattern))
        .forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
    console.log(
      `🗑️ Payment gateway fee cache cleared: ${destinationCountry || 'all'}:${gateway || 'all'}`,
    );
  }
}

// Export singleton instance
export const paymentGatewayFeeService = PaymentGatewayFeeService.getInstance();
export default paymentGatewayFeeService;
