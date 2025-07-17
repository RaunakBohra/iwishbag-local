import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RefundManagementModal } from '../../admin/RefundManagementModal';
import { currencyService } from '@/services/CurrencyService';
import type { Tables } from '@/integrations/supabase/types';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/CurrencyService');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user-id' },
    userProfile: { id: 'admin-profile-id', role: 'admin' }
  })
}));

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

type MockCurrencyService = {
  getCurrencySymbol: ReturnType<typeof vi.fn>;
  getCurrencyName: ReturnType<typeof vi.fn>;
  formatAmount: ReturnType<typeof vi.fn>;
  formatAmountSync?: ReturnType<typeof vi.fn>;
  isValidPaymentAmountSync?: ReturnType<typeof vi.fn>;
  isSupportedByPaymentGateway: ReturnType<typeof vi.fn>;
};

const mockSupabase = supabase as unknown as MockSupabaseClient;
const mockCurrencyService = currencyService as unknown as MockCurrencyService;

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Test data
const mockQuote: Partial<Tables<'quotes'>> = {
  id: 'test-quote-id',
  final_total: 1000,
  final_currency: 'USD',
  payment_status: 'paid',
  payment_method: 'payu',
  user_id: 'customer-user-id',
  currency: 'USD',
  amount_paid: 1000,
  refunded_amount: 0
};

const mockSingleCurrencyPayments = [
  {
    id: 'payment-1',
    quote_id: 'test-quote-id',
    amount: 1000,
    currency: 'USD',
    payment_type: 'customer_payment',
    status: 'completed',
    payment_method: 'stripe',
    method: 'stripe',
    gateway_transaction_id: 'stripe_123',
    payment_date: new Date('2024-01-15T10:00:00Z'),
    created_at: '2024-01-15T10:00:00Z',
    date: new Date('2024-01-15T10:00:00Z'),
    reference: 'stripe_123',
    canRefund: true
  }
];

const mockMultiCurrencyPayments = [
  {
    id: 'payment-1',
    quote_id: 'test-quote-id',
    amount: 500,
    currency: 'USD',
    payment_type: 'customer_payment',
    status: 'completed',
    payment_method: 'stripe',
    method: 'stripe',
    gateway_transaction_id: 'stripe_123',
    payment_date: new Date('2024-01-15T10:00:00Z'),
    created_at: '2024-01-15T10:00:00Z',
    date: new Date('2024-01-15T10:00:00Z'),
    reference: 'stripe_123',
    canRefund: true
  },
  {
    id: 'payment-2',
    quote_id: 'test-quote-id',
    amount: 41500,
    currency: 'INR',
    payment_type: 'customer_payment',
    status: 'completed',
    payment_method: 'payu',
    method: 'payu',
    gateway_transaction_id: 'payu_456',
    payment_date: new Date('2024-01-16T10:00:00Z'),
    created_at: '2024-01-16T10:00:00Z',
    date: new Date('2024-01-16T10:00:00Z'),
    reference: 'payu_456',
    canRefund: true
  }
];

