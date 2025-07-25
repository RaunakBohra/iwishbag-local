import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../UnifiedQuoteCard';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

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

// Test data
const mockQuote: UnifiedQuote = {
  id: 'test-quote-id',
  display_id: 'QT-12345',
  user_id: 'test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 159.99,
  item_price: 120.0,
  sales_tax_price: 9.6,
  merchant_shipping_price: 8.0,
  international_shipping: 15.0,
  customs_and_ecs: 4.8,
  domestic_shipping: 2.59,
  handling_charge: 0.0,
  insurance_amount: 0.0,
  payment_gateway_fee: 0.0,
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
    formatted: '123 Test St, Mumbai, Maharashtra 400001, India',
  },
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      description: 'A great test product',
      quantity: 2,
      price: 60.0,
      product_url: 'https://amazon.com/test-product',
      image_url: 'https://example.com/image.jpg',
    },
  ],
  notes: 'Test notes for the quote',
  admin_notes: 'Admin test notes',
  priority: 'medium',
  in_cart: false,
  attachments: [],
};

// Helper function to render component with providers
const renderUnifiedQuoteCard = (props: Partial<Parameters<typeof UnifiedQuoteCard>[0]> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    quote: mockQuote,
    viewMode: 'customer' as const,
    layout: 'card' as const,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>
          <UnifiedQuoteCard {...defaultProps} />
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('UnifiedQuoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render quote card with basic information', () => {
      renderUnifiedQuoteCard();

      expect(screen.getByText('QT-12345')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('$159.99')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display fallback ID when display_id is missing', () => {
      const quoteWithoutDisplayId = { ...mockQuote, display_id: null };
      renderUnifiedQuoteCard({ quote: quoteWithoutDisplayId });

      expect(screen.getByText('#test-quo')).toBeInTheDocument(); // First 8 chars of ID
    });

    it('should handle missing customer data gracefully', () => {
      const quoteWithoutCustomer = {
        ...mockQuote,
        customer_data: null,
      };
      renderUnifiedQuoteCard({ quote: quoteWithoutCustomer });

      expect(screen.getByText('Unknown Customer')).toBeInTheDocument();
    });
  });

  describe('View Mode Adaptations', () => {
    it('should show selection checkbox in admin view', () => {
      renderUnifiedQuoteCard({ viewMode: 'admin' });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should hide selection checkbox in customer view', () => {
      renderUnifiedQuoteCard({ viewMode: 'customer' });

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should hide selection checkbox in guest view', () => {
      renderUnifiedQuoteCard({ viewMode: 'guest' });

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should show detailed info for customer and admin views', () => {
      renderUnifiedQuoteCard({ viewMode: 'customer' });
      expect(screen.getByText('john@example.com')).toBeInTheDocument();

      renderUnifiedQuoteCard({ viewMode: 'admin' });
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('should render compact layout correctly', () => {
      renderUnifiedQuoteCard({ layout: 'compact' });

      // In compact layout, some details should be hidden or truncated
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('$159.99')).toBeInTheDocument();
    });

    it('should render list layout correctly', () => {
      renderUnifiedQuoteCard({ layout: 'list' });

      expect(screen.getByText('QT-12345')).toBeInTheDocument();
      expect(screen.getByText('sent')).toBeInTheDocument();
    });

    it('should render detail layout correctly', () => {
      renderUnifiedQuoteCard({ layout: 'detail' });

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display correct status colors', () => {
      const { container } = renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'approved' },
      });

      const statusIndicator = container.querySelector('.bg-green-500');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should show appropriate actions based on status', async () => {
      // Test 'sent' status shows approve/reject buttons
      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      expect(screen.getByText('Approve')).toBeInTheDocument();

      // Test 'approved' status shows add to cart button
      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'approved' },
        viewMode: 'customer',
      });

      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('should sanitize potentially malicious content', () => {
      const maliciousQuote = {
        ...mockQuote,
        display_id: '<script>alert("xss")</script>SAFE-ID',
        customer_data: {
          info: {
            name: '<img src=x onerror=alert("xss")>John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
          },
        },
        items: [
          {
            id: 'item-1',
            name: '<script>alert("xss")</script>Clean Product Name',
            description: 'Clean description',
            quantity: 1,
            price: 60.0,
            product_url: 'https://example.com/product',
            image_url: 'https://example.com/image.jpg',
          },
        ],
      };

      renderUnifiedQuoteCard({ quote: maliciousQuote });

      // Should display sanitized content without scripts
      expect(screen.getByText('SAFE-ID')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Clean Product Name')).toBeInTheDocument();

      // Should not render script tags
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('should handle invalid quote data gracefully', () => {
      const invalidQuote = {
        ...mockQuote,
        final_total_usd: 'invalid-number' as any,
        created_at: 'invalid-date',
      };

      renderUnifiedQuoteCard({ quote: invalidQuote });

      // Should show error state
      expect(screen.getByText('Invalid quote data')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics in detailed mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteCard({
        performanceMode: 'detailed',
        quote: mockQuote,
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteCard Performance:'),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should not log performance metrics in fast mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteCard({
        performanceMode: 'fast',
        quote: mockQuote,
      });

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('UnifiedQuoteCard Performance:'),
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('User Interactions', () => {
    it('should handle card click navigation', async () => {
      const user = userEvent.setup();
      const { container } = renderUnifiedQuoteCard({ viewMode: 'customer' });

      const card = container.querySelector('.quote-card');
      expect(card).toBeInTheDocument();

      await user.click(card!);

      // Should track conversion event
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_approval_colors',
        variant: 'control',
        action: 'guest_quote_view',
        value: undefined,
        user_id: expect.any(String),
      });
    });

    it('should handle action button clicks', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
      });

      const approveButton = screen.getByText('Approve');
      await user.click(approveButton);

      expect(mockOnAction).toHaveBeenCalledWith('approve', mockQuote);
    });

    it('should handle selection changes in admin view', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      renderUnifiedQuoteCard({
        viewMode: 'admin',
        onSelect: mockOnSelect,
        isSelected: false,
      });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnSelect).toHaveBeenCalledWith('test-quote-id', true);
    });
  });

  describe('A/B Testing Integration', () => {
    it('should apply color variant classes', () => {
      const { container } = renderUnifiedQuoteCard();

      expect(container.querySelector('.color-variant-control')).toBeInTheDocument();
    });

    it('should track conversion events for A/B testing', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const approveButton = screen.getByText('Approve');
      await user.click(approveButton);

      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_approval_colors',
        variant: 'control',
        action: 'quote_approved',
        value: undefined,
        user_id: expect.any(String),
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = renderUnifiedQuoteCard({ layout: 'compact' });

      // Should have mobile-specific classes
      expect(container.querySelector('.quote-card--compact')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderUnifiedQuoteCard({ viewMode: 'admin' });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const approveButton = screen.getByText('Approve');

      // Should be focusable
      approveButton.focus();
      expect(approveButton).toHaveFocus();

      // Should be activatable with Enter key
      const mockOnAction = vi.fn();
      renderUnifiedQuoteCard({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
      });

      const newApproveButton = screen.getByText('Approve');
      newApproveButton.focus();
      await user.keyboard('{Enter}');

      expect(mockOnAction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error state for invalid quotes', () => {
      const invalidQuote = null as any;

      renderUnifiedQuoteCard({ quote: invalidQuote });

      expect(screen.getByText('Invalid quote data')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle missing required fields', () => {
      const incompleteQuote = {
        id: 'test-id',
        // Missing required fields
      } as any;

      renderUnifiedQuoteCard({ quote: incompleteQuote });

      expect(screen.getByText('Invalid quote data')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should apply customer theme colors', () => {
      const { container } = renderUnifiedQuoteCard({ viewMode: 'customer' });

      // Should have customer theme class
      expect(container.querySelector('.quote-card--customer')).toBeInTheDocument();
    });

    it('should apply admin theme colors', () => {
      const { container } = renderUnifiedQuoteCard({ viewMode: 'admin' });

      // Should have admin theme class
      expect(container.querySelector('.quote-card--admin')).toBeInTheDocument();
    });
  });
});
