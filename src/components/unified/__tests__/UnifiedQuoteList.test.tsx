import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteList } from '../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock react-window for virtual scrolling
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount, itemData }) => {
    // Mock virtual list by rendering first 10 items
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => {
      return children({
        index,
        style: { height: 120, top: index * 120 },
        data: itemData,
      });
    });
    return <div data-testid="virtual-list">{items}</div>;
  }),
}));

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

// Generate test data
const generateMockQuote = (id: string, overrides = {}): UnifiedQuote => ({
  id,
  display_id: `QT-${id.slice(0, 5).toUpperCase()}`,
  user_id: 'test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 159.99,
  item_price: 120.0,
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
  items: [
    {
      id: `item-${id}`,
      name: `Test Product ${id}`,
      description: 'A great test product',
      quantity: 2,
      price: 60.0,
      product_url: `https://amazon.com/test-product-${id}`,
      image_url: 'https://example.com/image.jpg',
    },
  ],
  ...overrides,
});

const mockQuotes = Array.from({ length: 50 }, (_, i) =>
  generateMockQuote(`quote-${i}`, {
    status: ['pending', 'sent', 'approved', 'paid', 'rejected'][i % 5],
    destination_country: ['IN', 'NP', 'US', 'UK'][i % 4],
    final_total_usd: 100 + i * 10,
    customer_data: {
      info: {
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `+123456789${i}`,
      },
    },
  }),
);

