import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QuoteCalculatorService } from '../QuoteCalculatorService';
import { currencyService } from '../CurrencyService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('../CurrencyService');
vi.mock('@/integrations/supabase/client');

type MockCurrencyService = {
  getCurrencyForCountrySync: ReturnType<typeof vi.fn>;
  getCurrencySymbol: ReturnType<typeof vi.fn>;
  formatAmount: ReturnType<typeof vi.fn>;
};

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
};

const mockCurrencyService = currencyService as unknown as MockCurrencyService;
const mockSupabase = supabase as unknown as MockSupabaseClient;

describe('QuoteCalculatorService Currency Handling', () => {
  let calculatorService: QuoteCalculatorService;

  beforeEach(() => {
    calculatorService = QuoteCalculatorService.getInstance();
    vi.clearAllMocks();

    // Setup currency service mocks
    mockCurrencyService.getCurrencyForCountrySync.mockImplementation((country) => {
      const mapping: Record<string, string> = {
        'US': 'USD',
        'IN': 'INR',
        'NP': 'NPR',
        'GB': 'GBP',
        'JP': 'JPY'
      };
      return mapping[country] || 'USD';
    });

    // Mock Supabase queries
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { rate_from_usd: 83 }, // 1 USD = 83 INR
            error: null
          })
        })
      })
    });
  });

  describe('Currency Determination', () => {
    test('should determine correct quote currency based on destination country', () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 100,
        sales_tax_price: 10,
        merchant_shipping_price: 15,
        international_shipping: 25,
        customs_percentage: 10,
        domestic_shipping: 5,
        handling_charge: 3,
        insurance_amount: 2,
        payment_gateway_fee: 4,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      expect(result.currency).toBe('INR');
      expect(mockCurrencyService.getCurrencyForCountrySync).toHaveBeenCalledWith('IN');
    });

    test('should default to USD for unknown countries', () => {
      const params = {
        destination_country: 'UNKNOWN',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      expect(result.currency).toBe('USD');
    });
  });

  describe('Exchange Rate Application', () => {
    test('should apply exchange rates correctly for INR calculation', async () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 100, // USD
        sales_tax_price: 10,   // USD
        merchant_shipping_price: 15,
        international_shipping: 25,
        customs_percentage: 10,
        domestic_shipping: 5,
        handling_charge: 3,
        insurance_amount: 2,
        payment_gateway_fee: 4,
        discount: 0,
        vat: 0
      };

      const result = await calculatorService.calculateQuoteAsync(params);

      // With exchange rate of 83, amounts should be converted
      const expectedTotal = (100 + 10 + 15 + 25 + 16 + 5 + 3 + 2 + 4) * 83; // 16 is customs (10% of 100+10+15+25)
      expect(result.final_total).toBeCloseTo(expectedTotal, 0);
      expect(result.exchange_rate).toBe(83);
      expect(result.currency).toBe('INR');
    });

    test('should handle no exchange rate gracefully (default to 1)', async () => {
      // Mock no exchange rate found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const params = {
        destination_country: 'IN',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = await calculatorService.calculateQuoteAsync(params);

      expect(result.exchange_rate).toBe(1);
      expect(result.final_total).toBe(100); // No conversion
    });
  });

  describe('Customs Calculation with Currency', () => {
    test('should calculate customs percentage correctly across currencies', () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 100,
        sales_tax_price: 10,
        merchant_shipping_price: 15,
        international_shipping: 25,
        customs_percentage: 10, // 10%
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Customs should be 10% of (100 + 10 + 15 + 25) = 15
      const expectedCustoms = (100 + 10 + 15 + 25) * 0.10;
      expect(result.customs_and_ecs).toBe(expectedCustoms);
    });

    test('should handle basis points customs percentage', () => {
      const params = {
        destination_country: 'US',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 1000, // 1000 basis points = 10%
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Should convert 1000 basis points to 10%
      const expectedCustoms = 100 * 0.10;
      expect(result.customs_and_ecs).toBe(expectedCustoms);
    });

    test('should cap customs percentage at 50%', () => {
      const params = {
        destination_country: 'US',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 75, // 75%, should be capped at 50%
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Should be capped at 50%
      const expectedCustoms = 100 * 0.50;
      expect(result.customs_and_ecs).toBe(expectedCustoms);
    });
  });

  describe('Multi-Currency Shipping Calculations', () => {
    test('should handle shipping costs in different currencies', async () => {
      // Mock shipping route with different currency
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'shipping_routes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      base_shipping_cost: 500, // INR
                      cost_per_kg: 100,        // INR per kg
                      exchange_rate: 83        // USD to INR
                    },
                    error: null
                  })
                })
              })
            })
          };
        }
        // For country_settings
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { rate_from_usd: 83 },
                error: null
              })
            })
          })
        };
      });

      const params = {
        origin_country: 'US',
        destination_country: 'IN',
        total_item_price: 100,
        total_weight_kg: 2,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = await calculatorService.calculateQuoteAsync(params);

      // Shipping should be calculated: (500 + 100 * 2) = 700 INR converted to USD = 700/83
      const expectedShippingUSD = 700 / 83;
      expect(result.international_shipping).toBeCloseTo(expectedShippingUSD, 2);
    });
  });

  describe('Currency Breakdown and Display', () => {
    test('should generate correct breakdown with currency information', () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 100,
        sales_tax_price: 10,
        merchant_shipping_price: 15,
        international_shipping: 25,
        customs_percentage: 10,
        domestic_shipping: 5,
        handling_charge: 3,
        insurance_amount: 2,
        payment_gateway_fee: 4,
        discount: 5,
        vat: 2
      };

      const result = calculatorService.calculateQuote(params);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.currency).toBe('INR');
      expect(result.breakdown.exchange_rate).toBe(1); // Sync version defaults to 1
      expect(result.breakdown.total_item_price).toBe(100);
      expect(result.breakdown.final_total).toBe(result.final_total);
    });

    test('should maintain precision in currency conversions', async () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 99.99,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = await calculatorService.calculateQuoteAsync(params);

      // Should maintain precision: 99.99 * 83 = 8299.17
      const expectedTotal = 99.99 * 83;
      expect(result.final_total).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid currency codes gracefully', () => {
      mockCurrencyService.getCurrencyForCountrySync.mockReturnValue('INVALID');

      const params = {
        destination_country: 'INVALID_COUNTRY',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Should default to reasonable values
      expect(result.currency).toBe('INVALID');
      expect(result.exchange_rate).toBe(1);
      expect(result.final_total).toBe(100);
    });

    test('should handle zero amounts correctly', () => {
      const params = {
        destination_country: 'US',
        total_item_price: 0,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      expect(result.final_total).toBe(0);
      expect(result.customs_and_ecs).toBe(0);
    });

    test('should handle negative discounts correctly', () => {
      const params = {
        destination_country: 'US',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: -10, // Negative discount = surcharge
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Final total should be 100 - (-10) = 110
      expect(result.final_total).toBe(110);
    });
  });

  describe('Caching and Performance', () => {
    test('should cache exchange rate queries for performance', async () => {
      const params = {
        destination_country: 'IN',
        total_item_price: 100,
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        international_shipping: 0,
        customs_percentage: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        payment_gateway_fee: 0,
        discount: 0,
        vat: 0
      };

      // First call
      await calculatorService.calculateQuoteAsync(params);
      
      // Second call - should use cache
      await calculatorService.calculateQuoteAsync(params);

      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex multi-component quote with currency conversion', async () => {
      // Realistic scenario: US product shipped to India
      const params = {
        origin_country: 'US',
        destination_country: 'IN',
        total_item_price: 299.99,  // iPhone case
        sales_tax_price: 24.00,    // US sales tax
        merchant_shipping_price: 15.99, // US domestic shipping
        international_shipping: 45.00,  // International shipping
        customs_percentage: 18,    // India customs
        domestic_shipping: 12.50,  // India domestic delivery
        handling_charge: 5.00,     // Handling
        insurance_amount: 8.50,    // Insurance
        payment_gateway_fee: 12.80, // Gateway fee (usually % based)
        discount: 30.00,           // Promotional discount
        vat: 0,                    // No additional VAT
        total_weight_kg: 0.5
      };

      const result = await calculatorService.calculateQuoteAsync(params);

      // Verify all components are calculated
      expect(result.total_item_price).toBeCloseTo(299.99 * 83, 0);
      expect(result.sales_tax_price).toBeCloseTo(24.00 * 83, 0);
      expect(result.international_shipping).toBeCloseTo(45.00 * 83, 0);
      
      // Customs should be 18% of (item + tax + merchant shipping + intl shipping)
      const customsBase = 299.99 + 24.00 + 15.99 + 45.00;
      const expectedCustoms = customsBase * 0.18 * 83;
      expect(result.customs_and_ecs).toBeCloseTo(expectedCustoms, 0);

      // Final total should be sum of all components minus discount
      const expectedTotal = (299.99 + 24.00 + 15.99 + 45.00 + (customsBase * 0.18) + 12.50 + 5.00 + 8.50 + 12.80 - 30.00) * 83;
      expect(result.final_total).toBeCloseTo(expectedTotal, 0);

      expect(result.currency).toBe('INR');
      expect(result.exchange_rate).toBe(83);
    });

    test('should handle same-country quote (no currency conversion)', () => {
      const params = {
        destination_country: 'US',
        total_item_price: 100,
        sales_tax_price: 8.50,
        merchant_shipping_price: 12.99,
        international_shipping: 0, // No international shipping for domestic
        customs_percentage: 0,     // No customs for domestic
        domestic_shipping: 8.99,
        handling_charge: 3.00,
        insurance_amount: 2.50,
        payment_gateway_fee: 4.20,
        discount: 5.00,
        vat: 0
      };

      const result = calculatorService.calculateQuote(params);

      // Should calculate in USD with no conversion
      expect(result.currency).toBe('USD');
      expect(result.exchange_rate).toBe(1);
      
      const expectedTotal = 100 + 8.50 + 12.99 + 0 + 0 + 8.99 + 3.00 + 2.50 + 4.20 - 5.00;
      expect(result.final_total).toBeCloseTo(expectedTotal, 2);
    });
  });
});