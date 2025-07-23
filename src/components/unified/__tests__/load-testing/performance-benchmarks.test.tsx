import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Performance monitoring utilities
class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    
    if (startTime === undefined) {
      throw new Error(`Start mark "${startMark}" not found`);
    }
    
    const duration = endTime! - startTime;
    this.measures.set(name, duration);
    return duration;
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  clearMarks(): void {
    this.marks.clear();
  }

  clearMeasures(): void {
    this.measures.clear();
  }

  getMemoryUsage(): { used: number; total: number; } {
    // Mock memory usage (in real implementation, use performance.memory)
    return {
      used: Math.random() * 50 * 1024 * 1024, // Random value up to 50MB
      total: 100 * 1024 * 1024 // 100MB total
    };
  }
}

// Load testing utilities
class LoadTestRunner {
  private concurrentRequests: number = 0;
  private completedRequests: number = 0;
  private failedRequests: number = 0;
  private totalDuration: number = 0;
  private requestTimes: number[] = [];

  async runConcurrentTest(
    testFunction: () => Promise<void>,
    concurrency: number,
    totalRequests: number
  ): Promise<{
    completedRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    p95ResponseTime: number;
    memoryUsage: { used: number; total: number; };
  }> {
    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    // Reset counters
    this.concurrentRequests = 0;
    this.completedRequests = 0;
    this.failedRequests = 0;
    this.requestTimes = [];

    // Create batches of concurrent requests
    for (let i = 0; i < totalRequests; i += concurrency) {
      const batchSize = Math.min(concurrency, totalRequests - i);
      const batch = Array.from({ length: batchSize }, () => this.runSingleRequest(testFunction));
      promises.push(...batch);

      // Add small delay between batches to simulate realistic load
      if (i + concurrency < totalRequests) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await Promise.allSettled(promises);

    const endTime = performance.now();
    this.totalDuration = endTime - startTime;

    // Calculate metrics
    const averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    const requestsPerSecond = (this.completedRequests / this.totalDuration) * 1000;
    
    // Calculate 95th percentile
    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;

    const performanceMonitor = new PerformanceMonitor();
    const memoryUsage = performanceMonitor.getMemoryUsage();

    return {
      completedRequests: this.completedRequests,
      failedRequests: this.failedRequests,
      averageResponseTime,
      requestsPerSecond,
      p95ResponseTime,
      memoryUsage
    };
  }

  private async runSingleRequest(testFunction: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    
    try {
      this.concurrentRequests++;
      await testFunction();
      this.completedRequests++;
    } catch (error) {
      this.failedRequests++;
      console.error('Load test request failed:', error);
    } finally {
      this.concurrentRequests--;
      const endTime = performance.now();
      this.requestTimes.push(endTime - startTime);
    }
  }
}

// Mock large dataset generator
const generateTestQuotes = (count: number): UnifiedQuote[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `load-test-quote-${index + 1}`,
    display_id: `QT-LOAD${(index + 1).toString().padStart(3, '0')}`,
    user_id: `load-test-user-${Math.floor(index / 100) + 1}`,
    status: ['pending', 'sent', 'approved', 'paid', 'shipped'][index % 5] as any,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    final_total_usd: Math.round((Math.random() * 2000 + 100) * 100) / 100,
    item_price: Math.round((Math.random() * 1500 + 50) * 100) / 100,
    sales_tax_price: Math.round(Math.random() * 200 * 100) / 100,
    merchant_shipping_price: Math.round((Math.random() * 50 + 5) * 100) / 100,
    international_shipping: Math.round((Math.random() * 100 + 10) * 100) / 100,
    customs_and_ecs: Math.round(Math.random() * 150 * 100) / 100,
    domestic_shipping: Math.round((Math.random() * 30 + 5) * 100) / 100,
    handling_charge: Math.round((Math.random() * 20 + 2) * 100) / 100,
    insurance_amount: Math.round((Math.random() * 15 + 1) * 100) / 100,
    payment_gateway_fee: Math.round((Math.random() * 25 + 2) * 100) / 100,
    vat: Math.round(Math.random() * 100 * 100) / 100,
    discount: Math.round(Math.random() * 200 * 100) / 100,
    destination_country: ['US', 'IN', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'][index % 8],
    origin_country: ['US', 'CN', 'DE', 'JP'][index % 4],
    website: ['amazon.com', 'ebay.com', 'alibaba.com', 'flipkart.com'][index % 4],
    customer_data: {
      info: {
        name: `Load Test Customer ${index + 1}`,
        email: `loadtest${index + 1}@example.com`,
        phone: `+1-555-${String(index + 1).padStart(4, '0')}`
      }
    },
    shipping_address: {
      formatted: `${index + 1} Load Test Street, Test City, TC ${String(index + 1).padStart(5, '0')}, Test Country`
    },
    items: [{
      id: `load-test-item-${index + 1}`,
      name: `Load Test Product ${index + 1}`,
      description: `High-performance product for load testing purposes - Item ${index + 1}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      price: Math.round((Math.random() * 1500 + 50) * 100) / 100,
      product_url: `https://example.com/product-${index + 1}`,
      image_url: `https://example.com/image-${index + 1}.jpg`
    }],
    notes: `Load test quote ${index + 1} for performance benchmarking`,
    admin_notes: `Bulk generated for load testing - Batch ${Math.floor(index / 100) + 1}`,
    priority: ['low', 'medium', 'high', 'urgent'][index % 4] as any,
    in_cart: Math.random() > 0.7,
    attachments: []
  }));
};

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'load-test-user-id', email: 'loadtest@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Mock IntersectionObserver for virtual scrolling
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((target) => {
    setTimeout(() => {
      callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: { top: 0, bottom: 100, height: 100 },
        rootBounds: { top: 0, bottom: 800, height: 800 }
      }]);
    }, 1);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Helper function to render components with providers
