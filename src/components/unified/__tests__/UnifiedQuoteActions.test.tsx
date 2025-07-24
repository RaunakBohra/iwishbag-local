import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteActions } from '../UnifiedQuoteActions';
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

// Mock window.confirm for destructive actions
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
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
  destination_country: 'IN',
  origin_country: 'US',
  customer_data: {
    info: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
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
};

// Helper function to render component with providers
const renderUnifiedQuoteActions = (
  props: Partial<Parameters<typeof UnifiedQuoteActions>[0]> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    quote: mockQuote,
    viewMode: 'customer' as const,
    layout: 'horizontal' as const,
    size: 'md' as const,
    userId: 'test-user-id',
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>
          <UnifiedQuoteActions {...defaultProps} />
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('UnifiedQuoteActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render actions container', () => {
      const { container } = renderUnifiedQuoteActions();

      expect(container.querySelector('.quote-actions')).toBeInTheDocument();
    });

    it('should show appropriate actions based on quote status', () => {
      // Test 'sent' status
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      expect(screen.getByText('Approve Quote')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should show add to cart for approved quotes', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'approved' },
        viewMode: 'customer',
      });

      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    it('should show track order for paid quotes', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'paid' },
        viewMode: 'customer',
      });

      expect(screen.getByText('Track Order')).toBeInTheDocument();
    });
  });

  describe('View Mode Adaptations', () => {
    it('should show admin-specific actions in admin view', () => {
      renderUnifiedQuoteActions({
        viewMode: 'admin',
        quote: { ...mockQuote, status: 'pending' },
      });

      expect(screen.getByText('Edit Quote')).toBeInTheDocument();
      expect(screen.getByText('Send Quote')).toBeInTheDocument();
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      expect(screen.getByText('Contact Customer')).toBeInTheDocument();
    });

    it('should show customer actions in customer view', () => {
      renderUnifiedQuoteActions({
        viewMode: 'customer',
        quote: { ...mockQuote, status: 'sent' },
      });

      expect(screen.getByText('Approve Quote')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });

    it('should show limited actions in guest view', () => {
      renderUnifiedQuoteActions({
        viewMode: 'guest',
        quote: { ...mockQuote, status: 'sent' },
      });

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.queryByText('Contact Support')).not.toBeInTheDocument();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on actions', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableRateLimiting: true,
      });

      const approveButton = screen.getByText('Approve Quote');

      // First click should work
      await user.click(approveButton);
      expect(mockOnAction).toHaveBeenCalledTimes(1);

      // Rapid subsequent clicks should be rate limited
      await user.click(approveButton);
      await user.click(approveButton);
      await user.click(approveButton);

      // Should still be only 1 call due to rate limiting
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should show cooldown countdown', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableRateLimiting: true,
      });

      const approveButton = screen.getByText('Approve Quote');

      // Trigger rate limit
      await user.click(approveButton);
      await user.click(approveButton);
      await user.click(approveButton);
      await user.click(approveButton); // This should trigger cooldown

      // Should show cooldown badge
      await waitFor(() => {
        expect(screen.getByText(/\d+s/)).toBeInTheDocument(); // Countdown seconds
      });
    });

    it('should allow action after cooldown period', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableRateLimiting: true,
      });

      const approveButton = screen.getByText('Approve Quote');

      // Trigger rate limit
      await user.click(approveButton);
      for (let i = 0; i < 5; i++) {
        await user.click(approveButton);
      }

      // Fast forward past cooldown
      vi.advanceTimersByTime(31000); // 31 seconds

      // Should be able to act again
      await user.click(approveButton);
      expect(mockOnAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Optimistic Updates', () => {
    it('should show loading state during optimistic updates', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableOptimisticUpdates: true,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      // Should show loading spinner
      expect(screen.getByRole('button', { name: /approve quote/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should revert optimistic updates on error', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockRejectedValue(new Error('Action failed'));
      const mockOnActionError = vi.fn();

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        onActionError: mockOnActionError,
        enableOptimisticUpdates: true,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockOnActionError).toHaveBeenCalledWith('approve', mockQuote, expect.any(Error));
      });

      // Should show error state
      expect(screen.getByText('Action failed')).toBeInTheDocument();
    });

    it('should complete optimistic updates on success', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });
      const mockOnActionComplete = vi.fn();

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        onActionComplete: mockOnActionComplete,
        enableOptimisticUpdates: true,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockOnActionComplete).toHaveBeenCalledWith('approve', mockQuote, { success: true });
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track conversion events', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      // Should track conversion
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
        test_name: 'quote_approval_colors',
        variant: 'control',
        action: 'action_approve',
        value: 1,
        user_id: 'test-user-id',
      });
    });

    it('should log performance metrics', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        performanceMode: 'detailed',
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith('event', 'quote_action_performance', {
          action_type: 'approve',
          execution_time: expect.any(Number),
          success: true,
          rate_limited: false,
          optimistic: true,
          user_type: 'customer',
          component_id: mockQuote.id,
        });
      });
    });
  });

  describe('Layout Variants', () => {
    it('should render horizontal layout', () => {
      const { container } = renderUnifiedQuoteActions({ layout: 'horizontal' });

      expect(container.querySelector('.quote-actions--horizontal')).toBeInTheDocument();
    });

    it('should render vertical layout', () => {
      const { container } = renderUnifiedQuoteActions({ layout: 'vertical' });

      expect(container.querySelector('.quote-actions--vertical')).toBeInTheDocument();
    });

    it('should render grid layout', () => {
      const { container } = renderUnifiedQuoteActions({ layout: 'grid' });

      expect(container.querySelector('.quote-actions--grid')).toBeInTheDocument();
    });
  });

  describe('Action Prioritization', () => {
    it('should show primary actions first', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        maxActions: 2,
      });

      // Should show primary actions (approve/reject) first
      expect(screen.getByText('Approve Quote')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should limit number of actions displayed', () => {
      const { container } = renderUnifiedQuoteActions({
        viewMode: 'admin',
        maxActions: 3,
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation for destructive actions', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'pending' },
        viewMode: 'admin',
        onAction: mockOnAction,
      });

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete?');
    });

    it('should cancel action if confirmation is declined', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();
      vi.mocked(window.confirm).mockReturnValue(false);

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'pending' },
        viewMode: 'admin',
        onAction: mockOnAction,
      });

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('Hotkey Support', () => {
    it('should support keyboard shortcuts when enabled', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableHotkeys: true,
      });

      // Should respond to 'A' key for approve
      await user.keyboard('a');

      expect(mockOnAction).toHaveBeenCalledWith('approve', mockQuote, true);
    });

    it('should ignore hotkeys when disabled', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableHotkeys: false,
      });

      await user.keyboard('a');

      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should not trigger hotkeys with modifier keys', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn();

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
        enableHotkeys: true,
      });

      await user.keyboard('{Control>}a{/Control}');

      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('Action Button States', () => {
    it('should disable actions when quote status does not allow them', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'completed' },
        viewMode: 'customer',
      });

      const buttons = screen.queryAllByRole('button');
      const actionButtons = buttons.filter(
        (button) =>
          button.textContent?.includes('Approve') || button.textContent?.includes('Add to Cart'),
      );

      expect(actionButtons).toHaveLength(0);
    });

    it('should show appropriate button variants', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const approveButton = screen.getByText('Approve Quote');
      const rejectButton = screen.getByText('Reject');

      // Approve should be primary, reject should be outline
      expect(approveButton.closest('button')).toHaveClass('bg-');
      expect(rejectButton.closest('button')).toHaveClass('border');
    });
  });

  describe('Error Handling', () => {
    it('should display error messages for failed actions', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockRejectedValue(new Error('Network error'));

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/Action failed/)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error messages', async () => {
      const user = userEvent.setup();
      const mockOnAction = vi.fn().mockRejectedValue(new Error('Network error'));

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        onAction: mockOnAction,
      });

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/Action failed/)).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /close/i });
      await user.click(dismissButton);

      expect(screen.queryByText(/Action failed/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const approveButton = screen.getByText('Approve Quote');

      // Should be focusable
      await user.tab();
      expect(approveButton).toHaveFocus();
    });

    it('should show tooltips with hotkey information', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
        size: 'lg',
        enableHotkeys: true,
      });

      const approveButton = screen.getByText('Approve Quote');
      expect(approveButton).toHaveAttribute('title', expect.stringContaining('(A)'));
    });
  });

  describe('Theme Integration', () => {
    it('should apply psychology-driven colors for customer actions', () => {
      renderUnifiedQuoteActions({
        quote: { ...mockQuote, status: 'sent' },
        viewMode: 'customer',
      });

      const approveButton = screen.getByText('Approve Quote');

      // Should have conversion-optimized styling
      expect(approveButton.closest('button')).toHaveStyle({
        backgroundColor: expect.any(String),
      });
    });

    it('should apply professional styling for admin actions', () => {
      renderUnifiedQuoteActions({
        viewMode: 'admin',
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Should have professional styling
      buttons.forEach((button) => {
        expect(button).toHaveClass(/quote-actions/);
      });
    });
  });
});
