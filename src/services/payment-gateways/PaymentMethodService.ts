/**
 * Payment Method Service
 * Handles payment method display, availability, and user interaction logic
 * Decomposed from usePaymentGateways hook for better separation of concerns
 */

import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { PaymentGateway, PaymentMethod } from '@/types/payment';
import PaymentGatewayConfigService, { type GatewayAvailabilityFilter } from './PaymentGatewayConfigService';

export interface PaymentMethodDisplay {
  gateway: PaymentGateway;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  logo_url?: string;
  category: 'card' | 'wallet' | 'bank' | 'cash' | 'crypto';
  supported_currencies: string[];
  processing_fee_percentage?: number;
  fixed_fee_amount?: number;
  estimated_processing_time: string;
  is_recommended: boolean;
  is_popular: boolean;
  requires_registration: boolean;
  availability_status: 'available' | 'limited' | 'unavailable';
  unavailability_reason?: string;
  setup_required: boolean;
  verification_required: boolean;
}

export interface PaymentMethodGroup {
  category: string;
  title: string;
  description: string;
  methods: PaymentMethodDisplay[];
  priority: number;
}

export interface PaymentMethodPreferences {
  preferred_methods: PaymentGateway[];
  hidden_methods: PaymentGateway[];
  method_order: PaymentGateway[];
  show_all_methods: boolean;
  group_by_category: boolean;
  highlight_recommended: boolean;
}

export interface PaymentMethodAnalytics {
  gateway: PaymentGateway;
  usage_count: number;
  success_rate: number;
  average_processing_time_seconds: number;
  customer_satisfaction_score: number;
  last_used: string;
  failure_reasons: Array<{ reason: string; count: number }>;
}

