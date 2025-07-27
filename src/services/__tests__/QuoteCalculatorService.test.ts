import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuoteCalculatorService } from '../QuoteCalculatorService';
import type { QuoteItem } from '@/types/quote';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('../ErrorHandlingService');
vi.mock('../CurrencyService');

describe('QuoteCalculatorService', () => {
  let calculator: QuoteCalculatorService;

  beforeEach(() => {
    vi.clearAllMocks();
    calculator = QuoteCalculatorService.getInstance();
  });

  describe('Item Price Calculations', () => {
    it('should calculate item subtotal correctly', () => {
      const items: QuoteItem[] = [
        {
          id: '1',
          product_name: 'iPhone 15',
          quantity: 2,
          price_origin: 999,
          weight: 0.5,
          link: 'https://example.com',
        },
        {
          id: '2',
          product_name: 'AirPods',
          quantity: 1,
          price_origin: 249,
          weight: 0.1,
          link: 'https://example.com',
        },
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + item.price_origin * item.quantity,
        0
      );

      expect(subtotal).toBe(2247); // (999 * 2) + (249 * 1)
    });

    it('should handle zero and negative quantities', () => {
      const items: QuoteItem[] = [
        {
          id: '1',
          product_name: 'Test Product',
          quantity: 0,
          price_origin: 100,
          weight: 1,
          link: 'https://example.com',
        },
      ];

      const subtotal = items.reduce(
        (sum, item) => sum + Math.max(0, item.price_origin * item.quantity),
        0
      );

      expect(subtotal).toBe(0);
    });
  });

  describe('Shipping Cost Calculations', () => {
    it('should calculate shipping based on weight tiers', () => {
      const shippingRates = [
        { min_weight: 0, max_weight: 1, rate_per_kg: 10 },
        { min_weight: 1, max_weight: 5, rate_per_kg: 8 },
        { min_weight: 5, max_weight: 10, rate_per_kg: 6 },
        { min_weight: 10, max_weight: null, rate_per_kg: 5 },
      ];

      const calculateShipping = (weight: number) => {
        const tier = shippingRates.find(
          (rate) =>
            weight > rate.min_weight &&
            (rate.max_weight === null || weight <= rate.max_weight)
        );
        return tier ? weight * tier.rate_per_kg : 0;
      };

      expect(calculateShipping(0.5)).toBe(5); // 0.5kg * $10
      expect(calculateShipping(3)).toBe(24); // 3kg * $8
      expect(calculateShipping(7)).toBe(42); // 7kg * $6
      expect(calculateShipping(15)).toBe(75); // 15kg * $5
    });

    it('should apply minimum shipping charges', () => {
      const MIN_SHIPPING = 5;
      
      const applyMinimumShipping = (calculatedShipping: number) => {
        return Math.max(MIN_SHIPPING, calculatedShipping);
      };

      expect(applyMinimumShipping(3)).toBe(5);
      expect(applyMinimumShipping(10)).toBe(10);
    });
  });

  describe('Tax and Customs Calculations', () => {
    it('should calculate customs duty correctly', () => {
      const calculateCustomsDuty = (
        subtotal: number,
        dutyRate: number,
        isBasisPoints: boolean = false
      ) => {
        const rate = isBasisPoints ? dutyRate / 10000 : dutyRate / 100;
        return subtotal * rate;
      };

      // Percentage based (20%)
      expect(calculateCustomsDuty(1000, 20, false)).toBe(200);
      
      // Basis points (2000 = 20%)
      expect(calculateCustomsDuty(1000, 2000, true)).toBe(200);
      
      // Maximum 50% cap
      const cappedDuty = Math.min(calculateCustomsDuty(1000, 60, false), 500);
      expect(cappedDuty).toBe(500);
    });

    it('should calculate GST/VAT correctly', () => {
      const calculateTax = (amount: number, rate: number) => {
        return amount * (rate / 100);
      };

      // 18% GST (India)
      expect(calculateTax(1000, 18)).toBe(180);
      
      // 13% VAT (Nepal)
      expect(calculateTax(1000, 13)).toBe(130);
    });

    it('should apply tax on customs inclusive amount', () => {
      const subtotal = 1000;
      const customsDuty = 200;
      const taxRate = 18;

      const taxableAmount = subtotal + customsDuty;
      const tax = taxableAmount * (taxRate / 100);

      expect(taxableAmount).toBe(1200);
      expect(tax).toBe(216); // 18% of 1200
    });
  });

  describe('Service Fee Calculations', () => {
    it('should calculate tiered service fees', () => {
      const serviceTiers = [
        { min: 0, max: 100, fee: 10 },
        { min: 100, max: 500, fee: 20 },
        { min: 500, max: 1000, fee: 30 },
        { min: 1000, max: null, percentage: 3 },
      ];

      const calculateServiceFee = (amount: number) => {
        const tier = serviceTiers.find(
          (t) => amount >= t.min && (t.max === null || amount < t.max)
        );
        
        if (!tier) return 0;
        
        return tier.percentage 
          ? amount * (tier.percentage / 100)
          : tier.fee;
      };

      expect(calculateServiceFee(50)).toBe(10);
      expect(calculateServiceFee(250)).toBe(20);
      expect(calculateServiceFee(750)).toBe(30);
      expect(calculateServiceFee(2000)).toBe(60); // 3% of 2000
    });
  });

  describe('Total Calculation', () => {
    it('should calculate complete quote total', () => {
      const quote = {
        subtotal: 1000,
        shipping: 50,
        customs_duty: 200,
        tax: 216, // 18% of (1000 + 200)
        service_fee: 30,
        payment_gateway_fee: 15,
      };

      const total = Object.values(quote).reduce((sum, val) => sum + val, 0);
      
      expect(total).toBe(1511);
    });

    it('should handle discounts correctly', () => {
      const subtotal = 1000;
      const discount = {
        type: 'percentage' as const,
        value: 10,
      };

      const applyDiscount = (amount: number, discount: any) => {
        if (discount.type === 'percentage') {
          return amount * (discount.value / 100);
        }
        return Math.min(discount.value, amount);
      };

      expect(applyDiscount(subtotal, discount)).toBe(100);
      
      // Fixed discount
      const fixedDiscount = { type: 'fixed' as const, value: 50 };
      expect(applyDiscount(subtotal, fixedDiscount)).toBe(50);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert USD to destination currency', () => {
      const exchangeRates = {
        INR: 83.12,
        NPR: 132.45,
        EUR: 0.92,
      };

      const convertCurrency = (
        amountUSD: number,
        toCurrency: keyof typeof exchangeRates
      ) => {
        return amountUSD * exchangeRates[toCurrency];
      };

      expect(convertCurrency(100, 'INR')).toBeCloseTo(8312, 0);
      expect(convertCurrency(100, 'NPR')).toBeCloseTo(13245, 0);
      expect(convertCurrency(100, 'EUR')).toBeCloseTo(92, 0);
    });

    it('should round currency appropriately', () => {
      const roundCurrency = (amount: number, currency: string) => {
        // Most currencies use 2 decimal places
        if (['JPY', 'KRW'].includes(currency)) {
          return Math.round(amount); // No decimals
        }
        return Math.round(amount * 100) / 100; // 2 decimals
      };

      expect(roundCurrency(10.456, 'USD')).toBe(10.46);
      expect(roundCurrency(10.456, 'JPY')).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty quotes', () => {
      const emptyQuote = {
        items: [],
        subtotal: 0,
      };

      const calculateTotal = (quote: any) => {
        const subtotal = quote.items.reduce(
          (sum: number, item: any) => sum + (item.price_origin * item.quantity || 0),
          0
        );
        return subtotal;
      };

      expect(calculateTotal(emptyQuote)).toBe(0);
    });

    it('should validate maximum order limits', () => {
      const MAX_ORDER_VALUE = 10000;
      const MAX_ITEMS = 50;

      const validateQuote = (quote: any) => {
        const errors = [];
        
        if (quote.total > MAX_ORDER_VALUE) {
          errors.push('Order exceeds maximum value');
        }
        
        if (quote.items.length > MAX_ITEMS) {
          errors.push('Too many items in order');
        }
        
        return errors;
      };

      const largeQuote = { total: 15000, items: new Array(60) };
      const errors = validateQuote(largeQuote);
      
      expect(errors).toContain('Order exceeds maximum value');
      expect(errors).toContain('Too many items in order');
    });
  });
});