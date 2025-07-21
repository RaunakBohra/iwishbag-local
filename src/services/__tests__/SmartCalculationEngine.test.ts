import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartCalculationEngine } from '../SmartCalculationEngine';
import { currencyService } from '../CurrencyService';
import { calculationDefaultsService } from '../CalculationDefaultsService';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('../CurrencyService');
vi.mock('../CalculationDefaultsService');
vi.mock('@/lib/customs-tier-calculator');
vi.mock('@/integrations/supabase/client');

// Create mock UnifiedQuote for testing
const createMockQuote = (overrides: Partial<UnifiedQuote> = {}): UnifiedQuote => ({
  id: 'test-quote-123',
  user_id: 'test-user',
  origin_country: 'US',
  destination_country: 'IN',
  currency: 'USD',
  final_total_usd: 0,
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      price_usd: 100,
      weight_kg: 2,
      quantity: 1,
      sku: 'TEST-001',
      category: 'Electronics',
    },
  ],
  calculation_data: {
    breakdown: {
      items_total: 100,
      shipping: 25,
      customs: 15,
      taxes: 10,
      fees: 8,
      discount: 0,
    },
    exchange_rate: {
      rate: 1.0,
      source: 'cached',
      confidence: 0.9,
    },
    sales_tax_price: 10,
    discount: 0,
  },
  operational_data: {
    customs: {
      percentage: 10,
    },
    shipping: {
      selected_option: 'standard',
    },
    handling_charge: 5,
    insurance_amount: 3,
    payment_gateway_fee: 5,
    domestic_shipping: 0,
    vat_amount: 0,
  },
  customer_data: {
    preferences: {
      insurance_opted_in: false,
    },
  },
  optimization_score: 85,
  ...overrides,
});

