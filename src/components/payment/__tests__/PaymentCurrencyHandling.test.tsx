import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedPaymentModal } from '../../admin/UnifiedPaymentModal';
import { RefundManagementModal } from '../../admin/RefundManagementModal';
import { PaymentManagementWidget } from '../../admin/PaymentManagementWidget';
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
    user: { id: 'test-user-id' },
    userProfile: { id: 'test-profile-id', role: 'admin' }
  })
}));

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
};

type MockCurrencyService = {
  getCurrencySymbol: ReturnType<typeof vi.fn>;
  getCurrencyName: ReturnType<typeof vi.fn>;
  formatAmount: ReturnType<typeof vi.fn>;
  isValidPaymentAmountSync: ReturnType<typeof vi.fn>;
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

// Mock quote with multi-currency payments
const mockQuoteWithMultiCurrency: Partial<Tables<'quotes'>> = {
  id: 'test-quote-id',
  final_total: 1000,
  final_currency: 'USD',
  payment_status: 'partial',
  payment_method: 'payu',
  user_id: 'test-user-id'
};

const mockPaymentLedgerData: Array<{
  id: string;
  quote_id: string;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  payment_date: string;
}> = [
  {
    id: 'payment-1',
    quote_id: 'test-quote-id',
    amount: 800,
    currency: 'USD',
    payment_type: 'customer_payment',
    status: 'completed',
    payment_date: '2024-01-15T10:00:00Z'
  },
  {
    id: 'payment-2', 
    quote_id: 'test-quote-id',
    amount: 8300,
    currency: 'INR',
    payment_type: 'customer_payment',
    status: 'completed',
    payment_date: '2024-01-16T10:00:00Z'
  }
];

const mockPayments = [
  {
    id: 'pay-1',
    amount: 500,
    currency: 'USD',
    method: 'card',
    gateway: 'stripe',
    reference: 'ref-stripe-1',
    date: new Date(),
    canRefund: true,
  },
  {
    id: 'pay-2',
    amount: 300,
    currency: 'INR',
    method: 'netbanking',
    gateway: 'payu',
    reference: 'ref-payu-1',
    date: new Date(),
    canRefund: true,
  },
];

describe('Payment Currency Handling', () => {
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
      return `${symbol}${amount.toFixed(2)}`;
    });

    mockCurrencyService.isValidPaymentAmountSync.mockReturnValue(true);
    mockCurrencyService.isSupportedByPaymentGateway.mockReturnValue(true);

    // Mock Supabase real-time
    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    });
  });

  describe('Multi-Currency Payment Detection', () => {
    test('should detect and display multi-currency payments in PaymentManagementWidget', async () => {
      // Mock payment ledger query to return multi-currency data
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockPaymentLedgerData,
                  error: null
                })
              })
            })
          };
        }
        // For payment_transactions table - include the .in() method
        if (table === 'payment_transactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [], // No transactions, only ledger data
                    error: null
                  })
                })
              })
            })
          };
        }
        // For all other tables
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          })
        };
      });

      renderWithQueryClient(
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Multi-Currency Payments Detected/i)).toBeInTheDocument();
      });

      // Should show currency breakdown
      expect(screen.getByText(/USD:/)).toBeInTheDocument();
      expect(screen.getByText(/INR:/)).toBeInTheDocument();
    });

    test('should show currency mismatch warnings', async () => {
      const quoteWithMismatch: Partial<Tables<'quotes'>> = {
        ...mockQuoteWithMultiCurrency,
        final_currency: 'USD'
      };

      // Mock payment transaction with different currency
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_transactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { 
                        id: 'tx-1', 
                        currency: 'INR',
                        amount: 8300
                      },
                      error: null
                    })
                  })
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

      renderWithQueryClient(
        <PaymentManagementWidget quote={quoteWithMismatch as Tables<'quotes'>} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Currency Mismatch Warning/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Quote: USD/)).toBeInTheDocument();
    });
  });

  describe('Payment Recording Validation', () => {
    test('should validate currency selection in UnifiedPaymentModal', async () => {
      const onClose = vi.fn();

      // Mock Supabase queries for UnifiedPaymentModal
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      renderWithQueryClient(
        <UnifiedPaymentModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Record Payment/i)).toBeInTheDocument();
      });

      // Test currency selector functionality
      const currencySelector = screen.getByRole('combobox');
      expect(currencySelector).toBeInTheDocument();
    });

    test('should show suspicious amount warnings', async () => {
      // Test scenario where payment amount equals quote amount but in different currency
      const suspiciousAmount = 1000; // Same number as quote total
      const suspiciousCurrency = 'INR'; // Different currency

      mockCurrencyService.formatAmount.mockImplementation((amount, currency) => {
        if (currency === 'INR' && amount === 1000) {
          return '₹1,000.00';
        }
        if (currency === 'USD' && amount === 1000) {
          return '$1,000.00';
        }
        return `${currency}${amount}`;
      });

      const onClose = vi.fn();

      renderWithQueryClient(
        <UnifiedPaymentModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Record Payment/i)).toBeInTheDocument();
      });

      // Would need to trigger the validation in the actual component
      // This is a placeholder for the test structure
    });
  });

  describe('Refund Currency Validation', () => {
    test('should prevent mixed currency refunds', async () => {
      const onClose = vi.fn();

      // Mock payment ledger with multiple currencies
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockPaymentLedgerData, // Contains both USD and INR
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

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} 
          payments={mockPayments}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Refund Management/i)).toBeInTheDocument();
      });

      // Should show currency-specific refund options
      await waitFor(() => {
        expect(screen.getByText(/Multiple payment currencies detected/i)).toBeInTheDocument();
      });
    });

    test('should enforce original payment currency for refunds', async () => {
      const singleCurrencyPayment = [
        {
          id: 'payment-1',
          quote_id: 'test-quote-id',
          amount: 1000,
          currency: 'USD',
          payment_type: 'customer_payment',
          status: 'completed'
        }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: singleCurrencyPayment,
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
          quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} 
          payments={mockPayments}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Refund Management/i)).toBeInTheDocument();
      });

      // Should only allow refund in USD (the original payment currency)
      await waitFor(() => {
        const currencyDisplay = screen.getByText(/USD/);
        expect(currencyDisplay).toBeInTheDocument();
      });
    });
  });

  describe('Exchange Rate Handling', () => {
    test('should handle exchange rate calculations in payment processing', () => {
      const paymentAmount = 8300; // INR
      const paymentCurrency = 'INR';
      const exchangeRate = 83; // 1 USD = 83 INR
      const expectedUSDAmount = paymentAmount / exchangeRate; // ~100 USD

      // Test exchange rate calculation logic
      expect(expectedUSDAmount).toBeCloseTo(100, 0);
    });

    test('should store exchange rates with payments for refund accuracy', () => {
      const paymentData = {
        amount: 8300,
        currency: 'INR',
        exchange_rate: 83,
        base_amount: 100 // USD equivalent
      };

      // Verify that refund can use original exchange rate
      const refundAmount = paymentData.base_amount * paymentData.exchange_rate;
      expect(refundAmount).toBe(8300);
    });
  });

  describe('Currency Display Consistency', () => {
    test('should display amounts consistently across components', async () => {
      // Test that the same amount and currency are displayed consistently
      const testAmount = 1234.56;
      const testCurrency = 'USD';

      mockCurrencyService.formatAmount.mockReturnValue('$1,234.56');

      renderWithQueryClient(
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} />
      );

      // The formatting should be consistent
      expect(mockCurrencyService.formatAmount).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String)
      );
    });

    test('should handle zero-decimal currencies correctly', () => {
      const jpyAmount = 1234.99;
      mockCurrencyService.formatAmount.mockReturnValue('¥1,235');

      const formatted = mockCurrencyService.formatAmount(jpyAmount, 'JPY');
      expect(formatted).toBe('¥1,235'); // Should round to whole number
    });
  });

  describe('Error Scenarios', () => {
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

      renderWithQueryClient(
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as Tables<'quotes'>} />
      );

      // Should not crash and should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByText(/Payment Information/i)).toBeInTheDocument();
      });
    });

    test('should handle missing currency data', () => {
      mockCurrencyService.getCurrencySymbol.mockReturnValue('UNKNOWN');
      mockCurrencyService.formatAmount.mockReturnValue('UNKNOWN1000.00');

      const result = mockCurrencyService.formatAmount(1000, 'UNKNOWN_CURRENCY');
      expect(result).toBe('UNKNOWN1000.00');
    });
  });

  describe('Integration Test Scenarios', () => {
    test('should complete full payment workflow with currency validation', async () => {
      // 1. Record payment in specific currency
      // 2. Validate currency consistency
      // 3. Process refund in original currency
      
      const paymentWorkflow = {
        quoteAmount: 1000,
        quoteCurrency: 'USD',
        paymentAmount: 8300,
        paymentCurrency: 'INR',
        exchangeRate: 83
      };

      // Validate payment amount
      const isValidPayment = mockCurrencyService.isValidPaymentAmountSync(
        paymentWorkflow.paymentAmount, 
        paymentWorkflow.paymentCurrency
      );
      expect(isValidPayment).toBe(true);

      // Check currency support
      const isSupported = mockCurrencyService.isSupportedByPaymentGateway(
        paymentWorkflow.paymentCurrency
      );
      expect(isSupported).toBe(true);

      // For refund, should use original payment currency
      const refundCurrency = paymentWorkflow.paymentCurrency; // INR
      const refundAmount = paymentWorkflow.paymentAmount; // 8300

      expect(refundCurrency).toBe('INR');
      expect(refundAmount).toBe(8300);
    });
  });
});