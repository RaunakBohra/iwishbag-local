import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteBreakdown } from '../UnifiedQuoteBreakdown';
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

vi.mock('@/services/CurrencyService', () => ({
  currencyService: {
    getCurrency: vi.fn().mockResolvedValue({
      code: 'USD',
      symbol: '$',
      rate_from_usd: 1,
    }),
    getCurrencySymbol: vi.fn().mockReturnValue('$'),
    formatAmount: vi.fn((amount, currency) => `${currency} ${amount.toFixed(2)}`),
  },
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

// Test data with detailed breakdown
const mockQuoteWithBreakdown: UnifiedQuote = {
  id: 'test-quote-id',
  display_id: 'QT-12345',
  user_id: 'test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 159.99,
  item_price: 120.00,
  sales_tax_price: 9.60,
  merchant_shipping_price: 8.00,
  international_shipping: 15.00,
  customs_and_ecs: 4.80,
  domestic_shipping: 2.59,
  handling_charge: 5.00,
  insurance_amount: 3.00,
  payment_gateway_fee: 2.50,
  vat: 1.50,
  discount: 12.00,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  },
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      description: 'A great test product',
      quantity: 2,
      price: 60.00,
      product_url: 'https://amazon.com/test-product',
      image_url: 'https://example.com/image.jpg'
    }
  ]
};

