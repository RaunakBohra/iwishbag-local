import { describe, test, expect, beforeEach, vi, Mock } from 'vitest';
import { QuoteCalculatorService, QuoteCalculationParams } from '../QuoteCalculatorService';
import { currencyService } from '../CurrencyService';
import { supabase } from '@/integrations/supabase/client';
import { getExchangeRate } from '@/lib/currencyUtils';
import { getShippingCost } from '@/lib/unified-shipping-calculator';

// Mock dependencies
vi.mock('../CurrencyService');
vi.mock('@/integrations/supabase/client');
vi.mock('@/lib/currencyUtils');
vi.mock('@/lib/unified-shipping-calculator');

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
const mockGetExchangeRate = getExchangeRate as Mock;
const mockGetShippingCost = getShippingCost as Mock;

// Helper function to convert old test params to QuoteCalculationParams
function convertToQuoteCalculationParams(oldParams: any): QuoteCalculationParams {
  return {
    items: [{
      id: '1',
      item_price: oldParams.total_item_price || 0,
      item_weight: 1,
      quantity: 1
    }],
    originCountry: 'US',
    destinationCountry: oldParams.destination_country || 'US',
    currency: 'USD',
    sales_tax_price: oldParams.sales_tax_price || 0,
    merchant_shipping_price: oldParams.merchant_shipping_price || 0,
    domestic_shipping: oldParams.domestic_shipping || 0,
    handling_charge: oldParams.handling_charge || 0,
    insurance_amount: oldParams.insurance_amount || 0,
    discount: oldParams.discount || 0,
    customs_percentage: oldParams.customs_percentage,
    countrySettings: {
      code: oldParams.destination_country || 'US',
      currency: mockCurrencyService.getCurrencyForCountrySync(oldParams.destination_country || 'US'),
      rate_from_usd: oldParams.destination_country === 'IN' ? 83 : 1,
      payment_gateway_percent_fee: oldParams.payment_gateway_fee || 0,
      payment_gateway_fixed_fee: 0,
      vat_percent: oldParams.vat || 0
    } as any
  };
}

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
    test('should determine correct quote currency based on destination country', async () => {
      // Setup mocks
      mockGetExchangeRate.mockResolvedValue({ rate: 83, fromCache: false });
      mockGetShippingCost.mockResolvedValue(25);
      
      const params: QuoteCalculationParams = {
        items: [{
          id: '1',
          item_price: 100,
          item_weight: 1,
          quantity: 1
        }],
        originCountry: 'US',
        destinationCountry: 'IN',
        currency: 'USD',
        sales_tax_price: 10,
        merchant_shipping_price: 15,
        domestic_shipping: 5,
        handling_charge: 3,
        insurance_amount: 2,
        discount: 0,
        customs_percentage: 10,
        countrySettings: {
          code: 'IN',
          currency: 'INR',
          rate_from_usd: 83,
          payment_gateway_percent_fee: 2,
          payment_gateway_fixed_fee: 0
        } as any
      };

      const result = await calculatorService.calculateQuote(params);

      expect(result.success).toBe(true);
      expect(result.breakdown?.currency).toBe('INR');
      expect(mockCurrencyService.getCurrencyForCountrySync).toHaveBeenCalledWith('IN');
    });

    test('should default to USD for unknown countries', async () => {
      // Setup mocks
      mockGetExchangeRate.mockResolvedValue({ rate: 1, fromCache: false });
      mockGetShippingCost.mockResolvedValue(10);
      
      const params: QuoteCalculationParams = {
        items: [{
          id: '1',
          item_price: 100,
          item_weight: 1,
          quantity: 1
        }],
        originCountry: 'US',
        destinationCountry: 'UNKNOWN',
        currency: 'USD',
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        discount: 0,
        customs_percentage: 0,
        countrySettings: {
          code: 'UNKNOWN',
          currency: 'USD',
          rate_from_usd: 1,
          payment_gateway_percent_fee: 2,
          payment_gateway_fixed_fee: 0
        } as any
      };

      const result = await calculatorService.calculateQuote(params);

      expect(result.success).toBe(true);
      expect(result.breakdown?.currency).toBe('USD');
    });
  });

  describe('Exchange Rate Application', () => {
    test('should apply exchange rates correctly for INR calculation', async () => {
      // Setup mocks
      mockGetExchangeRate.mockResolvedValue({ rate: 83, fromCache: false });
      mockGetShippingCost.mockResolvedValue(25);
      
      const params: QuoteCalculationParams = {
        items: [{
          id: '1',
          item_price: 100,
          item_weight: 1,
          quantity: 1
        }],
        originCountry: 'US',
        destinationCountry: 'IN',
        currency: 'USD',
        sales_tax_price: 10,
        merchant_shipping_price: 15,
        domestic_shipping: 5,
        handling_charge: 3,
        insurance_amount: 2,
        discount: 0,
        customs_percentage: 10,
        countrySettings: {
          code: 'IN',
          currency: 'INR',
          rate_from_usd: 83,
          payment_gateway_percent_fee: 2.5,
          payment_gateway_fixed_fee: 0,
          vat_percent: 0
        } as any
      };

      const result = await calculatorService.calculateQuote(params);

      // Check that amounts are properly calculated
      expect(result.success).toBe(true);
      expect(result.breakdown?.exchange_rate).toBe(83);
      expect(result.breakdown?.currency).toBe('INR');
      expect(result.breakdown?.final_total).toBeGreaterThan(0);
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
      
      mockGetExchangeRate.mockResolvedValue({ rate: 1, fromCache: false });
      mockGetShippingCost.mockResolvedValue(0);

      const params: QuoteCalculationParams = {
        items: [{
          id: '1',
          item_price: 100,
          item_weight: 1,
          quantity: 1
        }],
        originCountry: 'US',
        destinationCountry: 'IN',
        currency: 'USD',
        sales_tax_price: 0,
        merchant_shipping_price: 0,
        domestic_shipping: 0,
        handling_charge: 0,
        insurance_amount: 0,
        discount: 0,
        customs_percentage: 0,
        countrySettings: {
          code: 'IN',
          currency: 'INR',
          rate_from_usd: 1, // Fallback rate
          payment_gateway_percent_fee: 0,
          payment_gateway_fixed_fee: 0
        } as any
      };

      const result = await calculatorService.calculateQuote(params);

      expect(result.success).toBe(true);
      expect(result.breakdown?.exchange_rate).toBe(1);
    });
  });

  describe('Customs Calculation with Currency', () => {
    test('should calculate customs percentage correctly across currencies', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      // Customs should be 10% of (100 + 10 + 15 + 25) = 15
      const expectedCustoms = (100 + 10 + 15 + 25) * 0.10;
      expect(result.customs_and_ecs).toBe(expectedCustoms);
    });

    test('should handle basis points customs percentage', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      // Should convert 1000 basis points to 10%
      const expectedCustoms = 100 * 0.10;
      expect(result.customs_and_ecs).toBe(expectedCustoms);
    });

    test('should cap customs percentage at 50%', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
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

      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = await calculatorService.calculateQuote(params);

      // Shipping should be calculated: (500 + 100 * 2) = 700 INR converted to USD = 700/83
      const expectedShippingUSD = 700 / 83;
      expect(result.international_shipping).toBeCloseTo(expectedShippingUSD, 2);
    });
  });

  describe('Currency Breakdown and Display', () => {
    test('should generate correct breakdown with currency information', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.currency).toBe('INR');
      expect(result.breakdown.exchange_rate).toBe(1); // Sync version defaults to 1
      expect(result.breakdown.total_item_price).toBe(100);
      expect(result.breakdown.final_total).toBe(result.final_total);
    });

    test('should maintain precision in currency conversions', async () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = await calculatorService.calculateQuote(params);

      // Should maintain precision: 99.99 * 83 = 8299.17
      const expectedTotal = 99.99 * 83;
      expect(result.final_total).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid currency codes gracefully', () => {
      mockCurrencyService.getCurrencyForCountrySync.mockReturnValue('INVALID');

      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      // Should default to reasonable values
      expect(result.currency).toBe('INVALID');
      expect(result.exchange_rate).toBe(1);
      expect(result.final_total).toBe(100);
    });

    test('should handle zero amounts correctly', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      expect(result.final_total).toBe(0);
      expect(result.customs_and_ecs).toBe(0);
    });

    test('should handle negative discounts correctly', () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      // Final total should be 100 - (-10) = 110
      expect(result.final_total).toBe(110);
    });
  });

  describe('Caching and Performance', () => {
    test('should cache exchange rate queries for performance', async () => {
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      // First call
      await calculatorService.calculateQuote(params);
      
      // Second call - should use cache
      await calculatorService.calculateQuote(params);

      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex multi-component quote with currency conversion', async () => {
      // Realistic scenario: US product shipped to India
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = await calculatorService.calculateQuote(params);

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
      const oldParams = {
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

      const params = convertToQuoteCalculationParams(oldParams);
      const result = calculatorService.calculateQuote(params);

      // Should calculate in USD with no conversion
      expect(result.currency).toBe('USD');
      expect(result.exchange_rate).toBe(1);
      
      const expectedTotal = 100 + 8.50 + 12.99 + 0 + 0 + 8.99 + 3.00 + 2.50 + 4.20 - 5.00;
      expect(result.final_total).toBeCloseTo(expectedTotal, 2);
    });
  });
});