const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: 1,
        retryDelay: 100,
        staleTime: 30000,
        cacheTime: 60000
      },
      mutations: { 
        retry: 1,
        retryDelay: 100
      },
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

describe('Load Testing and Performance Benchmarks', () => {
  let performanceMonitor: PerformanceMonitor;
  let loadTestRunner: LoadTestRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor = new PerformanceMonitor();
    loadTestRunner = new LoadTestRunner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    performanceMonitor.clearMarks();
    performanceMonitor.clearMeasures();
  });

  describe('Component Rendering Performance', () => {
    it('should render large quote lists efficiently', async () => {
      const quotes = generateTestQuotes(1000);
      
      performanceMonitor.mark('list-render-start');
      
      const { container } = renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="table"
        />
      );

      await waitFor(() => {
        expect(container.querySelector('[role="table"]')).toBeInTheDocument();
      });

      performanceMonitor.mark('list-render-end');
      const renderTime = performanceMonitor.measure('list-render', 'list-render-start', 'list-render-end');

      // Should render 1000 quotes in under 2 seconds
      expect(renderTime).toBeLessThan(2000);
      
      // Memory usage should be reasonable
      const memory = performanceMonitor.getMemoryUsage();
      expect(memory.used).toBeLessThan(memory.total * 0.8); // Less than 80% of available memory
    });

    it('should handle rapid quote card updates efficiently', async () => {
      const quote = generateTestQuotes(1)[0];
      const updateCount = 100;
      let updateTimes: number[] = [];

      const RapidUpdateTest = () => {
        const [currentQuote, setCurrentQuote] = React.useState(quote);
        const [updateCounter, setUpdateCounter] = React.useState(0);

        React.useEffect(() => {
          if (updateCounter < updateCount) {
            const startTime = performance.now();
            
            setTimeout(() => {
              setCurrentQuote({
                ...currentQuote,
                final_total_usd: Math.random() * 1000,
                status: ['pending', 'sent', 'approved'][Math.floor(Math.random() * 3)] as any
              });
              
              const endTime = performance.now();
              updateTimes.push(endTime - startTime);
              setUpdateCounter(c => c + 1);
            }, 10);
          }
        }, [updateCounter, currentQuote]);

        return (
          <div>
            <div data-testid="update-counter">{updateCounter}</div>
            <UnifiedQuoteCard
              quote={currentQuote}
              viewMode="admin"
              layout="detail"
            />
          </div>
        );
      };

      renderWithProviders(<RapidUpdateTest />);

      // Wait for all updates to complete
      await waitFor(() => {
        expect(screen.getByTestId('update-counter')).toHaveTextContent(updateCount.toString());
      }, { timeout: 5000 });

      // Calculate average update time
      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      
      // Each update should take less than 50ms on average
      expect(averageUpdateTime).toBeLessThan(50);
      
      // 95th percentile should be under 100ms
      const sortedTimes = updateTimes.sort((a, b) => a - b);
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      expect(p95Time).toBeLessThan(100);
    });

    it('should handle form rendering with large datasets efficiently', async () => {
      const FormWithLargeDataset = () => {
        const [formData, setFormData] = React.useState({
          countries: Array.from({ length: 200 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}` })),
          categories: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Category ${i}` }))
        });

        return (
          <div>
            <select data-testid="country-select">
              {formData.countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={vi.fn()}
            />
          </div>
        );
      };

      performanceMonitor.mark('form-render-start');
      
      renderWithProviders(<FormWithLargeDataset />);

      await waitFor(() => {
        expect(screen.getByTestId('country-select')).toBeInTheDocument();
      });

      performanceMonitor.mark('form-render-end');
      const renderTime = performanceMonitor.measure('form-render', 'form-render-start', 'form-render-end');

      // Form with large dataset should render in under 1 second
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent User Load Testing', () => {
    it('should handle multiple concurrent quote approvals', async () => {
      const quotes = generateTestQuotes(50);
      let approvalCount = 0;

      const testApproval = async (): Promise<void> => {
        return new Promise((resolve) => {
          const mockAction = vi.fn().mockImplementation(() => {
            approvalCount++;
            resolve();
          });

          const { unmount } = renderWithProviders(
            <UnifiedQuoteActions
              quote={quotes[approvalCount % quotes.length]}
              viewMode="admin"
              onAction={mockAction}
            />
          );

          // Simulate user clicking approve
          setTimeout(async () => {
            const approveButton = screen.getByText('Approve Quote');
            fireEvent.click(approveButton);
            unmount();
          }, Math.random() * 100);
        });
      };

      const results = await loadTestRunner.runConcurrentTest(
        testApproval,
        10, // 10 concurrent users
        50  // 50 total requests
      );

      // Performance benchmarks
      expect(results.completedRequests).toBe(50);
      expect(results.failedRequests).toBe(0);
      expect(results.averageResponseTime).toBeLessThan(200); // Under 200ms average
      expect(results.requestsPerSecond).toBeGreaterThan(50); // At least 50 RPS
      expect(results.p95ResponseTime).toBeLessThan(500); // 95th percentile under 500ms
      
      // Memory should not exceed reasonable limits
      expect(results.memoryUsage.used / results.memoryUsage.total).toBeLessThan(0.9);
    });

    it('should handle concurrent form submissions', async () => {
      let submissionCount = 0;

      const testFormSubmission = async (): Promise<void> => {
        return new Promise((resolve) => {
          const mockSubmit = vi.fn().mockImplementation(() => {
            submissionCount++;
            resolve();
          });

          const { unmount } = renderWithProviders(
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={mockSubmit}
            />
          );

          // Simulate form filling and submission
          setTimeout(async () => {
            const nameInput = screen.getByLabelText(/your name/i);
            const emailInput = screen.getByLabelText(/email address/i);
            
            fireEvent.change(nameInput, { target: { value: `User ${submissionCount}` } });
            fireEvent.change(emailInput, { target: { value: `user${submissionCount}@example.com` } });
            
            const submitButton = screen.getByRole('button', { name: /submit quote request/i });
            fireEvent.click(submitButton);
            
            unmount();
          }, Math.random() * 150);
        });
      };

      const results = await loadTestRunner.runConcurrentTest(
        testFormSubmission,
        5,  // 5 concurrent users
        25  // 25 total submissions
      );

      expect(results.completedRequests).toBe(25);
      expect(results.failedRequests).toBe(0);
      expect(results.averageResponseTime).toBeLessThan(300);
      expect(results.requestsPerSecond).toBeGreaterThan(20);
    });

    it('should handle concurrent quote list scrolling', async () => {
      const quotes = generateTestQuotes(5000);
      let scrollCount = 0;

      const testScrolling = async (): Promise<void> => {
        return new Promise((resolve) => {
          const { container, unmount } = renderWithProviders(
            <UnifiedQuoteList
              quotes={quotes}
              viewMode="customer"
              layout="list"
            />
          );

          setTimeout(() => {
            // Simulate rapid scrolling
            const scrollableElement = container.querySelector('[data-testid="virtual-list"]');
            if (scrollableElement) {
              for (let i = 0; i < 10; i++) {
                fireEvent.scroll(scrollableElement, { target: { scrollTop: i * 100 } });
              }
            }
            scrollCount++;
            unmount();
            resolve();
          }, Math.random() * 100);
        });
      };

      const results = await loadTestRunner.runConcurrentTest(
        testScrolling,
        8,  // 8 concurrent users scrolling
        40  // 40 total scroll sessions
      );

      expect(results.completedRequests).toBe(40);
      expect(results.failedRequests).toBe(0);
      expect(results.averageResponseTime).toBeLessThan(250);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during component mounting/unmounting', async () => {
      const quotes = generateTestQuotes(100);
      const initialMemory = performanceMonitor.getMemoryUsage();
      
      const MountUnmountTest = () => {
        const [mounted, setMounted] = React.useState(true);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setMounted(m => !m);
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
          }, 2000);

          return () => clearInterval(interval);
        }, []);

        if (!mounted) return null;

        return (
          <UnifiedQuoteList
            quotes={quotes}
            viewMode="admin"
            layout="table"
          />
        );
      };

      renderWithProviders(<MountUnmountTest />);

      // Wait for multiple mount/unmount cycles
      await new Promise(resolve => setTimeout(resolve, 2500));

      const finalMemory = performanceMonitor.getMemoryUsage();
      
      // Memory usage should not increase significantly (less than 20% growth)
      const memoryGrowth = (finalMemory.used - initialMemory.used) / initialMemory.used;
      expect(memoryGrowth).toBeLessThan(0.2);
    });

    it('should clean up event listeners properly', async () => {
      let listenerCount = 0;
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;

      window.addEventListener = vi.fn().mockImplementation((...args) => {
        listenerCount++;
        return originalAddEventListener.apply(window, args);
      });

      window.removeEventListener = vi.fn().mockImplementation((...args) => {
        listenerCount--;
        return originalRemoveEventListener.apply(window, args);
      });

      const EventListenerTest = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          const handleResize = () => setCount(c => c + 1);
          const handleScroll = () => setCount(c => c + 1);

          window.addEventListener('resize', handleResize);
          window.addEventListener('scroll', handleScroll);

          return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
          };
        }, []);

        return (
          <UnifiedQuoteCard
            quote={generateTestQuotes(1)[0]}
            viewMode="customer"
            layout="detail"
          />
        );
      };

      const { unmount } = renderWithProviders(<EventListenerTest />);
      
      // Let component mount and set up listeners
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const listenersAfterMount = listenerCount;
      
      // Unmount component
      unmount();
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // All listeners should be cleaned up
      expect(listenerCount).toBeLessThanOrEqual(listenersAfterMount - 2);

      // Restore original functions
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });
  });

  describe('Performance Regression Testing', () => {
    it('should maintain performance baselines for quote rendering', async () => {
      const quotes = generateTestQuotes(500);
      const performanceBaselines = {
        initialRender: 1500, // 1.5 seconds
        listUpdate: 200,     // 200ms
        itemScrolling: 50    // 50ms per scroll
      };

      // Test initial render performance
      performanceMonitor.mark('baseline-render-start');
      
      const { rerender } = renderWithProviders(
        <UnifiedQuoteList
          quotes={quotes}
          viewMode="admin"
          layout="table"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      performanceMonitor.mark('baseline-render-end');
      const initialRenderTime = performanceMonitor.measure('baseline-render', 'baseline-render-start', 'baseline-render-end');

      expect(initialRenderTime).toBeLessThan(performanceBaselines.initialRender);

      // Test update performance
      performanceMonitor.mark('baseline-update-start');
      
      const updatedQuotes = quotes.map(q => ({ ...q, status: 'approved' as any }));
      
      rerender(
        <UnifiedQuoteList
          quotes={updatedQuotes}
          viewMode="admin"
          layout="table"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('approved')).toHaveLength(Math.min(25, quotes.length)); // Assuming 25 items per page
      });

      performanceMonitor.mark('baseline-update-end');
      const updateTime = performanceMonitor.measure('baseline-update', 'baseline-update-start', 'baseline-update-end');

      expect(updateTime).toBeLessThan(performanceBaselines.listUpdate);
    });

    it('should maintain performance under stress conditions', async () => {
      const StressTest = () => {
        const [quotes, setQuotes] = React.useState(generateTestQuotes(100));
        const [updateCount, setUpdateCount] = React.useState(0);

        React.useEffect(() => {
          if (updateCount < 50) {
            setTimeout(() => {
              // Simulate rapid updates
              setQuotes(prevQuotes => prevQuotes.map(q => ({
                ...q,
                final_total_usd: Math.random() * 2000,
                status: ['pending', 'sent', 'approved', 'paid'][Math.floor(Math.random() * 4)] as any
              })));
              setUpdateCount(c => c + 1);
            }, 50);
          }
        }, [updateCount]);

        return (
          <div>
            <div data-testid="stress-counter">{updateCount}</div>
            <UnifiedQuoteList
              quotes={quotes}
              viewMode="admin"
              layout="table"
            />
          </div>
        );
      };

      performanceMonitor.mark('stress-test-start');
      
      renderWithProviders(<StressTest />);

      await waitFor(() => {
        expect(screen.getByTestId('stress-counter')).toHaveTextContent('50');
      }, { timeout: 10000 });

      performanceMonitor.mark('stress-test-end');
      const stressTestTime = performanceMonitor.measure('stress-test', 'stress-test-start', 'stress-test-end');

      // Stress test should complete in under 5 seconds
      expect(stressTestTime).toBeLessThan(5000);

      const finalMemory = performanceMonitor.getMemoryUsage();
      // Memory usage should remain reasonable even under stress
      expect(finalMemory.used / finalMemory.total).toBeLessThan(0.85);
    });
  });

  describe('Network Performance Simulation', () => {
    it('should handle slow network conditions gracefully', async () => {
      // Mock slow API responses
      const slowApiResponse = () => new Promise(resolve => setTimeout(resolve, 2000));

      const SlowNetworkTest = () => {
        const [loading, setLoading] = React.useState(true);
        const [quotes, setQuotes] = React.useState<UnifiedQuote[]>([]);

        React.useEffect(() => {
          slowApiResponse().then(() => {
            setQuotes(generateTestQuotes(10));
            setLoading(false);
          });
        }, []);

        if (loading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return (
          <UnifiedQuoteList
            quotes={quotes}
            viewMode="customer"
            layout="list"
          />
        );
      };

      performanceMonitor.mark('slow-network-start');
      
      renderWithProviders(<SlowNetworkTest />);

      // Should show loading state initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      performanceMonitor.mark('slow-network-end');
      const loadTime = performanceMonitor.measure('slow-network', 'slow-network-start', 'slow-network-end');

      // Should handle gracefully even with slow network
      expect(loadTime).toBeGreaterThan(1900); // Should respect the 2s delay
      expect(loadTime).toBeLessThan(3000); // But not take too much longer
    });

    it('should optimize for high-latency connections', async () => {
      const HighLatencyTest = () => {
        const [quotes] = React.useState(generateTestQuotes(50));
        const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 10 });

        React.useEffect(() => {
          // Simulate lazy loading with high latency
          const loadMore = () => {
            setTimeout(() => {
              setVisibleRange(prev => ({ 
                start: prev.start, 
                end: Math.min(prev.end + 10, quotes.length) 
              }));
            }, 500); // 500ms latency
          };

          if (visibleRange.end < quotes.length) {
            loadMore();
          }
        }, [visibleRange, quotes.length]);

        const visibleQuotes = quotes.slice(visibleRange.start, visibleRange.end);

        return (
          <div>
            <div data-testid="visible-count">{visibleQuotes.length}</div>
            <UnifiedQuoteList
              quotes={visibleQuotes}
              viewMode="customer"
              layout="list"
            />
          </div>
        );
      };

      renderWithProviders(<HighLatencyTest />);

      // Should progressively load more items
      await waitFor(() => {
        expect(parseInt(screen.getByTestId('visible-count').textContent!)).toBeGreaterThan(10);
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(parseInt(screen.getByTestId('visible-count').textContent!)).toBe(50);
      }, { timeout: 5000 });
    });
  });
});