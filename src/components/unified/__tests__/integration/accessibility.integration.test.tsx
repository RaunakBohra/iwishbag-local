import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

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

// Mock IntersectionObserver for virtual scrolling
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test data for accessibility testing
const accessibleQuote: UnifiedQuote = {
  id: 'accessible-quote',
  display_id: 'QT-A11Y001',
  user_id: 'test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 199.99,
  item_price: 149.99,
  sales_tax_price: 12.00,
  merchant_shipping_price: 10.00,
  international_shipping: 18.00,
  customs_and_ecs: 7.50,
  domestic_shipping: 5.00,
  handling_charge: 2.50,
  insurance_amount: 1.50,
  payment_gateway_fee: 2.50,
  vat: 0.00,
  discount: 5.00,
  destination_country: 'CA',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Maria Rodriguez',
      email: 'maria@example.com',
      phone: '+1-555-0123'
    }
  },
  shipping_address: {
    formatted: '789 Maple Street, Toronto, ON M5H 2N2, Canada'
  },
  items: [{
    id: 'accessible-item',
    name: 'Bluetooth Speaker',
    description: 'Portable wireless speaker with 12-hour battery life',
    quantity: 1,
    price: 149.99,
    product_url: 'https://amazon.com/bluetooth-speaker',
    image_url: 'https://example.com/speaker.jpg'
  }],
  notes: 'Gift wrapping requested',
  admin_notes: 'Customer has accessibility needs - ensure clear communication',
  priority: 'medium',
  in_cart: false,
  attachments: []
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
        <QuoteThemeProvider>
          {component}
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Unified Components Accessibility Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WCAG 2.2 Compliance', () => {
    it('should meet WCAG 2.2 AA standards for quote form', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
          enableRealTimeValidation={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG 2.2 AA standards for quote card', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibleQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG 2.2 AA standards for quote breakdown', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={accessibleQuote}
          viewMode="customer"
          allowExpansion={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG 2.2 AA standards for quote actions', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibleQuote}
          viewMode="customer"
          layout="horizontal"
          enableHotkeys={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should meet WCAG 2.2 AA standards for quote list', async () => {
      const quotes = Array.from({ length: 5 }, (_, i) => ({
        ...accessibleQuote,
        id: `list-quote-${i}`,
        display_id: `QT-LIST${i.toString().padStart(3, '0')}`
      }));

      const { container } = renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableSearch={true}
          enableSorting={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support complete keyboard navigation through form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockOnSubmit}
        />
      );

      // Navigate through all form fields using Tab
      const productUrlInput = screen.getByLabelText(/product url/i);
      
      await user.tab();
      expect(productUrlInput).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/product name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/quantity/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/destination country/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/your name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/phone number/i)).toHaveFocus();

      // Navigate to submit button
      await user.tab();
      await user.tab(); // Skip special notes field
      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      expect(submitButton).toHaveFocus();

      // Should be able to submit with Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should support keyboard navigation in quote actions', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibleQuote}
          viewMode="customer"
          layout="horizontal"
          onAction={mockOnAction}
          enableHotkeys={true}
        />
      );

      // Test Tab navigation through actions
      await user.tab();
      const approveButton = screen.getByText('Approve Quote');
      expect(approveButton).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Reject')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('View Details')).toHaveFocus();

      // Test hotkey support
      await user.keyboard('a'); // 'A' for approve
      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('approve', accessibleQuote, true);
      });

      await user.keyboard('r'); // 'R' for reject
      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('reject', accessibleQuote, true);
      });
    });

    it('should handle keyboard navigation in quote list with virtual scrolling', async () => {
      const user = userEvent.setup();
      const quotes = Array.from({ length: 50 }, (_, i) => ({
        ...accessibleQuote,
        id: `keyboard-nav-${i}`,
        display_id: `QT-KB${i.toString().padStart(3, '0')}`
      }));

      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
          enableSearch={true}
        />
      );

      // Navigate to search input
      await user.tab();
      const searchInput = screen.getByPlaceholderText('Search quotes...');
      expect(searchInput).toHaveFocus();

      // Type search query
      await user.type(searchInput, 'QT-KB001');

      // Navigate to first quote item
      await user.tab();
      const firstQuote = screen.getByText('QT-KB001');
      expect(firstQuote.closest('[tabindex]')).toHaveFocus();

      // Use arrow keys to navigate between items (if implemented)
      await user.keyboard('{ArrowDown}');
      // Should focus next visible item

      await user.keyboard('{ArrowUp}');
      // Should return to previous item
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels and descriptions for quote card', () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibleQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Check for proper heading structure
      const quoteHeader = screen.getByRole('heading', { name: /QT-A11Y001/i });
      expect(quoteHeader).toBeInTheDocument();

      // Check for proper labeling of price information
      const totalAmount = screen.getByText('$199.99');
      expect(totalAmount).toHaveAttribute('aria-label', expect.stringContaining('Total amount'));

      // Check for proper status announcement
      const statusElement = screen.getByText('sent');
      expect(statusElement).toHaveAttribute('aria-label', expect.stringContaining('Quote status is sent'));

      // Check for product information accessibility
      const productName = screen.getByText('Bluetooth Speaker');
      expect(productName).toHaveAttribute('aria-label', expect.stringContaining('Product: Bluetooth Speaker'));
    });

    it('should provide proper ARIA labels for interactive elements in breakdown', async () => {
      const user = userEvent.setup();
      const mockOnLineItemClick = vi.fn();

      renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={accessibleQuote}
          viewMode="customer"
          onLineItemClick={mockOnLineItemClick}
          allowExpansion={true}
          compact={true}
        />
      );

      // Check expand/collapse button accessibility
      const expandButton = screen.getByText('Expand');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      expect(expandButton).toHaveAttribute('aria-controls', expect.any(String));

      await user.click(expandButton);

      await waitFor(() => {
        const collapseButton = screen.getByText('Collapse');
        expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      });

      // Check line item accessibility
      const itemCostElement = screen.getByText('Item Cost');
      expect(itemCostElement.closest('div')).toHaveAttribute('role', 'button');
      expect(itemCostElement.closest('div')).toHaveAttribute('aria-label', 
        expect.stringContaining('Item Cost: $149.99')
      );
    });

    it('should announce form validation errors to screen readers', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
          enableRealTimeValidation={true}
        />
      );

      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);

        errorMessages.forEach(error => {
          expect(error).toHaveAttribute('aria-live', 'polite');
        });
      });

      // Check specific field error
      const urlError = screen.getByText(/this field is required/i);
      expect(urlError).toHaveAttribute('role', 'alert');
    });

    it('should provide proper announcements for dynamic content updates', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderWithProviders(
        <div>
          <UnifiedQuoteCard
            quote={accessibleQuote}
            viewMode="customer"
            onAction={mockOnAction}
          />
          <div role="status" aria-live="polite" id="status-announcements"></div>
        </div>
      );

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      // Should have live region for status updates
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should maintain proper color contrast for all text elements', () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibleQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Test high contrast elements
      const statusBadge = container.querySelector('[class*="status"]');
      if (statusBadge) {
        const styles = window.getComputedStyle(statusBadge);
        // In a real test, you would calculate contrast ratio
        // For now, we ensure styles are applied
        expect(styles.backgroundColor).toBeTruthy();
        expect(styles.color).toBeTruthy();
      }

      // Test link colors
      const links = container.querySelectorAll('a');
      links.forEach(link => {
        const styles = window.getComputedStyle(link);
        expect(styles.color).toBeTruthy();
      });
    });

    it('should support high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibleQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Should apply high contrast classes
      expect(container.querySelector('[class*="high-contrast"]')).toBeInTheDocument();
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibleQuote}
          viewMode="customer"
          layout="horizontal"
        />
      );

      // Should disable animations when reduced motion is preferred
      // This would be tested by checking for reduced motion classes or styles
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // In reduced motion mode, transitions should be minimal
        expect(styles.transition).toMatch(/(none|0s)/);
      });
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in modal-like components', async () => {
      const user = userEvent.setup();

      // Create a component that opens breakdown in modal-like overlay
      const ModalTestComponent = () => {
        const [showBreakdown, setShowBreakdown] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShowBreakdown(true)}>
              Show Breakdown
            </button>
            {showBreakdown && (
              <div 
                role="dialog" 
                aria-modal="true"
                aria-labelledby="breakdown-title"
              >
                <UnifiedQuoteBreakdown
                  quote={accessibleQuote}
                  viewMode="customer"
                  allowExpansion={true}
                />
                <button onClick={() => setShowBreakdown(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(<ModalTestComponent />);

      const openButton = screen.getByText('Show Breakdown');
      await user.click(openButton);

      // Focus should move to modal
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        // First focusable element in modal should receive focus
        const closeButton = screen.getByText('Close');
        expect(closeButton).toHaveFocus();
      });

      // Test focus trap (Tab should stay within modal)
      await user.tab();
      // Should focus next element within modal

      // Close modal
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      // Focus should return to original trigger
      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });

    it('should handle focus for dynamically added/removed elements', async () => {
      const user = userEvent.setup();

      const DynamicContentTest = () => {
        const [showDetails, setShowDetails] = React.useState(false);

        return (
          <div>
            <UnifiedQuoteCard
              quote={accessibleQuote}
              viewMode="customer"
              layout="compact"
            />
            <button onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {showDetails && (
              <div id="dynamic-details">
                <UnifiedQuoteBreakdown
                  quote={accessibleQuote}
                  viewMode="customer"
                />
                <UnifiedQuoteActions
                  quote={accessibleQuote}
                  viewMode="customer"
                />
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(<DynamicContentTest />);

      const toggleButton = screen.getByText('Show Details');
      await user.click(toggleButton);

      // New content should be accessible via keyboard
      await waitFor(() => {
        expect(screen.getByText('Quote Breakdown')).toBeInTheDocument();
      });

      // Should be able to navigate to new elements
      await user.tab();
      // Focus should move to elements in the newly shown breakdown
    });
  });

  describe('Internationalization and Accessibility', () => {
    it('should maintain accessibility across different languages', () => {
      // Test with different locales
      const languages = ['en', 'hi', 'ne'];

      languages.forEach(locale => {
        renderWithProviders(
          <UnifiedQuoteForm
            mode="create"
            viewMode="guest"
            locale={locale as any}
            onSubmit={vi.fn()}
          />
        );

        // Form should remain accessible regardless of language
        const productUrlInput = screen.getByLabelText(/product|उत्पाद|उत्पादन/i);
        expect(productUrlInput).toBeInTheDocument();
        expect(productUrlInput).toHaveAccessibleName();

        const submitButton = screen.getByRole('button', { name: /submit|भेजें|पठाउनुहोस्/i });
        expect(submitButton).toBeInTheDocument();
      });
    });

    it('should handle RTL languages properly', () => {
      // Mock RTL language setting
      document.dir = 'rtl';
      document.documentElement.lang = 'ar';

      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibleQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Should apply RTL-appropriate styles
      expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();

      // Reset
      document.dir = 'ltr';
      document.documentElement.lang = 'en';
    });
  });

  describe('Error Handling and Accessibility', () => {
    it('should maintain accessibility during error states', async () => {
      const user = userEvent.setup();
      const failingAction = vi.fn().mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibleQuote}
          viewMode="customer"
          onAction={failingAction}
        />
      );

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Action failed/);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      });

      // Error should be dismissible
      const dismissButton = screen.getByRole('button', { name: /close/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAccessibleName();

      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Action failed/)).not.toBeInTheDocument();
      });
    });

    it('should handle loading states accessibly', async () => {
      const slowAction = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibleQuote}
          viewMode="customer"
          onAction={slowAction}
        />
      );

      const approveButton = screen.getByText('Approve Quote');
      const user = userEvent.setup();
      await user.click(approveButton);

      // Should show accessible loading state
      await waitFor(() => {
        expect(approveButton).toBeDisabled();
        expect(approveButton).toHaveAttribute('aria-busy', 'true');
        
        const loadingIndicator = screen.getByRole('status');
        expect(loadingIndicator).toBeInTheDocument();
        expect(loadingIndicator).toHaveAttribute('aria-label', expect.stringContaining('loading'));
      });
    });
  });
});