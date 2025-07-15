import { currencyService } from '../CurrencyService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('CurrencyService', () => {
  beforeEach(() => {
    // Clear cache before each test
    currencyService.clearCache();
    jest.clearAllMocks();
  });

  describe('Currency Symbol and Name Functions', () => {
    test('should return correct symbols for major currencies', () => {
      expect(currencyService.getCurrencySymbol('USD')).toBe('$');
      expect(currencyService.getCurrencySymbol('EUR')).toBe('€');
      expect(currencyService.getCurrencySymbol('GBP')).toBe('£');
      expect(currencyService.getCurrencySymbol('INR')).toBe('₹');
      expect(currencyService.getCurrencySymbol('NPR')).toBe('₨');
      expect(currencyService.getCurrencySymbol('JPY')).toBe('¥');
      expect(currencyService.getCurrencySymbol('CNY')).toBe('¥');
    });

    test('should return currency code for unknown currencies', () => {
      expect(currencyService.getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
    });

    test('should return correct names for major currencies', () => {
      expect(currencyService.getCurrencyName('USD')).toBe('US Dollar');
      expect(currencyService.getCurrencyName('EUR')).toBe('Euro');
      expect(currencyService.getCurrencyName('GBP')).toBe('British Pound');
      expect(currencyService.getCurrencyName('INR')).toBe('Indian Rupee');
      expect(currencyService.getCurrencyName('NPR')).toBe('Nepalese Rupee');
    });
  });

  describe('Currency Formatting', () => {
    test('should format amounts correctly with proper decimal places', () => {
      expect(currencyService.formatAmount(1234.56, 'USD')).toBe('$1,234.56');
      expect(currencyService.formatAmount(1234.56, 'EUR')).toBe('€1.234,56');
      expect(currencyService.formatAmount(1234, 'JPY')).toBe('¥1,234');
      expect(currencyService.formatAmount(1234567.89, 'INR')).toBe('₹1,234,567.89');
    });

    test('should handle zero decimal currencies correctly', () => {
      expect(currencyService.formatAmount(1234.99, 'JPY')).toBe('¥1,235');
      expect(currencyService.formatAmount(1234.99, 'KRW')).toBe('₩1,235');
      expect(currencyService.formatAmount(1234.99, 'VND')).toBe('₫1,235');
      expect(currencyService.formatAmount(1234.99, 'IDR')).toBe('Rp1,235');
    });

    test('should handle negative amounts', () => {
      expect(currencyService.formatAmount(-1234.56, 'USD')).toBe('$-1,234.56');
      expect(currencyService.formatAmount(-1000, 'JPY')).toBe('¥-1,000');
    });

    test('should handle very small amounts', () => {
      expect(currencyService.formatAmount(0.01, 'USD')).toBe('$0.01');
      expect(currencyService.formatAmount(0.001, 'USD')).toBe('$0.00');
    });

    test('should handle very large amounts', () => {
      expect(currencyService.formatAmount(1234567890.12, 'USD')).toBe('$1,234,567,890.12');
    });
  });

  describe('Minimum Payment Amounts', () => {
    test('should return correct minimum amounts for sync function', () => {
      expect(currencyService.getMinimumPaymentAmountSync('USD')).toBe(10);
      expect(currencyService.getMinimumPaymentAmountSync('EUR')).toBe(10);
      expect(currencyService.getMinimumPaymentAmountSync('INR')).toBe(750);
      expect(currencyService.getMinimumPaymentAmountSync('NPR')).toBe(1200);
      expect(currencyService.getMinimumPaymentAmountSync('JPY')).toBe(1100);
      expect(currencyService.getMinimumPaymentAmountSync('UNKNOWN')).toBe(10);
    });

    test('should validate payment amounts correctly', () => {
      expect(currencyService.isValidPaymentAmountSync(15, 'USD')).toBe(true);
      expect(currencyService.isValidPaymentAmountSync(5, 'USD')).toBe(false);
      expect(currencyService.isValidPaymentAmountSync(1000, 'INR')).toBe(true);
      expect(currencyService.isValidPaymentAmountSync(500, 'INR')).toBe(false);
      expect(currencyService.isValidPaymentAmountSync(1500, 'JPY')).toBe(true);
      expect(currencyService.isValidPaymentAmountSync(500, 'JPY')).toBe(false);
    });

    test('should handle async minimum payment amounts with database fallback', async () => {
      // Mock database returning null (to test fallback)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
              })
            })
          })
        })
      } as any);

      const minAmount = await currencyService.getMinimumPaymentAmount('USD');
      expect(minAmount).toBe(10); // Should fallback to sync version
    });

    test('should handle async minimum payment amounts with database data', async () => {
      // Mock database returning data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { minimum_payment_amount: 25 }, 
                  error: null 
                })
              })
            })
          })
        })
      } as any);

      const minAmount = await currencyService.getMinimumPaymentAmount('USD');
      expect(minAmount).toBe(25);
    });
  });

  describe('Payment Gateway Support', () => {
    test('should identify supported payment gateway currencies', () => {
      expect(currencyService.isSupportedByPaymentGateway('USD')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('EUR')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('GBP')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('INR')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('SGD')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('AED')).toBe(true);
      expect(currencyService.isSupportedByPaymentGateway('SAR')).toBe(true);
    });

    test('should identify unsupported payment gateway currencies', () => {
      expect(currencyService.isSupportedByPaymentGateway('JPY')).toBe(false);
      expect(currencyService.isSupportedByPaymentGateway('KRW')).toBe(false);
      expect(currencyService.isSupportedByPaymentGateway('VND')).toBe(false);
      expect(currencyService.isSupportedByPaymentGateway('IDR')).toBe(false);
      expect(currencyService.isSupportedByPaymentGateway('UNKNOWN')).toBe(false);
    });

    test('should return correct list of gateway currencies', () => {
      const gatewayCurrencies = currencyService.getPaymentGatewayCurrencies();
      expect(gatewayCurrencies).toContain('USD');
      expect(gatewayCurrencies).toContain('EUR');
      expect(gatewayCurrencies).toContain('GBP');
      expect(gatewayCurrencies).toContain('INR');
      expect(gatewayCurrencies).not.toContain('JPY');
      expect(gatewayCurrencies).not.toContain('KRW');
    });
  });

  describe('Country-Currency Mapping', () => {
    test('should return correct currency for country (sync)', () => {
      expect(currencyService.getCurrencyForCountrySync('US')).toBe('USD');
      expect(currencyService.getCurrencyForCountrySync('IN')).toBe('INR');
      expect(currencyService.getCurrencyForCountrySync('NP')).toBe('NPR');
      expect(currencyService.getCurrencyForCountrySync('GB')).toBe('GBP');
      expect(currencyService.getCurrencyForCountrySync('JP')).toBe('JPY');
      expect(currencyService.getCurrencyForCountrySync('UNKNOWN')).toBe('USD');
    });

    test('should return correct country for currency (sync)', () => {
      expect(currencyService.getCountryForCurrencySync('USD')).toBe('US');
      expect(currencyService.getCountryForCurrencySync('INR')).toBe('IN');
      expect(currencyService.getCountryForCurrencySync('NPR')).toBe('NP');
      expect(currencyService.getCountryForCurrencySync('GBP')).toBe('GB');
      expect(currencyService.getCountryForCurrencySync('JPY')).toBe('JP');
      expect(currencyService.getCountryForCurrencySync('UNKNOWN')).toBe(null);
    });
  });

  describe('Currency Formatting Options', () => {
    test('should return correct formatting options for different currencies', () => {
      const usdOptions = currencyService.getCurrencyFormatOptions('USD');
      expect(usdOptions.decimalPlaces).toBe(2);
      expect(usdOptions.thousandSeparator).toBe(',');
      expect(usdOptions.decimalSeparator).toBe('.');

      const eurOptions = currencyService.getCurrencyFormatOptions('EUR');
      expect(eurOptions.decimalPlaces).toBe(2);
      expect(eurOptions.thousandSeparator).toBe('.');
      expect(eurOptions.decimalSeparator).toBe(',');

      const jpyOptions = currencyService.getCurrencyFormatOptions('JPY');
      expect(jpyOptions.decimalPlaces).toBe(0);
    });

    test('should handle zero decimal currencies', () => {
      ['JPY', 'KRW', 'VND', 'IDR'].forEach(currency => {
        const options = currencyService.getCurrencyFormatOptions(currency);
        expect(options.decimalPlaces).toBe(0);
      });
    });
  });

  describe('Async Database Operations', () => {
    test('should handle getAllCurrencies with database error gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      } as any);

      const currencies = await currencyService.getAllCurrencies();
      expect(currencies.length).toBeGreaterThan(0); // Should return fallback currencies
      expect(currencies.some(c => c.code === 'USD')).toBe(true);
      expect(currencies.some(c => c.code === 'EUR')).toBe(true);
    });

    test('should handle getCurrency with cache miss gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      } as any);

      const currency = await currencyService.getCurrency('USD');
      expect(currency).toBeNull(); // Should return null for unknown currency after database check
    });

    test('should handle getCountryCurrencyMap with database success', async () => {
      const mockCountrySettings = [
        { code: 'US', currency: 'USD' },
        { code: 'IN', currency: 'INR' },
        { code: 'NP', currency: 'NPR' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: mockCountrySettings,
            error: null
          })
        })
      } as any);

      const map = await currencyService.getCountryCurrencyMap();
      expect(map.get('US')).toBe('USD');
      expect(map.get('IN')).toBe('INR');
      expect(map.get('NP')).toBe('NPR');
    });
  });

  describe('Cache Management', () => {
    test('should cache currency data and use cache on subsequent calls', async () => {
      const mockCountrySettings = [
        { code: 'US', currency: 'USD', minimum_payment_amount: 10 }
      ];

      // Mock first call
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCountrySettings,
              error: null
            })
          })
        })
      } as any);

      // First call should hit database
      await currencyService.getAllCurrencies();
      expect(mockSupabase.from).toHaveBeenCalled();

      // Clear mock call count
      jest.clearAllMocks();

      // Second call should use cache
      await currencyService.getAllCurrencies();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('should clear cache when requested', async () => {
      // Add something to cache first
      await currencyService.getAllCurrencies();
      
      // Clear cache
      currencyService.clearCache();
      
      // Mock for second call
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      } as any);

      // Should hit database again after cache clear
      await currencyService.getAllCurrencies();
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null/undefined amounts in formatAmount', () => {
      expect(currencyService.formatAmount(0, 'USD')).toBe('$0.00');
      // @ts-expect-error - Testing runtime behavior
      expect(currencyService.formatAmount(null, 'USD')).toBe('$0.00');
      // @ts-expect-error - Testing runtime behavior
      expect(currencyService.formatAmount(undefined, 'USD')).toBe('$0.00');
    });

    test('should handle empty currency code', () => {
      expect(currencyService.getCurrencySymbol('')).toBe('');
      expect(currencyService.getCurrencyName('')).toBe('');
      expect(currencyService.formatAmount(100, '')).toBe('100.00');
    });

    test('should handle very large numbers in formatAmount', () => {
      const largeNumber = 999999999999.99;
      const formatted = currencyService.formatAmount(largeNumber, 'USD');
      expect(formatted).toContain('$');
      expect(formatted).toContain(',');
    });

    test('should handle very small numbers in formatAmount', () => {
      const smallNumber = 0.001;
      const formatted = currencyService.formatAmount(smallNumber, 'USD');
      expect(formatted).toBe('$0.00'); // Should round to 2 decimal places
    });
  });

  describe('Integration Scenarios', () => {
    test('should correctly validate payment amount workflow', async () => {
      // Test the complete workflow from amount validation to payment
      const amount = 1500;
      const currency = 'INR';
      
      // Check if amount meets minimum
      const isValid = currencyService.isValidPaymentAmountSync(amount, currency);
      expect(isValid).toBe(true);
      
      // Check if currency is supported by payment gateways
      const isSupported = currencyService.isSupportedByPaymentGateway(currency);
      expect(isSupported).toBe(true);
      
      // Format for display
      const formatted = currencyService.formatAmount(amount, currency);
      expect(formatted).toBe('₹1,500.00');
    });

    test('should handle currency mismatch scenarios', () => {
      // Scenario: Quote in USD, payment in INR
      const quoteAmount = 100; // USD
      const quoteCurrency = 'USD';
      const paymentAmount = 8300; // INR equivalent
      const paymentCurrency = 'INR';
      
      // Both should be valid individually
      expect(currencyService.isValidPaymentAmountSync(quoteAmount, quoteCurrency)).toBe(true);
      expect(currencyService.isValidPaymentAmountSync(paymentAmount, paymentCurrency)).toBe(true);
      
      // Formatting should show different symbols
      expect(currencyService.formatAmount(quoteAmount, quoteCurrency)).toBe('$100.00');
      expect(currencyService.formatAmount(paymentAmount, paymentCurrency)).toBe('₹8,300.00');
    });
  });
});