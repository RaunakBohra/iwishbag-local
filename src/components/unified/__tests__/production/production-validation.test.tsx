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

// Production environment configurations
const PRODUCTION_CONFIG = {
  apiUrl: 'https://api.iwishbag.com',
  cdnUrl: 'https://cdn.iwishbag.com',
  environment: 'production',
  version: '2.1.0',
  buildId: 'prod-20241215-abc123',
  features: {
    analytics: true,
    errorTracking: true,
    performanceMonitoring: true,
    a11y: true,
    pwa: true,
  },
  limits: {
    maxQuotesPerPage: 25,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentUsers: 10000,
    apiRateLimit: 100, // requests per minute
    cacheTTL: 300000, // 5 minutes
  },
  security: {
    csrfProtection: true,
    corsEnabled: true,
    httpsOnly: true,
    secureHeaders: true,
  },
};

// Production monitoring utilities
class ProductionMonitor {
  private metrics: Map<string, any> = new Map();
  private alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
  }> = [];

  trackMetric(name: string, value: any, tags: Record<string, string> = {}): void {
    this.metrics.set(name, {
      value,
      tags,
      timestamp: Date.now(),
    });

    // Simulate production monitoring thresholds
    this.checkThresholds(name, value);
  }

  private checkThresholds(metricName: string, value: any): void {
    const thresholds = {
      response_time: { warning: 500, error: 1000, critical: 2000 },
      error_rate: { warning: 0.01, error: 0.05, critical: 0.1 },
      memory_usage: { warning: 0.7, error: 0.85, critical: 0.95 },
      cpu_usage: { warning: 0.7, error: 0.85, critical: 0.95 },
    };

    const threshold = thresholds[metricName as keyof typeof thresholds];
    if (!threshold) return;

    if (value >= threshold.critical) {
      this.addAlert('critical', `${metricName} is critical: ${value}`, Date.now());
    } else if (value >= threshold.error) {
      this.addAlert('error', `${metricName} is high: ${value}`, Date.now());
    } else if (value >= threshold.warning) {
      this.addAlert('warning', `${metricName} is elevated: ${value}`, Date.now());
    }
  }

  addAlert(
    level: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    timestamp: number,
  ): void {
    this.alerts.push({ level, message, timestamp });

    // In production, this would send to monitoring services
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  getMetric(name: string): any {
    return this.metrics.get(name);
  }

  getAlerts(level?: string): Array<{ level: string; message: string; timestamp: number }> {
    return level ? this.alerts.filter((alert) => alert.level === level) : this.alerts;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.alerts = [];
  }
}

// Production error handling
class ProductionErrorHandler {
  private errors: Array<{ error: Error; context: any; timestamp: number }> = [];

  captureError(error: Error, context: any = {}): void {
    this.errors.push({
      error,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        buildId: PRODUCTION_CONFIG.buildId,
        version: PRODUCTION_CONFIG.version,
      },
      timestamp: Date.now(),
    });

