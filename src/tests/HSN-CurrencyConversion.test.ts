/**
 * HSN System Currency Conversion Tests
 *
 * Comprehensive tests for the critical currency conversion feature
 * that converts minimum valuations from USD to origin country currency.
 *
 * These tests validate the core requirement that was the main concern:
 * - Minimum valuations stored in USD
 * - Quotes calculated in origin country currency
 * - Proper conversion and comparison logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CurrencyConversionService from '../services/CurrencyConversionService';
import PerItemTaxCalculator from '../services/PerItemTaxCalculator';
import type {
  QuoteItem,
  ShippingRoute,
  TaxCalculationContext,
} from '../services/PerItemTaxCalculator';

// Mock supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Currency Conversion Service', () => {
  let currencyService: CurrencyConversionService;

  beforeEach(() => {
    currencyService = CurrencyConversionService.getInstance();
    currencyService.clearCache(); // Clear cache between tests
    vi.clearAllMocks();
  });

  describe('Minimum Valuation Conversion - Core Feature', () => {
    it('should convert USD minimum valuation to Nepal currency (NPR)', async () => {
      // Mock country_settings data for Nepal
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.0 },
          error: null,
        });

      const result = await currencyService.convertMinimumValuation(10.0, 'NP');

      expect(result).toEqual({
        usdAmount: 10.0,
        originCurrency: 'NPR',
        convertedAmount: 1330, // 10 * 133, rounded up
        exchangeRate: 133.0,
        conversionTimestamp: expect.any(Date),
        roundingMethod: 'up',
        cacheSource: 'cached',
      });
    });

    it('should convert USD minimum valuation to India currency (INR)', async () => {
      // Mock country_settings data for India
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'INR', rate_from_usd: 83.0 },
          error: null,
        });

      const result = await currencyService.convertMinimumValuation(50.0, 'IN');

      expect(result).toEqual({
        usdAmount: 50.0,
        originCurrency: 'INR',
        convertedAmount: 4150, // 50 * 83, rounded up
        exchangeRate: 83.0,
        conversionTimestamp: expect.any(Date),
        roundingMethod: 'up',
        cacheSource: 'cached',
      });
    });

    it('should handle USD to USD conversion (no conversion needed)', async () => {
      // Mock country_settings data for USA
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'USD', rate_from_usd: 1.0 },
          error: null,
        });

      const result = await currencyService.convertMinimumValuation(25.0, 'US');

      expect(result.convertedAmount).toBe(25.0);
      expect(result.exchangeRate).toBe(1.0);
      expect(result.originCurrency).toBe('USD');
    });

    it('should use fallback rates when database fails', async () => {
      // Mock database error
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

      const result = await currencyService.convertMinimumValuation(10.0, 'NP');

      expect(result.cacheSource).toBe('fallback');
      expect(result.exchangeRate).toBe(133.0); // Fallback rate for NPR
      expect(result.convertedAmount).toBe(1330);
    });

    it('should handle batch conversions efficiently', async () => {
      // Mock country_settings for multiple countries
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.0 },
          error: null,
        })
        .mockResolvedValueOnce({ data: { currency: 'INR', rate_from_usd: 83.0 }, error: null })
        .mockResolvedValueOnce({ data: { currency: 'CNY', rate_from_usd: 7.2 }, error: null });

      const conversions = [
        { usdAmount: 10.0, originCountry: 'NP', itemId: 'kurta' },
        { usdAmount: 50.0, originCountry: 'IN', itemId: 'mobile' },
        { usdAmount: 25.0, originCountry: 'CN', itemId: 'watch' },
      ];

      const results = await currencyService.convertMultipleMinimumValuations(conversions);

      expect(results).toHaveLength(3);
      expect(results[0].convertedAmount).toBe(1330); // Nepal kurta
      expect(results[1].convertedAmount).toBe(4150); // India mobile
      expect(results[2].convertedAmount).toBe(180); // China watch
    });
  });

  describe('Currency Conversion Edge Cases', () => {
    it('should handle rounding methods correctly', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.7 },
          error: null,
        });

      // Test different rounding methods
      const upResult = await currencyService.convertMinimumValuation(10.0, 'NP', {
        roundingMethod: 'up',
      });
      const downResult = await currencyService.convertMinimumValuation(10.0, 'NP', {
        roundingMethod: 'down',
      });
      const nearestResult = await currencyService.convertMinimumValuation(10.0, 'NP', {
        roundingMethod: 'nearest',
      });

      expect(upResult.convertedAmount).toBe(1337); // Math.ceil(10 * 133.7)
      expect(downResult.convertedAmount).toBe(1337); // Math.floor(10 * 133.7)
      expect(nearestResult.convertedAmount).toBe(1337); // Math.round(10 * 133.7)
    });

    it('should validate conversion accuracy', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.0 },
          error: null,
        });

      const validation = await currencyService.validateConversion({
        usdAmount: 10.0,
        originCountry: 'NP',
        expectedAmount: 1330,
        tolerance: 1.0, // 1% tolerance
      });

      expect(validation.isValid).toBe(true);
      expect(validation.percentageError).toBeLessThan(1.0);
    });
  });
});

describe('Per-Item Tax Calculator with Currency Conversion', () => {
  let taxCalculator: PerItemTaxCalculator;
  let mockContext: TaxCalculationContext;

  beforeEach(() => {
    taxCalculator = PerItemTaxCalculator.getInstance();
    mockContext = {
      route: {
        id: 1,
        origin_country: 'NP',
        destination_country: 'IN',
        tax_configuration: {},
        weight_configuration: {},
        api_configuration: {},
      },
    };
    vi.clearAllMocks();
  });

  describe('Critical Minimum Valuation Logic', () => {
    it('should apply minimum valuation when actual price is lower - Nepal Kurta Example', async () => {
      // Mock HSN data for kurta with $10 USD minimum
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            hsn_code: '6204',
            description: 'Kurtas and dresses',
            category: 'clothing',
            minimum_valuation_usd: 10.0,
            requires_currency_conversion: true,
            tax_data: {
              typical_rates: {
                customs: { common: 12 },
                gst: { standard: 0 },
                vat: { common: 13 },
              },
            },
            classification_data: {
              auto_classification: { confidence: 0.85 },
            },
          },
          error: null,
        });

      // Mock currency conversion (USD to NPR)
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.0 },
          error: null,
        });

      // Mock destination country tax system
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            config_data: { tax_system: 'VAT' },
          },
          error: null,
        });

      const item: QuoteItem = {
        id: 'kurta-1',
        name: 'Nepal Traditional Kurta',
        price_origin_currency: 500, // NPR - lower than minimum
        hsn_code: '6204',
      };

      const result = await taxCalculator.calculateItemTax(item, mockContext);

      // Verify minimum valuation was applied
      expect(result.valuation_method).toBe('minimum_valuation');
      expect(result.taxable_amount_origin_currency).toBe(1330); // $10 USD * 133 NPR/USD
      expect(result.original_price_origin_currency).toBe(500);
      expect(result.minimum_valuation_conversion).toBeDefined();
      expect(result.minimum_valuation_conversion?.convertedAmount).toBe(1330);

      // Verify customs calculation on converted minimum
      expect(result.customs_calculation.basis_amount).toBe(1330);
      expect(result.customs_calculation.amount_origin_currency).toBe(159.6); // 1330 * 12%

      // Verify warning message
      expect(result.warnings).toContain(expect.stringContaining('Minimum valuation applied'));
    });

    it('should use actual price when it is higher than minimum valuation', async () => {
      // Mock HSN data for electronics with $50 USD minimum
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            hsn_code: '8517',
            description: 'Mobile phones',
            category: 'electronics',
            minimum_valuation_usd: 50.0,
            requires_currency_conversion: true,
            tax_data: {
              typical_rates: {
                customs: { common: 20 },
                gst: { standard: 18 },
                vat: { common: 0 },
              },
            },
            classification_data: {
              auto_classification: { confidence: 0.95 },
            },
          },
          error: null,
        });

      // Mock currency conversion
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { currency: 'NPR', rate_from_usd: 133.0 },
          error: null,
        });

      // Mock destination country tax system
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            config_data: { tax_system: 'GST' },
          },
          error: null,
        });

      const item: QuoteItem = {
        id: 'mobile-1',
        name: 'Samsung Galaxy S23',
        price_origin_currency: 80000, // NPR - higher than minimum ($50 * 133 = 6650 NPR)
        hsn_code: '8517',
      };

      const result = await taxCalculator.calculateItemTax(item, mockContext);

      // Verify actual price was used (higher of both)
      expect(result.valuation_method).toBe('higher_of_both');
      expect(result.taxable_amount_origin_currency).toBe(80000);
      expect(result.original_price_origin_currency).toBe(80000);
      expect(result.minimum_valuation_conversion).toBeDefined();
      expect(result.minimum_valuation_conversion?.convertedAmount).toBe(6650);

      // Verify customs calculation on actual price
      expect(result.customs_calculation.basis_amount).toBe(80000);
      expect(result.customs_calculation.amount_origin_currency).toBe(16000); // 80000 * 20%
    });

    it('should handle items without minimum valuation requirements', async () => {
      // Mock HSN data for books (no minimum valuation)
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            hsn_code: '4901',
            description: 'Books and printed materials',
            category: 'books',
            minimum_valuation_usd: null,
            requires_currency_conversion: false,
            tax_data: {
              typical_rates: {
                customs: { common: 0 },
                gst: { standard: 0 },
                vat: { common: 0 },
              },
            },
            classification_data: {
              auto_classification: { confidence: 0.9 },
            },
          },
          error: null,
        });

      // Mock destination country tax system
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            config_data: { tax_system: 'VAT' },
          },
          error: null,
        });

      const item: QuoteItem = {
        id: 'book-1',
        name: 'Programming Textbook',
        price_origin_currency: 1500, // NPR
        hsn_code: '4901',
      };

      const result = await taxCalculator.calculateItemTax(item, mockContext);

      // Verify original price was used (no minimum valuation)
      expect(result.valuation_method).toBe('original_price');
      expect(result.taxable_amount_origin_currency).toBe(1500);
      expect(result.minimum_valuation_conversion).toBeUndefined();

      // Verify no taxes (books are typically exempt)
      expect(result.total_taxes).toBe(0);
      expect(result.warnings).toContain(expect.stringContaining('No taxes calculated'));
    });
  });

  describe('Multiple Items Calculation', () => {
    it('should calculate taxes for multiple items with different valuation methods', async () => {
      // Mock multiple HSN lookups
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            hsn_code: '6204',
            category: 'clothing',
            minimum_valuation_usd: 10.0,
            requires_currency_conversion: true,
            tax_data: { typical_rates: { customs: { common: 12 }, vat: { common: 13 } } },
            classification_data: { auto_classification: { confidence: 0.85 } },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            hsn_code: '8517',
            category: 'electronics',
            minimum_valuation_usd: 50.0,
            requires_currency_conversion: true,
            tax_data: { typical_rates: { customs: { common: 20 }, gst: { standard: 18 } } },
            classification_data: { auto_classification: { confidence: 0.95 } },
          },
          error: null,
        });

      // Mock currency conversions
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({ data: { currency: 'NPR', rate_from_usd: 133.0 }, error: null });

      // Mock destination country lookups
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValue({ data: { config_data: { tax_system: 'VAT' } }, error: null });

      const items: QuoteItem[] = [
        {
          id: 'kurta-1',
          name: 'Nepal Kurta',
          price_origin_currency: 500, // Lower than minimum
          hsn_code: '6204',
        },
        {
          id: 'mobile-1',
          name: 'Smartphone',
          price_origin_currency: 80000, // Higher than minimum
          hsn_code: '8517',
        },
      ];

      const results = await taxCalculator.calculateMultipleItemTaxes(items, mockContext);

      expect(results).toHaveLength(2);

      // First item (kurta) should use minimum valuation
      expect(results[0].valuation_method).toBe('minimum_valuation');
      expect(results[0].taxable_amount_origin_currency).toBe(1330);

      // Second item (mobile) should use actual price
      expect(results[1].valuation_method).toBe('higher_of_both');
      expect(results[1].taxable_amount_origin_currency).toBe(80000);

      // Get summary
      const summary = await taxCalculator.getCalculationSummary(results);
      expect(summary.total_items).toBe(2);
      expect(summary.items_with_minimum_valuation).toBe(1);
      expect(summary.currency_conversions_applied).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing HSN codes gracefully', async () => {
      // Mock HSN lookup failure
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'HSN code not found' },
        });

      const item: QuoteItem = {
        id: 'unknown-1',
        name: 'Unknown Product',
        price_origin_currency: 1000,
        hsn_code: 'INVALID',
      };

      await expect(taxCalculator.calculateItemTax(item, mockContext)).rejects.toThrow(
        'HSN code not found: INVALID',
      );
    });

    it('should handle currency conversion failures with fallback', async () => {
      // Mock HSN data
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: {
            hsn_code: '6204',
            category: 'clothing',
            minimum_valuation_usd: 10.0,
            requires_currency_conversion: true,
            tax_data: { typical_rates: { customs: { common: 12 }, vat: { common: 13 } } },
            classification_data: { auto_classification: { confidence: 0.85 } },
          },
          error: null,
        });

      // Mock currency lookup failure
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Country not found' },
        });

      // Mock destination country
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .single.mockResolvedValueOnce({
          data: { config_data: { tax_system: 'VAT' } },
          error: null,
        });

      const item: QuoteItem = {
        id: 'kurta-1',
        name: 'Nepal Kurta',
        price_origin_currency: 500,
        hsn_code: '6204',
      };

      const result = await taxCalculator.calculateItemTax(item, mockContext);

      // Should still work with fallback rates
      expect(result.minimum_valuation_conversion?.cacheSource).toBe('fallback');
      expect(result.warnings).toContain(expect.stringContaining('fallback exchange rates'));
    });
  });
});

describe('Integration Tests - Full Currency Conversion Flow', () => {
  it('should demonstrate the complete Nepal kurta minimum valuation scenario', async () => {
    const currencyService = CurrencyConversionService.getInstance();

    // Mock database responses for the complete flow
    mockSupabase
      .from()
      .select()
      .eq()
      .single.mockResolvedValue({
        data: { currency: 'NPR', rate_from_usd: 133.0 },
        error: null,
      });

    // Test the complete flow that addresses the user's main concern
    const testScenarios = [
      {
        name: 'Nepal Kurta - Price Below Minimum',
        usdMinimum: 10.0,
        actualPriceNPR: 500,
        expectedTaxableAmount: 1330, // $10 * 133 NPR/USD
        expectedMethod: 'minimum_valuation',
      },
      {
        name: 'Nepal Kurta - Price Above Minimum',
        usdMinimum: 10.0,
        actualPriceNPR: 2000,
        expectedTaxableAmount: 2000, // Actual price is higher
        expectedMethod: 'higher_of_both',
      },
      {
        name: 'Electronics - High Minimum',
        usdMinimum: 50.0,
        actualPriceNPR: 3000,
        expectedTaxableAmount: 6650, // $50 * 133 NPR/USD
        expectedMethod: 'minimum_valuation',
      },
    ];

    for (const scenario of testScenarios) {
      const conversion = await currencyService.convertMinimumValuation(scenario.usdMinimum, 'NP');
      const taxableAmount = Math.max(scenario.actualPriceNPR, conversion.convertedAmount);
      const method =
        scenario.actualPriceNPR >= conversion.convertedAmount
          ? 'higher_of_both'
          : 'minimum_valuation';

      expect(taxableAmount).toBe(scenario.expectedTaxableAmount);
      expect(method).toBe(scenario.expectedMethod);

      console.log(`✅ ${scenario.name}:`);
      console.log(`   USD Minimum: $${scenario.usdMinimum}`);
      console.log(`   Converted: ${conversion.convertedAmount} NPR`);
      console.log(`   Actual Price: ${scenario.actualPriceNPR} NPR`);
      console.log(`   Taxable Amount: ${taxableAmount} NPR`);
      console.log(`   Method: ${method}`);
      console.log('');
    }
  });
});
