import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
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

// Mock cache services
const mockCacheStorage: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

const createMockCacheService = () => ({
  get: vi.fn((key: string) => {
    const entry = mockCacheStorage.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      mockCacheStorage.delete(key);
      return null;
    }

    return entry.data;
  }),
  set: vi.fn((key: string, data: any, ttl: number = 300000) => {
    mockCacheStorage.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }),
  delete: vi.fn((key: string) => {
    mockCacheStorage.delete(key);
  }),
  clear: vi.fn(() => {
    mockCacheStorage.clear();
  }),
  size: vi.fn(() => mockCacheStorage.size),
  keys: vi.fn(() => Array.from(mockCacheStorage.keys())),
});

const mockCacheService = createMockCacheService();

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
        entryType: 'measure',
      } as PerformanceMeasure);

      return duration;
    },
    getEntriesByType: (type: string) => {
      return performanceEntries.filter((entry) => entry.entryType === type);
    },
    clearMarks: () => {
      performanceMarks.clear();
    },
    clearMeasures: () => {
      performanceEntries.length = 0;
    },
  },
});

// Mock localStorage for persistent caching
const mockLocalStorage: { [key: string]: string } = {};

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => {
        delete mockLocalStorage[key];
      });
    }),
    length: Object.keys(mockLocalStorage).length,
  },
});

// Generate test data for caching tests
const generateCacheTestQuote = (
  id: string,
  complexity: 'simple' | 'medium' | 'complex' = 'medium',
): UnifiedQuote => {
  const baseQuote: UnifiedQuote = {
    id,
    display_id: `QT-CACHE${id}`,
    user_id: 'test-user-id',
    status: 'sent',
    created_at: '2024-01-15T10:00:00Z',
    expires_at: '2024-02-15T10:00:00Z',
    final_total_usd: 299.99,
    item_price: 249.99,
    sales_tax_price: 20.0,
    merchant_shipping_price: 15.0,
    international_shipping: 25.0,
    customs_and_ecs: 12.5,
    domestic_shipping: 7.5,
    handling_charge: 5.0,
    insurance_amount: 2.5,
    payment_gateway_fee: 3.75,
    vat: 0.0,
    discount: 10.0,
    destination_country: 'IN',
    origin_country: 'US',
    website: 'amazon.com',
    customer_data: {
      info: {
        name: `Customer ${id}`,
        email: `customer${id}@example.com`,
        phone: `+123456789${id}`,
      },
    },
    shipping_address: {
      formatted: `${id} Test Street, City, State, ZIP`,
    },
    items: [
      {
        id: `item-${id}`,
        name: `Product ${id}`,
        description: `Test product for caching performance ${id}`,
        quantity: 1,
        price: 249.99,
        product_url: `https://example.com/product-${id}`,
        image_url: `https://example.com/image-${id}.jpg`,
      },
    ],
    notes: complexity === 'complex' ? `Very detailed notes for ${id}` : '',
    admin_notes: complexity === 'complex' ? `Detailed admin notes for ${id}` : '',
    priority: 'medium',
    in_cart: false,
    attachments:
      complexity === 'complex'
        ? [
            {
              id: `att-${id}-1`,
              name: `file1-${id}.pdf`,
              url: `https://example.com/file1-${id}.pdf`,
            },
            {
              id: `att-${id}-2`,
              name: `file2-${id}.jpg`,
              url: `https://example.com/file2-${id}.jpg`,
            },
          ]
        : [],
  };

  if (complexity === 'complex') {
    // Add more items for complex quotes
    baseQuote.items.push(
      {
        id: `item-${id}-2`,
        name: `Secondary Product ${id}`,
        description: `Additional complex product for ${id}`,
        quantity: 2,
        price: 124.99,
        product_url: `https://example.com/product-${id}-2`,
        image_url: `https://example.com/image-${id}-2.jpg`,
      },
      {
        id: `item-${id}-3`,
        name: `Third Product ${id}`,
        description: `Even more complex product for ${id}`,
        quantity: 1,
        price: 199.99,
        product_url: `https://example.com/product-${id}-3`,
        image_url: `https://example.com/image-${id}-3.jpg`,
      },
    );
  }

  return baseQuote;
};