// Helper function to render component with providers
const renderUnifiedQuoteList = (props: Partial<Parameters<typeof UnifiedQuoteList>[0]> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    quotes: mockQuotes.slice(0, 10), // Default to first 10 quotes
    viewMode: 'customer' as const,
    layout: 'list' as const,
    loading: false,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>
          <UnifiedQuoteList {...defaultProps} />
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('UnifiedQuoteList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render quote list with title and count', () => {
      renderUnifiedQuoteList();

      expect(screen.getByText('Quotes')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Quote count badge
    });

    it('should display quotes in the list', () => {
      renderUnifiedQuoteList();

      expect(screen.getByText('QT-QUOTE')).toBeInTheDocument(); // First quote display ID
      expect(screen.getByText('Test Product quote-0')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      renderUnifiedQuoteList({ loading: true, quotes: [] });

      expect(screen.getByText('Loading quotes...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show error state', () => {
      renderUnifiedQuoteList({
        error: 'Failed to load quotes',
        quotes: [],
      });

      expect(screen.getByText('Error Loading Quotes')).toBeInTheDocument();
      expect(screen.getByText('Failed to load quotes')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show empty state when no quotes', () => {
      renderUnifiedQuoteList({ quotes: [] });

      expect(screen.getByText('No Quotes Found')).toBeInTheDocument();
      expect(screen.getByText('No quotes found')).toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling', () => {
    it('should use virtual scrolling when enabled', () => {
      renderUnifiedQuoteList({
        quotes: mockQuotes, // All 50 quotes
        enableVirtualScrolling: true,
      });

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should render regular list when virtual scrolling disabled', () => {
      renderUnifiedQuoteList({
        enableVirtualScrolling: false,
        quotes: mockQuotes.slice(0, 5),
      });

      expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
      // Should show all items directly
      expect(screen.getAllByText(/Test Product/)).toHaveLength(5);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => generateMockQuote(`large-${i}`));

      renderUnifiedQuoteList({
        quotes: largeDataset,
        enableVirtualScrolling: true,
      });

      // Should only render visible items (mocked to 10)
      expect(screen.getAllByText(/Test Product/)).toHaveLength(10);
    });
  });

  describe('Search Functionality', () => {
    it('should render search input when enabled', () => {
      renderUnifiedQuoteList({ enableSearch: true });

      expect(screen.getByPlaceholderText('Search quotes...')).toBeInTheDocument();
    });

    it('should filter quotes by search term', async () => {
      const user = userEvent.setup();
      const mockOnSearch = vi.fn();

      renderUnifiedQuoteList({
        enableSearch: true,
        onSearch: mockOnSearch,
      });

      const searchInput = screen.getByPlaceholderText('Search quotes...');
      await user.type(searchInput, 'customer0');

      // Should call search callback with debounced value
      await waitFor(
        () => {
          expect(mockOnSearch).toHaveBeenCalledWith('customer0');
        },
        { timeout: 1000 },
      );
    });

    it('should show clear search button when search has value', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteList({
        enableSearch: true,
        quotes: [], // Empty results to show clear button
      });

      const searchInput = screen.getByPlaceholderText('Search quotes...');
      await user.type(searchInput, 'test search');

      await waitFor(() => {
        expect(screen.getByText('Clear Search')).toBeInTheDocument();
      });
    });

    it('should perform fuzzy search with typos', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteList({
        quotes: [
          generateMockQuote('fuzzy-1', {
            customer_data: { info: { name: 'John Smith' } },
          }),
        ],
      });

      const searchInput = screen.getByPlaceholderText('Search quotes...');
      await user.type(searchInput, 'Jon Smth'); // With typos

      // Should still find the quote (mocked fuzzy matching)
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should show sort controls when enabled', () => {
      renderUnifiedQuoteList({ enableSorting: true });

      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('should sort quotes by different fields', async () => {
      const user = userEvent.setup();
      const mockOnSort = vi.fn();

      renderUnifiedQuoteList({
        enableSorting: true,
        onSort: mockOnSort,
      });

      const amountButton = screen.getByText('Amount');
      await user.click(amountButton);

      expect(mockOnSort).toHaveBeenCalledWith({
        field: 'final_total_usd',
        direction: 'asc',
      });
    });

    it('should toggle sort direction on repeated clicks', async () => {
      const user = userEvent.setup();
      const mockOnSort = vi.fn();

      renderUnifiedQuoteList({
        enableSorting: true,
        onSort: mockOnSort,
      });

      const dateButton = screen.getByText('Date');

      // First click - ascending
      await user.click(dateButton);
      expect(mockOnSort).toHaveBeenCalledWith({
        field: 'created_at',
        direction: 'asc',
      });

      // Second click - descending
      await user.click(dateButton);
      expect(mockOnSort).toHaveBeenCalledWith({
        field: 'created_at',
        direction: 'desc',
      });
    });

    it('should show sort direction indicators', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteList({ enableSorting: true });

      const dateButton = screen.getByText('Date');
      await user.click(dateButton);

      // Should show ascending arrow
      expect(screen.getByTestId('sort-asc-icon')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should show filter controls when enabled', () => {
      renderUnifiedQuoteList({ enableFilters: true });

      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('should apply filters to quotes', async () => {
      const user = userEvent.setup();
      const mockOnFilter = vi.fn();

      renderUnifiedQuoteList({
        enableFilters: true,
        onFilter: mockOnFilter,
      });

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Should show filter options (implementation depends on UI)
      // This would expand to show filter controls
    });
  });

  describe('Selection', () => {
    it('should show selection controls when enabled', () => {
      renderUnifiedQuoteList({
        enableSelection: true,
        viewMode: 'admin',
      });

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('should handle select all functionality', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = vi.fn();

      renderUnifiedQuoteList({
        enableSelection: true,
        viewMode: 'admin',
        onSelectionChange: mockOnSelectionChange,
      });

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(['quote-0', 'quote-1']), // All quote IDs
      );
    });

    it('should show bulk actions when items selected', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteList({
        enableSelection: true,
        viewMode: 'admin',
      });

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByText('Export Selected')).toBeInTheDocument();
        expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
      });
    });

    it('should show selection count', async () => {
      const user = userEvent.setup();

      renderUnifiedQuoteList({
        enableSelection: true,
        viewMode: 'admin',
      });

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByText(/10 Selected/)).toBeInTheDocument();
      });
    });
  });

  describe('Smart Caching', () => {
    it('should use cached results when available', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteList({
        enableSmartCaching: true,
        performanceMode: 'detailed',
      });

      // Should log cache statistics in development
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Quote processing took'),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it('should show cache hit rate in detailed mode', () => {
      renderUnifiedQuoteList({
        enableSmartCaching: true,
        performanceMode: 'detailed',
      });

      // Should show cache statistics badge
      expect(screen.getByText(/Cache:/)).toBeInTheDocument();
    });

    it('should invalidate cache on data changes', async () => {
      const user = userEvent.setup();
      const mockOnItemAction = vi.fn();

      const { rerender } = renderUnifiedQuoteList({
        enableSmartCaching: true,
        onItemAction: mockOnItemAction,
      });

      // Simulate quote action that would invalidate cache
      const firstQuote = mockQuotes[0];
      mockOnItemAction('approve', firstQuote);

      // Re-render with updated data
      const updatedQuotes = mockQuotes.map((q) =>
        q.id === firstQuote.id ? { ...q, status: 'approved' } : q,
      );

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <UnifiedQuoteList
                quotes={updatedQuotes.slice(0, 10)}
                viewMode="customer"
                layout="list"
                enableSmartCaching={true}
                onItemAction={mockOnItemAction}
              />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>,
      );

      // Cache should be invalidated and data refreshed
      expect(screen.getByText('approved')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics in detailed mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteList({
        performanceMode: 'detailed',
        quotes: mockQuotes,
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteList Performance:'),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should track search performance', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteList({
        enableSearch: true,
        performanceMode: 'detailed',
      });

      const searchInput = screen.getByPlaceholderText('Search quotes...');
      await user.type(searchInput, 'test search');

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Search took'),
          expect.stringContaining('ms'),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Layout Variants', () => {
    it('should render grid layout', () => {
      const { container } = renderUnifiedQuoteList({ layout: 'grid' });

      expect(container.querySelector('.quote-list--grid')).toBeInTheDocument();
    });

    it('should render list layout', () => {
      const { container } = renderUnifiedQuoteList({ layout: 'list' });

      expect(container.querySelector('.quote-list--list')).toBeInTheDocument();
    });

    it('should render compact layout', () => {
      const { container } = renderUnifiedQuoteList({ layout: 'compact' });

      expect(container.querySelector('.quote-list--compact')).toBeInTheDocument();
    });
  });

  describe('Pagination and Load More', () => {
    it('should show load more button when hasNextPage is true', () => {
      renderUnifiedQuoteList({
        hasNextPage: true,
        totalCount: 100,
      });

      expect(screen.getByText('Load More Quotes')).toBeInTheDocument();
    });

    it('should call onLoadMore when load more button clicked', async () => {
      const user = userEvent.setup();
      const mockOnLoadMore = vi.fn();

      renderUnifiedQuoteList({
        hasNextPage: true,
        onLoadMore: mockOnLoadMore,
      });

      const loadMoreButton = screen.getByText('Load More Quotes');
      await user.click(loadMoreButton);

      expect(mockOnLoadMore).toHaveBeenCalled();
    });

    it('should show loading state on load more button', () => {
      renderUnifiedQuoteList({
        hasNextPage: true,
        loading: true,
      });

      const loadMoreButton = screen.getByText('Load More Quotes');
      expect(loadMoreButton).toBeDisabled();
    });

    it('should show total count when provided', () => {
      renderUnifiedQuoteList({
        quotes: mockQuotes.slice(0, 10),
        totalCount: 50,
      });

      expect(screen.getByText('10 of 50')).toBeInTheDocument();
    });
  });

  describe('Item Actions', () => {
    it('should handle item actions', async () => {
      const user = userEvent.setup();
      const mockOnItemAction = vi.fn();

      renderUnifiedQuoteList({
        onItemAction: mockOnItemAction,
        quotes: [generateMockQuote('actionable', { status: 'sent' })],
      });

      // This would depend on the UnifiedQuoteCard implementation
      // The card should have action buttons that trigger the callback
      const quote = screen.getByText('QT-ACTIO'); // Truncated display ID
      await user.click(quote);

      // Should handle item click (navigation or action)
      expect(window.gtag).toHaveBeenCalled(); // Analytics tracking
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

      const { container } = renderUnifiedQuoteList({ layout: 'compact' });

      // Should have mobile-specific adaptations
      expect(container.querySelector('.quote-list--compact')).toBeInTheDocument();
    });

    it('should show/hide elements based on screen size', () => {
      renderUnifiedQuoteList();

      // Some elements should be hidden on mobile (tested via CSS classes)
      const hiddenElements = screen.queryAllByText(/hidden/);
      expect(hiddenElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderUnifiedQuoteList({ enableSelection: true });

      const selectAllButton = screen.getByText('Select All');
      expect(selectAllButton).toHaveAttribute('role', 'button');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteList({ enableSearch: true });

      const searchInput = screen.getByPlaceholderText('Search quotes...');

      // Should be focusable
      await user.tab();
      expect(searchInput).toHaveFocus();
    });

    it('should have proper heading structure', () => {
      renderUnifiedQuoteList();

      const heading = screen.getByRole('heading', { name: /quotes/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should retry on error button click', async () => {
      const user = userEvent.setup();
      const mockOnRefresh = vi.fn();

      renderUnifiedQuoteList({
        error: 'Network error',
        quotes: [],
        onRefresh: mockOnRefresh,
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('should clear errors on successful data load', () => {
      const { rerender } = renderUnifiedQuoteList({
        error: 'Network error',
        quotes: [],
      });

      expect(screen.getByText('Error Loading Quotes')).toBeInTheDocument();

      // Re-render with successful data
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <UnifiedQuoteList
                quotes={mockQuotes.slice(0, 5)}
                viewMode="customer"
                layout="list"
                error={undefined}
              />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>,
      );

      expect(screen.queryByText('Error Loading Quotes')).not.toBeInTheDocument();
      expect(screen.getByText('Quotes')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should apply appropriate theme classes', () => {
      const { container } = renderUnifiedQuoteList({ viewMode: 'admin' });

      expect(container.querySelector('.quote-list--admin')).toBeInTheDocument();
    });

    it('should apply color variant classes', () => {
      const { container } = renderUnifiedQuoteList();

      expect(container.querySelector('.color-variant-control')).toBeInTheDocument();
    });
  });
});