export class PaymentMethodService {
  private configService: PaymentGatewayConfigService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Payment method display metadata
  private readonly METHOD_METADATA: Record<PaymentGateway, Omit<PaymentMethodDisplay, 'gateway' | 'availability_status' | 'supported_currencies'>> = {
    stripe: {
      name: 'Stripe',
      display_name: 'Credit/Debit Card',
      description: 'Pay securely with your credit or debit card',
      icon: '💳',
      logo_url: '/images/payment-logos/stripe.png',
      category: 'card',
      processing_fee_percentage: 2.9,
      fixed_fee_amount: 0.30,
      estimated_processing_time: 'Instant',
      is_recommended: true,
      is_popular: true,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
    payu: {
      name: 'PayU',
      display_name: 'PayU - Cards, UPI, Wallets',
      description: 'Pay with cards, UPI, net banking, or digital wallets',
      icon: '🇮🇳',
      logo_url: '/images/payment-logos/payu.png',
      category: 'wallet',
      processing_fee_percentage: 2.0,
      fixed_fee_amount: 0,
      estimated_processing_time: 'Instant',
      is_recommended: true,
      is_popular: true,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
    paypal: {
      name: 'PayPal',
      display_name: 'PayPal',
      description: 'Pay with your PayPal account or credit card',
      icon: '🅿️',
      logo_url: '/images/payment-logos/paypal.png',
      category: 'wallet',
      processing_fee_percentage: 3.49,
      fixed_fee_amount: 0.49,
      estimated_processing_time: 'Instant',
      is_recommended: true,
      is_popular: true,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
    esewa: {
      name: 'eSewa',
      display_name: 'eSewa Digital Wallet',
      description: 'Pay with your eSewa digital wallet',
      icon: '🏦',
      logo_url: '/images/payment-logos/esewa.png',
      category: 'wallet',
      processing_fee_percentage: 1.5,
      fixed_fee_amount: 0,
      estimated_processing_time: 'Instant',
      is_recommended: true,
      is_popular: true,
      requires_registration: true,
      setup_required: false,
      verification_required: true,
    },
    khalti: {
      name: 'Khalti',
      display_name: 'Khalti Digital Wallet',
      description: 'Pay with your Khalti digital wallet',
      icon: '💜',
      logo_url: '/images/payment-logos/khalti.png',
      category: 'wallet',
      processing_fee_percentage: 1.5,
      fixed_fee_amount: 0,
      estimated_processing_time: 'Instant',
      is_recommended: true,
      is_popular: true,
      requires_registration: true,
      setup_required: false,
      verification_required: true,
    },
    fonepay: {
      name: 'FonePay',
      display_name: 'FonePay Mobile Banking',
      description: 'Pay directly from your bank account via mobile',
      icon: '📱',
      logo_url: '/images/payment-logos/fonepay.png',
      category: 'bank',
      processing_fee_percentage: 1.0,
      fixed_fee_amount: 0,
      estimated_processing_time: '2-5 minutes',
      is_recommended: false,
      is_popular: false,
      requires_registration: true,
      setup_required: true,
      verification_required: true,
    },
    airwallex: {
      name: 'Airwallex',
      display_name: 'Airwallex Global Payments',
      description: 'Multi-currency payment processing for international transactions',
      icon: '🌍',
      logo_url: '/images/payment-logos/airwallex.png',
      category: 'card',
      processing_fee_percentage: 2.8,
      fixed_fee_amount: 0,
      estimated_processing_time: 'Instant',
      is_recommended: false,
      is_popular: false,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
    bank_transfer: {
      name: 'Bank Transfer',
      display_name: 'Bank Transfer',
      description: 'Transfer directly from your bank account',
      icon: '🏧',
      category: 'bank',
      processing_fee_percentage: 0,
      fixed_fee_amount: 0,
      estimated_processing_time: '1-3 business days',
      is_recommended: false,
      is_popular: false,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
    cod: {
      name: 'Cash on Delivery',
      display_name: 'Cash on Delivery',
      description: 'Pay with cash when your order is delivered',
      icon: '💵',
      category: 'cash',
      processing_fee_percentage: 0,
      fixed_fee_amount: 0,
      estimated_processing_time: 'On delivery',
      is_recommended: false,
      is_popular: true,
      requires_registration: false,
      setup_required: false,
      verification_required: false,
    },
  };

  // Method category metadata
  private readonly CATEGORY_METADATA = {
    card: {
      title: 'Credit & Debit Cards',
      description: 'Pay securely with your cards',
      priority: 1,
    },
    wallet: {
      title: 'Digital Wallets',
      description: 'Quick payment with digital wallets',
      priority: 2,
    },
    bank: {
      title: 'Bank Transfers',
      description: 'Direct transfers from your bank',
      priority: 3,
    },
    cash: {
      title: 'Cash Payment',
      description: 'Pay with cash on delivery',
      priority: 4,
    },
    crypto: {
      title: 'Cryptocurrency',
      description: 'Pay with digital currencies',
      priority: 5,
    },
  };

  constructor(configService?: PaymentGatewayConfigService) {
    this.configService = configService || new PaymentGatewayConfigService();
    logger.info('PaymentMethodService initialized');
  }

  /**
   * Get available payment methods with display information
   */
  async getAvailablePaymentMethods(
    filter: GatewayAvailabilityFilter,
    preferences?: PaymentMethodPreferences
  ): Promise<PaymentMethodDisplay[]> {
    try {
      const cacheKey = this.getCacheKey('methods', { filter, preferences });
      const cached = this.getFromCache<PaymentMethodDisplay[]>(cacheKey);
      if (cached) return cached;

      // Get available gateways from config service
      const availableGateways = await this.configService.getAvailableGateways(filter);

      // Build display methods
      const methods = await this.buildPaymentMethodDisplays(availableGateways, filter, preferences);

      // Apply user preferences
      const filteredMethods = this.applyUserPreferences(methods, preferences);

      // Sort methods
      const sortedMethods = this.sortPaymentMethods(filteredMethods, preferences);

      this.setCache(cacheKey, sortedMethods);
      return sortedMethods;

    } catch (error) {
      logger.error('Error getting available payment methods:', error);
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Get payment methods grouped by category
   */
  async getGroupedPaymentMethods(
    filter: GatewayAvailabilityFilter,
    preferences?: PaymentMethodPreferences
  ): Promise<PaymentMethodGroup[]> {
    try {
      const methods = await this.getAvailablePaymentMethods(filter, preferences);
      
      // Group by category
      const grouped = new Map<string, PaymentMethodDisplay[]>();
      
      methods.forEach(method => {
        const category = method.category;
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(method);
      });

      // Build groups with metadata
      const groups: PaymentMethodGroup[] = [];
      
      for (const [category, categoryMethods] of grouped) {
        const metadata = this.CATEGORY_METADATA[category as keyof typeof this.CATEGORY_METADATA] || {
          title: category,
          description: '',
          priority: 999,
        };

        groups.push({
          category,
          title: metadata.title,
          description: metadata.description,
          methods: categoryMethods,
          priority: metadata.priority,
        });
      }

      // Sort groups by priority
      groups.sort((a, b) => a.priority - b.priority);

      return groups;

    } catch (error) {
      logger.error('Error getting grouped payment methods:', error);
      return [];
    }
  }

  /**
   * Get recommended payment methods
   */
  async getRecommendedPaymentMethods(
    filter: GatewayAvailabilityFilter,
    limit = 3
  ): Promise<PaymentMethodDisplay[]> {
    try {
      const methods = await this.getAvailablePaymentMethods(filter);
      
      return methods
        .filter(method => method.is_recommended && method.availability_status === 'available')
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting recommended payment methods:', error);
      return [];
    }
  }

  /**
   * Get popular payment methods
   */
  async getPopularPaymentMethods(
    filter: GatewayAvailabilityFilter,
    limit = 5
  ): Promise<PaymentMethodDisplay[]> {
    try {
      const methods = await this.getAvailablePaymentMethods(filter);
      
      return methods
        .filter(method => method.is_popular && method.availability_status === 'available')
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting popular payment methods:', error);
      return [];
    }
  }

  /**
   * Get payment method by gateway code
   */
  async getPaymentMethodByGateway(
    gateway: PaymentGateway,
    filter: GatewayAvailabilityFilter
  ): Promise<PaymentMethodDisplay | null> {
    try {
      const methods = await this.getAvailablePaymentMethods(filter);
      return methods.find(method => method.gateway === gateway) || null;

    } catch (error) {
      logger.error('Error getting payment method by gateway:', error);
      return null;
    }
  }

  /**
   * Check if payment method is available
   */
  async isPaymentMethodAvailable(
    gateway: PaymentGateway,
    filter: GatewayAvailabilityFilter
  ): Promise<boolean> {
    try {
      const method = await this.getPaymentMethodByGateway(gateway, filter);
      return method?.availability_status === 'available' || false;

    } catch (error) {
      logger.error('Error checking payment method availability:', error);
      return false;
    }
  }

  /**
   * Get payment method analytics
   */
  async getPaymentMethodAnalytics(
    gateway: PaymentGateway,
    dateRange?: { start: string; end: string }
  ): Promise<PaymentMethodAnalytics | null> {
    try {
      // In real implementation, this would fetch from analytics database
      // For now, return mock analytics data
      return {
        gateway,
        usage_count: Math.floor(Math.random() * 100),
        success_rate: 95.5 + Math.random() * 4,
        average_processing_time_seconds: Math.floor(Math.random() * 10) + 1,
        customer_satisfaction_score: 4.2 + Math.random() * 0.8,
        last_used: new Date().toISOString(),
        failure_reasons: [
          { reason: 'Insufficient funds', count: 5 },
          { reason: 'Network timeout', count: 2 },
          { reason: 'Invalid card', count: 3 },
        ],
      };

    } catch (error) {
      logger.error('Error getting payment method analytics:', error);
      return null;
    }
  }

  /**
   * Build payment method displays from gateways
   */
  private async buildPaymentMethodDisplays(
    gateways: PaymentGateway[],
    filter: GatewayAvailabilityFilter,
    preferences?: PaymentMethodPreferences
  ): Promise<PaymentMethodDisplay[]> {
    try {
      const displays: PaymentMethodDisplay[] = [];

      for (const gateway of gateways) {
        const metadata = this.METHOD_METADATA[gateway];
        if (!metadata) {
          logger.warn('No metadata found for gateway:', gateway);
          continue;
        }

        // Get gateway config for supported currencies
        const config = await this.configService.getGatewayConfig(gateway);
        const supportedCurrencies = config?.supported_currencies || [];

        // Check availability status
        const availabilityStatus = await this.checkAvailabilityStatus(gateway, filter);

        const display: PaymentMethodDisplay = {
          gateway,
          ...metadata,
          supported_currencies: supportedCurrencies,
          availability_status: availabilityStatus.status,
          unavailability_reason: availabilityStatus.reason,
        };

        displays.push(display);
      }

      return displays;

    } catch (error) {
      logger.error('Error building payment method displays:', error);
      return [];
    }
  }

  /**
   * Check payment method availability status
   */
  private async checkAvailabilityStatus(
    gateway: PaymentGateway,
    filter: GatewayAvailabilityFilter
  ): Promise<{ status: 'available' | 'limited' | 'unavailable'; reason?: string }> {
    try {
      // Check if gateway supports the currency
      const supportsCurrency = await this.configService.supportsCurrency(gateway, filter.currency);
      if (!supportsCurrency) {
        return { status: 'unavailable', reason: 'Currency not supported' };
      }

      // Check if gateway supports the country
      if (filter.country) {
        const supportsCountry = await this.configService.supportsCountry(gateway, filter.country);
        if (!supportsCountry) {
          return { status: 'unavailable', reason: 'Not available in your country' };
        }
      }

      // Check gateway credentials
      const config = await this.configService.getGatewayConfig(gateway);
      if (!config) {
        return { status: 'unavailable', reason: 'Gateway configuration missing' };
      }

      const validation = this.configService.validateGatewayCredentials(config);
      if (!validation.hasValidCredentials) {
        return { status: 'unavailable', reason: 'Gateway not properly configured' };
      }

      // Check for test mode
      if (validation.isTestMode) {
        return { status: 'limited', reason: 'Test mode only' };
      }

      // Check for COD availability (special case)
      if (gateway === 'cod') {
        const codAvailable = this.checkCODAvailability(filter);
        if (!codAvailable) {
          return { status: 'unavailable', reason: 'Cash on delivery not available' };
        }
      }

      return { status: 'available' };

    } catch (error) {
      logger.error('Error checking availability status:', error);
      return { status: 'unavailable', reason: 'Availability check failed' };
    }
  }

  /**
   * Check Cash on Delivery availability
   */
  private checkCODAvailability(filter: GatewayAvailabilityFilter): boolean {
    // COD is typically available for authenticated users with valid delivery addresses
    // and in supported countries
    if (filter.isGuest) {
      return false; // Guests can't use COD typically
    }

    // Check if user has COD enabled in their profile
    if (filter.userProfile?.cod_enabled === false) {
      return false;
    }

    // Check if country supports COD
    const codSupportedCountries = ['IN', 'NP', 'BD', 'LK']; // Example countries
    if (filter.country && !codSupportedCountries.includes(filter.country)) {
      return false;
    }

    return true;
  }

  /**
   * Apply user preferences to payment methods
   */
  private applyUserPreferences(
    methods: PaymentMethodDisplay[],
    preferences?: PaymentMethodPreferences
  ): PaymentMethodDisplay[] {
    if (!preferences) return methods;

    let filteredMethods = methods;

    // Filter hidden methods
    if (preferences.hidden_methods.length > 0) {
      filteredMethods = filteredMethods.filter(method => 
        !preferences.hidden_methods.includes(method.gateway)
      );
    }

    // Show only preferred methods if not showing all
    if (!preferences.show_all_methods && preferences.preferred_methods.length > 0) {
      filteredMethods = filteredMethods.filter(method => 
        preferences.preferred_methods.includes(method.gateway)
      );
    }

    return filteredMethods;
  }

  /**
   * Sort payment methods based on preferences
   */
  private sortPaymentMethods(
    methods: PaymentMethodDisplay[],
    preferences?: PaymentMethodPreferences
  ): PaymentMethodDisplay[] {
    if (!preferences?.method_order.length) {
      // Default sorting: recommended first, then by popularity, then alphabetically
      return methods.sort((a, b) => {
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        if (a.is_popular && !b.is_popular) return -1;
        if (!a.is_popular && b.is_popular) return 1;
        return a.display_name.localeCompare(b.display_name);
      });
    }

    // Sort by user-defined order
    return methods.sort((a, b) => {
      const aIndex = preferences.method_order.indexOf(a.gateway);
      const bIndex = preferences.method_order.indexOf(b.gateway);
      
      // If both are in the order list, use the order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the order list, use default sorting
      return a.display_name.localeCompare(b.display_name);
    });
  }

  /**
   * Get payment method fees for display
   */
  getPaymentMethodFees(
    gateway: PaymentGateway,
    amount: number,
    currency: string
  ): { percentageFee: number; fixedFee: number; totalFee: number; displayText: string } {
    const metadata = this.METHOD_METADATA[gateway];
    
    const percentageFee = (metadata?.processing_fee_percentage || 0) / 100 * amount;
    const fixedFee = metadata?.fixed_fee_amount || 0;
    const totalFee = percentageFee + fixedFee;

    let displayText = 'No additional fees';
    
    if (totalFee > 0) {
      if (metadata?.processing_fee_percentage && metadata?.fixed_fee_amount) {
        displayText = `${metadata.processing_fee_percentage}% + ${currency} ${metadata.fixed_fee_amount}`;
      } else if (metadata?.processing_fee_percentage) {
        displayText = `${metadata.processing_fee_percentage}%`;
      } else if (metadata?.fixed_fee_amount) {
        displayText = `${currency} ${metadata.fixed_fee_amount}`;
      }
    }

    return {
      percentageFee: Math.round(percentageFee * 100) / 100,
      fixedFee: Math.round(fixedFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      displayText,
    };
  }

  /**
   * Get payment method processing time estimate
   */
  getProcessingTimeEstimate(gateway: PaymentGateway): {
    text: string;
    category: 'instant' | 'fast' | 'slow';
  } {
    const metadata = this.METHOD_METADATA[gateway];
    const estimatedTime = metadata?.estimated_processing_time || 'Unknown';
    
    let category: 'instant' | 'fast' | 'slow' = 'fast';
    
    if (estimatedTime.toLowerCase().includes('instant')) {
      category = 'instant';
    } else if (estimatedTime.toLowerCase().includes('day') || estimatedTime.toLowerCase().includes('hour')) {
      category = 'slow';
    }

    return {
      text: estimatedTime,
      category,
    };
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `payment_method_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('PaymentMethodService cleanup completed');
  }
}

export default PaymentMethodService;