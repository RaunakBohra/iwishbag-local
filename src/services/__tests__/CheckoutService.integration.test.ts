/**
 * CheckoutService Integration Tests
 * Tests the enhanced checkout flow with regional pricing integration
 */

import { CheckoutService, AddonServiceSelection } from '../CheckoutService';

// Mock dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue({
      data: { id: 'test-order-id' },
      error: null
    }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }
}));

jest.mock('@/services/CurrencyService', () => ({
  currencyService: {
    getCurrencyForCountry: jest.fn().mockResolvedValue('USD'),
    getExchangeRateByCurrency: jest.fn().mockResolvedValue(1.0),
  }
}));

jest.mock('@/services/AddonServicesService', () => ({
  addonServicesService: {
    getRecommendedServices: jest.fn().mockResolvedValue({
      success: true,
      recommendations: [
        {
          service_key: 'package_protection',
          service_name: 'Package Protection',
          pricing: {
            calculated_amount: 5.99,
            pricing_tier: 'regional'
          },
          recommendation_score: 0.8
        }
      ]
    })
  }
}));

jest.mock('@/services/EnhancedGeoLocationService', () => ({
  EnhancedGeoLocationService: {
    getCountryInfo: jest.fn().mockResolvedValue({
      country: 'US',
      source: 'ip',
      confidence: 0.9,
      pricingInfo: {
        hasRegionalPricing: true
      }
    })
  }
}));