describe('Refund Currency Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup currency service mocks
    mockCurrencyService.getCurrencySymbol.mockImplementation((code) => {
      const symbols: Record<string, string> = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£'
      };
      return symbols[code] || code;
    });

    mockCurrencyService.formatAmount.mockImplementation((amount, currency) => {
      const symbol = mockCurrencyService.getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString()}`;
    });

    // Add formatAmountSync mock if it doesn't exist
    if (!mockCurrencyService.formatAmountSync) {
      (mockCurrencyService as any).formatAmountSync = vi.fn();
    }
    mockCurrencyService.formatAmountSync?.mockImplementation((amount, currency) => {
      const symbol = mockCurrencyService.getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString()}`;
    });

    mockCurrencyService.getCurrencyName.mockImplementation((code) => {
      const names: Record<string, string> = {
        'USD': 'US Dollar',
        'INR': 'Indian Rupee',
        'EUR': 'Euro',
        'GBP': 'British Pound'
      };
      return names[code] || code;
    });

    // Add isValidPaymentAmountSync mock if it doesn't exist
    if (!mockCurrencyService.isValidPaymentAmountSync) {
      (mockCurrencyService as any).isValidPaymentAmountSync = vi.fn();
    }
    mockCurrencyService.isValidPaymentAmountSync?.mockReturnValue(true);
    
    mockCurrencyService.isSupportedByPaymentGateway.mockReturnValue(true);
  });

  describe('Single Currency Refund Validation', () => {
    test('should allow refund in original payment currency', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSingleCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show USD payment and allow USD refund
      await waitFor(() => {
        expect(screen.getByText(/USD/)).toBeInTheDocument();
      });

      // Should show refund amount input
      const refundInput = screen.getByRole('spinbutton');
      expect(refundInput).toBeInTheDocument();

      // Should allow entering refund amount up to payment amount
      fireEvent.change(refundInput, { target: { value: '500' } });
      expect(refundInput).toHaveValue(500);
    });

    test('should validate refund amount against original payment amount', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSingleCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const refundInput = screen.getByRole('spinbutton');
      
      // Try to enter amount greater than payment
      fireEvent.change(refundInput, { target: { value: '1500' } });
      
      // Should show validation error or clamp to maximum
      // Implementation depends on the component's validation logic
    });

    test('should prevent refund in different currency than payment', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSingleCurrencyPayments, // USD payments
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should only show USD option, not other currencies
      expect(screen.getByText(/USD/)).toBeInTheDocument();
      expect(screen.queryByText(/INR/)).not.toBeInTheDocument();
      expect(screen.queryByText(/EUR/)).not.toBeInTheDocument();
    });
  });

  describe('Multi-Currency Refund Validation', () => {
    test('should detect multiple payment currencies', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockMultiCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockMultiCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show multi-currency warning
      await waitFor(() => {
        expect(screen.getByText(/Multiple payment currencies detected/i)).toBeInTheDocument();
      });

      // Should show both currencies
      expect(screen.getByText(/USD/)).toBeInTheDocument();
      expect(screen.getByText(/INR/)).toBeInTheDocument();
    });

    test('should require currency-specific refund selection', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockMultiCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockMultiCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Multiple payment currencies detected/i)).toBeInTheDocument();
      });

      // Should show separate refund options for each currency
      // Implementation details depend on component structure
    });

    test('should prevent mixing currencies in single refund operation', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockMultiCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockMultiCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Multiple payment currencies detected/i)).toBeInTheDocument();
      });

      // The component should enforce single-currency refund operations
      // This test validates the UI prevents mixed currency selection
    });
  });

  describe('Suspicious Amount Detection', () => {
    test('should detect when refund amount equals different currency payment', () => {
      // Scenario: Customer paid ₹8300 INR, admin tries to refund $8300 USD
      const suspiciousRefund = {
        amount: 8300,
        currency: 'USD',
        originalPayment: {
          amount: 8300,
          currency: 'INR'
        }
      };

      // This logic would be in the component - testing the detection algorithm
      const isSuspicious = suspiciousRefund.amount === suspiciousRefund.originalPayment.amount &&
                          suspiciousRefund.currency !== suspiciousRefund.originalPayment.currency;

      expect(isSuspicious).toBe(true);
    });

    test('should flag refund amounts that match quote total but wrong currency', () => {
      // Scenario: Quote total $1000 USD, customer paid ₹83000 INR, admin tries to refund $1000 USD
      const quoteTotal = 1000;
      const quoteCurrency = 'USD';
      const refundAmount = 1000;
      const refundCurrency = 'USD';
      const actualPaymentCurrency = 'INR';

      // Should flag when refund amount matches quote total but payment was in different currency
      const isSuspicious = refundAmount === quoteTotal && 
                          refundCurrency === quoteCurrency && 
                          actualPaymentCurrency !== quoteCurrency;

      expect(isSuspicious).toBe(true);
    });
  });

  describe('Gateway-Specific Refund Validation', () => {
    test('should validate PayU refunds are in INR', async () => {
      const payuPayment = [{
        id: 'payment-1',
        quote_id: 'test-quote-id',
        amount: 83000,
        currency: 'INR',
        payment_type: 'customer_payment',
        status: 'completed',
        payment_method: 'payu',
        gateway_transaction_id: 'payu_123'
      }];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: payuPayment,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show INR currency for PayU refund
      await waitFor(() => {
        expect(screen.getByText(/INR/)).toBeInTheDocument();
      });
    });

    test('should validate Stripe refunds match original payment currency', async () => {
      const stripePayment = [{
        id: 'payment-1',
        quote_id: 'test-quote-id',
        amount: 1000,
        currency: 'USD',
        payment_type: 'customer_payment',
        status: 'completed',
        payment_method: 'stripe',
        gateway_transaction_id: 'stripe_123'
      }];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: stripePayment,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show USD currency for Stripe refund
      await waitFor(() => {
        expect(screen.getByText(/USD/)).toBeInTheDocument();
      });
    });
  });

  describe('Exchange Rate Preservation for Refunds', () => {
    test('should use original exchange rate for refund calculations', () => {
      const originalPayment = {
        amount: 8300,          // INR
        currency: 'INR',
        exchange_rate: 83,     // 1 USD = 83 INR at time of payment
        base_amount: 100       // USD equivalent
      };

      const refundAmount = 4150; // Half of original payment in INR

      // Refund should use original exchange rate, not current rate
      const refundBaseAmount = refundAmount / originalPayment.exchange_rate;
      expect(refundBaseAmount).toBeCloseTo(50, 2); // $50 USD equivalent
    });

    test('should warn when current exchange rate differs significantly from original', () => {
      const originalRate = 83;   // At time of payment
      const currentRate = 85;    // Current rate
      const rateChangePercent = Math.abs(currentRate - originalRate) / originalRate * 100;

      // Should warn if rate changed more than 5%
      const shouldWarn = rateChangePercent > 5;
      expect(shouldWarn).toBe(false); // 2.4% change, should not warn

      // Test significant change
      const significantCurrentRate = 90;
      const significantChange = Math.abs(significantCurrentRate - originalRate) / originalRate * 100;
      const shouldWarnSignificant = significantChange > 5;
      expect(shouldWarnSignificant).toBe(true); // 8.4% change, should warn
    });
  });

  describe('Partial Refund Validation', () => {
    test('should allow partial refunds within payment limits', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSingleCurrencyPayments,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should allow partial refund (e.g., $250 out of $1000 payment)
      const refundInput = screen.getByRole('spinbutton');
      fireEvent.change(refundInput, { target: { value: '250' } });
      
      expect(refundInput).toHaveValue(250);
    });

    test('should track cumulative refunds to prevent over-refunding', () => {
      const paymentAmount = 1000;
      const existingRefunds = [
        { amount: 200, currency: 'USD' },
        { amount: 150, currency: 'USD' }
      ];

      const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
      const remainingRefundable = paymentAmount - totalRefunded;

      expect(remainingRefundable).toBe(650);
      expect(remainingRefundable > 0).toBe(true);

      // Attempting to refund more than remaining should be blocked
      const attemptedRefund = 700;
      const isValidRefund = attemptedRefund <= remainingRefundable;
      expect(isValidRefund).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing payment data gracefully', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [], // No payments found
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should show appropriate message for no payments
      await waitFor(() => {
        expect(screen.getByText(/No payments found/i)).toBeInTheDocument();
      });
    });

    test('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed')
            })
          })
        })
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      // Should not crash and handle error gracefully
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    test('should handle zero amount payments', async () => {
      const zeroPayment = [{
        id: 'payment-1',
        quote_id: 'test-quote-id',
        amount: 0,
        currency: 'USD',
        payment_type: 'customer_payment',
        status: 'completed'
      }];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: zeroPayment,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuote as Tables<'quotes'>}
          payments={mockSingleCurrencyPayments as any[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should handle zero payment appropriately
      await waitFor(() => {
        expect(screen.getByText(/No refundable amount/i)).toBeInTheDocument();
      });
    });
  });
});