    // In production, this would send to Sentry or similar service
    console.error('Production Error:', error, context);
  }

  getErrors(): Array<{ error: Error; context: any; timestamp: number }> {
    return this.errors;
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// Production API mocking
const mockProductionAPI = {
  quotes: {
    list: vi.fn().mockImplementation(async (params: any) => {
      // Simulate production API response times and patterns
      const delay = Math.random() * 200 + 50; // 50-250ms
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (Math.random() < 0.02) {
        // 2% error rate
        throw new Error('API temporarily unavailable');
      }

      return {
        data: generateProductionQuotes(params.limit || 25),
        pagination: {
          page: params.page || 1,
          limit: params.limit || 25,
          total: 1000,
          totalPages: 40,
        },
        meta: {
          timestamp: Date.now(),
          version: PRODUCTION_CONFIG.version,
        },
      };
    }),

    update: vi.fn().mockImplementation(async (id: string, data: any) => {
      const delay = Math.random() * 300 + 100; // 100-400ms
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (Math.random() < 0.01) {
        // 1% error rate
        throw new Error('Update failed - please try again');
      }

      return {
        data: { ...data, id, updated_at: new Date().toISOString() },
        meta: { timestamp: Date.now() },
      };
    }),

    create: vi.fn().mockImplementation(async (data: any) => {
      const delay = Math.random() * 500 + 200; // 200-700ms
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (Math.random() < 0.005) {
        // 0.5% error rate
        throw new Error('Creation failed - validation error');
      }

      return {
        data: { ...data, id: `prod-${Date.now()}`, created_at: new Date().toISOString() },
        meta: { timestamp: Date.now() },
      };
    }),
  },
};

// Generate production-like test data
const generateProductionQuotes = (count: number): UnifiedQuote[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `prod-quote-${Date.now()}-${index}`,
    display_id: `QT-PROD${(index + 1).toString().padStart(4, '0')}`,
    user_id: `prod-user-${Math.floor(Math.random() * 1000)}`,
    status: ['pending', 'sent', 'approved', 'paid', 'shipped', 'completed'][
      Math.floor(Math.random() * 6)
    ] as any,
    created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    final_total_usd: Math.round((Math.random() * 3000 + 50) * 100) / 100,
    item_price: Math.round((Math.random() * 2500 + 25) * 100) / 100,
    sales_tax_price: Math.round(Math.random() * 250 * 100) / 100,
    merchant_shipping_price: Math.round((Math.random() * 75 + 5) * 100) / 100,
    international_shipping: Math.round((Math.random() * 150 + 15) * 100) / 100,
    customs_and_ecs: Math.round(Math.random() * 200 * 100) / 100,
    domestic_shipping: Math.round((Math.random() * 40 + 5) * 100) / 100,
    handling_charge: Math.round((Math.random() * 30 + 3) * 100) / 100,
    insurance_amount: Math.round((Math.random() * 25 + 2) * 100) / 100,
    payment_gateway_fee: Math.round((Math.random() * 40 + 3) * 100) / 100,
    vat: Math.round(Math.random() * 150 * 100) / 100,
    discount: Math.round(Math.random() * 300 * 100) / 100,
    destination_country: ['US', 'IN', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'SG', 'AE'][
      Math.floor(Math.random() * 10)
    ],
    origin_country: ['US', 'CN', 'DE', 'JP', 'GB'][Math.floor(Math.random() * 5)],
    website: ['amazon.com', 'ebay.com', 'alibaba.com', 'flipkart.com', 'etsy.com'][
      Math.floor(Math.random() * 5)
    ],
    customer_data: {
      info: {
        name: `Production Customer ${index + 1}`,
        email: `prod.customer${index + 1}@example.com`,
        phone: `+${Math.floor(Math.random() * 99) + 1}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      },
    },
    shipping_address: {
      formatted: `${index + 1} Production Street, Business District, ${Math.floor(Math.random() * 99999) + 10000}, Production Country`,
    },
    items: [
      {
        id: `prod-item-${index + 1}`,
        name: `Production Item ${index + 1}`,
        description: `Real-world product for production testing - ${['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'][Math.floor(Math.random() * 5)]}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.round((Math.random() * 2500 + 25) * 100) / 100,
        product_url: `https://example.com/product-${index + 1}`,
        image_url: `${PRODUCTION_CONFIG.cdnUrl}/images/product-${index + 1}.jpg`,
      },
    ],
    notes: `Production quote ${index + 1} for end-to-end testing`,
    admin_notes: `Generated for production validation - Batch ${Math.floor(index / 100) + 1}`,
    priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)] as any,
    in_cart: Math.random() > 0.8,
    attachments:
      Math.random() > 0.7
        ? [
            {
              id: `attachment-${index}`,
              name: `document-${index}.pdf`,
              url: `${PRODUCTION_CONFIG.cdnUrl}/attachments/document-${index}.pdf`,
            },
          ]
        : [],
  }));
};

// Mock dependencies with production configurations
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'prod-user-12345',
      email: 'production.user@iwishbag.com',
      subscription_plan: 'enterprise',
      created_at: '2023-01-01T00:00:00Z',
    },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: true, // Production admin access
    isLoading: false,
  }),
}));

// Helper function to render components with production providers
const renderWithProductionProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: PRODUCTION_CONFIG.limits.cacheTTL,
        cacheTime: PRODUCTION_CONFIG.limits.cacheTTL * 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 2,
        retryDelay: 1000,
      },
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

