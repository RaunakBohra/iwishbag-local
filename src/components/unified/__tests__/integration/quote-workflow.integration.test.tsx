import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Mock cart operations
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: vi.fn().mockResolvedValue({ success: true }),
    items: [],
    totalCount: 0,
  }),
}));

// Mock payment operations
vi.mock('@/hooks/usePayment', () => ({
  usePayment: () => ({
    initiatePayment: vi.fn().mockResolvedValue({
      success: true,
      paymentUrl: 'https://payment.example.com',
    }),
  }),
}));

// Mock server validation
const mockServerValidation = {
  validateUrl: vi.fn().mockResolvedValue({
    valid: true,
    productName: 'MacBook Pro 16"',
    price: 2499.99,
  }),
  checkDuplicate: vi.fn().mockResolvedValue({
    isDuplicate: false,
  }),
};

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
  },
});

// Mock gtag for analytics
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
});

// Test data representing the complete workflow
const guestQuoteData = {
  productUrl: 'https://amazon.com/macbook-pro-16',
  productName: 'MacBook Pro 16"',
  description: 'Latest MacBook Pro with M3 chip',
  quantity: 1,
  estimatedPrice: 2499.99,
  destinationCountry: 'IN',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+1234567890',
  notes: 'Need this urgently for work',
};

const mockWorkflowQuote: UnifiedQuote = {
  id: 'workflow-quote-id',
  display_id: 'QT-WF001',
  user_id: 'guest-user-id',
  status: 'pending',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 2799.99,
  item_price: 2499.99,
  sales_tax_price: 199.99,
  merchant_shipping_price: 29.99,
  international_shipping: 49.99,
  customs_and_ecs: 124.99,
  domestic_shipping: 15.99,
  handling_charge: 10.0,
  insurance_amount: 25.0,
  payment_gateway_fee: 35.0,
  vat: 0.0,
  discount: 0.0,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
  },
  shipping_address: {
    formatted: '123 Business Park, Bangalore, Karnataka 560001, India',
  },
  items: [
    {
      id: 'item-workflow',
      name: 'MacBook Pro 16"',
      description: 'Latest MacBook Pro with M3 chip',
      quantity: 1,
      price: 2499.99,
      product_url: 'https://amazon.com/macbook-pro-16',
      image_url: 'https://example.com/macbook.jpg',
    },
  ],
  notes: 'Need this urgently for work',
  admin_notes: '',
  priority: 'high',
  in_cart: false,
  attachments: [],
};

