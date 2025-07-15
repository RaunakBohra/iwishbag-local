import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Checkout from '../Checkout';

// Mock all the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    userProfile: { 
      id: 'test-profile-id', 
      preferred_display_currency: 'USD',
      role: 'user'
    },
  }),
}));

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [
      {
        id: 'quote-1',
        quoteId: 'quote-1',
        finalTotal: 1000,
        quantity: 1,
        in_cart: true,
        purchaseCountryCode: 'US',
        destinationCountryCode: 'IN',
        countryCode: 'US',
      },
    ],
    isLoading: false,
    clearCart: vi.fn(),
    removeFromCart: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePaymentGateways', () => ({
  usePaymentGateways: () => ({
    data: [
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'stripe',
        enabled: true,
        supported_currencies: ['USD', 'EUR', 'INR'],
        priority: 1,
      },
      {
        id: 'payu',
        name: 'PayU',
        type: 'payu',
        enabled: true,
        supported_currencies: ['INR', 'USD'],
        priority: 2,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useAllCountries', () => ({
  useAllCountries: () => ({
    data: [
      { code: 'US', name: 'United States', currency: 'USD' },
      { code: 'IN', name: 'India', currency: 'INR' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/services/CurrencyService', () => ({
  currencyService: {
    formatAmount: vi.fn((amount, currency) => `${currency} ${amount}`),
    getCurrencySymbol: vi.fn((currency) => ({
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
    }[currency] || currency)),
    isValidPaymentAmountSync: vi.fn(() => true),
    isSupportedByPaymentGateway: vi.fn(() => true),
  },
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    data: {
      id: 'test-profile-id',
      preferred_display_currency: 'USD',
      role: 'user',
    },
  }),
}));

vi.mock('@/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ({
    userCurrency: 'USD',
    exchangeRate: 1,
  }),
}));

vi.mock('@/hooks/useQuoteDisplayCurrency', () => ({
  useQuoteDisplayCurrency: () => ({
    formatAmount: vi.fn((amount) => `$${amount}`),
    displayCurrency: 'USD',
  }),
}));

