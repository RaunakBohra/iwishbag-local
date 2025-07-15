import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { StripePaymentForm } from '../StripePaymentForm';

// Mock Stripe hooks and components
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    confirmCardPayment: vi.fn(),
  }),
  useElements: () => ({
    getElement: vi.fn(() => ({})),
  }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
  },
}));

const mockProps = {
  client_secret: 'pi_test_1234567890_secret_test',
  amount: 1000,
  currency: 'USD',
  onSuccess: vi.fn(),
  onError: vi.fn(),
};

describe('StripePaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render payment form with correct title and description', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getByText('Secure Payment')).toBeInTheDocument();
      expect(screen.getByText(/Complete your payment of/)).toBeInTheDocument();
      expect(screen.getAllByText(/\$1,000\.00/)).toHaveLength(2); // Description and button
    });

    test('should render Stripe Elements wrapper', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    });

    test('should render card element', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getByTestId('card-element')).toBeInTheDocument();
      expect(screen.getByText('Card Information')).toBeInTheDocument();
    });

    test('should render payment button with correct text', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button', { name: /Pay \$1,000\.00/ });
      expect(payButton).toBeInTheDocument();
    });

    test('should render without amount when not provided', () => {
      const propsWithoutAmount = { ...mockProps, amount: undefined };
      render(<StripePaymentForm {...propsWithoutAmount} />);
      
      expect(screen.getByText('Enter your payment information below')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Complete Payment/ })).toBeInTheDocument();
    });
  });

  describe('Currency Handling', () => {
    test('should format USD currency correctly', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getAllByText(/\$1,000\.00/)).toHaveLength(2); // Description and button
    });

    test('should format EUR currency correctly', () => {
      const eurProps = { ...mockProps, currency: 'EUR', amount: 850 };
      render(<StripePaymentForm {...eurProps} />);
      
      expect(screen.getAllByText(/€850\.00/)).toHaveLength(2); // Description and button
    });

    test('should format INR currency correctly', () => {
      const inrProps = { ...mockProps, currency: 'INR', amount: 83000 };
      render(<StripePaymentForm {...inrProps} />);
      
      expect(screen.getAllByText(/₹83,000\.00/)).toHaveLength(2); // Description and button
    });

    test('should handle currency case insensitivity', () => {
      const lowerCaseProps = { ...mockProps, currency: 'usd' };
      render(<StripePaymentForm {...lowerCaseProps} />);
      
      expect(screen.getAllByText(/\$1,000\.00/)).toHaveLength(2); // Description and button
    });
  });

  describe('Form Interaction', () => {
    test('should have payment button initially enabled when Stripe is ready', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      // Button should be enabled when Stripe elements are ready
      expect(payButton).not.toBeDisabled();
    });

    test('should show loading state when processing payment', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      // Mock a slow payment confirmation
      mockStripe.confirmCardPayment.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ paymentIntent: { id: 'pi_123' } }), 1000))
      );

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    test('should prevent form submission when Stripe is not ready', async () => {
      // Mock Stripe not being ready
      vi.doMock('@stripe/react-stripe-js', () => ({
        ...vi.importActual('@stripe/react-stripe-js'),
        useStripe: () => null,
        useElements: () => null,
      }));

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Stripe is not ready/)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Success Flow', () => {
    test('should show success state after successful payment', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      const mockPaymentIntent = {
        id: 'pi_1234567890',
        status: 'succeeded',
        amount: 100000, // Stripe uses cents
      };

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
      });

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
        expect(screen.getByText('Your payment has been processed successfully.')).toBeInTheDocument();
        expect(screen.getByText('pi_1234567890')).toBeInTheDocument();
        expect(screen.getByText('succeeded')).toBeInTheDocument();
      });
    });

    test('should call onSuccess callback with payment intent', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      const onSuccessMock = vi.fn();
      
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' };
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent,
      });

      render(<StripePaymentForm {...mockProps} onSuccess={onSuccessMock} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalledWith(mockPaymentIntent);
      });
    });

    test('should display payment details in success state', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      });

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Payment ID:')).toBeInTheDocument();
        expect(screen.getByText('Amount:')).toBeInTheDocument();
        expect(screen.getByText('Status:')).toBeInTheDocument();
        expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error when payment fails', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        error: {
          message: 'Your card was declined.',
          type: 'card_error',
        },
      });

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Your card was declined.')).toBeInTheDocument();
      });
    });

    test('should call onError callback when payment fails', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      const onErrorMock = vi.fn();
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        error: { message: 'Payment failed' },
      });

      render(<StripePaymentForm {...mockProps} onError={onErrorMock} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledWith('Payment failed');
      });
    });

    test('should handle card element not found error', async () => {
      const { useElements } = await import('@stripe/react-stripe-js');
      const mockElements = useElements() as any;
      
      mockElements.getElement.mockReturnValue(null);

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Card element not found/)).toBeInTheDocument();
      });
    });

    test('should handle unexpected errors gracefully', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      mockStripe.confirmCardPayment.mockRejectedValue(new Error('Network error'));

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('should handle unknown errors', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      mockStripe.confirmCardPayment.mockRejectedValue('Unknown error');

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    test('should apply custom className', () => {
      const { container } = render(
        <StripePaymentForm {...mockProps} className="custom-class" />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    test('should handle missing callbacks gracefully', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_123', status: 'succeeded' },
      });

      const propsWithoutCallbacks = {
        client_secret: mockProps.client_secret,
        amount: mockProps.amount,
        currency: mockProps.currency,
      };

      expect(() => {
        render(<StripePaymentForm {...propsWithoutCallbacks} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getByLabelText('Card Information')).toBeInTheDocument();
    });

    test('should have accessible button text', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      expect(payButton).toHaveAccessibleName(/Pay \$1,000\.00/);
    });

    test('should show loading state in accessible way', async () => {
      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      // Check if button becomes disabled during loading
      await waitFor(() => {
        expect(payButton).toBeDisabled();
      });
    });
  });

  describe('Security Features', () => {
    test('should mention security in UI', () => {
      render(<StripePaymentForm {...mockProps} />);
      
      expect(screen.getByText('Your payment information is secure and encrypted.')).toBeInTheDocument();
      expect(screen.getByText('Powered by Stripe')).toBeInTheDocument();
    });

    test('should use client_secret for payment confirmation', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;

      render(<StripePaymentForm {...mockProps} />);
      
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          mockProps.client_secret,
          expect.any(Object)
        );
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete payment workflow', async () => {
      const { useStripe } = await import('@stripe/react-stripe-js');
      const mockStripe = useStripe() as any;
      const onSuccessMock = vi.fn();
      
      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: { 
          id: 'pi_integration_test',
          status: 'succeeded',
          amount: 100000,
        },
      });

      render(<StripePaymentForm {...mockProps} onSuccess={onSuccessMock} />);
      
      // 1. Initial render shows payment form
      expect(screen.getByText('Secure Payment')).toBeInTheDocument();
      
      // 2. Submit payment
      const payButton = screen.getByRole('button');
      fireEvent.click(payButton);
      
      // 3. Success state is shown
      await waitFor(() => {
        expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      });
      
      // 4. Callback is called
      expect(onSuccessMock).toHaveBeenCalled();
    });

    test('should work with different currencies and amounts', async () => {
      const testCases = [
        { amount: 500, currency: 'EUR', expected: '€500.00' },
        { amount: 75000, currency: 'INR', expected: '₹75,000.00' },
        { amount: 1500, currency: 'GBP', expected: '£1,500.00' },
      ];

      for (const testCase of testCases) {
        const props = { ...mockProps, amount: testCase.amount, currency: testCase.currency };
        const { rerender } = render(<StripePaymentForm {...props} />);
        
        expect(screen.getByText(new RegExp(testCase.expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      }
    });
  });
});