// Helper function to render component with providers
const renderUnifiedQuoteBreakdown = (
  props: Partial<Parameters<typeof UnifiedQuoteBreakdown>[0]> = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    quote: mockQuoteWithBreakdown,
    viewMode: 'customer' as const,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>
          <UnifiedQuoteBreakdown {...defaultProps} />
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UnifiedQuoteBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render quote breakdown with title', () => {
      renderUnifiedQuoteBreakdown();

      expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
    });

    it('should display final total amount', () => {
      renderUnifiedQuoteBreakdown();

      expect(screen.getByText('$159.99')).toBeInTheDocument();
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
    });

    it('should show all breakdown line items', () => {
      renderUnifiedQuoteBreakdown();

      expect(screen.getByText('Item Cost')).toBeInTheDocument();
      expect(screen.getByText('Sales Tax')).toBeInTheDocument();
      expect(screen.getByText('Merchant Shipping')).toBeInTheDocument();
      expect(screen.getByText('International Shipping')).toBeInTheDocument();
      expect(screen.getByText('Customs & Duties')).toBeInTheDocument();
      expect(screen.getByText('Domestic Delivery')).toBeInTheDocument();
      expect(screen.getByText('Handling Fee')).toBeInTheDocument();
      expect(screen.getByText('Insurance')).toBeInTheDocument();
      expect(screen.getByText('Payment Processing')).toBeInTheDocument();
      expect(screen.getByText('VAT')).toBeInTheDocument();
      expect(screen.getByText('Discount')).toBeInTheDocument();
    });
  });

  describe('Currency Precision', () => {
    it('should display amounts with correct precision for customer view', () => {
      renderUnifiedQuoteBreakdown({ viewMode: 'customer' });

      // Customer view should show 2 decimal places
      expect(screen.getByText('$120.00')).toBeInTheDocument(); // Item cost
      expect(screen.getByText('$9.60')).toBeInTheDocument();   // Sales tax
    });

    it('should display amounts with higher precision for admin view', () => {
      renderUnifiedQuoteBreakdown({ viewMode: 'admin' });

      // Admin view should show 4 decimal places (though test might show 2 if amount is whole)
      expect(screen.getByText('$120.0000')).toBeInTheDocument(); // Item cost
      expect(screen.getByText('$9.6000')).toBeInTheDocument();   // Sales tax
    });

    it('should handle very small amounts correctly', () => {
      const quoteWithSmallAmounts = {
        ...mockQuoteWithBreakdown,
        payment_gateway_fee: 0.001,
        insurance_amount: 0.0001
      };

      renderUnifiedQuoteBreakdown({ 
        quote: quoteWithSmallAmounts,
        viewMode: 'admin' 
      });

      expect(screen.getByText('$0.0010')).toBeInTheDocument(); // Gateway fee
      expect(screen.getByText('$0.0001')).toBeInTheDocument(); // Insurance
    });
  });

  describe('View Mode Adaptations', () => {
    it('should show detailed breakdown for admin view', () => {
      renderUnifiedQuoteBreakdown({ viewMode: 'admin' });

      // Admin should see all breakdown items and estimates
      expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Estimate')).toBeInTheDocument(); // Customs estimate badge
    });

    it('should show customer-friendly breakdown', () => {
      renderUnifiedQuoteBreakdown({ viewMode: 'customer' });

      // Customer view should show breakdown but not admin-specific details
      expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
      expect(screen.queryByText('Calculation Variance')).not.toBeInTheDocument();
    });

    it('should show simplified view for guests', () => {
      renderUnifiedQuoteBreakdown({ viewMode: 'guest' });

      // Guest view should show minimal information
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
      expect(screen.getByText('$159.99')).toBeInTheDocument();
    });
  });

  describe('Price Validation', () => {
    it('should validate currency amounts', () => {
      const invalidQuote = {
        ...mockQuoteWithBreakdown,
        final_total_usd: -100 // Invalid negative amount
      };

      renderUnifiedQuoteBreakdown({ quote: invalidQuote });

      // Should show error state for invalid amounts
      expect(screen.getByText('Invalid quote data for breakdown')).toBeInTheDocument();
    });

    it('should handle extremely large amounts', () => {
      const quoteWithLargeAmount = {
        ...mockQuoteWithBreakdown,
        final_total_usd: 1500000 // Very large amount
      };

      renderUnifiedQuoteBreakdown({ quote: quoteWithLargeAmount });

      // Should handle large amounts without overflow
      expect(screen.getByText('$1,500,000.00')).toBeInTheDocument();
    });

    it('should detect calculation mismatches', () => {
      const inconsistentQuote = {
        ...mockQuoteWithBreakdown,
        // Manually set total that doesn't match calculated total
        final_total_usd: 200.00 // Different from calculated total
      };

      renderUnifiedQuoteBreakdown({ 
        quote: inconsistentQuote,
        viewMode: 'admin',
        performanceMode: 'detailed'
      });

      // Admin should see calculation variance warning
      expect(screen.getByText('Calculation Variance')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should trigger callback on amount changes when enabled', async () => {
      const mockOnAmountChange = vi.fn();

      renderUnifiedQuoteBreakdown({
        enableRealTimeUpdates: true,
        onAmountChange: mockOnAmountChange
      });

      // Should call callback with final total
      await waitFor(() => {
        expect(mockOnAmountChange).toHaveBeenCalledWith(159.99);
      });
    });

    it('should not trigger callback when real-time updates disabled', () => {
      const mockOnAmountChange = vi.fn();

      renderUnifiedQuoteBreakdown({
        enableRealTimeUpdates: false,
        onAmountChange: mockOnAmountChange
      });

      // Should not call callback
      expect(mockOnAmountChange).not.toHaveBeenCalled();
    });
  });

  describe('Interactive Features', () => {
    it('should handle line item clicks when callback provided', async () => {
      const user = userEvent.setup();
      const mockOnLineItemClick = vi.fn();

      renderUnifiedQuoteBreakdown({
        onLineItemClick: mockOnLineItemClick
      });

      const itemCostRow = screen.getByText('Item Cost').closest('div');
      await user.click(itemCostRow!);

      expect(mockOnLineItemClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'item-cost',
          label: 'Item Cost',
          amount: 120.00
        })
      );
    });

    it('should expand/collapse breakdown when toggle enabled', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteBreakdown({
        allowExpansion: true,
        compact: true
      });

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });
  });

  describe('Savings and Discounts', () => {
    it('should highlight savings when discounts present', () => {
      renderUnifiedQuoteBreakdown({ showSavings: true });

      expect(screen.getByText('You save $12.00')).toBeInTheDocument();
      expect(screen.getByText('Total Savings')).toBeInTheDocument();
    });

    it('should not show savings section when no discounts', () => {
      const quoteWithoutDiscount = {
        ...mockQuoteWithBreakdown,
        discount: 0
      };

      renderUnifiedQuoteBreakdown({ 
        quote: quoteWithoutDiscount,
        showSavings: true 
      });

      expect(screen.queryByText('You save')).not.toBeInTheDocument();
    });

    it('should highlight discount line items', () => {
      renderUnifiedQuoteBreakdown();

      const discountRow = screen.getByText('Discount').closest('div');
      expect(discountRow).toHaveClass('bg-green-50');
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics in detailed mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteBreakdown({
        performanceMode: 'detailed'
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteBreakdown Performance:'),
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should measure calculation time', async () => {
      const performanceSpy = vi.spyOn(performance, 'now');

      renderUnifiedQuoteBreakdown({
        performanceMode: 'detailed'
      });

      expect(performanceSpy).toHaveBeenCalled();
      performanceSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid quote data gracefully', () => {
      const invalidQuote = null as any;

      renderUnifiedQuoteBreakdown({ quote: invalidQuote });

      expect(screen.getByText('Invalid quote data for breakdown')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle missing currency conversion', () => {
      const quoteWithoutCurrency = {
        ...mockQuoteWithBreakdown,
        final_total_usd: undefined as any
      };

      renderUnifiedQuoteBreakdown({ quote: quoteWithoutCurrency });

      expect(screen.getByText('Invalid quote data for breakdown')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderUnifiedQuoteBreakdown();

      const heading = screen.getByRole('heading', { name: /quote breakdown/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible table structure for breakdown items', () => {
      renderUnifiedQuoteBreakdown();

      // Breakdown items should be in a structured list or table format
      const itemCost = screen.getByText('Item Cost');
      const itemCostValue = screen.getByText('$120.00');
      
      expect(itemCost).toBeInTheDocument();
      expect(itemCostValue).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnLineItemClick = vi.fn();

      renderUnifiedQuoteBreakdown({
        onLineItemClick: mockOnLineItemClick
      });

      const itemCostRow = screen.getByText('Item Cost').closest('div');
      
      // Should be focusable and clickable with keyboard
      itemCostRow?.focus();
      await user.keyboard('{Enter}');

      expect(mockOnLineItemClick).toHaveBeenCalled();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency according to locale', () => {
      renderUnifiedQuoteBreakdown({ displayCurrency: 'USD' });

      // Should use USD formatting
      expect(screen.getByText(/\$159\.99/)).toBeInTheDocument();
    });

    it('should handle different display currencies', () => {
      renderUnifiedQuoteBreakdown({ displayCurrency: 'EUR' });

      // Should convert and format for EUR (mocked)
      expect(screen.getByText('EUR 159.99')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should show condensed layout in compact mode', () => {
      renderUnifiedQuoteBreakdown({ compact: true });

      // Should show essential information only
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
      expect(screen.getByText('$159.99')).toBeInTheDocument();
    });

    it('should expand to full breakdown when toggled', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteBreakdown({ 
        compact: true,
        allowExpansion: true
      });

      const expandButton = screen.getByText('Expand');
      await user.click(expandButton);

      // Should now show full breakdown
      expect(screen.getByText('Item Cost')).toBeInTheDocument();
      expect(screen.getByText('Sales Tax')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should apply appropriate colors for customer view', () => {
      const { container } = renderUnifiedQuoteBreakdown({ viewMode: 'customer' });

      expect(container.querySelector('.quote-breakdown--customer')).toBeInTheDocument();
    });

    it('should apply professional styling for admin view', () => {
      const { container } = renderUnifiedQuoteBreakdown({ viewMode: 'admin' });

      expect(container.querySelector('.quote-breakdown--admin')).toBeInTheDocument();
    });
  });
});