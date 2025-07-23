import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock react-window for performance testing
const mockRenderItem = vi.fn();
const mockOnScroll = vi.fn();

vi.mock('react-window', () => ({
  FixedSizeList: vi.fn().mockImplementation(({ 
    children, 
    itemCount, 
    itemData, 
    onScroll, 
    height, 
    itemSize 
  }) => {
    const items = Array.from({ length: Math.min(itemCount, 20) }, (_, index) => {
      const item = children({
        index,
        style: { 
          position: 'absolute',
          top: index * itemSize,
          height: itemSize,
          width: '100%'
        },
        data: itemData
      });
      mockRenderItem(index, itemData?.[index]);
      return item;
    });

    return (
      <div 
        data-testid="virtual-list"
        style={{ height, overflow: 'auto' }}
        onScroll={(e) => {
          mockOnScroll(e);
          onScroll?.(e);
        }}
      >
        {items}
      </div>
    );
  })
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

// Mock performance API with detailed tracking
const performanceEntries: PerformanceEntry[] = [];
const performanceMarks: Map<string, number> = new Map();

Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
    mark: (name: string) => {
      performanceMarks.set(name, Date.now());
    },
    measure: (name: string, startMark: string, endMark?: string) => {
      const start = performanceMarks.get(startMark) || 0;
      const end = endMark ? performanceMarks.get(endMark) : Date.now();
      const duration = end - start;
      
      performanceEntries.push({
        name,
        startTime: start,
        duration,
        entryType: 'measure'
      } as PerformanceMeasure);
      
      return duration;
    },
    getEntriesByType: (type: string) => {
      return performanceEntries.filter(entry => entry.entryType === type);
    },
    clearMarks: () => {
      performanceMarks.clear();
    },
    clearMeasures: () => {
      performanceEntries.length = 0;
    }
  },
});

// Mock Intersection Observer for viewport detection
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((target) => {
    // Simulate element entering viewport
    setTimeout(() => {
      callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { top: 0, bottom: 100, height: 100 }
      }]);
    }, 0);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver for responsive behavior
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((target) => {
    // Simulate resize
    setTimeout(() => {
      callback([{
        target,
        contentRect: { width: 800, height: 600 }
      }]);
    }, 0);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Generate large datasets for performance testing
const generateLargeQuoteDataset = (count: number): UnifiedQuote[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `perf-quote-${i}`,
    display_id: `QT-PERF${i.toString().padStart(5, '0')}`,
    user_id: `user-${i % 100}`, // 100 different users
    status: ['pending', 'sent', 'approved', 'paid', 'rejected'][i % 5] as any,
    created_at: new Date(Date.now() - (i * 3600000)).toISOString(), // Spread over time
    expires_at: new Date(Date.now() + (30 * 24 * 3600000)).toISOString(),
    final_total_usd: 100 + (i * 10) + Math.random() * 500,
    item_price: 80 + (i * 8) + Math.random() * 400,
    sales_tax_price: 8 + Math.random() * 40,
    merchant_shipping_price: 5 + Math.random() * 20,
    international_shipping: 10 + Math.random() * 30,
    customs_and_ecs: 5 + Math.random() * 25,
    domestic_shipping: 3 + Math.random() * 10,
    handling_charge: 2 + Math.random() * 8,
    insurance_amount: 1 + Math.random() * 5,
    payment_gateway_fee: 2 + Math.random() * 10,
    vat: Math.random() * 15,
    discount: Math.random() * 50,
    destination_country: ['US', 'IN', 'NP', 'CA', 'UK'][i % 5],
    origin_country: ['US', 'CN', 'DE', 'JP'][i % 4],
    website: ['amazon.com', 'flipkart.com', 'ebay.com', 'alibaba.com'][i % 4],
    customer_data: {
      info: {
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `+1${i.toString().padStart(9, '0')}`
      }
    },
    shipping_address: {
      formatted: `${i} Test Street, City ${i % 50}, State, ${i.toString().padStart(5, '0')}`
    },
    items: [{
      id: `item-${i}`,
      name: `Product ${i}`,
      description: `High-quality product for testing performance with ID ${i}`,
      quantity: 1 + (i % 5),
      price: 80 + (i * 8) + Math.random() * 400,
      product_url: `https://example.com/product-${i}`,
      image_url: `https://example.com/image-${i}.jpg`
    }],
    notes: i % 3 === 0 ? `Special instructions for order ${i}` : '',
    admin_notes: i % 5 === 0 ? `Admin note for quote ${i}` : '',
    priority: ['low', 'medium', 'high'][i % 3] as any,
    in_cart: i % 10 === 0,
    attachments: []
  }));
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