vi.mock('@/hooks/useStatusManagement', () => ({
  useStatusManagement: () => ({
    updateQuoteStatus: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEmailNotifications', () => ({
  useEmailNotifications: () => ({
    sendPaymentLinkEmail: vi.fn(),
  }),
}));

vi.mock('@/services/CheckoutSessionService', () => ({
  checkoutSessionService: {
    createCheckoutSession: vi.fn(),
    processCheckout: vi.fn(),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Stripe components
vi.mock('@/components/payment/StripePaymentForm', () => ({
  StripePaymentForm: ({ onSuccess, onError, amount, currency }: any) => (
    <div data-testid="stripe-payment-form">
      <div>Stripe Payment Form</div>
      <div>Amount: {amount}</div>
      <div>Currency: {currency}</div>
      <button 
        onClick={() => onSuccess?.({ id: 'pi_test_success' })}
        data-testid="stripe-success-btn"
      >
        Simulate Success
      </button>
      <button 
        onClick={() => onError?.('Test error')}
        data-testid="stripe-error-btn"
      >
        Simulate Error
      </button>
    </div>
  ),
}));

vi.mock('@/components/payment/PaymentMethodSelector', () => ({
  PaymentMethodSelector: ({ onSelect, selectedMethod }: any) => (
    <div data-testid="payment-method-selector">
      <button 
        onClick={() => onSelect('stripe')}
        data-testid="select-stripe"
        className={selectedMethod === 'stripe' ? 'selected' : ''}
      >
        Stripe
      </button>
      <button 
        onClick={() => onSelect('payu')}
        data-testid="select-payu"
        className={selectedMethod === 'payu' ? 'selected' : ''}
      >
        PayU
      </button>
    </div>
  ),
}));

vi.mock('@/components/payment/QRPaymentModal', () => ({
  QRPaymentModal: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="qr-payment-modal">
        <div>QR Payment Modal</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/payment/PaymentStatusTracker', () => ({
  PaymentStatusTracker: ({ transactionId }: any) => (
    <div data-testid="payment-status-tracker">
      <div>Tracking: {transactionId}</div>
    </div>
  ),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Checkout - Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock search params for checkout
    Object.defineProperty(window, 'location', {
      value: {
        search: '?payment_method=stripe',
      },
      writable: true,
    });
  });

  describe('Stripe Payment Gateway Selection', () => {
    test('should display Stripe as payment option', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
      });

      expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
    });

    test('should allow selection of Stripe payment method', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toHaveClass('selected');
      });
    });

    test('should show Stripe payment form when Stripe is selected', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      });
    });
  });

  describe('Stripe Payment Form Integration', () => {
    test('should pass correct amount and currency to Stripe form', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        const stripeForm = screen.getByTestId('stripe-payment-form');
        expect(stripeForm).toBeInTheDocument();
        expect(screen.getByText('Amount: 1000')).toBeInTheDocument();
        expect(screen.getByText('Currency: USD')).toBeInTheDocument();
      });
    });

    test('should handle successful Stripe payment', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-success-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('stripe-success-btn'));

      // Should show payment success indicators
      await waitFor(() => {
        expect(screen.getByTestId('payment-status-tracker')).toBeInTheDocument();
      });
    });

    test('should handle Stripe payment errors', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-error-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('stripe-error-btn'));

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Currency Support', () => {
    test('should handle USD payments through Stripe', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByText('Currency: USD')).toBeInTheDocument();
      });
    });

    test('should validate currency support before showing Stripe', async () => {
      const { currencyService } = await import('@/services/CurrencyService');
      
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      expect(currencyService.isSupportedByPaymentGateway).toHaveBeenCalledWith('USD');
    });
  });

  describe('Checkout Flow Integration', () => {
    test('should complete full checkout flow with Stripe', async () => {
      renderWithProviders(<Checkout />);

      // 1. Select Stripe payment method
      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      // 2. Stripe form appears
      await waitFor(() => {
        expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      });

      // 3. Simulate successful payment
      fireEvent.click(screen.getByTestId('stripe-success-btn'));

      // 4. Payment tracking should appear
      await waitFor(() => {
        expect(screen.getByTestId('payment-status-tracker')).toBeInTheDocument();
      });
    });

    test('should handle checkout with shipping address', async () => {
      renderWithProviders(<Checkout />);

      // Check that shipping address form is present
      await waitFor(() => {
        expect(screen.getByText(/shipping/i) || screen.getByText(/address/i)).toBeInTheDocument();
      });

      // Select Stripe and proceed
      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Gateway Priority', () => {
    test('should respect payment gateway priority order', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        const paymentSelector = screen.getByTestId('payment-method-selector');
        expect(paymentSelector).toBeInTheDocument();
      });

      // Stripe should appear (priority 1 in mock)
      expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      // PayU should also appear (priority 2 in mock)
      expect(screen.getByTestId('select-payu')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle payment gateway initialization errors', async () => {
      const { usePaymentGateways } = await import('@/hooks/usePaymentGateways');
      
      vi.mocked(usePaymentGateways).mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Gateway initialization failed'),
      } as any);

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    test('should handle cart loading errors', async () => {
      const { useCart } = await import('@/hooks/useCart');
      
      vi.mocked(useCart).mockReturnValue({
        items: [],
        isLoading: false,
        error: new Error('Cart loading failed'),
        clearCart: vi.fn(),
        removeFromCart: vi.fn(),
      } as any);

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading state while initializing', async () => {
      const { usePaymentGateways } = await import('@/hooks/usePaymentGateways');
      
      vi.mocked(usePaymentGateways).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    test('should show loading state while cart is loading', async () => {
      const { useCart } = await import('@/hooks/useCart');
      
      vi.mocked(useCart).mockReturnValue({
        items: [],
        isLoading: true,
        error: null,
        clearCart: vi.fn(),
        removeFromCart: vi.fn(),
      } as any);

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    test('should display security indicators', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/secure/i) || screen.getByText(/encrypted/i)).toBeInTheDocument();
      });
    });

    test('should validate payment amounts before processing', async () => {
      const { currencyService } = await import('@/services/CurrencyService');
      
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      expect(currencyService.isValidPaymentAmountSync).toHaveBeenCalledWith(1000, 'USD');
    });
  });

  describe('User Experience', () => {
    test('should provide clear payment method selection', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
      });

      expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    test('should show payment summary before processing', async () => {
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/total/i) || screen.getByText(/summary/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Backend', () => {
    test('should call checkout session service for Stripe payments', async () => {
      const { checkoutSessionService } = await import('@/services/CheckoutSessionService');
      
      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      });

      // Simulate successful payment
      fireEvent.click(screen.getByTestId('stripe-success-btn'));

      await waitFor(() => {
        expect(checkoutSessionService.processCheckout).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should render payment form on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('select-stripe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-stripe'));

      await waitFor(() => {
        expect(screen.getByTestId('stripe-payment-form')).toBeInTheDocument();
      });
    });
  });
});