// Helper function to render components with providers
const renderWithProviders = (component: React.ReactNode, queryClient?: QueryClient) => {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 60000, cacheTime: 300000 },
        mutations: { retry: false },
      },
    });

  return {
    ...render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <QuoteThemeProvider>{component}</QuoteThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    ),
    queryClient: client,
  };
};

describe('Smart Caching Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMarks.clear();
    performanceEntries.length = 0;
    mockCacheStorage.clear();
    Object.keys(mockLocalStorage).forEach((key) => {
      delete mockLocalStorage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component-Level Caching Performance', () => {
    it('should demonstrate significant performance improvement with cached data', async () => {
      const quote = generateCacheTestQuote('001', 'complex');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60000, cacheTime: 300000 },
        },
      });

      // First render (cold cache)
      performance.mark('cold-render-start');

      const { rerender } = renderWithProviders(
        <UnifiedQuoteCard
          quote={quote}
          viewMode="customer"
          layout="detail"
          enableSmartCaching={true}
          performanceMode="detailed"
        />,
        queryClient,
      );

      performance.mark('cold-render-end');
      performance.measure('cold-render-time', 'cold-render-start', 'cold-render-end');

      expect(screen.getByText('QT-CACHE001')).toBeInTheDocument();

      // Populate cache
      queryClient.setQueryData(['quote', '001'], quote);

      // Second render (warm cache)
      performance.mark('warm-render-start');

      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <UnifiedQuoteCard
                quote={quote}
                viewMode="customer"
                layout="detail"
                enableSmartCaching={true}
                performanceMode="detailed"
              />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>,
      );

      performance.mark('warm-render-end');
      performance.measure('warm-render-time', 'warm-render-start', 'warm-render-end');

      const coldRenderTime = performance.measure(
        'cold-render-time',
        'cold-render-start',
        'cold-render-end',
      );
      const warmRenderTime = performance.measure(
        'warm-render-time',
        'warm-render-start',
        'warm-render-end',
      );

      // Warm cache should be significantly faster
      expect(warmRenderTime).toBeLessThan(coldRenderTime * 0.7); // At least 30% improvement
      expect(warmRenderTime).toBeLessThan(20); // Warm renders should be very fast
    });

    it('should efficiently cache breakdown calculations', async () => {
      const quote = generateCacheTestQuote('002', 'complex');

      // Mock expensive calculation
      const mockCalculateBreakdown = vi.fn().mockImplementation((q) => {
        // Simulate expensive calculation
        const start = Date.now();
        while (Date.now() - start < 10) {} // Simulate 10ms work

        return {
          subtotal: q.item_price,
          taxes: q.sales_tax_price,
          shipping: q.international_shipping + q.domestic_shipping,
          total: q.final_total_usd,
        };
      });

      const CachedBreakdownComponent = ({ enableCaching }: { enableCaching: boolean }) => {
        const cacheKey = `breakdown-${quote.id}`;

        const breakdown = React.useMemo(() => {
          if (enableCaching) {
            const cached = mockCacheService.get(cacheKey);
            if (cached) return cached;
          }

          const result = mockCalculateBreakdown(quote);

          if (enableCaching) {
            mockCacheService.set(cacheKey, result, 300000); // 5 minute cache
          }

          return result;
        }, [enableCaching]);

        return (
          <UnifiedQuoteBreakdown
            quote={quote}
            viewMode="customer"
            enableSmartCaching={enableCaching}
            performanceMode="detailed"
          />
        );
      };

      // Test without caching
      performance.mark('no-cache-start');

      const { rerender } = renderWithProviders(<CachedBreakdownComponent enableCaching={false} />);

      performance.mark('no-cache-end');
      performance.measure('no-cache-render', 'no-cache-start', 'no-cache-end');

      expect(mockCalculateBreakdown).toHaveBeenCalledTimes(1);

      // Test with caching (second render should use cache)
      performance.mark('cache-start');

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <CachedBreakdownComponent enableCaching={true} />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>,
      );

      performance.mark('cache-end');
      performance.measure('cache-render', 'cache-start', 'cache-end');

      // Third render should use cached result
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <CachedBreakdownComponent enableCaching={true} />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>,
      );

      const noCacheTime = performance.measure('no-cache-render', 'no-cache-start', 'no-cache-end');
      const cacheTime = performance.measure('cache-render', 'cache-start', 'cache-end');

      // Should only calculate once (first time)
      expect(mockCalculateBreakdown).toHaveBeenCalledTimes(2); // Once for each component instance

      // Cached version should be faster
      expect(cacheTime).toBeLessThan(noCacheTime);
    });

    it('should handle cache invalidation efficiently', async () => {
      const quotes = [
        generateCacheTestQuote('003', 'medium'),
        generateCacheTestQuote('004', 'medium'),
        generateCacheTestQuote('005', 'medium'),
      ];

      const queryClient = new QueryClient();

      // Populate cache
      quotes.forEach((quote) => {
        queryClient.setQueryData(['quote', quote.id], quote);
      });

      const mockOnItemAction = vi.fn().mockImplementation(async (action, quote) => {
        // Simulate successful update
        const updatedQuote = { ...quote, status: 'approved' };

        performance.mark('cache-invalidation-start');

        // Update cache
        queryClient.setQueryData(['quote', quote.id], updatedQuote);
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['quotes'] });

        performance.mark('cache-invalidation-end');
        performance.measure(
          'cache-invalidation-time',
          'cache-invalidation-start',
          'cache-invalidation-end',
        );

        return { success: true, quote: updatedQuote };
      });

      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="list"
          enableSmartCaching={true}
          onItemAction={mockOnItemAction}
        />,
        queryClient,
      );

      const user = userEvent.setup();

      // Trigger action that invalidates cache
      const approveButton = screen.getAllByText('Approve')[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockOnItemAction).toHaveBeenCalled();
      });

      const invalidationTime = performance.measure(
        'cache-invalidation-time',
        'cache-invalidation-start',
        'cache-invalidation-end',
      );
      expect(invalidationTime).toBeLessThan(50); // Cache invalidation should be very fast
    });
  });

  describe('Memory-Based Caching Performance', () => {
    it('should manage memory cache efficiently with large datasets', async () => {
      const quotes = Array.from({ length: 1000 }, (_, i) =>
        generateCacheTestQuote(i.toString().padStart(3, '0'), 'simple'),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60000,
            cacheTime: 300000,
            // Limit cache size for testing
            structuralSharing: true,
          },
        },
      });

      performance.mark('large-cache-start');

      // Populate cache with large dataset
      quotes.forEach((quote) => {
        queryClient.setQueryData(['quote', quote.id], quote);
      });

      renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="customer"
          layout="list"
          enableSmartCaching={true}
          enableVirtualScrolling={true}
        />,
        queryClient,
      );

      performance.mark('large-cache-end');
      performance.measure('large-cache-performance', 'large-cache-start', 'large-cache-end');

      const largeCacheTime = performance.measure(
        'large-cache-performance',
        'large-cache-start',
        'large-cache-end',
      );
      expect(largeCacheTime).toBeLessThan(500); // Should handle large cache efficiently

      // Check cache size
      const cacheSize = queryClient.getQueryCache().getAll().length;
      expect(cacheSize).toBeGreaterThan(0);
      expect(cacheSize).toBeLessThanOrEqual(1001); // quotes + list query
    });

    it('should implement LRU-style cache eviction under memory pressure', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            cacheTime: 100, // Very short cache time to trigger eviction
          },
        },
      });

      const quotes = Array.from({ length: 50 }, (_, i) =>
        generateCacheTestQuote(i.toString(), 'complex'),
      );

      performance.mark('lru-test-start');

      // Add items to cache sequentially
      for (let i = 0; i < quotes.length; i++) {
        queryClient.setQueryData(['quote', quotes[i].id], quotes[i]);

        // Access first few items repeatedly to keep them "hot"
        if (i < 5) {
          queryClient.getQueryData(['quote', quotes[i].id]);
        }
      }

      // Wait for potential evictions
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      performance.mark('lru-test-end');
      performance.measure('lru-performance', 'lru-test-start', 'lru-test-end');

      const lruTime = performance.measure('lru-performance', 'lru-test-start', 'lru-test-end');
      expect(lruTime).toBeLessThan(200);

      // Check that cache size is managed
      const finalCacheSize = queryClient.getQueryCache().getAll().length;
      expect(finalCacheSize).toBeLessThan(quotes.length); // Some items should have been evicted
    });
  });

  describe('Persistent Caching Performance', () => {
    it('should efficiently save and restore from localStorage', async () => {
      const quote = generateCacheTestQuote('persistent', 'complex');

      const PersistentCacheComponent = () => {
        const [cachedQuote, setCachedQuote] = React.useState<UnifiedQuote | null>(null);

        React.useEffect(() => {
          performance.mark('localStorage-read-start');

          // Try to restore from localStorage
          const stored = localStorage.getItem(`quote-${quote.id}`);
          if (stored) {
            setCachedQuote(JSON.parse(stored));
          } else {
            setCachedQuote(quote);
            // Save to localStorage
            localStorage.setItem(`quote-${quote.id}`, JSON.stringify(quote));
          }

          performance.mark('localStorage-read-end');
          performance.measure(
            'localStorage-read-time',
            'localStorage-read-start',
            'localStorage-read-end',
          );
        }, []);

        if (!cachedQuote) return <div>Loading...</div>;

        return (
          <UnifiedQuoteCard
            quote={cachedQuote}
            viewMode="customer"
            layout="detail"
            enableSmartCaching={true}
          />
        );
      };

      // First render (saves to localStorage)
      const { rerender, unmount } = renderWithProviders(<PersistentCacheComponent />);

      await waitFor(() => {
        expect(screen.getByText('QT-CACHEpersistent')).toBeInTheDocument();
      });

      unmount();

      // Second render (should restore from localStorage)
      performance.mark('persistent-restore-start');

      renderWithProviders(<PersistentCacheComponent />);

      await waitFor(() => {
        expect(screen.getByText('QT-CACHEpersistent')).toBeInTheDocument();
      });

      performance.mark('persistent-restore-end');
      performance.measure(
        'persistent-restore-time',
        'persistent-restore-start',
        'persistent-restore-end',
      );

      const readTime = performance.measure(
        'localStorage-read-time',
        'localStorage-read-start',
        'localStorage-read-end',
      );
      const restoreTime = performance.measure(
        'persistent-restore-time',
        'persistent-restore-start',
        'persistent-restore-end',
      );

      expect(readTime).toBeLessThan(10); // localStorage read should be very fast
      expect(restoreTime).toBeLessThan(100); // Restore should be fast
    });

    it('should handle localStorage quota exceeded gracefully', async () => {
      const originalSetItem = localStorage.setItem;

      // Mock localStorage quota exceeded
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const quote = generateCacheTestQuote('quota-test', 'complex');

      const QuotaTestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          try {
            performance.mark('quota-handling-start');
            localStorage.setItem(`quote-${quote.id}`, JSON.stringify(quote));
            performance.mark('quota-handling-end');
          } catch (e) {
            setError('Storage quota exceeded');
            performance.mark('quota-handling-end');
          }

          performance.measure('quota-handling-time', 'quota-handling-start', 'quota-handling-end');
        }, []);

        return (
          <div>
            {error && <div data-testid="quota-error">{error}</div>}
            <UnifiedQuoteCard quote={quote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<QuotaTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('quota-error')).toBeInTheDocument();
      });

      const quotaHandlingTime = performance.measure(
        'quota-handling-time',
        'quota-handling-start',
        'quota-handling-end',
      );
      expect(quotaHandlingTime).toBeLessThan(50); // Error handling should be fast

      // Component should still render despite cache failure
      expect(screen.getByText('QT-CACHEquota-test')).toBeInTheDocument();

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Cache Hit Rate Optimization', () => {
    it('should achieve high cache hit rates with realistic usage patterns', async () => {
      const quotes = Array.from({ length: 20 }, (_, i) =>
        generateCacheTestQuote(i.toString(), 'medium'),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { staleTime: 300000 }, // 5 minute stale time
        },
      });

      let cacheHits = 0;
      let cacheMisses = 0;

      // Mock cache hit/miss tracking
      const originalGetQueryData = queryClient.getQueryData.bind(queryClient);
      queryClient.getQueryData = vi.fn().mockImplementation((key) => {
        const result = originalGetQueryData(key);
        if (result) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        return result;
      });

      const CacheTestComponent = () => {
        const [currentQuoteIndex, setCurrentQuoteIndex] = React.useState(0);
        const [accessPattern, setAccessPattern] = React.useState<number[]>([]);

        React.useEffect(() => {
          // Simulate realistic access pattern: frequent access to recent items
          const pattern = [0, 1, 0, 2, 1, 0, 3, 1, 2, 0, 4, 2, 1, 0];

          let index = 0;
          const interval = setInterval(() => {
            if (index < pattern.length) {
              const quoteIndex = pattern[index];
              setCurrentQuoteIndex(quoteIndex);
              setAccessPattern((prev) => [...prev, quoteIndex]);

              // Populate cache for accessed items
              queryClient.setQueryData(['quote', quotes[quoteIndex].id], quotes[quoteIndex]);

              index++;
            } else {
              clearInterval(interval);
            }
          }, 10);

          return () => clearInterval(interval);
        }, []);

        return (
          <div>
            <UnifiedQuoteCard
              quote={quotes[currentQuoteIndex]}
              viewMode="customer"
              layout="compact"
              enableSmartCaching={true}
            />
            <div data-testid="access-count">{accessPattern.length}</div>
          </div>
        );
      };

      performance.mark('cache-hit-test-start');

      renderWithProviders(<CacheTestComponent />);

      // Wait for access pattern to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('access-count')).toHaveTextContent('14');
        },
        { timeout: 2000 },
      );

      performance.mark('cache-hit-test-end');
      performance.measure('cache-hit-test-time', 'cache-hit-test-start', 'cache-hit-test-end');

      const testTime = performance.measure(
        'cache-hit-test-time',
        'cache-hit-test-start',
        'cache-hit-test-end',
      );
      expect(testTime).toBeLessThan(1000);

      // Calculate cache hit rate
      const totalAccesses = cacheHits + cacheMisses;
      const hitRate = totalAccesses > 0 ? cacheHits / totalAccesses : 0;

      // Should achieve good hit rate with realistic access patterns
      expect(hitRate).toBeGreaterThan(0.6); // At least 60% hit rate
    });

    it('should optimize cache based on usage patterns', async () => {
      const quotes = Array.from({ length: 100 }, (_, i) =>
        generateCacheTestQuote(i.toString(), 'simple'),
      );

      // Track access frequency
      const accessCounts: Map<string, number> = new Map();
      const mockTrackAccess = vi.fn((quoteId: string) => {
        accessCounts.set(quoteId, (accessCounts.get(quoteId) || 0) + 1);
      });

      const OptimizedCacheComponent = () => {
        const [hotQuotes, setHotQuotes] = React.useState<UnifiedQuote[]>([]);

        React.useEffect(() => {
          performance.mark('cache-optimization-start');

          // Simulate accessing some quotes more frequently
          const frequentlyAccessed = [0, 1, 2, 5, 10];
          const occasionallyAccessed = [3, 4, 6, 7, 8, 9];

          // Hot quotes (accessed multiple times)
          frequentlyAccessed.forEach((index) => {
            for (let i = 0; i < 5; i++) {
              mockTrackAccess(quotes[index].id);
            }
          });

          // Cold quotes (accessed once)
          occasionallyAccessed.forEach((index) => {
            mockTrackAccess(quotes[index].id);
          });

          // Identify hot quotes (accessed more than 2 times)
          const hot = quotes.filter((quote) => (accessCounts.get(quote.id) || 0) > 2);

          setHotQuotes(hot);

          performance.mark('cache-optimization-end');
          performance.measure(
            'cache-optimization-time',
            'cache-optimization-start',
            'cache-optimization-end',
          );
        }, []);

        return (
          <div>
            <div data-testid="hot-quotes-count">{hotQuotes.length}</div>
            <UnifiedQuoteList
              quotes={hotQuotes}
              viewMode="customer"
              layout="compact"
              enableSmartCaching={true}
              performanceMode="detailed"
            />
          </div>
        );
      };

      renderWithProviders(<OptimizedCacheComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('hot-quotes-count')).toHaveTextContent('5');
      });

      const optimizationTime = performance.measure(
        'cache-optimization-time',
        'cache-optimization-start',
        'cache-optimization-end',
      );
      expect(optimizationTime).toBeLessThan(100);

      // Should correctly identify frequently accessed items
      expect(mockTrackAccess).toHaveBeenCalledTimes(30); // 5 * 5 + 6 * 1
    });
  });

  describe('Cache Memory Management', () => {
    it('should prevent memory leaks in long-running applications', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            cacheTime: 1000, // Short cache time for testing
            staleTime: 0,
          },
        },
      });

      const MemoryTestComponent = () => {
        const [quoteCount, setQuoteCount] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            // Continuously create and cache new quotes
            const newQuote = generateCacheTestQuote(`memory-${quoteCount}`, 'simple');
            queryClient.setQueryData(['quote', newQuote.id], newQuote);
            setQuoteCount((prev) => prev + 1);
          }, 50);

          // Stop after creating 100 quotes
          setTimeout(() => clearInterval(interval), 5000);

          return () => clearInterval(interval);
        }, [quoteCount]);

        return (
          <div>
            <div data-testid="quote-count">{quoteCount}</div>
            <div data-testid="cache-size">{queryClient.getQueryCache().getAll().length}</div>
          </div>
        );
      };

      performance.mark('memory-test-start');

      renderWithProviders(<MemoryTestComponent />);

      // Let it run for a while
      await waitFor(
        () => {
          const count = parseInt(screen.getByTestId('quote-count').textContent || '0');
          expect(count).toBeGreaterThan(50);
        },
        { timeout: 6000 },
      );

      performance.mark('memory-test-end');
      performance.measure('memory-test-time', 'memory-test-start', 'memory-test-end');

      // Cache size should be bounded due to automatic cleanup
      const finalCacheSize = parseInt(screen.getByTestId('cache-size').textContent || '0');
      const totalQuotesCreated = parseInt(screen.getByTestId('quote-count').textContent || '0');

      expect(finalCacheSize).toBeLessThan(totalQuotesCreated); // Should cleanup old entries
      expect(finalCacheSize).toBeLessThan(200); // Should not grow unbounded

      const memoryTestTime = performance.measure(
        'memory-test-time',
        'memory-test-start',
        'memory-test-end',
      );
      expect(memoryTestTime).toBeLessThan(7000);
    });
  });
});
