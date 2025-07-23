import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock Web Speech API for screen reader testing
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  configurable: true
});

// Mock Media Query for reduced motion
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  configurable: true
});

// Mock Intersection Observer for lazy loading accessibility
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((target) => {
    // Simulate visibility change for screen reader announcements
    setTimeout(() => {
      callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { top: 0, bottom: 100, height: 100 },
        rootBounds: { top: 0, bottom: 800, height: 800 }
      }]);
    }, 100);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = mockIntersectionObserver;

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'accessibility-user-id', email: 'accessibility@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Test data with accessibility considerations
const accessibilityTestQuote: UnifiedQuote = {
  id: 'accessibility-quote-001',
  display_id: 'QT-ACC001',
  user_id: 'accessibility-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 399.99,
  item_price: 329.99,
  sales_tax_price: 26.40,
  merchant_shipping_price: 15.00,
  international_shipping: 29.99,
  customs_and_ecs: 16.50,
  domestic_shipping: 8.99,
  handling_charge: 4.99,
  insurance_amount: 3.99,
  payment_gateway_fee: 4.99,
  vat: 0.00,
  discount: 15.00,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Accessibility Test User',
      email: 'accessibility@example.com',
      phone: '+91-9876543210'
    }
  },
  shipping_address: {
    formatted: '123 Accessibility Street, Mumbai, Maharashtra 400001, India'
  },
  items: [{
    id: 'accessibility-item',
    name: 'High-Contrast Gaming Monitor',
    description: 'Professional gaming monitor with accessibility features',
    quantity: 1,
    price: 329.99,
    product_url: 'https://amazon.com/gaming-monitor',
    image_url: 'https://example.com/monitor.jpg'
  }],
  notes: 'Accessibility compliance test quote',
  admin_notes: 'WCAG 2.2 AA testing',
  priority: 'high',
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

// Helper function to simulate screen reader behavior
const simulateScreenReaderAnnouncement = (element: HTMLElement) => {
  const ariaLive = element.getAttribute('aria-live');
  const ariaLabel = element.getAttribute('aria-label');
  const textContent = element.textContent;
  
  if (ariaLive || ariaLabel || textContent) {
    mockSpeechSynthesis.speak(new SpeechSynthesisUtterance(ariaLabel || textContent || ''));
  }
};