// Helper function to render components with providers
const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>{component}</QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('Complete Quote Workflow Integration Tests', () => {
  let mockQuoteOperations: {
    createQuote: ReturnType<typeof vi.fn>;
    updateQuoteStatus: ReturnType<typeof vi.fn>;
    sendQuote: ReturnType<typeof vi.fn>;
    approveQuote: ReturnType<typeof vi.fn>;
    addToCart: ReturnType<typeof vi.fn>;
    processPayment: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Mock quote operations that would normally come from API
    mockQuoteOperations = {
      createQuote: vi.fn().mockResolvedValue({
        success: true,
        quote: { ...mockWorkflowQuote, status: 'pending' },
      }),
      updateQuoteStatus: vi.fn().mockResolvedValue({ success: true }),
      sendQuote: vi.fn().mockResolvedValue({ success: true }),
      approveQuote: vi.fn().mockResolvedValue({ success: true }),
      addToCart: vi.fn().mockResolvedValue({ success: true }),
      processPayment: vi.fn().mockResolvedValue({
        success: true,
        paymentUrl: 'https://payment.example.com',
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Phase 1: Guest User Quote Creation', () => {
    it('should allow guest user to create a complete quote request', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockQuoteOperations.createQuote}
          serverValidation={mockServerValidation}
          enableFileUpload={true}
        />,
      );

      // Fill out the form with complete guest data
      await user.type(screen.getByLabelText(/product url/i), guestQuoteData.productUrl);

      // Wait for server validation to populate fields
      await waitFor(
        () => {
          expect(screen.getByDisplayValue('MacBook Pro 16"')).toBeInTheDocument();
          expect(screen.getByDisplayValue('2499.99')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      await user.type(screen.getByLabelText(/quantity/i), guestQuoteData.quantity.toString());
      await user.selectOptions(
        screen.getByLabelText(/destination country/i),
        guestQuoteData.destinationCountry,
      );

      // Guest-specific fields
      await user.type(screen.getByLabelText(/your name/i), guestQuoteData.customerName);
      await user.type(screen.getByLabelText(/email address/i), guestQuoteData.customerEmail);
      await user.type(screen.getByLabelText(/phone number/i), guestQuoteData.customerPhone);
      await user.type(screen.getByLabelText(/special notes/i), guestQuoteData.notes);

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockQuoteOperations.createQuote).toHaveBeenCalledWith(
          expect.objectContaining({
            productUrl: guestQuoteData.productUrl,
            productName: 'MacBook Pro 16"',
            quantity: 1,
            destinationCountry: 'IN',
            customerName: guestQuoteData.customerName,
            customerEmail: guestQuoteData.customerEmail,
            customerPhone: guestQuoteData.customerPhone,
            notes: guestQuoteData.notes,
          }),
          [], // No files uploaded
        );
      });

      // Should track quote creation event
      expect(window.gtag).toHaveBeenCalledWith('event', 'quote_created', {
        source: 'guest_form',
        destination_country: 'IN',
        estimated_value: expect.any(Number),
        user_type: 'guest',
      });
    });

    it('should validate guest data thoroughly before submission', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockQuoteOperations.createQuote}
          enableRealTimeValidation={true}
        />,
      );

      // Try to submit without required guest fields
      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
      });

      // Should not have called create quote
      expect(mockQuoteOperations.createQuote).not.toHaveBeenCalled();
    });
  });

  describe('Phase 2: Admin Quote Processing', () => {
    it('should allow admin to review and process pending quote', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        if (action === 'send') {
          return mockQuoteOperations.sendQuote(quote.id);
        }
        return { success: true };
      });

      // Render quote in admin view for processing
      renderWithProviders(
        <UnifiedQuoteCard
          quote={{ ...mockWorkflowQuote, status: 'pending' }}
          viewMode="admin"
          layout="detail"
          onAction={mockOnAction}
        />,
      );

      // Admin should see quote details
      expect(screen.getByText('QT-WF001')).toBeInTheDocument();
      expect(screen.getByText('MacBook Pro 16"')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();

      // Admin can edit quote details
      expect(screen.getByText('Edit Quote')).toBeInTheDocument();

      // Admin processes and sends quote
      const sendButton = screen.getByText('Send Quote');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith(
          'send',
          expect.objectContaining({ id: 'workflow-quote-id' }),
        );
      });

      // Should track admin action
      expect(window.gtag).toHaveBeenCalledWith('event', 'admin_quote_action', {
        action: 'send',
        quote_id: 'workflow-quote-id',
        quote_value: expect.any(Number),
      });
    });

    it('should display comprehensive quote breakdown for admin review', async () => {
      renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={mockWorkflowQuote}
          viewMode="admin"
          performanceMode="detailed"
        />,
      );

      // Admin should see detailed breakdown with precise amounts
      expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
      expect(screen.getByText('$2,499.9900')).toBeInTheDocument(); // Item cost with admin precision
      expect(screen.getByText('$199.9900')).toBeInTheDocument(); // Sales tax
      expect(screen.getByText('$2,799.99')).toBeInTheDocument(); // Final total

      // Should show all line items
      expect(screen.getByText('Item Cost')).toBeInTheDocument();
      expect(screen.getByText('Sales Tax')).toBeInTheDocument();
      expect(screen.getByText('International Shipping')).toBeInTheDocument();
      expect(screen.getByText('Customs & Duties')).toBeInTheDocument();
      expect(screen.getByText('Payment Processing')).toBeInTheDocument();
    });
  });

  describe('Phase 3: Customer Quote Approval', () => {
    it('should allow customer to review and approve sent quote', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        if (action === 'approve') {
          return mockQuoteOperations.approveQuote(quote.id);
        }
        return { success: true };
      });

      // Render quote in customer view for approval
      renderWithProviders(
        <UnifiedQuoteCard
          quote={{ ...mockWorkflowQuote, status: 'sent' }}
          viewMode="customer"
          layout="detail"
          onAction={mockOnAction}
        />,
      );

      // Customer should see quote ready for approval
      expect(screen.getByText('QT-WF001')).toBeInTheDocument();
      expect(screen.getByText('sent')).toBeInTheDocument();
      expect(screen.getByText('Approve Quote')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();

      // Customer reviews breakdown
      expect(screen.getByText('$2,799.99')).toBeInTheDocument(); // Customer precision

      // Customer approves quote
      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith(
          'approve',
          expect.objectContaining({ status: 'sent' }),
        );
      });

      // Should track customer conversion
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_approval_colors',
        variant: 'control',
        action: 'quote_approved',
        value: undefined,
        user_id: expect.any(String),
      });
    });

    it('should show customer-friendly breakdown without admin details', async () => {
      renderWithProviders(
        <UnifiedQuoteBreakdown quote={mockWorkflowQuote} viewMode="customer" showSavings={false} />,
      );

      // Customer should see simplified breakdown
      expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
      expect(screen.getByText('$2,499.99')).toBeInTheDocument(); // Customer precision (2 decimal places)
      expect(screen.getByText('$2,799.99')).toBeInTheDocument(); // Final total

      // Should not show admin-specific details
      expect(screen.queryByText('Calculation Variance')).not.toBeInTheDocument();
      expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
    });
  });

  describe('Phase 4: Cart and Checkout Process', () => {
    it('should allow adding approved quote to cart', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        if (action === 'addToCart') {
          return mockQuoteOperations.addToCart(quote.id);
        }
        return { success: true };
      });

      // Render approved quote with cart option
      renderWithProviders(
        <UnifiedQuoteCard
          quote={{ ...mockWorkflowQuote, status: 'approved' }}
          viewMode="customer"
          layout="detail"
          onAction={mockOnAction}
        />,
      );

      // Should show add to cart option
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();

      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith(
          'addToCart',
          expect.objectContaining({ status: 'approved' }),
        );
      });

      // Should track cart addition
      expect(window.gtag).toHaveBeenCalledWith('event', 'add_to_cart', {
        currency: 'USD',
        value: 2799.99,
        items: [
          {
            item_id: 'workflow-quote-id',
            item_name: 'MacBook Pro 16"',
            category: 'Electronics',
            quantity: 1,
            price: 2799.99,
          },
        ],
      });
    });

    it('should handle payment initiation for cart items', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        if (action === 'proceedToPayment') {
          return mockQuoteOperations.processPayment(quote.id);
        }
        return { success: true };
      });

      // Render quote in cart ready for payment
      renderWithProviders(
        <UnifiedQuoteCard
          quote={{ ...mockWorkflowQuote, status: 'approved', in_cart: true }}
          viewMode="customer"
          layout="detail"
          onAction={mockOnAction}
        />,
      );

      expect(screen.getByText('Proceed to Payment')).toBeInTheDocument();

      const paymentButton = screen.getByText('Proceed to Payment');
      await user.click(paymentButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith(
          'proceedToPayment',
          expect.objectContaining({ in_cart: true }),
        );
      });

      // Should track payment initiation
      expect(window.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
        currency: 'USD',
        value: 2799.99,
        items: [
          {
            item_id: 'workflow-quote-id',
            item_name: 'MacBook Pro 16"',
            category: 'Electronics',
            quantity: 1,
            price: 2799.99,
          },
        ],
      });
    });
  });

  describe('Phase 5: View Mode Switching Integration', () => {
    it('should maintain data consistency across view mode switches', async () => {
      const currentViewMode: 'guest' | 'customer' | 'admin' = 'guest';

      const TestViewSwitcher = () => {
        const [viewMode, setViewMode] = React.useState<'guest' | 'customer' | 'admin'>('guest');

        return (
          <div>
            <button onClick={() => setViewMode('guest')}>Guest View</button>
            <button onClick={() => setViewMode('customer')}>Customer View</button>
            <button onClick={() => setViewMode('admin')}>Admin View</button>

            <UnifiedQuoteCard quote={mockWorkflowQuote} viewMode={viewMode} layout="detail" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<TestViewSwitcher />);

      // Should start in guest view
      expect(screen.getByText('Guest View')).toBeInTheDocument();
      expect(screen.getByText('QT-WF001')).toBeInTheDocument();

      // Switch to customer view
      await user.click(screen.getByText('Customer View'));
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); // No selection in customer view

      // Switch to admin view
      await user.click(screen.getByText('Admin View'));
      expect(screen.getByRole('checkbox')).toBeInTheDocument(); // Selection available in admin view
      expect(screen.getByText('Edit Quote')).toBeInTheDocument();

      // Data should remain consistent across all views
      expect(screen.getByText('QT-WF001')).toBeInTheDocument();
      expect(screen.getByText('MacBook Pro 16"')).toBeInTheDocument();
    });
  });

  describe('Phase 6: A/B Testing Integration Across Workflow', () => {
    it('should track A/B test conversions throughout the workflow', async () => {
      const user = userEvent.setup();

      // Test form submission tracking
      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockQuoteOperations.createQuote}
        />,
      );

      // Fill minimal form data
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      // Should track form conversion
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_form_layout',
        variant: 'control',
        action: 'form_submitted',
        value: 1,
      });

      // Test approval tracking
      renderWithProviders(
        <UnifiedQuoteActions
          quote={{ ...mockWorkflowQuote, status: 'sent' }}
          viewMode="customer"
          onAction={vi.fn()}
        />,
      );

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      // Should track approval conversion
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_approval_colors',
        variant: 'control',
        action: 'action_approve',
        value: 1,
        user_id: 'test-user-id',
      });
    });
  });

  describe('Phase 7: Error Handling Across Workflow', () => {
    it('should handle errors gracefully at each workflow stage', async () => {
      const user = userEvent.setup();

      // Test form submission error
      const failingCreateQuote = vi.fn().mockRejectedValue(new Error('Server error'));

      renderWithProviders(
        <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={failingCreateQuote} />,
      );

      // Fill form and submit
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });

      // Test action error handling
      const failingAction = vi.fn().mockRejectedValue(new Error('Action failed'));

      renderWithProviders(
        <UnifiedQuoteActions
          quote={{ ...mockWorkflowQuote, status: 'sent' }}
          viewMode="customer"
          onAction={failingAction}
        />,
      );

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/Action failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Phase 8: Performance Integration', () => {
    it('should maintain performance across complex workflow scenarios', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Render multiple components simultaneously (dashboard scenario)
      const quotes = Array.from({ length: 20 }, (_, i) => ({
        ...mockWorkflowQuote,
        id: `quote-${i}`,
        display_id: `QT-${i.toString().padStart(3, '0')}`,
      }));

      renderWithProviders(
        <div>
          <UnifiedQuoteList
            quotes={quotes}
            viewMode="admin"
            layout="list"
            enableVirtualScrolling={true}
            performanceMode="detailed"
          />
          <UnifiedQuoteBreakdown
            quote={mockWorkflowQuote}
            viewMode="admin"
            performanceMode="detailed"
          />
        </div>,
      );

      await waitFor(() => {
        // Should log performance metrics for both components
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteList Performance:'),
          expect.any(Object),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteBreakdown Performance:'),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