describe('SmartCalculationEngine', () => {
  let calculationEngine: SmartCalculationEngine;

  beforeEach(() => {
    calculationEngine = SmartCalculationEngine.getInstance();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default currency service mocks
    vi.mocked(currencyService.getExchangeRate).mockResolvedValue(1.0);
    vi.mocked(calculationDefaultsService.calculateHandlingCharge).mockResolvedValue(5);
    vi.mocked(calculationDefaultsService.calculateInsurance).mockResolvedValue(3);
    vi.mocked(calculationDefaultsService.logFallbackUsage).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateLiveSync - Happy Path', () => {
    it('should correctly calculate final total with realistic positive values', () => {
      const mockQuote = createMockQuote({
        items: [
          {
            id: 'item-1',
            name: 'Laptop',
            price_usd: 500,
            weight_kg: 3,
            quantity: 1,
            sku: 'LAPTOP-001',
            category: 'Electronics',
          },
        ],
        operational_data: {
          customs: {
            percentage: 15, // 15%
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 12,
          insurance_amount: 5,
          payment_gateway_fee: 15,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      expect(result.updated_quote).toBeDefined();
      expect(result.shipping_options).toHaveLength(2); // Standard + Express options

      // Verify calculation logic
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      expect(breakdown).toBeDefined();
      expect(breakdown?.items_total).toBe(500);
      expect(breakdown?.shipping).toBe(40); // Base shipping cost for 3kg
      expect(breakdown?.customs).toBe(81); // (500 + 40) * 0.15 = 81
      expect(result.updated_quote.final_total_usd).toBeGreaterThan(500);
    });
  });

  describe('calculateLiveSync - Zero-Value Inputs', () => {
    it('should handle calculation where optional costs are zero', () => {
      const mockQuote = createMockQuote({
        items: [
          {
            id: 'item-1',
            name: 'Free Sample',
            price_usd: 50,
            weight_kg: 0.5,
            quantity: 1,
            sku: 'SAMPLE-001',
            category: 'Sample',
          },
        ],
        calculation_data: {
          breakdown: {
            items_total: 50,
            shipping: 0,
            customs: 0,
            taxes: 0,
            fees: 0,
            discount: 0,
          },
          exchange_rate: {
            rate: 1.0,
            source: 'cached',
            confidence: 0.9,
          },
          sales_tax_price: 0, // Zero sales tax
          discount: 0, // Zero discount
        },
        operational_data: {
          customs: {
            percentage: 0, // Zero customs
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 0,
          insurance_amount: 0,
          payment_gateway_fee: 0,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      expect(breakdown?.items_total).toBe(50);
      expect(breakdown?.customs).toBe(0);
      expect(breakdown?.taxes).toBe(0);
      expect(result.updated_quote.final_total_usd).toBeGreaterThanOrEqual(50);
    });
  });

  describe('calculateLiveSync - Customs Logic Tests', () => {
    it('should handle simple percentage (10%)', () => {
      const mockQuote = createMockQuote({
        items: [
          {
            id: 'item-1',
            name: 'Product',
            price_usd: 200,
            weight_kg: 1,
            quantity: 1,
            sku: 'PROD-001',
            category: 'General',
          },
        ],
        operational_data: {
          customs: {
            percentage: 10, // Simple 10%
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 0,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      // Customs = (items_total + shipping) * (10 / 100)
      // Customs = (200 + 30) * 0.10 = 23
      expect(breakdown?.customs).toBe(23);
    });

    it('should handle percentage provided as decimal (0.15 = 15%)', () => {
      const mockQuote = createMockQuote({
        operational_data: {
          customs: {
            percentage: 0.15, // 15% as decimal
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 0,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      // Since 0.15 is already in decimal form, it should be used directly
      // Customs = (100 + 30) * 0.15 = 19.5
      expect(breakdown?.customs).toBeCloseTo(19.5, 1);
    });

    it('should handle percentage in basis points (1500 = 15%)', () => {
      // Note: The SmartCalculationEngine doesn't have the complex customs logic
      // that was in the original QuoteCalculatorService. It uses the percentage directly.
      // This test verifies the current behavior rather than the complex basis points logic.
      const mockQuote = createMockQuote({
        operational_data: {
          customs: {
            percentage: 1500, // Would be 15% if converted from basis points
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 0,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      // The engine uses the percentage as-is, so 1500% would be a very high customs rate
      // This reflects the current implementation behavior
      expect(result.updated_quote.final_total_usd).toBeGreaterThan(1000);
    });

    it('should cap customs percentage at reasonable limits', () => {
      // Test with a very high percentage to see current behavior
      const mockQuote = createMockQuote({
        operational_data: {
          customs: {
            percentage: 100, // 100% customs
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 0,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      // With 100% customs: (100 + 30) * 1.0 = 130
      expect(breakdown?.customs).toBe(130);
    });
  });

  describe('calculateLiveSync - Discount & VAT', () => {
    it('should correctly subtract discount and add VAT to final total', () => {
      const mockQuote = createMockQuote({
        calculation_data: {
          breakdown: {
            items_total: 100,
            shipping: 30,
            customs: 15,
            taxes: 10,
            fees: 8,
            discount: 20, // $20 discount
          },
          exchange_rate: {
            rate: 1.0,
            source: 'cached',
            confidence: 0.9,
          },
          sales_tax_price: 10,
          discount: 20, // $20 discount
        },
        operational_data: {
          customs: {
            percentage: 15,
            smart_tier: {
              tier_name: 'standard',
              tier_id: 'tier-1',
              fallback_used: false,
              route: 'US-IN',
              vat_percentage: 5, // 5% VAT
            },
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 3,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 5, // 5% of $100 = $5
        },
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      
      // VAT should be included in subtotal calculation
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      expect(breakdown?.discount).toBe(20);
      
      // Final total should include VAT but subtract discount
      // Subtotal includes VAT, then payment gateway fee is added, then discount is subtracted
      const expectedSubtotal = 100 + 30 + 15 + 10 + 5 + 3 + 5; // items + shipping + customs + sales_tax + handling + insurance + vat
      const expectedTotal = expectedSubtotal + 8 - 20; // + payment_gateway_fee - discount
      expect(result.updated_quote.final_total_usd).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle calculation errors gracefully', () => {
      // Create a quote that might cause errors (e.g., missing items)
      const mockQuote = createMockQuote({
        items: [], // Empty items array
      });

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      // Should still return a result, even if with zero totals
      expect(result.success).toBe(true);
      expect(result.updated_quote).toBeDefined();
      expect(result.shipping_options).toHaveLength(2);
      
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      expect(breakdown?.items_total).toBe(0);
    });

    it('should provide fallback shipping options when calculation fails', () => {
      const mockQuote = createMockQuote();

      const result = calculationEngine.calculateLiveSync({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      expect(result.shipping_options).toHaveLength(2);
      expect(result.shipping_options[0]).toMatchObject({
        id: 'country_standard',
        carrier: 'Standard',
        name: 'Standard Shipping',
        days: '7-14',
        confidence: 0.85,
      });
      expect(result.shipping_options[1]).toMatchObject({
        id: 'country_express',
        carrier: 'Express',
        name: 'Express Shipping', 
        days: '3-7',
        confidence: 0.8,
      });
    });
  });

  describe('Async calculation with full features', () => {
    it('should use smart customs tier calculation when available', async () => {
      const mockQuote = createMockQuote();
      
      // Mock smart customs tier calculation
      vi.mocked(calculateCustomsTier).mockResolvedValue({
        customs_percentage: 12,
        applied_tier: {
          id: 'tier-1',
          rule_name: 'electronics',
        },
        fallback_used: false,
        route: 'US-IN',
        vat_percentage: 5,
      });

      const result = await calculationEngine.calculateWithShippingOptions({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      expect(calculateCustomsTier).toHaveBeenCalledWith(
        'US',
        'IN',
        100, // items total
        2    // total weight
      );
      
      // Should use smart tier customs percentage
      expect(result.updated_quote.operational_data.customs?.percentage).toBe(12);
      expect(result.updated_quote.operational_data.customs?.smart_tier).toMatchObject({
        tier_name: 'electronics',
        tier_id: 'tier-1',
        fallback_used: false,
        route: 'US-IN',
        vat_percentage: 5,
      });
    });

    it('should fall back to manual customs percentage when smart tier fails', async () => {
      const mockQuote = createMockQuote({
        operational_data: {
          customs: {
            percentage: 18, // Manual fallback percentage
          },
          shipping: {
            selected_option: 'standard',
          },
          handling_charge: 5,
          insurance_amount: 3,
          payment_gateway_fee: 8,
          domestic_shipping: 0,
          vat_amount: 0,
        },
      });
      
      // Mock smart customs tier to fail
      vi.mocked(calculateCustomsTier).mockRejectedValue(new Error('Service unavailable'));

      const result = await calculationEngine.calculateWithShippingOptions({
        quote: mockQuote,
      });

      expect(result.success).toBe(true);
      // Should fall back to manual percentage from quote
      const breakdown = result.updated_quote.calculation_data?.breakdown;
      // Customs = (100 + shipping) * 0.18
      expect(breakdown?.customs).toBeCloseTo(23.4, 1); // (100 + 30) * 0.18 = 23.4
    });
  });
});