describe('CheckoutService Integration Tests', () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    checkoutService = CheckoutService.getInstance();
    jest.clearAllMocks();
  });

  describe('Order Summary Calculation with Addon Services', () => {
    const mockCartItems = [
      {
        quote: {
          id: 'quote-1',
          display_id: 'Q001',
          final_total_origincurrency: 100,
          customer_currency: 'USD',
          origin_country: 'US',
          destination_country: 'IN',
          calculation_data: {
            calculation_steps: {
              items_subtotal: 80,
              shipping_cost: 15,
              customs_duty: 5,
              handling_fee: 0
            }
          }
        }
      }
    ];

    const mockAddonServices: AddonServiceSelection[] = [
      {
        service_key: 'package_protection',
        service_name: 'Package Protection',
        calculated_amount: 5.99,
        pricing_tier: 'regional',
        recommendation_score: 0.8
      },
      {
        service_key: 'express_processing',
        service_name: 'Express Processing',
        calculated_amount: 12.50,
        pricing_tier: 'country',
        recommendation_score: 0.6
      }
    ];

    it('should calculate order summary without addon services', async () => {
      const summary = await checkoutService.calculateOrderSummary(
        mockCartItems,
        'IN'
      );

      expect(summary).toMatchObject({
        itemsTotal: expect.any(Number),
        shippingTotal: expect.any(Number),
        taxesTotal: expect.any(Number),
        serviceFeesTotal: expect.any(Number),
        addonServicesTotal: 0,
        finalTotal: expect.any(Number),
        currency: 'USD'
      });

      expect(summary.addonServices).toBeUndefined();
    });

    it('should calculate order summary with addon services', async () => {
      const summary = await checkoutService.calculateOrderSummary(
        mockCartItems,
        'IN',
        mockAddonServices
      );

      expect(summary).toMatchObject({
        itemsTotal: expect.any(Number),
        shippingTotal: expect.any(Number),
        taxesTotal: expect.any(Number),
        serviceFeesTotal: expect.any(Number),
        addonServicesTotal: 18.49, // 5.99 + 12.50
        finalTotal: expect.any(Number),
        currency: 'USD',
        addonServices: mockAddonServices
      });

      expect(summary.finalTotal).toBeGreaterThan(100); // Base total + addon services
    });

    it('should handle currency conversion for addon services', async () => {
      // Mock currency service to return different exchange rate
      const currencyService = require('@/services/CurrencyService').currencyService;
      currencyService.getCurrencyForCountry.mockResolvedValue('INR');
      currencyService.getExchangeRateByCurrency.mockResolvedValueOnce(82.5); // USD to INR
      currencyService.getExchangeRateByCurrency.mockResolvedValueOnce(82.5); // USD to INR for addons

      const summary = await checkoutService.calculateOrderSummary(
        mockCartItems,
        'IN',
        mockAddonServices
      );

      expect(summary.currency).toBe('INR');
      expect(summary.addonServicesTotal).toBeGreaterThan(1000); // ~18.49 * 82.5
    });
  });

  describe('Addon Services Recommendations', () => {
    const mockCartItems = [
      {
        quote: {
          id: 'quote-1',
          final_total_origincurrency: 250
        }
      }
    ];

    it('should get addon service recommendations for checkout', async () => {
      const recommendations = await checkoutService.getRecommendedAddonServices(
        mockCartItems,
        'US',
        'user-123'
      );

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toMatchObject({
        service_key: 'package_protection',
        service_name: 'Package Protection',
        calculated_amount: 5.99,
        pricing_tier: 'regional',
        recommendation_score: 0.8
      });
    });

    it('should determine correct customer tier based on order value', async () => {
      const highValueItems = [
        {
          quote: { id: 'quote-1', final_total_origincurrency: 600 }
        }
      ];

      await checkoutService.getRecommendedAddonServices(
        highValueItems,
        'US'
      );

      // The service should have been called with 'vip' tier for $600+ order
      const addonServicesService = require('@/services/AddonServicesService').addonServicesService;
      expect(addonServicesService.getRecommendedServices).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_tier: 'vip'
        }),
        'USD'
      );
    });

    it('should handle recommendation service failures gracefully', async () => {
      const addonServicesService = require('@/services/AddonServicesService').addonServicesService;
      addonServicesService.getRecommendedServices.mockResolvedValueOnce({
        success: false,
        error: 'Service unavailable'
      });

      const recommendations = await checkoutService.getRecommendedAddonServices(
        mockCartItems,
        'US'
      );

      expect(recommendations).toEqual([]);
    });
  });

  describe('Addon Services Validation', () => {
    const mockValidServices: AddonServiceSelection[] = [
      {
        service_key: 'package_protection',
        service_name: 'Package Protection',
        calculated_amount: 5.99,
        pricing_tier: 'regional'
      }
    ];

    it('should validate valid addon services', async () => {
      const result = await checkoutService.validateAddonServices(
        mockValidServices,
        'US'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid pricing amounts', async () => {
      const invalidServices: AddonServiceSelection[] = [
        {
          service_key: 'package_protection',
          service_name: 'Package Protection',
          calculated_amount: -5.99, // Invalid negative amount
          pricing_tier: 'regional'
        }
      ];

      const result = await checkoutService.validateAddonServices(
        invalidServices,
        'US'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid pricing for Package Protection');
    });
  });

  describe('Order Creation with Addon Services', () => {
    const mockOrderRequest = {
      items: [
        {
          quote: {
            id: 'quote-1',
            display_id: 'Q001',
            final_total_origincurrency: 100,
            customer_currency: 'USD'
          }
        }
      ],
      address: {
        id: 'addr-1',
        destination_country: 'US'
      },
      paymentMethod: 'stripe',
      orderSummary: {
        itemsTotal: 100,
        shippingTotal: 15,
        taxesTotal: 5,
        serviceFeesTotal: 2,
        addonServicesTotal: 5.99,
        finalTotal: 127.99,
        currency: 'USD'
      },
      userId: 'user-123',
      addonServices: [
        {
          service_key: 'package_protection',
          service_name: 'Package Protection',
          calculated_amount: 5.99,
          pricing_tier: 'regional'
        }
      ]
    };

    it('should create order with addon services', async () => {
      const result = await checkoutService.createOrder(mockOrderRequest);

      expect(result).toMatchObject({
        id: expect.any(String),
        orderNumber: expect.any(String),
        status: 'pending_payment',
        paymentRequired: true
      });
    });

    it('should store addon services in order data', async () => {
      await checkoutService.createOrder(mockOrderRequest);

      const supabase = require('@/integrations/supabase/client').supabase;
      expect(supabase.from).toHaveBeenCalledWith('orders');
      
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.order_data).toMatchObject({
        addonServices: mockOrderRequest.addonServices,
        regional_pricing_used: true
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty cart gracefully', async () => {
      const summary = await checkoutService.calculateOrderSummary([], 'US');

      expect(summary).toMatchObject({
        itemsTotal: 0,
        shippingTotal: 0,
        taxesTotal: 0,
        serviceFeesTotal: 0,
        addonServicesTotal: 0,
        finalTotal: 0,
        currency: 'USD'
      });
    });

    it('should handle missing country information', async () => {
      const mockCartItems = [
        {
          quote: {
            id: 'quote-1',
            final_total_origincurrency: 100,
            // Missing country information
          }
        }
      ];

      const summary = await checkoutService.calculateOrderSummary(
        mockCartItems,
        '' // Empty destination country
      );

      expect(summary.currency).toBe('USD'); // Should fallback to USD
    });

    it('should handle addon services with zero amount', async () => {
      const zeroAmountServices: AddonServiceSelection[] = [
        {
          service_key: 'free_service',
          service_name: 'Free Service',
          calculated_amount: 0,
          pricing_tier: 'global'
        }
      ];

      const mockCartItems = [
        {
          quote: {
            id: 'quote-1',
            final_total_origincurrency: 100
          }
        }
      ];

      const summary = await checkoutService.calculateOrderSummary(
        mockCartItems,
        'US',
        zeroAmountServices
      );

      expect(summary.addonServicesTotal).toBe(0);
      expect(summary.addonServices).toEqual(zeroAmountServices);
    });
  });
});