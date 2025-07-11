import { supabase } from '@/integrations/supabase/client';

export interface PaymentGatewayInfo {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  fee_percent: number;
  fee_fixed: number;
  config: Record<string, any>;
  test_mode: boolean;
  priority: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CountryPaymentPreference {
  country_code: string;
  gateway_code: string;
  priority: number;
  is_active: boolean;
}

class PaymentGatewayService {
  private static instance: PaymentGatewayService;
  private gatewayCache: Map<string, PaymentGatewayInfo> = new Map();
  private allGatewaysCache: PaymentGatewayInfo[] | null = null;
  private countryPreferencesCache: Map<string, CountryPaymentPreference[]> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Fallback gateway codes for when database is unavailable
  private readonly FALLBACK_GATEWAY_CODES = [
    'payu', 'esewa', 'khalti', 'fonepay', 'airwallex', 
    'bank_transfer', 'cod', 'razorpay', 'paypal', 'upi', 'paytm', 
    'grabpay', 'alipay'
  ] as const;

  private constructor() {}

  static getInstance(): PaymentGatewayService {
    if (!PaymentGatewayService.instance) {
      PaymentGatewayService.instance = new PaymentGatewayService();
    }
    return PaymentGatewayService.instance;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.gatewayCache.clear();
    this.allGatewaysCache = null;
    this.countryPreferencesCache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Get all payment gateways from database
   */
  async getAllGateways(): Promise<PaymentGatewayInfo[]> {
    if (this.allGatewaysCache && this.isCacheValid()) {
      return this.allGatewaysCache;
    }

    try {
      const { data: gateways, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching payment gateways:', error);
        return this.getFallbackGateways();
      }

      this.allGatewaysCache = gateways || [];
      this.cacheTimestamp = Date.now();

      // Update individual gateway cache
      gateways?.forEach(gateway => {
        this.gatewayCache.set(gateway.code, gateway);
      });

      return this.allGatewaysCache;
    } catch (error) {
      console.error('Error in getAllGateways:', error);
      return this.getFallbackGateways();
    }
  }

  /**
   * Get active gateway codes dynamically from database
   */
  async getActiveGatewayCodes(): Promise<string[]> {
    try {
      const gateways = await this.getAllGateways();
      return gateways
        .filter(g => g.is_active)
        .map(g => g.code);
    } catch (error) {
      console.error('Error getting active gateway codes:', error);
      return [...this.FALLBACK_GATEWAY_CODES];
    }
  }

  /**
   * Get gateway codes synchronously (using cache)
   */
  getActiveGatewayCodesSync(): string[] {
    if (this.allGatewaysCache && this.isCacheValid()) {
      return this.allGatewaysCache
        .filter(g => g.is_active)
        .map(g => g.code);
    }
    return [...this.FALLBACK_GATEWAY_CODES];
  }

  /**
   * Get gateway by code
   */
  async getGateway(code: string): Promise<PaymentGatewayInfo | null> {
    if (this.gatewayCache.has(code) && this.isCacheValid()) {
      return this.gatewayCache.get(code) || null;
    }

    // If not in cache, fetch all gateways (which will populate cache)
    const allGateways = await this.getAllGateways();
    return allGateways.find(g => g.code === code) || null;
  }

  /**
   * Get gateways ordered by priority (global default)
   */
  async getGatewaysByPriority(): Promise<PaymentGatewayInfo[]> {
    const gateways = await this.getAllGateways();
    return gateways
      .filter(g => g.is_active)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get country-specific payment preferences
   */
  async getCountryPaymentPreferences(countryCode: string): Promise<CountryPaymentPreference[]> {
    if (this.countryPreferencesCache.has(countryCode) && this.isCacheValid()) {
      return this.countryPreferencesCache.get(countryCode) || [];
    }

    try {
      const { data: preferences, error } = await supabase
        .from('country_payment_preferences')
        .select('*')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching country payment preferences:', error);
        return [];
      }

      const result = preferences || [];
      this.countryPreferencesCache.set(countryCode, result);
      this.cacheTimestamp = Date.now();

      return result;
    } catch (error) {
      console.error('Error in getCountryPaymentPreferences:', error);
      return [];
    }
  }

  /**
   * Get recommended payment gateway for a country
   */
  async getRecommendedGateway(countryCode: string): Promise<string> {
    try {
      // First try country-specific preferences
      const countryPreferences = await this.getCountryPaymentPreferences(countryCode);
      if (countryPreferences.length > 0) {
        return countryPreferences[0].gateway_code;
      }

      // Fall back to global priority
      const gateways = await this.getGatewaysByPriority();
      if (gateways.length > 0) {
        return gateways[0].code;
      }

      // Final fallback
      return 'bank_transfer';
    } catch (error) {
      console.error('Error getting recommended gateway:', error);
      return 'bank_transfer';
    }
  }

  /**
   * Get gateways ordered by country-specific preferences
   */
  async getGatewaysForCountry(countryCode: string): Promise<PaymentGatewayInfo[]> {
    try {
      const countryPreferences = await this.getCountryPaymentPreferences(countryCode);
      const allGateways = await this.getAllGateways();
      
      if (countryPreferences.length === 0) {
        // No country-specific preferences, use global priority
        return allGateways
          .filter(g => g.is_active)
          .sort((a, b) => a.priority - b.priority);
      }

      // Create a map of gateway codes to preferences
      const preferenceMap = new Map<string, CountryPaymentPreference>();
      countryPreferences.forEach(pref => {
        preferenceMap.set(pref.gateway_code, pref);
      });

      // Separate gateways into preferred and non-preferred
      const preferredGateways: PaymentGatewayInfo[] = [];
      const otherGateways: PaymentGatewayInfo[] = [];

      allGateways.filter(g => g.is_active).forEach(gateway => {
        const preference = preferenceMap.get(gateway.code);
        if (preference) {
          preferredGateways.push(gateway);
        } else {
          otherGateways.push(gateway);
        }
      });

      // Sort preferred gateways by country preference priority
      preferredGateways.sort((a, b) => {
        const prefA = preferenceMap.get(a.code)!;
        const prefB = preferenceMap.get(b.code)!;
        return prefA.priority - prefB.priority;
      });

      // Sort other gateways by global priority
      otherGateways.sort((a, b) => a.priority - b.priority);

      // Return preferred gateways first, then others
      return [...preferredGateways, ...otherGateways];
    } catch (error) {
      console.error('Error getting gateways for country:', error);
      return this.getFallbackGateways();
    }
  }

  /**
   * Validate if a gateway code is valid
   */
  async isValidGatewayCode(code: string): Promise<boolean> {
    const gateways = await this.getAllGateways();
    return gateways.some(g => g.code === code && g.is_active);
  }

  /**
   * Get fallback gateways when database is unavailable
   */
  private getFallbackGateways(): PaymentGatewayInfo[] {
    return this.FALLBACK_GATEWAY_CODES.map((code, index) => ({
      id: `fallback-${code}`,
      name: this.getFallbackGatewayName(code),
      code,
      is_active: true,
      supported_countries: [],
      supported_currencies: [],
      fee_percent: 0,
      fee_fixed: 0,
      config: {},
      test_mode: true,
      priority: index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  /**
   * Get fallback gateway names
   */
  private getFallbackGatewayName(code: string): string {
    const names: Record<string, string> = {
      'stripe': 'Stripe',
      'payu': 'PayU',
      'esewa': 'eSewa',
      'khalti': 'Khalti',
      'fonepay': 'Fonepay',
      'airwallex': 'Airwallex',
      'bank_transfer': 'Bank Transfer',
      'cod': 'Cash on Delivery',
      'razorpay': 'Razorpay',
      'paypal': 'PayPal',
      'upi': 'UPI',
      'paytm': 'Paytm',
      'grabpay': 'GrabPay',
      'alipay': 'Alipay'
    };
    return names[code] || code;
  }

  /**
   * Check if gateway supports a specific currency
   */
  async isGatewaySupportedForCurrency(gatewayCode: string, currency: string): Promise<boolean> {
    const gateway = await this.getGateway(gatewayCode);
    if (!gateway) return false;
    
    return gateway.supported_currencies.includes(currency);
  }

  /**
   * Check if gateway supports a specific country
   */
  async isGatewaySupportedForCountry(gatewayCode: string, countryCode: string): Promise<boolean> {
    const gateway = await this.getGateway(gatewayCode);
    if (!gateway) return false;
    
    return gateway.supported_countries.includes(countryCode);
  }
}

// Export singleton instance
export const paymentGatewayService = PaymentGatewayService.getInstance();

// Export convenience functions for backward compatibility
export const getAllGateways = () => paymentGatewayService.getAllGateways();
export const getActiveGatewayCodes = () => paymentGatewayService.getActiveGatewayCodes();
export const getGateway = (code: string) => paymentGatewayService.getGateway(code);
export const getRecommendedGateway = (countryCode: string) => paymentGatewayService.getRecommendedGateway(countryCode);