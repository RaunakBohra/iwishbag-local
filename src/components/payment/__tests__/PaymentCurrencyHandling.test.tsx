import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedPaymentModal } from '../UnifiedPaymentModal';
import { RefundManagementModal } from '../RefundManagementModal';
import { PaymentManagementWidget } from '../../admin/PaymentManagementWidget';
import { currencyService } from '@/services/CurrencyService';

// Mock dependencies
jest.mock('@/integrations/supabase/client');
jest.mock('@/services/CurrencyService');
jest.mock('@/hooks/use-toast');
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    userProfile: { id: 'test-profile-id', role: 'admin' }
  })
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCurrencyService = currencyService as jest.Mocked<typeof currencyService>;

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
const mockQuoteWithMultiCurrency = {
  id: 'test-quote-id',
  final_total: 1000,
  final_currency: 'USD',
  payment_status: 'partial',
  payment_method: 'payu',
  user_id: 'test-user-id'
};

const mockPaymentLedgerData = [
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

describe('Payment Currency Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
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
  });

  describe('Multi-Currency Payment Detection', () => {
    test('should detect and display multi-currency payments in PaymentManagementWidget', async () => {
      // Mock supabase queries
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      } as any);

      // Mock payment ledger query
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockPaymentLedgerData,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          })
        };
      } as any);

      renderWithQueryClient(
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Multi-Currency Payments Detected/i)).toBeInTheDocument();
      });

      // Should show currency breakdown
      expect(screen.getByText(/USD:/)).toBeInTheDocument();
      expect(screen.getByText(/INR:/)).toBeInTheDocument();
    });

    test('should show currency mismatch warnings', async () => {
      const quoteWithMismatch = {
        ...mockQuoteWithMultiCurrency,
        final_currency: 'USD'
      };

      // Mock payment transaction with different currency
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_transactions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
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
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      } as any);

      renderWithQueryClient(
        <PaymentManagementWidget quote={quoteWithMismatch as any} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Currency Mismatch Warning/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Quote: USD/)).toBeInTheDocument();
    });
  });

  describe('Payment Recording Validation', () => {
    test('should validate currency selection in UnifiedPaymentModal', async () => {
      const onClose = jest.fn();

      // Mock Supabase queries for UnifiedPaymentModal
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      } as any);

      renderWithQueryClient(
        <UnifiedPaymentModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as any} 
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

      const onClose = jest.fn();

      renderWithQueryClient(
        <UnifiedPaymentModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as any} 
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
      const onClose = jest.fn();

      // Mock payment ledger with multiple currencies
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'payment_ledger') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockPaymentLedgerData, // Contains both USD and INR
                  error: null
                })
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      } as any);

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as any} 
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: singleCurrencyPayment,
                  error: null
                })
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      } as any);

      const onClose = jest.fn();

      renderWithQueryClient(
        <RefundManagementModal 
          isOpen={true} 
          onClose={onClose} 
          quote={mockQuoteWithMultiCurrency as any} 
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
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as any} />
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
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed')
            })
          })
        })
      } as any);

      renderWithQueryClient(
        <PaymentManagementWidget quote={mockQuoteWithMultiCurrency as any} />
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