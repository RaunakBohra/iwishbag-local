import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { currencyService } from '../CurrencyService';
import { supabase } from '@/integrations/supabase/client';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client');

describe('CurrencyService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Clear the service cache to ensure clean state
    currencyService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrency - Get Currency Data', () => {
    it('should return correct currency data when database call succeeds', async () => {
      const mockCountrySettings = [
        {
          currency: 'USD',
          minimum_payment_amount: 10,
          decimal_places: 2,
          thousand_separator: ',',
          decimal_separator: '.',
        },
        {
          currency: 'INR',
          minimum_payment_amount: 750,
          decimal_places: 2,
          thousand_separator: ',',
          decimal_separator: '.',
        },
      ];

      // Mock the Supabase query chain
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCountrySettings,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.getCurrency('USD');

      expect(result).toMatchObject({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimal_places: 2,
        min_payment_amount: 10,
        thousand_separator: ',',
        decimal_separator: '.',
        is_active: true,
      });

      expect(supabase.from).toHaveBeenCalledWith('country_settings');
      expect(mockSelect).toHaveBeenCalledWith(
        'currency, minimum_payment_amount, decimal_places, thousand_separator, decimal_separator'
      );
    });

    it('should return null when currency is not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [], // Empty array - no currencies found
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.getCurrency('XYZ');

      expect(result).toBeNull();
    });

    it('should use cached data on subsequent calls', async () => {
      const mockCountrySettings = [
        {
          currency: 'EUR',
          minimum_payment_amount: 10,
          decimal_places: 2,
          thousand_separator: '.',
          decimal_separator: ',',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCountrySettings,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // First call - should fetch from database
      const firstResult = await currencyService.getCurrency('EUR');
      expect(firstResult?.code).toBe('EUR');

      // Second call - should use cached data
      const secondResult = await currencyService.getCurrency('EUR');
      expect(secondResult?.code).toBe('EUR');

      // Should only call supabase once (first time)
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValidPaymentAmount - Minimum Payment Validation', () => {
    it('should return true when amount is above minimum for USD', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { minimum_payment_amount: 10 },
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.isValidPaymentAmount(25, 'USD');

      expect(result).toBe(true);
      expect(mockSelect).toHaveBeenCalledWith('minimum_payment_amount');
    });

    it('should return false when amount is below minimum for INR', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { minimum_payment_amount: 750 },
                error: null,
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.isValidPaymentAmount(500, 'INR');

      expect(result).toBe(false);
    });

    it('should use sync fallback when database call fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.isValidPaymentAmount(15, 'USD');

      // Should use fallback minimum of $10 for USD
      expect(result).toBe(true);
    });
  });

  describe('isSupportedByPaymentGateway - Gateway Compatibility', () => {
    it('should return true for supported currency USD', () => {
      const result = currencyService.isSupportedByPaymentGateway('USD');
      expect(result).toBe(true);
    });

    it('should return true for supported currency INR', () => {
      const result = currencyService.isSupportedByPaymentGateway('INR');
      expect(result).toBe(true);
    });

    it('should return false for unsupported currency THB', () => {
      const result = currencyService.isSupportedByPaymentGateway('THB');
      expect(result).toBe(false);
    });

    it('should return false for unsupported currency XYZ', () => {
      const result = currencyService.isSupportedByPaymentGateway('XYZ');
      expect(result).toBe(false);
    });

    it('should handle all supported gateway currencies correctly', () => {
      const supportedCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR'];
      
      supportedCurrencies.forEach(currency => {
        expect(currencyService.isSupportedByPaymentGateway(currency)).toBe(true);
      });
    });
  });

  describe('Fallback Mechanism', () => {
    it('should return hardcoded USD values when database fetch fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.getCurrency('USD');

      expect(result).toMatchObject({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimal_places: 2,
        is_active: true,
      });
    });

    it('should return hardcoded INR values when database fetch fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.getCurrency('INR');

      expect(result).toMatchObject({
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimal_places: 2,
        is_active: true,
      });
    });

    it('should return hardcoded NPR values when database fetch fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await currencyService.getCurrency('NPR');

      expect(result).toMatchObject({
        code: 'NPR',
        name: 'Nepalese Rupee',
        symbol: '₨',
        decimal_places: 2,
        is_active: true,
      });
    });

    it('should use fallback minimum payment amounts when database fails', () => {
      // Test sync fallback function directly
      expect(currencyService.getMinimumPaymentAmountSync('USD')).toBe(10);
      expect(currencyService.getMinimumPaymentAmountSync('INR')).toBe(750);
      expect(currencyService.getMinimumPaymentAmountSync('NPR')).toBe(1200);
      expect(currencyService.getMinimumPaymentAmountSync('EUR')).toBe(10);
      expect(currencyService.getMinimumPaymentAmountSync('XYZ')).toBe(10); // Default fallback
    });
  });

  describe('Currency Formatting and Display', () => {
    it('should format USD amounts correctly', () => {
      const result = currencyService.formatAmount(1234.56, 'USD');
      expect(result).toBe('$1,234.56');
    });

    it('should format INR amounts correctly', () => {
      const result = currencyService.formatAmount(12345.67, 'INR');
      expect(result).toBe('₹12,345.67');
    });

    it('should format JPY amounts without decimals', () => {
      const result = currencyService.formatAmount(1234, 'JPY');
      expect(result).toBe('¥1,234');
    });

    it('should handle zero and negative amounts', () => {
      expect(currencyService.formatAmount(0, 'USD')).toBe('$0.00');
      expect(currencyService.formatAmount(-100, 'USD')).toBe('$-100.00');
    });

    it('should handle null and undefined amounts', () => {
      expect(currencyService.formatAmount(null as any, 'USD')).toBe('$0.00');
      expect(currencyService.formatAmount(undefined as any, 'USD')).toBe('$0.00');
      expect(currencyService.formatAmount(NaN, 'USD')).toBe('$0.00');
    });
  });

  describe('Exchange Rate Calculations', () => {
    it('should return 1.0 for same country exchange rates', async () => {
      const rate = await currencyService.getExchangeRate('US', 'US');
      expect(rate).toBe(1.0);
    });

    it('should use shipping route exchange rates when available', async () => {
      const mockShippingRoute = {
        data: { exchange_rate: 82.5 },
        error: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockShippingRoute),
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const rate = await currencyService.getExchangeRate('US', 'IN');

      expect(rate).toBe(82.5);
      expect(supabase.from).toHaveBeenCalledWith('shipping_routes');
    });

    it('should fall back to country settings USD cross-rate when no shipping route', async () => {
      // Mock shipping route to return null
      const mockShippingSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No route found' },
              }),
            }),
          }),
        }),
      });

      // Mock country settings to return valid rates
      const mockCountrySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation((args) => {
            // Return different rates based on country code
            if (args === undefined) {
              // First call for origin country (US)
              return Promise.resolve({
                data: { currency: 'USD', rate_from_usd: 1.0 },
                error: null,
              });
            }
            // Second call for destination country (IN)
            return Promise.resolve({
              data: { currency: 'INR', rate_from_usd: 83.0 },
              error: null,
            });
          }),
        }),
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockShippingSelect } as any)
        .mockReturnValue({ select: mockCountrySelect } as any);

      const rate = await currencyService.getExchangeRate('US', 'IN');

      // Should calculate cross-rate: 83.0 / 1.0 = 83.0
      expect(rate).toBe(83.0);
    });

    it('should throw error when country settings are unavailable', async () => {
      // Mock shipping route to fail
      const mockShippingSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No route' },
              }),
            }),
          }),
        }),
      });

      // Mock country settings to fail
      const mockCountrySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Country not found' },
          }),
        }),
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce({ select: mockShippingSelect } as any)
        .mockReturnValue({ select: mockCountrySelect } as any);

      await expect(currencyService.getExchangeRate('XX', 'YY')).rejects.toThrow(
        'Country settings not found: XX or YY'
      );
    });
  });

  describe('Currency Validation and Utilities', () => {
    it('should correctly identify valid currencies', async () => {
      const mockCountrySettings = [
        { currency: 'USD', minimum_payment_amount: 10 },
        { currency: 'EUR', minimum_payment_amount: 10 },
        { currency: 'GBP', minimum_payment_amount: 8 },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCountrySettings,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const isValidUSD = await currencyService.isValidCurrency('USD');
      const isValidEUR = await currencyService.isValidCurrency('EUR');
      const isValidXYZ = await currencyService.isValidCurrency('XYZ');

      expect(isValidUSD).toBe(true);
      expect(isValidEUR).toBe(true);
      expect(isValidXYZ).toBe(false);
    });

    it('should provide correct currency display information', async () => {
      const mockCountrySettings = [
        {
          currency: 'CAD',
          minimum_payment_amount: 15,
          decimal_places: 2,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCountrySettings,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const displayInfo = await currencyService.getCurrencyDisplayInfo('CAD');

      expect(displayInfo).toMatchObject({
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        formatted: 'Canadian Dollar (CAD)',
      });
    });
  });
});