describe('Virtual Scrolling Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMarks.clear();
    performanceEntries.length = 0;
    mockRenderItem.mockClear();
    mockOnScroll.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Large Dataset Rendering Performance', () => {
    it('should efficiently render 1000 quotes with virtual scrolling', async () => {
      const quotes = generateLargeQuoteDataset(1000);
      
      performance.mark('render-start');
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
          performanceMode="detailed"
        />
      );
      
      performance.mark('render-end');
      performance.measure('initial-render', 'render-start', 'render-end');

      // Should render virtual list container
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();

      // Should only render visible items (not all 1000)
      await waitFor(() => {
        expect(mockRenderItem).toHaveBeenCalledTimes(20); // Only visible items
      });

      // Measure initial render performance
      const renderTime = performance.measure('initial-render', 'render-start', 'render-end');
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms

      // Should show total count
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should maintain performance with 10000 quotes', async () => {
      const quotes = generateLargeQuoteDataset(10000);
      
      performance.mark('large-render-start');
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSmartCaching={true}
          performanceMode="detailed"
        />
      );
      
      performance.mark('large-render-end');
      performance.measure('large-initial-render', 'large-render-start', 'large-render-end');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      // Should still only render visible items
      expect(mockRenderItem).toHaveBeenCalledTimes(20);

      // Performance should still be acceptable even with 10x data
      const renderTime = performance.measure('large-initial-render', 'large-render-start', 'large-render-end');
      expect(renderTime).toBeLessThan(200); // Allow slightly more time for larger dataset

      // Memory usage should be bounded (check that not all items are in DOM)
      const quoteElements = screen.getAllByText(/QT-PERF/);
      expect(quoteElements.length).toBeLessThanOrEqual(20);
    });

    it('should handle memory efficiently during extended scrolling', async () => {
      const quotes = generateLargeQuoteDataset(5000);
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
          enableSmartCaching={true}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      
      // Simulate scrolling to middle
      performance.mark('scroll-start');
      
      act(() => {
        fireEvent.scroll(virtualList, { target: { scrollTop: 100000 } });
      });

      await waitFor(() => {
        expect(mockOnScroll).toHaveBeenCalled();
      });

      performance.mark('scroll-end');
      performance.measure('scroll-performance', 'scroll-start', 'scroll-end');

      // Scrolling should be smooth and fast
      const scrollTime = performance.measure('scroll-performance', 'scroll-start', 'scroll-end');
      expect(scrollTime).toBeLessThan(50);

      // Should render new visible items
      expect(mockRenderItem).toHaveBeenCalledWith(
        expect.any(Number), 
        expect.any(Object)
      );

      // DOM should still only contain visible items
      const visibleQuotes = screen.getAllByText(/QT-PERF/);
      expect(visibleQuotes.length).toBeLessThanOrEqual(25); // Allow some buffer
    });
  });

  describe('Search Performance with Virtual Scrolling', () => {
    it('should maintain virtual scrolling performance during search', async () => {
      const quotes = generateLargeQuoteDataset(2000);
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
          enableSearch={true}
          performanceMode="detailed"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search quotes...');
      
      performance.mark('search-start');
      
      await user.type(searchInput, 'QT-PERF001');
      
      // Wait for debounced search
      await waitFor(() => {
        // Search should filter results while maintaining virtual scrolling
        expect(screen.getByText('QT-PERF00100')).toBeInTheDocument();
      }, { timeout: 1000 });

      performance.mark('search-end');
      performance.measure('search-performance', 'search-start', 'search-end');

      const searchTime = performance.measure('search-performance', 'search-start', 'search-end');
      expect(searchTime).toBeLessThan(500); // Search should complete quickly

      // Should still use virtual scrolling for filtered results
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should handle complex search queries efficiently', async () => {
      const quotes = generateLargeQuoteDataset(1500);
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSearch={true}
          enableFilters={true}
        />
      );

      performance.mark('complex-search-start');

      // Perform complex search
      const searchInput = screen.getByPlaceholderText('Search quotes...');
      await user.type(searchInput, 'customer50');

      // Apply filters
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      await waitFor(() => {
        // Complex search should still be performant
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      performance.mark('complex-search-end');
      performance.measure('complex-search-performance', 'complex-search-start', 'complex-search-end');

      const complexSearchTime = performance.measure('complex-search-performance', 'complex-search-start', 'complex-search-end');
      expect(complexSearchTime).toBeLessThan(800);
    });
  });

  describe('Sorting Performance with Virtual Scrolling', () => {
    it('should maintain performance during large dataset sorting', async () => {
      const quotes = generateLargeQuoteDataset(3000);
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSorting={true}
          performanceMode="detailed"
        />
      );

      performance.mark('sort-start');

      // Sort by amount (most expensive operation)
      const amountSortButton = screen.getByText('Amount');
      await user.click(amountSortButton);

      await waitFor(() => {
        // Should re-render with sorted data
        expect(mockRenderItem).toHaveBeenCalled();
      });

      performance.mark('sort-end');
      performance.measure('sort-performance', 'sort-start', 'sort-end');

      const sortTime = performance.measure('sort-performance', 'sort-start', 'sort-end');
      expect(sortTime).toBeLessThan(300); // Sorting should be reasonably fast

      // Virtual scrolling should still work after sorting
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      
      // Should show sort indicator
      expect(screen.getByTestId('sort-asc-icon')).toBeInTheDocument();
    });

    it('should handle multiple sort operations efficiently', async () => {
      const quotes = generateLargeQuoteDataset(1000);
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSorting={true}
        />
      );

      performance.mark('multi-sort-start');

      // Multiple sort operations
      const dateSortButton = screen.getByText('Date');
      await user.click(dateSortButton); // Sort by date ASC

      await user.click(dateSortButton); // Sort by date DESC

      const statusSortButton = screen.getByText('Status');
      await user.click(statusSortButton); // Sort by status ASC

      const amountSortButton = screen.getByText('Amount');
      await user.click(amountSortButton); // Sort by amount ASC

      await waitFor(() => {
        expect(mockRenderItem).toHaveBeenCalled();
      });

      performance.mark('multi-sort-end');
      performance.measure('multi-sort-performance', 'multi-sort-start', 'multi-sort-end');

      const multiSortTime = performance.measure('multi-sort-performance', 'multi-sort-start', 'multi-sort-end');
      expect(multiSortTime).toBeLessThan(1000); // Multiple sorts should complete in reasonable time

      // Virtual scrolling should remain functional
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  describe('Selection Performance with Virtual Scrolling', () => {
    it('should handle bulk selection efficiently', async () => {
      const quotes = generateLargeQuoteDataset(2000);
      const mockOnSelectionChange = vi.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSelection={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      performance.mark('bulk-select-start');

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(
          expect.arrayContaining(quotes.map(q => q.id))
        );
      });

      performance.mark('bulk-select-end');
      performance.measure('bulk-select-performance', 'bulk-select-start', 'bulk-select-end');

      const bulkSelectTime = performance.measure('bulk-select-performance', 'bulk-select-start', 'bulk-select-end');
      expect(bulkSelectTime).toBeLessThan(200); // Bulk selection should be fast

      // Should show selection count
      expect(screen.getByText(/2000 Selected/)).toBeInTheDocument();

      // Virtual scrolling should still work with selections
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('should maintain performance with mixed selection operations', async () => {
      const quotes = generateLargeQuoteDataset(1000);
      const mockOnSelectionChange = vi.fn();
      const user = userEvent.setup();
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableVirtualScrolling={true}
          enableSelection={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      performance.mark('mixed-selection-start');

      // Select all
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      // Deselect all
      await user.click(selectAllButton);

      // Select first 100 manually (simulate partial selection)
      for (let i = 0; i < 10; i++) { // Test with 10 for performance
        const checkbox = screen.getAllByRole('checkbox')[i + 1]; // Skip select all checkbox
        if (checkbox) {
          await user.click(checkbox);
        }
      }

      performance.mark('mixed-selection-end');
      performance.measure('mixed-selection-performance', 'mixed-selection-start', 'mixed-selection-end');

      const mixedSelectionTime = performance.measure('mixed-selection-performance', 'mixed-selection-start', 'mixed-selection-end');
      expect(mixedSelectionTime).toBeLessThan(1000);

      // Should handle mixed selections correctly
      expect(mockOnSelectionChange).toHaveBeenCalled();
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should not leak memory during extended virtual scrolling', async () => {
      const quotes = generateLargeQuoteDataset(5000);
      
      const { unmount } = renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
          enableSmartCaching={true}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      
      // Simulate extensive scrolling
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent.scroll(virtualList, { target: { scrollTop: i * 10000 } });
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check that DOM size remains bounded
      const quoteElements = screen.getAllByText(/QT-PERF/);
      expect(quoteElements.length).toBeLessThan(30); // Should not accumulate DOM nodes

      // Cleanup should work properly
      unmount();
      
      // Verify cleanup
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('should efficiently handle component updates with large datasets', async () => {
      const initialQuotes = generateLargeQuoteDataset(1000);
      
      const { rerender } = renderWithProviders(
        <UnifiedQuoteList
          quotes={initialQuotes}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
        />
      );

      // Initial render
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();

      performance.mark('update-start');

      // Update with new data (simulate real-time updates)
      const updatedQuotes = initialQuotes.map(quote => ({
        ...quote,
        status: 'approved' as any,
        final_total_usd: quote.final_total_usd * 1.1
      }));

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <UnifiedQuoteList
                quotes={updatedQuotes}
                viewMode="customer"
                layout="list"
                enableVirtualScrolling={true}
              />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      performance.mark('update-end');
      performance.measure('update-performance', 'update-start', 'update-end');

      const updateTime = performance.measure('update-performance', 'update-start', 'update-end');
      expect(updateTime).toBeLessThan(100); // Updates should be fast

      // Should reflect updated data
      expect(screen.getByText('approved')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty datasets gracefully', async () => {
      performance.mark('empty-render-start');
      
      renderWithProviders(
        <UnifiedQuoteList
          quotes={[]}
          viewMode="customer"
          layout="list"
          enableVirtualScrolling={true}
        />
      );

      performance.mark('empty-render-end');
      performance.measure('empty-render-performance', 'empty-render-start', 'empty-render-end');

      const emptyRenderTime = performance.measure('empty-render-performance', 'empty-render-start', 'empty-render-end');
      expect(emptyRenderTime).toBeLessThan(50);

      // Should show empty state
      expect(screen.getByText('No Quotes Found')).toBeInTheDocument();
    });

    it('should handle rapid data changes efficiently', async () => {
      let quotes = generateLargeQuoteDataset(500);
      
      const RapidUpdateComponent = () => {
        const [currentQuotes, setCurrentQuotes] = React.useState(quotes);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            // Simulate rapid updates
            setCurrentQuotes(prev => prev.map(quote => ({
              ...quote,
              final_total_usd: quote.final_total_usd + Math.random() * 10
            })));
          }, 100);

          setTimeout(() => clearInterval(interval), 500); // Stop after 500ms
          
          return () => clearInterval(interval);
        }, []);

        return (
          <UnifiedQuoteList
            quotes={currentQuotes}
            viewMode="customer"
            layout="list"
            enableVirtualScrolling={true}
            performanceMode="detailed"
          />
        );
      };

      performance.mark('rapid-updates-start');
      
      renderWithProviders(<RapidUpdateComponent />);

      // Wait for rapid updates to complete
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      performance.mark('rapid-updates-end');
      performance.measure('rapid-updates-performance', 'rapid-updates-start', 'rapid-updates-end');

      const rapidUpdatesTime = performance.measure('rapid-updates-performance', 'rapid-updates-start', 'rapid-updates-end');
      expect(rapidUpdatesTime).toBeLessThan(1000); // Should handle rapid updates efficiently

      // Should still be functional
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });
});