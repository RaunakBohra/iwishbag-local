// ============================================================================
// PAYMENT GATEWAY FEE SERVICE TESTS
// Tests the centralized payment gateway fee system
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentGatewayFeeService } from '../PaymentGatewayFeeService';

// Mock the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                payment_gateway_fixed_fee: 0.5,
                payment_gateway_percent_fee: 3.5,
                currency: 'INR',
              },
              error: null,
            }),
          ),
        })),
      })),
    })),
  },
}));

vi.mock('../UnifiedConfigurationService', () => ({
  unifiedConfigService: {
    getGatewayConfig: vi.fn(),
    getCountryConfig: vi.fn(),
  },
}));

vi.mock('@sentry/react', () => ({
  startTransaction: vi.fn(() => ({
    setStatus: vi.fn(),
    finish: vi.fn(),
  })),
  captureException: vi.fn(),
}));

describe('PaymentGatewayFeeService', () => {
  beforeEach(() => {
    // Clear cache before each test
    paymentGatewayFeeService.clearCache();
    vi.clearAllMocks();
  });

  describe('getPaymentGatewayFees', () => {
    it('should return default fees when no configuration is found', async () => {
      // Mock no configuration found
      const { unifiedConfigService } = await import('../UnifiedConfigurationService');
      vi.mocked(unifiedConfigService.getGatewayConfig).mockResolvedValue(null);
      vi.mocked(unifiedConfigService.getCountryConfig).mockResolvedValue(null);

      // Mock supabase to return no data
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No data found' },
            }),
          }),
        }),
      } as any);

      const fees = await paymentGatewayFeeService.getPaymentGatewayFees('XX');

      expect(fees).toEqual({
        fixedFee: 0.3,
        percentFee: 2.9,
        source: 'default',
        currency: 'USD',
      });
    });

    it('should return country-specific fees when available', async () => {
      const fees = await paymentGatewayFeeService.getPaymentGatewayFees('IN');

      expect(fees).toEqual({
        fixedFee: 0.5,
        percentFee: 3.5,
        source: 'country',
        currency: 'INR',
      });
    });

    it('should return gateway-specific fees when gateway is specified', async () => {
      const { unifiedConfigService } = await import('../UnifiedConfigurationService');
      vi.mocked(unifiedConfigService.getGatewayConfig).mockResolvedValue({
        gateway_name: 'stripe',
        fees: {
          fixed_fee: 0.3,
          percent_fee: 2.9,
        },
        supported_countries: ['US', 'IN'],
        supported_currencies: ['USD', 'INR'],
        is_active: true,
        display_name: 'Stripe',
        api_config: {
          webhook_endpoint: '/webhook/stripe',
          supported_payment_methods: ['card'],
        },
        limits: {
          min_amount: 0.5,
          max_amount: 999999,
        },
      });

      const fees = await paymentGatewayFeeService.getPaymentGatewayFees('IN', 'stripe');

      expect(fees).toEqual({
        fixedFee: 0.3,
        percentFee: 2.9,
        source: 'gateway',
        gateway: 'stripe',
        currency: 'USD',
      });
    });
  });

  describe('calculatePaymentGatewayFee', () => {
    it('should calculate fees correctly', async () => {
      const calculation = await paymentGatewayFeeService.calculatePaymentGatewayFee(100, 'IN');

      expect(calculation.calculatedAmount).toBe(4.0); // (100 * 3.5%) + 0.50 = 3.50 + 0.50 = 4.00
      expect(calculation.breakdown).toEqual({
        baseAmount: 100,
        percentageFee: 3.5,
        fixedFee: 0.5,
        totalFee: 4.0,
      });
      expect(calculation.fees.source).toBe('country');
    });

    it('should handle zero amounts correctly', async () => {
      const calculation = await paymentGatewayFeeService.calculatePaymentGatewayFee(0, 'IN');

      expect(calculation.calculatedAmount).toBe(0.5); // Only fixed fee
      expect(calculation.breakdown).toEqual({
        baseAmount: 0,
        percentageFee: 0,
        fixedFee: 0.5,
        totalFee: 0.5,
      });
    });
  });

  describe('cache behavior', () => {
    it('should cache results and return cached values on subsequent calls', async () => {
      // First call
      const fees1 = await paymentGatewayFeeService.getPaymentGatewayFees('IN');

      // Second call should use cache
      const fees2 = await paymentGatewayFeeService.getPaymentGatewayFees('IN');

      expect(fees1).toEqual(fees2);

      // Verify supabase was only called once
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      // Make a call to populate cache
      await paymentGatewayFeeService.getPaymentGatewayFees('IN');

      // Clear cache
      paymentGatewayFeeService.clearCache('IN');

      // Next call should fetch fresh data
      await paymentGatewayFeeService.getPaymentGatewayFees('IN');

      // Verify supabase was called twice
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });
  });
});

export {};