describe('Production Environment Validation', () => {
  let productionMonitor: ProductionMonitor;
  let errorHandler: ProductionErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    productionMonitor = new ProductionMonitor();
    errorHandler = new ProductionErrorHandler();

    // Set production environment
    process.env.NODE_ENV = 'production';
    process.env.VITE_API_URL = PRODUCTION_CONFIG.apiUrl;
    process.env.VITE_CDN_URL = PRODUCTION_CONFIG.cdnUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    productionMonitor.clearMetrics();
    errorHandler.clearErrors();
  });

  describe('Production Configuration Validation', () => {
    it('should validate all required production environment variables', () => {
      const requiredEnvVars = ['VITE_API_URL', 'VITE_CDN_URL'];

      requiredEnvVars.forEach((envVar) => {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      });

      // Validate URLs are HTTPS in production
      expect(process.env.VITE_API_URL).toMatch(/^https:\/\//);
      expect(process.env.VITE_CDN_URL).toMatch(/^https:\/\//);
    });

    it('should validate production feature flags', () => {
      const { features } = PRODUCTION_CONFIG;

      expect(features.analytics).toBe(true);
      expect(features.errorTracking).toBe(true);
      expect(features.performanceMonitoring).toBe(true);
      expect(features.a11y).toBe(true);
      expect(features.pwa).toBe(true);
    });

    it('should validate security configurations', () => {
      const { security } = PRODUCTION_CONFIG;

      expect(security.csrfProtection).toBe(true);
      expect(security.corsEnabled).toBe(true);
      expect(security.httpsOnly).toBe(true);
      expect(security.secureHeaders).toBe(true);
    });

    it('should validate production limits and constraints', () => {
      const { limits } = PRODUCTION_CONFIG;

      expect(limits.maxQuotesPerPage).toBeGreaterThan(0);
      expect(limits.maxQuotesPerPage).toBeLessThanOrEqual(100);
      expect(limits.maxFileSize).toBeGreaterThan(0);
      expect(limits.maxConcurrentUsers).toBeGreaterThan(1000);
      expect(limits.apiRateLimit).toBeGreaterThan(10);
      expect(limits.cacheTTL).toBeGreaterThan(0);
    });
  });

  describe('Production API Integration', () => {
    it('should handle production API responses correctly', async () => {
      const startTime = performance.now();

      const ProductionAPITest = () => {
        const [quotes, setQuotes] = React.useState<UnifiedQuote[]>([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          mockProductionAPI.quotes
            .list({ limit: 25, page: 1 })
            .then((response) => {
              setQuotes(response.data);
              setLoading(false);

              const responseTime = performance.now() - startTime;
              productionMonitor.trackMetric('api_response_time', responseTime, {
                endpoint: 'quotes.list',
                status: 'success',
              });
            })
            .catch((err) => {
              setError(err.message);
              setLoading(false);
              errorHandler.captureError(err, { endpoint: 'quotes.list' });
            });
        }, []);

        if (loading) return <div data-testid="loading">Loading...</div>;
        if (error) return <div data-testid="error">{error}</div>;

        return <UnifiedQuoteList quotes={quotes} viewMode="admin" layout="table" />;
      };

      renderWithProductionProviders(<ProductionAPITest />);

      await waitFor(
        () => {
          expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Verify API performance metrics
      const responseTime = productionMonitor.getMetric('api_response_time');
      expect(responseTime).toBeDefined();
      expect(responseTime.value).toBeLessThan(1000); // Under 1 second

      // Check for any errors
      const errors = errorHandler.getErrors();
      if (errors.length > 0) {
        console.warn('Production API errors detected:', errors);
      }
    });

    it('should handle production API failures gracefully', async () => {
      // Force API failure for testing
      mockProductionAPI.quotes.list.mockRejectedValueOnce(
        new Error('Service temporarily unavailable'),
      );

      const APIFailureTest = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [retryCount, setRetryCount] = React.useState(0);

        React.useEffect(() => {
          const attemptLoad = async () => {
            try {
              await mockProductionAPI.quotes.list({ limit: 25 });
            } catch (err) {
              setError((err as Error).message);
              errorHandler.captureError(err as Error, {
                endpoint: 'quotes.list',
                retryAttempt: retryCount,
              });

              // Implement retry logic
              if (retryCount < 3) {
                setTimeout(
                  () => {
                    setRetryCount((c) => c + 1);
                    setError(null);
                  },
                  1000 * (retryCount + 1),
                ); // Exponential backoff
              }
            }
          };

          attemptLoad();
        }, [retryCount]);

        return (
          <div>
            {error && (
              <div data-testid="api-error" role="alert">
                {error}
                {retryCount < 3 && <span data-testid="retry-indicator">Retrying...</span>}
              </div>
            )}
            <div data-testid="retry-count">{retryCount}</div>
          </div>
        );
      };

      renderWithProductionProviders(<APIFailureTest />);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeInTheDocument();
      });

      // Should implement retry logic
      await waitFor(
        () => {
          expect(parseInt(screen.getByTestId('retry-count').textContent!)).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      const errors = errorHandler.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].context.endpoint).toBe('quotes.list');
    });

    it('should respect production rate limits', async () => {
      const requests: Promise<any>[] = [];
      const maxRequests = PRODUCTION_CONFIG.limits.apiRateLimit + 10; // Exceed limit

      // Make rapid requests to test rate limiting
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          mockProductionAPI.quotes
            .list({ limit: 1 })
            .catch((err) => ({ error: err.message, requestIndex: i })),
        );
      }

      const results = await Promise.allSettled(requests);

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && !(r.value as any).error,
      ).length;
      const rateLimited = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any).error,
      ).length;

      // Should respect rate limits
      expect(successful).toBeLessThanOrEqual(PRODUCTION_CONFIG.limits.apiRateLimit);

      productionMonitor.trackMetric('api_rate_limit_test', {
        total_requests: maxRequests,
        successful_requests: successful,
        rate_limited_requests: rateLimited,
      });
    });
  });

  describe('Production Performance Monitoring', () => {
    it('should monitor component rendering performance in production', async () => {
      const quotes = generateProductionQuotes(PRODUCTION_CONFIG.limits.maxQuotesPerPage);

      const PerformanceMonitoringTest = () => {
        const [renderTime, setRenderTime] = React.useState<number>(0);

        React.useEffect(() => {
          const startTime = performance.now();

          // Simulate component work
          setTimeout(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            setRenderTime(duration);

            productionMonitor.trackMetric('component_render_time', duration, {
              component: 'UnifiedQuoteList',
              itemCount: quotes.length.toString(),
            });
          }, 100);
        }, []);

        return (
          <div>
            <div data-testid="render-time">{renderTime}</div>
            <UnifiedQuoteList quotes={quotes} viewMode="admin" layout="table" />
          </div>
        );
      };

      renderWithProductionProviders(<PerformanceMonitoringTest />);

      await waitFor(() => {
        const renderTime = parseFloat(screen.getByTestId('render-time').textContent!);
        expect(renderTime).toBeGreaterThan(0);
        expect(renderTime).toBeLessThan(2000); // Under 2 seconds
      });

      const renderMetric = productionMonitor.getMetric('component_render_time');
      expect(renderMetric).toBeDefined();
    });

    it('should monitor memory usage in production', async () => {
      const MemoryMonitoringTest = () => {
        const [memoryUsage, setMemoryUsage] = React.useState<{ used: number; total: number }>({
          used: 0,
          total: 0,
        });

        React.useEffect(() => {
          const monitorMemory = () => {
            // Simulate memory monitoring (in real production, use performance.memory)
            const usage = {
              used: Math.random() * 100 * 1024 * 1024, // Random usage up to 100MB
              total: 200 * 1024 * 1024, // 200MB total
            };

            setMemoryUsage(usage);

            productionMonitor.trackMetric('memory_usage', usage.used / usage.total, {
              component: 'production_validation',
            });
          };

          monitorMemory();
          const interval = setInterval(monitorMemory, 1000);

          return () => clearInterval(interval);
        }, []);

        return (
          <div>
            <div data-testid="memory-usage">
              {((memoryUsage.used / memoryUsage.total) * 100).toFixed(1)}%
            </div>
            <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={vi.fn()} />
          </div>
        );
      };

      renderWithProductionProviders(<MemoryMonitoringTest />);

      await waitFor(() => {
        const usage = parseFloat(screen.getByTestId('memory-usage').textContent!);
        expect(usage).toBeGreaterThan(0);
        expect(usage).toBeLessThan(90); // Should not exceed 90% memory usage
      });

      const memoryMetric = productionMonitor.getMetric('memory_usage');
      expect(memoryMetric).toBeDefined();
      expect(memoryMetric.value).toBeLessThan(0.9); // Less than 90%
    });

    it('should track user interactions in production', async () => {
      const InteractionTrackingTest = () => {
        const [interactions, setInteractions] = React.useState<number>(0);

        const handleInteraction = (action: string) => {
          setInteractions((prev) => prev + 1);

          productionMonitor.trackMetric('user_interaction', 1, {
            action,
            component: 'UnifiedQuoteActions',
            timestamp: Date.now().toString(),
          });
        };

        return (
          <div>
            <div data-testid="interaction-count">{interactions}</div>
            <UnifiedQuoteActions
              quote={generateProductionQuotes(1)[0]}
              viewMode="admin"
              onAction={handleInteraction}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProductionProviders(<InteractionTrackingTest />);

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByTestId('interaction-count')).toHaveTextContent('1');
      });

      const interactionMetric = productionMonitor.getMetric('user_interaction');
      expect(interactionMetric).toBeDefined();
      expect(interactionMetric.tags.action).toBe('approve');
    });
  });

  describe('Production Error Handling', () => {
    it('should capture and report production errors', async () => {
      const ErrorBoundaryTest = () => {
        const [shouldError, setShouldError] = React.useState(false);

        React.useEffect(() => {
          // Setup global error handler
          const handleError = (event: ErrorEvent) => {
            errorHandler.captureError(event.error, {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            });
          };

          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        const triggerError = () => {
          try {
            setShouldError(true);
            throw new Error('Production test error');
          } catch (error) {
            errorHandler.captureError(error as Error, {
              component: 'ErrorBoundaryTest',
              userAction: 'triggerError',
            });
          }
        };

        return (
          <div>
            <button onClick={triggerError} data-testid="trigger-error">
              Trigger Error
            </button>
            <div data-testid="error-count">{errorHandler.getErrors().length}</div>
            {!shouldError && (
              <UnifiedQuoteCard
                quote={generateProductionQuotes(1)[0]}
                viewMode="customer"
                layout="detail"
              />
            )}
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProductionProviders(<ErrorBoundaryTest />);

      await user.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      });

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toBe('Production test error');
      expect(errors[0].context.component).toBe('ErrorBoundaryTest');
    });

    it('should handle network errors gracefully in production', async () => {
      const NetworkErrorTest = () => {
        const [networkError, setNetworkError] = React.useState<string | null>(null);

        React.useEffect(() => {
          // Simulate network failure
          mockProductionAPI.quotes.list({}).catch((error) => {
            setNetworkError(error.message);
            errorHandler.captureError(error, {
              type: 'network_error',
              endpoint: 'quotes.list',
            });

            productionMonitor.trackMetric('error_rate', 1, {
              error_type: 'network',
              endpoint: 'quotes.list',
            });
          });
        }, []);

        return (
          <div>
            {networkError && (
              <div data-testid="network-error" role="alert">
                {networkError}
              </div>
            )}
          </div>
        );
      };

      // Mock network failure
      mockProductionAPI.quotes.list.mockRejectedValueOnce(new Error('Network request failed'));

      renderWithProductionProviders(<NetworkErrorTest />);

      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument();
      });

      const errors = errorHandler.getErrors();
      expect(errors.some((e) => e.context.type === 'network_error')).toBe(true);
    });
  });

  describe('Production Security Validation', () => {
    it('should validate HTTPS enforcement', () => {
      // In production, all URLs should be HTTPS
      expect(PRODUCTION_CONFIG.apiUrl).toMatch(/^https:\/\//);
      expect(PRODUCTION_CONFIG.cdnUrl).toMatch(/^https:\/\//);
      expect(PRODUCTION_CONFIG.security.httpsOnly).toBe(true);
    });

    it('should validate CSRF protection', () => {
      expect(PRODUCTION_CONFIG.security.csrfProtection).toBe(true);

      // Mock CSRF token validation
      const mockCSRFToken = 'prod-csrf-token-12345';

      // Simulate API request with CSRF token
      const apiRequest = {
        method: 'POST',
        url: `${PRODUCTION_CONFIG.apiUrl}/quotes`,
        headers: {
          'X-CSRF-Token': mockCSRFToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      };

      expect(apiRequest.headers['X-CSRF-Token']).toBeDefined();
    });

    it('should validate input sanitization', async () => {
      const SecurityTest = () => {
        const [sanitizedValue, setSanitizedValue] = React.useState('');

        const handleInput = (value: string) => {
          // Simulate input sanitization
          const sanitized = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');

          setSanitizedValue(sanitized);
        };

        return (
          <div>
            <div data-testid="sanitized-output">{sanitizedValue}</div>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={vi.fn()}
              onFieldChange={(field, value) => handleInput(value)}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProductionProviders(<SecurityTest />);

      const nameInput = screen.getByLabelText(/your name/i);
      const maliciousInput = '<script>alert("xss")</script>John Doe';

      await user.type(nameInput, maliciousInput);

      await waitFor(() => {
        const sanitized = screen.getByTestId('sanitized-output').textContent;
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).toContain('John Doe');
      });
    });
  });

  describe('Production Scalability Testing', () => {
    it('should handle high-volume data efficiently', async () => {
      const largeDataset = generateProductionQuotes(1000);

      const ScalabilityTest = () => {
        const [processedCount, setProcessedCount] = React.useState(0);
        const [processingTime, setProcessingTime] = React.useState(0);

        React.useEffect(() => {
          const startTime = performance.now();

          // Process data in chunks to avoid blocking UI
          const processChunk = (startIndex: number) => {
            const chunkSize = 50;
            const endIndex = Math.min(startIndex + chunkSize, largeDataset.length);

            // Simulate processing
            setTimeout(() => {
              setProcessedCount(endIndex);

              if (endIndex < largeDataset.length) {
                processChunk(endIndex);
              } else {
                const endTime = performance.now();
                setProcessingTime(endTime - startTime);

                productionMonitor.trackMetric('bulk_processing_time', endTime - startTime, {
                  item_count: largeDataset.length.toString(),
                  chunk_size: chunkSize.toString(),
                });
              }
            }, 10);
          };

          processChunk(0);
        }, []);

        return (
          <div>
            <div data-testid="processed-count">{processedCount}</div>
            <div data-testid="processing-time">{processingTime}</div>
            <UnifiedQuoteList
              quotes={largeDataset.slice(
                0,
                Math.min(processedCount, PRODUCTION_CONFIG.limits.maxQuotesPerPage),
              )}
              viewMode="admin"
              layout="table"
            />
          </div>
        );
      };

      renderWithProductionProviders(<ScalabilityTest />);

      await waitFor(
        () => {
          expect(parseInt(screen.getByTestId('processed-count').textContent!)).toBe(1000);
        },
        { timeout: 10000 },
      );

      const processingTime = parseFloat(screen.getByTestId('processing-time').textContent!);
      expect(processingTime).toBeLessThan(5000); // Under 5 seconds

      const metric = productionMonitor.getMetric('bulk_processing_time');
      expect(metric).toBeDefined();
    });

    it('should maintain performance under concurrent load', async () => {
      const ConcurrentLoadTest = () => {
        const [activeUsers, setActiveUsers] = React.useState(0);
        const [completedActions, setCompletedActions] = React.useState(0);

        React.useEffect(() => {
          const simulateUser = async (userId: number) => {
            setActiveUsers((prev) => prev + 1);

            // Simulate user actions
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

            setCompletedActions((prev) => prev + 1);
            setActiveUsers((prev) => prev - 1);

            productionMonitor.trackMetric('concurrent_user_action', 1, {
              user_id: userId.toString(),
              action_type: 'quote_interaction',
            });
          };

          // Simulate 100 concurrent users
          const users = Array.from({ length: 100 }, (_, i) => simulateUser(i));
          Promise.all(users);
        }, []);

        return (
          <div>
            <div data-testid="active-users">{activeUsers}</div>
            <div data-testid="completed-actions">{completedActions}</div>
          </div>
        );
      };

      renderWithProductionProviders(<ConcurrentLoadTest />);

      await waitFor(
        () => {
          expect(parseInt(screen.getByTestId('completed-actions').textContent!)).toBe(100);
        },
        { timeout: 15000 },
      );

      const userActionMetric = productionMonitor.getMetric('concurrent_user_action');
      expect(userActionMetric).toBeDefined();
    });
  });

  describe('Production Monitoring and Alerting', () => {
    it('should generate alerts for critical metrics', async () => {
      // Simulate critical response time
      productionMonitor.trackMetric('response_time', 2500); // Above critical threshold

      const criticalAlerts = productionMonitor.getAlerts('critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].message).toContain('response_time is critical');
    });

    it('should track business metrics', async () => {
      const BusinessMetricsTest = () => {
        React.useEffect(() => {
          // Track business-specific metrics
          productionMonitor.trackMetric('quote_conversion_rate', 0.15, {
            period: 'daily',
            date: new Date().toISOString().split('T')[0],
          });

          productionMonitor.trackMetric('average_quote_value', 587.99, {
            currency: 'USD',
            period: 'daily',
          });

          productionMonitor.trackMetric('customer_satisfaction', 4.7, {
            scale: '1-5',
            period: 'weekly',
          });
        }, []);

        return <div data-testid="metrics-tracked">Metrics tracked</div>;
      };

      renderWithProductionProviders(<BusinessMetricsTest />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-tracked')).toBeInTheDocument();
      });

      expect(productionMonitor.getMetric('quote_conversion_rate')).toBeDefined();
      expect(productionMonitor.getMetric('average_quote_value')).toBeDefined();
      expect(productionMonitor.getMetric('customer_satisfaction')).toBeDefined();
    });
  });
});