describe('Accessibility Compliance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WCAG 2.2 AA Compliance', () => {
    it('should pass axe accessibility audit for UnifiedQuoteCard', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility audit for UnifiedQuoteForm', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility audit for UnifiedQuoteList', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteList
          quotes={[accessibilityTestQuote]}
          viewMode="customer"
          layout="list"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility audit for UnifiedQuoteBreakdown', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={accessibilityTestQuote}
          viewMode="customer"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility audit for UnifiedQuoteActions', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibilityTestQuote}
          viewMode="customer"
          onAction={vi.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in quote form', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockSubmit}
        />
      );

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/product url/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/your name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/phone number/i)).toHaveFocus();

      // Test skip links
      await user.keyboard('{Alt>}{1}');
      expect(screen.getByLabelText(/your name/i)).toHaveFocus();

      // Test form submission with Enter
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });

    it('should support keyboard navigation in quote actions', async () => {
      const user = userEvent.setup();
      const mockAction = vi.fn();

      renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibilityTestQuote}
          viewMode="customer"
          onAction={mockAction}
        />
      );

      // Test keyboard activation of approve button
      const approveButton = screen.getByText('Approve Quote');
      approveButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockAction).toHaveBeenCalledWith('approve');

      mockAction.mockClear();

      // Test spacebar activation
      await user.keyboard(' ');
      expect(mockAction).toHaveBeenCalledWith('approve');
    });

    it('should provide visible focus indicators', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Tab to focusable elements and check focus indicators
      await user.tab();
      const focusedElement = document.activeElement;
      
      // Check that focused element has focus-visible styles
      expect(focusedElement).toHaveClass('focus:ring-2');
      
      // Check focus outline
      const computedStyle = window.getComputedStyle(focusedElement!);
      expect(computedStyle.outline).not.toBe('none');
    });

    it('should trap focus in modal dialogs', async () => {
      const user = userEvent.setup();
      
      const ModalTest = () => {
        const [showModal, setShowModal] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShowModal(true)} data-testid="open-modal">
              Open Modal
            </button>
            {showModal && (
              <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title">Confirm Action</h2>
                <p>Are you sure you want to approve this quote?</p>
                <button data-testid="confirm">Confirm</button>
                <button onClick={() => setShowModal(false)} data-testid="cancel">
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(<ModalTest />);

      // Open modal
      await user.click(screen.getByTestId('open-modal'));

      // Focus should be trapped within modal
      await user.tab();
      expect(screen.getByTestId('confirm')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('cancel')).toHaveFocus();

      // Tab again should cycle back to first focusable element
      await user.tab();
      expect(screen.getByTestId('confirm')).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide appropriate ARIA labels and descriptions', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Check ARIA labels
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 
        expect.stringContaining('Quote QT-ACC001'));

      // Check price information has proper labeling
      const priceElement = screen.getByText('$399.99');
      expect(priceElement.closest('[role="region"]')).toHaveAttribute('aria-labelledby');

      // Check status has proper semantic meaning
      const statusElement = screen.getByText('sent');
      expect(statusElement).toHaveAttribute('aria-label', 
        expect.stringContaining('Quote status: sent'));
    });

    it('should announce dynamic content changes', async () => {
      const DynamicContentTest = () => {
        const [status, setStatus] = React.useState('pending');
        const [announcement, setAnnouncement] = React.useState('');

        const updateStatus = (newStatus: string) => {
          setStatus(newStatus);
          setAnnouncement(`Quote status updated to ${newStatus}`);
          
          // Simulate screen reader announcement
          setTimeout(() => {
            simulateScreenReaderAnnouncement(
              document.querySelector('[aria-live="polite"]') as HTMLElement
            );
          }, 100);
        };

        return (
          <div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {announcement}
            </div>
            <UnifiedQuoteCard
              quote={{...accessibilityTestQuote, status: status as any}}
              viewMode="admin"
              layout="detail"
            />
            <button onClick={() => updateStatus('approved')} data-testid="approve">
              Approve
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<DynamicContentTest />);

      await user.click(screen.getByTestId('approve'));

      await waitFor(() => {
        expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Quote status updated to approved')
          })
        );
      });
    });

    it('should provide proper heading hierarchy', async () => {
      renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={accessibilityTestQuote}
          viewMode="customer"
        />
      );

      // Check heading levels
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toBeInTheDocument();

      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(subHeadings.length).toBeGreaterThan(0);

      // Verify no heading levels are skipped
      const allHeadings = screen.getAllByRole('heading');
      const headingLevels = allHeadings.map(h => parseInt(h.tagName.slice(1)));
      
      for (let i = 1; i < headingLevels.length; i++) {
        expect(headingLevels[i] - headingLevels[i-1]).toBeLessThanOrEqual(1);
      }
    });

    it('should support screen reader table navigation', async () => {
      renderWithProviders(
        <UnifiedQuoteList
          quotes={[accessibilityTestQuote]}
          viewMode="admin"
          layout="table"
        />
      );

      // Check table structure
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', expect.stringContaining('Quotes'));

      // Check column headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
      
      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });

      // Check row headers
      const rowHeaders = screen.getAllByRole('rowheader');
      rowHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'row');
      });

      // Check table caption
      expect(table).toHaveAccessibleDescription();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG AA color contrast requirements', async () => {
      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Test critical color combinations
      const statusBadge = container.querySelector('[data-testid="quote-status"]');
      if (statusBadge) {
        const computedStyle = window.getComputedStyle(statusBadge);
        
        // Simulate color contrast check (in real implementation, use color-contrast library)
        expect(computedStyle.color).not.toBe(computedStyle.backgroundColor);
      }

      // Test high contrast mode support
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        configurable: true
      });

      // Component should adapt to high contrast mode
      expect(container.firstChild).toHaveClass('contrast-more:border-2');
    });

    it('should not rely solely on color to convey information', async () => {
      renderWithProviders(
        <UnifiedQuoteActions
          quote={{...accessibilityTestQuote, priority: 'urgent'}}
          viewMode="admin"
          onAction={vi.fn()}
        />
      );

      // Priority should be indicated by icon AND color
      const priorityIndicator = screen.getByTitle('Urgent priority');
      expect(priorityIndicator).toBeInTheDocument();
      
      // Should have both visual (icon) and text indicators
      expect(priorityIndicator).toHaveAttribute('aria-label', 
        expect.stringContaining('Urgent'));
    });

    it('should support reduced motion preferences', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
        configurable: true
      });

      const { container } = renderWithProviders(
        <UnifiedQuoteList
          quotes={[accessibilityTestQuote]}
          viewMode="customer"
          layout="list"
        />
      );

      // Animations should be disabled
      const animatedElements = container.querySelectorAll('[class*="animate-"]');
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:animate-none');
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should provide clear form labels and error messages', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      // All inputs should have labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });

      // Test error state
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby');
        
        const errorMessage = document.getElementById(
          emailInput.getAttribute('aria-describedby')!
        );
        expect(errorMessage).toHaveTextContent(/valid email/i);
      });
    });

    it('should group related form fields', async () => {
      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      // Address fields should be grouped
      const addressFieldset = screen.getByRole('group', { name: /shipping address/i });
      expect(addressFieldset).toBeInTheDocument();
      expect(addressFieldset.tagName).toBe('FIELDSET');

      const legend = addressFieldset.querySelector('legend');
      expect(legend).toBeInTheDocument();
    });

    it('should provide help text and instructions', async () => {
      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      const productUrlInput = screen.getByLabelText(/product url/i);
      expect(productUrlInput).toHaveAttribute('aria-describedby');
      
      const helpText = document.getElementById(
        productUrlInput.getAttribute('aria-describedby')!
      );
      expect(helpText).toHaveTextContent(/paste the full product page URL/i);
    });
  });

  describe('International Accessibility (i18n)', () => {
    it('should support right-to-left (RTL) languages', async () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');

      const { container } = renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Layout should adapt to RTL
      expect(container.firstChild).toHaveClass('rtl:flex-row-reverse');
      
      // Cleanup
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    });

    it('should provide proper language declarations', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={{
            ...accessibilityTestQuote,
            items: [{
              ...accessibilityTestQuote.items[0],
              name: 'モニター', // Japanese text
              description: 'ゲーミングモニター'
            }]
          }}
          viewMode="customer"
          layout="detail"
        />
      );

      // Foreign language content should have lang attribute
      const foreignText = screen.getByText('モニター');
      expect(foreignText.closest('[lang]')).toHaveAttribute('lang', 'ja');
    });

    it('should handle currency and number formatting for accessibility', async () => {
      renderWithProviders(
        <UnifiedQuoteBreakdown
          quote={accessibilityTestQuote}
          viewMode="customer"
        />
      );

      // Price should be announced properly by screen readers
      const priceElement = screen.getByText('$399.99');
      expect(priceElement).toHaveAttribute('aria-label', '399 dollars and 99 cents');
    });
  });

  describe('Mobile Accessibility', () => {
    it('should provide adequate touch target sizes', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const { container } = renderWithProviders(
        <UnifiedQuoteActions
          quote={accessibilityTestQuote}
          viewMode="customer"
          onAction={vi.fn()}
        />
      );

      // Buttons should meet minimum touch target size (44px)
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button);
        const minSize = parseInt(computedStyle.minHeight) || parseInt(computedStyle.height);
        expect(minSize).toBeGreaterThanOrEqual(44);
      });
    });

    it('should support voice control and voice navigation', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={accessibilityTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Elements should have voice-friendly labels
      const approveButton = screen.getByText('Approve Quote');
      expect(approveButton).toHaveAttribute('aria-label', 
        expect.stringMatching(/approve.*quote/i));

      // Voice commands should work with proper labeling
      expect(approveButton.getAttribute('aria-label')).not.toContain('button');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide accessible error messages and recovery options', async () => {
      const ErrorTest = () => {
        const [hasError, setHasError] = React.useState(false);

        const triggerError = () => {
          setHasError(true);
        };

        const clearError = () => {
          setHasError(false);
        };

        if (hasError) {
          return (
            <div role="alert" aria-live="assertive">
              <h2>Something went wrong</h2>
              <p>We couldn't load your quote. Please try again.</p>
              <button onClick={clearError} data-testid="retry">
                Try Again
              </button>
            </div>
          );
        }

        return (
          <div>
            <button onClick={triggerError} data-testid="trigger-error">
              Trigger Error
            </button>
            <UnifiedQuoteCard
              quote={accessibilityTestQuote}
              viewMode="customer"
              layout="detail"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<ErrorTest />);

      await user.click(screen.getByTestId('trigger-error'));

      // Error should be announced to screen readers
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');

      // Recovery option should be available
      const retryButton = screen.getByTestId('retry');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAccessibleName();

      await user.click(retryButton);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should maintain accessibility during loading states', async () => {
      const LoadingTest = () => {
        const [isLoading, setIsLoading] = React.useState(true);

        React.useEffect(() => {
          setTimeout(() => setIsLoading(false), 1000);
        }, []);

        if (isLoading) {
          return (
            <div aria-live="polite" aria-busy="true">
              <div role="status" aria-label="Loading quote details">
                <span className="sr-only">Loading...</span>
                <div aria-hidden="true">🔄</div>
              </div>
            </div>
          );
        }

        return (
          <UnifiedQuoteCard
            quote={accessibilityTestQuote}
            viewMode="customer"
            layout="detail"
          />
        );
      };

      renderWithProviders(<LoadingTest />);

      // Loading state should be announced
      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-label', 'Loading quote details');
      
      // Parent should indicate busy state
      expect(loadingStatus.parentElement).toHaveAttribute('aria-busy', 'true');

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
      }, { timeout: 1500 });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});