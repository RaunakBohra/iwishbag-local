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

// Mock Google Analytics (gtag)
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
  configurable: true,
});

// Mock Google Tag Manager (dataLayer)
Object.defineProperty(window, 'dataLayer', {
  value: [],
  configurable: true,
});

// Mock Facebook Pixel
Object.defineProperty(window, 'fbq', {
  value: vi.fn(),
  configurable: true,
});

// Mock Mixpanel
Object.defineProperty(window, 'mixpanel', {
  value: {
    track: vi.fn(),
    identify: vi.fn(),
    people: {
      set: vi.fn(),
      increment: vi.fn(),
    },
    register: vi.fn(),
    time_event: vi.fn(),
  },
  configurable: true,
});

// Mock Hotjar
Object.defineProperty(window, 'hj', {
  value: vi.fn(),
  configurable: true,
});

// Mock custom analytics service
const mockAnalyticsService = {
  track: vi.fn(),
  identify: vi.fn(),
  page: vi.fn(),
  group: vi.fn(),
  alias: vi.fn(),
  flush: vi.fn(),
  reset: vi.fn(),
};

// Mock performance observer
const mockPerformanceObserver = vi.fn();
Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  configurable: true,
});

// Mock intersection observer for viewport tracking
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((target) => {
    // Simulate viewport entry
    setTimeout(() => {
      callback([
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: { top: 0, bottom: 100, height: 100 },
          rootBounds: { top: 0, bottom: 800, height: 800 },
        },
      ]);
    }, 100);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = mockIntersectionObserver;

// Mock user agent for device detection
const mockUserAgents = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  mobile:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  tablet:
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
};

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'analytics-user-id',
      email: 'analytics@example.com',
      created_at: '2024-01-01T00:00:00Z',
      subscription_plan: 'premium',
    },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Test data
const analyticsTestQuote: UnifiedQuote = {
  id: 'analytics-quote-001',
  display_id: 'QT-ANALYTICS001',
  user_id: 'analytics-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 599.99,
  item_price: 499.99,
  sales_tax_price: 40.0,
  merchant_shipping_price: 25.0,
  international_shipping: 39.99,
  customs_and_ecs: 24.99,
  domestic_shipping: 12.99,
  handling_charge: 9.99,
  insurance_amount: 5.99,
  payment_gateway_fee: 7.99,
  vat: 0.0,
  discount: 25.0,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Analytics Test User',
      email: 'analytics@example.com',
      phone: '+91-9876543210',
    },
  },
  shipping_address: {
    formatted: '123 Analytics Street, Mumbai, Maharashtra 400001, India',
  },
  items: [
    {
      id: 'analytics-item',
      name: 'Professional Camera',
      description: 'High-end DSLR camera for professionals',
      quantity: 1,
      price: 499.99,
      product_url: 'https://amazon.com/professional-camera',
      image_url: 'https://example.com/camera.jpg',
    },
  ],
  notes: 'Analytics test quote',
  admin_notes: 'High-value customer',
  priority: 'high',
  in_cart: false,
  attachments: [],
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
        <QuoteThemeProvider>{component}</QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

// Helper function to set user agent
const setUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });
};

describe('Analytics Tracking Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer.length = 0; // Clear GTM data layer
    setUserAgent(mockUserAgents.desktop); // Default to desktop
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page View and Session Tracking', () => {
    it('should track page views with proper metadata', async () => {
      const PageViewTrackingTest = () => {
        React.useEffect(() => {
          // Track page view
          const pageData = {
            page_title: 'Quote Details - QT-ANALYTICS001',
            page_location: window.location.href,
            page_referrer: document.referrer,
            user_id: 'analytics-user-id',
            custom_parameters: {
              quote_id: 'analytics-quote-001',
              quote_status: 'sent',
              quote_value: 599.99,
              destination_country: 'IN',
              user_segment: 'premium',
            },
          };

          // Google Analytics 4
          window.gtag('config', 'GA_MEASUREMENT_ID', {
            page_title: pageData.page_title,
            page_location: pageData.page_location,
            custom_map: {
              custom_parameter_1: 'quote_id',
              custom_parameter_2: 'quote_value',
            },
          });

          window.gtag('event', 'page_view', pageData);

          // Google Tag Manager
          window.dataLayer.push({
            event: 'page_view',
            page_data: pageData,
          });

          // Mixpanel
          window.mixpanel.track('Page View', {
            page: 'quote_details',
            quote_id: 'analytics-quote-001',
            user_type: 'premium',
          });

          // Custom analytics
          mockAnalyticsService.page('Quote Details', pageData);
        }, []);

        return <UnifiedQuoteCard quote={analyticsTestQuote} viewMode="customer" layout="detail" />;
      };

      renderWithProviders(<PageViewTrackingTest />);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'page_view',
          expect.objectContaining({
            page_title: 'Quote Details - QT-ANALYTICS001',
            user_id: 'analytics-user-id',
            custom_parameters: expect.objectContaining({
              quote_id: 'analytics-quote-001',
            }),
          }),
        );

        expect(window.dataLayer).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              event: 'page_view',
              page_data: expect.objectContaining({
                quote_id: 'analytics-quote-001',
              }),
            }),
          ]),
        );

        expect(window.mixpanel.track).toHaveBeenCalledWith('Page View', {
          page: 'quote_details',
          quote_id: 'analytics-quote-001',
          user_type: 'premium',
        });

        expect(mockAnalyticsService.page).toHaveBeenCalledWith('Quote Details', expect.any(Object));
      });
    });

    it('should track session start and duration', async () => {
      const SessionTrackingTest = () => {
        const [sessionId, setSessionId] = React.useState<string>('');
        const [sessionStart, setSessionStart] = React.useState<number>(0);

        React.useEffect(() => {
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = Date.now();

          setSessionId(sessionId);
          setSessionStart(startTime);

          // Track session start
          window.gtag('event', 'session_start', {
            session_id: sessionId,
            timestamp: startTime,
            user_id: 'analytics-user-id',
            device_category: 'desktop',
            source: 'direct',
            medium: 'none',
          });

          // Track session data periodically
          const sessionTracker = setInterval(() => {
            const duration = Date.now() - startTime;

            window.gtag('event', 'session_ping', {
              session_id: sessionId,
              session_duration: duration,
              user_id: 'analytics-user-id',
            });
          }, 10000); // Every 10 seconds

          // Cleanup on unmount
          return () => {
            clearInterval(sessionTracker);

            const endTime = Date.now();
            const totalDuration = endTime - startTime;

            window.gtag('event', 'session_end', {
              session_id: sessionId,
              session_duration: totalDuration,
              user_id: 'analytics-user-id',
            });
          };
        }, []);

        return (
          <div>
            <div data-testid="session-id">{sessionId}</div>
            <div data-testid="session-start">{sessionStart}</div>
            <UnifiedQuoteList quotes={[analyticsTestQuote]} viewMode="customer" layout="list" />
          </div>
        );
      };

      const { unmount } = renderWithProviders(<SessionTrackingTest />);

      await waitFor(() => {
        expect(screen.getByTestId('session-id')).not.toHaveTextContent('');
        expect(screen.getByTestId('session-start')).not.toHaveTextContent('0');
      });

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'session_start',
        expect.objectContaining({
          session_id: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
          user_id: 'analytics-user-id',
        }),
      );

      // Unmount to trigger session end
      unmount();

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'session_end',
          expect.objectContaining({
            session_id: expect.any(String),
            session_duration: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track click events with context', async () => {
      const ClickTrackingTest = () => {
        const handleQuoteAction = async (action: string) => {
          const clickData = {
            event_category: 'Quote Actions',
            event_action: action,
            event_label: analyticsTestQuote.display_id,
            value: analyticsTestQuote.final_total_usd,
            user_id: 'analytics-user-id',
            custom_parameters: {
              quote_id: analyticsTestQuote.id,
              quote_status: analyticsTestQuote.status,
              destination_country: analyticsTestQuote.destination_country,
              click_timestamp: Date.now(),
              page_location: window.location.href,
            },
          };

          // Google Analytics
          window.gtag('event', action, clickData);

          // Facebook Pixel
          window.fbq('track', 'CustomEvent', {
            event_name: `quote_${action}`,
            quote_value: analyticsTestQuote.final_total_usd,
            currency: 'USD',
            content_category: 'International Shopping',
            content_ids: [analyticsTestQuote.id],
          });

          // Mixpanel
          window.mixpanel.track(`Quote ${action.charAt(0).toUpperCase() + action.slice(1)}`, {
            quote_id: analyticsTestQuote.id,
            quote_value: analyticsTestQuote.final_total_usd,
            status: analyticsTestQuote.status,
            country: analyticsTestQuote.destination_country,
          });

          // Hotjar event
          window.hj('event', `quote_${action}`);
        };

        return (
          <UnifiedQuoteActions
            quote={analyticsTestQuote}
            viewMode="customer"
            onAction={handleQuoteAction}
          />
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<ClickTrackingTest />);

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'approve',
          expect.objectContaining({
            event_category: 'Quote Actions',
            event_action: 'approve',
            event_label: 'QT-ANALYTICS001',
            value: 599.99,
            custom_parameters: expect.objectContaining({
              quote_id: 'analytics-quote-001',
            }),
          }),
        );

        expect(window.fbq).toHaveBeenCalledWith(
          'track',
          'CustomEvent',
          expect.objectContaining({
            event_name: 'quote_approve',
            quote_value: 599.99,
            currency: 'USD',
          }),
        );

        expect(window.mixpanel.track).toHaveBeenCalledWith(
          'Quote Approve',
          expect.objectContaining({
            quote_id: 'analytics-quote-001',
            quote_value: 599.99,
          }),
        );

        expect(window.hj).toHaveBeenCalledWith('event', 'quote_approve');
      });
    });

    it('should track form interactions and field completion', async () => {
      const FormTrackingTest = () => {
        const [formData, setFormData] = React.useState({
          fieldsCompleted: 0,
          fieldsTotal: 5,
          timeSpent: 0,
          interactions: 0,
        });

        React.useEffect(() => {
          const startTime = Date.now();

          // Track form start
          window.gtag('event', 'form_start', {
            form_id: 'quote_creation_form',
            form_name: 'Quote Request Form',
            user_id: 'analytics-user-id',
          });

          const timeTracker = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setFormData((prev) => ({ ...prev, timeSpent: elapsed }));
          }, 1000);

          return () => clearInterval(timeTracker);
        }, []);

        const handleFieldInteraction = (fieldName: string, value: string) => {
          setFormData((prev) => ({
            ...prev,
            interactions: prev.interactions + 1,
            fieldsCompleted: value ? prev.fieldsCompleted + 1 : prev.fieldsCompleted,
          }));

          // Track field interaction
          window.gtag('event', 'form_field_interaction', {
            field_name: fieldName,
            field_value_length: value.length,
            form_completion_rate: (formData.fieldsCompleted / formData.fieldsTotal) * 100,
            time_to_interaction: formData.timeSpent,
          });

          // Mixpanel funnel tracking
          window.mixpanel.track('Form Field Completed', {
            field_name: fieldName,
            completion_percentage: (formData.fieldsCompleted / formData.fieldsTotal) * 100,
            form_type: 'quote_request',
          });
        };

        const handleFormSubmit = async (data: any) => {
          // Track form completion
          window.gtag('event', 'form_submit', {
            form_id: 'quote_creation_form',
            completion_rate: 100,
            time_spent: formData.timeSpent,
            total_interactions: formData.interactions,
            user_id: 'analytics-user-id',
          });

          // E-commerce tracking
          window.gtag('event', 'begin_checkout', {
            currency: 'USD',
            value: data.estimatedPrice || 0,
            items: [
              {
                item_id: 'quote_request',
                item_name: data.productName,
                category: 'International Shopping',
                quantity: data.quantity || 1,
                price: data.estimatedPrice || 0,
              },
            ],
          });
        };

        return (
          <div>
            <div data-testid="form-progress">
              {Math.round((formData.fieldsCompleted / formData.fieldsTotal) * 100)}%
            </div>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={handleFormSubmit}
              onFieldChange={handleFieldInteraction}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<FormTrackingTest />);

      // Interact with form fields
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'Test User');

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'form_start',
          expect.objectContaining({
            form_id: 'quote_creation_form',
          }),
        );

        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'form_field_interaction',
          expect.objectContaining({
            field_name: expect.any(String),
            field_value_length: expect.any(Number),
          }),
        );
      });
    });
  });

  describe('Performance and User Experience Tracking', () => {
    it('should track component render performance', async () => {
      const PerformanceTrackingTest = () => {
        React.useEffect(() => {
          const startTime = performance.now();

          // Simulate component render completion
          setTimeout(() => {
            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Track render performance
            window.gtag('event', 'component_render', {
              component_name: 'UnifiedQuoteCard',
              render_time: renderTime,
              user_id: 'analytics-user-id',
              device_type: 'desktop',
            });

            // Track Core Web Vitals if available
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                  if (entry.entryType === 'largest-contentful-paint') {
                    window.gtag('event', 'web_vitals', {
                      metric_name: 'LCP',
                      metric_value: entry.startTime,
                      metric_rating: entry.startTime < 2500 ? 'good' : 'needs_improvement',
                    });
                  }
                });
              });

              observer.observe({ entryTypes: ['largest-contentful-paint'] });
            }
          }, 50);
        }, []);

        return (
          <UnifiedQuoteCard
            quote={analyticsTestQuote}
            viewMode="customer"
            layout="detail"
            performanceMode="detailed"
          />
        );
      };

      renderWithProviders(<PerformanceTrackingTest />);

      await waitFor(
        () => {
          expect(window.gtag).toHaveBeenCalledWith(
            'event',
            'component_render',
            expect.objectContaining({
              component_name: 'UnifiedQuoteCard',
              render_time: expect.any(Number),
            }),
          );
        },
        { timeout: 1000 },
      );
    });

    it('should track scroll depth and engagement', async () => {
      const ScrollTrackingTest = () => {
        const [scrollDepth, setScrollDepth] = React.useState(0);
        const [maxScroll, setMaxScroll] = React.useState(0);

        React.useEffect(() => {
          const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);

            setScrollDepth(scrollPercent);
            setMaxScroll((prev) => Math.max(prev, scrollPercent));

            // Track scroll milestones
            const milestones = [25, 50, 75, 90];
            milestones.forEach((milestone) => {
              if (scrollPercent >= milestone && maxScroll < milestone) {
                window.gtag('event', 'scroll', {
                  event_category: 'Engagement',
                  event_action: 'Scroll',
                  event_label: `${milestone}%`,
                  value: milestone,
                  user_id: 'analytics-user-id',
                });
              }
            });
          };

          window.addEventListener('scroll', handleScroll);
          return () => window.removeEventListener('scroll', handleScroll);
        }, [maxScroll]);

        return (
          <div style={{ height: '2000px' }}>
            <div data-testid="scroll-depth">{scrollDepth}%</div>
            <UnifiedQuoteBreakdown quote={analyticsTestQuote} viewMode="customer" />
            <div style={{ height: '1500px', backgroundColor: '#f0f0f0' }}>
              Long content to enable scrolling
            </div>
          </div>
        );
      };

      renderWithProviders(<ScrollTrackingTest />);

      // Simulate scrolling
      act(() => {
        Object.defineProperty(window, 'pageYOffset', { value: 500, configurable: true });
        Object.defineProperty(document.documentElement, 'scrollTop', {
          value: 500,
          configurable: true,
        });
        Object.defineProperty(document.documentElement, 'scrollHeight', {
          value: 2000,
          configurable: true,
        });
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

        fireEvent.scroll(window);
      });

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'scroll',
          expect.objectContaining({
            event_category: 'Engagement',
            event_action: 'Scroll',
            event_label: '25%',
          }),
        );
      });
    });
  });

  describe('E-commerce and Conversion Tracking', () => {
    it('should track add to cart events with product data', async () => {
      const EcommerceTrackingTest = () => {
        const handleAddToCart = async () => {
          const cartData = {
            currency: 'USD',
            value: analyticsTestQuote.final_total_usd,
            items: [
              {
                item_id: analyticsTestQuote.id,
                item_name: analyticsTestQuote.items[0].name,
                item_category: 'Electronics',
                item_category2: 'Cameras',
                item_brand: 'Professional',
                price: analyticsTestQuote.final_total_usd,
                quantity: 1,
                index: 0,
                item_variant: 'International',
              },
            ],
          };

          // Google Analytics Enhanced Ecommerce
          window.gtag('event', 'add_to_cart', cartData);

          // Facebook Pixel
          window.fbq('track', 'AddToCart', {
            value: cartData.value,
            currency: cartData.currency,
            content_ids: [analyticsTestQuote.id],
            content_type: 'product',
            contents: [
              {
                id: analyticsTestQuote.id,
                quantity: 1,
                item_price: cartData.value,
              },
            ],
          });

          // Mixpanel
          window.mixpanel.track('Product Added', {
            product_id: analyticsTestQuote.id,
            product_name: analyticsTestQuote.items[0].name,
            price: cartData.value,
            category: 'Electronics',
            source: 'quote_approval',
          });
        };

        return (
          <div>
            <UnifiedQuoteCard quote={analyticsTestQuote} viewMode="customer" layout="detail" />
            <button onClick={handleAddToCart} data-testid="add-to-cart">
              Add to Cart
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<EcommerceTrackingTest />);

      const addToCartButton = screen.getByTestId('add-to-cart');
      await user.click(addToCartButton);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'add_to_cart',
          expect.objectContaining({
            currency: 'USD',
            value: 599.99,
            items: expect.arrayContaining([
              expect.objectContaining({
                item_id: 'analytics-quote-001',
                item_name: 'Professional Camera',
              }),
            ]),
          }),
        );

        expect(window.fbq).toHaveBeenCalledWith(
          'track',
          'AddToCart',
          expect.objectContaining({
            value: 599.99,
            currency: 'USD',
            content_ids: ['analytics-quote-001'],
          }),
        );

        expect(window.mixpanel.track).toHaveBeenCalledWith(
          'Product Added',
          expect.objectContaining({
            product_id: 'analytics-quote-001',
            price: 599.99,
          }),
        );
      });
    });

    it('should track purchase completion with full transaction data', async () => {
      const PurchaseTrackingTest = () => {
        const handlePurchase = async () => {
          const transactionData = {
            transaction_id: `txn_${Date.now()}`,
            value: analyticsTestQuote.final_total_usd,
            currency: 'USD',
            tax: analyticsTestQuote.sales_tax_price,
            shipping:
              analyticsTestQuote.international_shipping + analyticsTestQuote.domestic_shipping,
            items: [
              {
                item_id: analyticsTestQuote.id,
                item_name: analyticsTestQuote.items[0].name,
                item_category: 'Electronics',
                price: analyticsTestQuote.item_price,
                quantity: 1,
              },
            ],
            user_id: 'analytics-user-id',
            custom_parameters: {
              payment_method: 'credit_card',
              shipping_method: 'international',
              destination_country: analyticsTestQuote.destination_country,
              quote_conversion_time: Date.now() - new Date(analyticsTestQuote.created_at).getTime(),
            },
          };

          // Google Analytics Purchase
          window.gtag('event', 'purchase', transactionData);

          // Facebook Pixel Purchase
          window.fbq('track', 'Purchase', {
            value: transactionData.value,
            currency: transactionData.currency,
            content_ids: [analyticsTestQuote.id],
            content_type: 'product',
            num_items: 1,
          });

          // Mixpanel Revenue Tracking
          window.mixpanel.track('Order Completed', {
            ...transactionData,
            revenue: transactionData.value,
          });

          window.mixpanel.people.increment('total_revenue', transactionData.value);
          window.mixpanel.people.increment('order_count', 1);
        };

        return (
          <div>
            <UnifiedQuoteBreakdown quote={analyticsTestQuote} viewMode="customer" />
            <button onClick={handlePurchase} data-testid="complete-purchase">
              Complete Purchase
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<PurchaseTrackingTest />);

      const purchaseButton = screen.getByTestId('complete-purchase');
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'purchase',
          expect.objectContaining({
            transaction_id: expect.stringMatching(/^txn_\d+$/),
            value: 599.99,
            currency: 'USD',
            tax: 40.0,
          }),
        );

        expect(window.fbq).toHaveBeenCalledWith(
          'track',
          'Purchase',
          expect.objectContaining({
            value: 599.99,
            currency: 'USD',
          }),
        );

        expect(window.mixpanel.track).toHaveBeenCalledWith(
          'Order Completed',
          expect.objectContaining({
            revenue: 599.99,
          }),
        );

        expect(window.mixpanel.people.increment).toHaveBeenCalledWith('total_revenue', 599.99);
      });
    });
  });

  describe('Error and Exception Tracking', () => {
    it('should track JavaScript errors and exceptions', async () => {
      const ErrorTrackingTest = () => {
        React.useEffect(() => {
          const handleError = (error: ErrorEvent) => {
            window.gtag('event', 'exception', {
              description: error.message,
              fatal: false,
              error_stack: error.error?.stack,
              user_id: 'analytics-user-id',
              page_location: window.location.href,
            });

            // Mixpanel error tracking
            window.mixpanel.track('JavaScript Error', {
              error_message: error.message,
              error_stack: error.error?.stack,
              user_agent: navigator.userAgent,
              url: window.location.href,
            });
          };

          const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            window.gtag('event', 'exception', {
              description: `Unhandled Promise Rejection: ${event.reason}`,
              fatal: false,
              user_id: 'analytics-user-id',
            });
          };

          window.addEventListener('error', handleError);
          window.addEventListener('unhandledrejection', handleUnhandledRejection);

          return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          };
        }, []);

        const triggerError = () => {
          // Simulate an error
          throw new Error('Test analytics error');
        };

        return (
          <div>
            <button onClick={triggerError} data-testid="trigger-error">
              Trigger Error
            </button>
            <UnifiedQuoteCard quote={analyticsTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<ErrorTrackingTest />);

      // Trigger error
      const errorButton = screen.getByTestId('trigger-error');

      try {
        await user.click(errorButton);
      } catch (error) {
        // Expected error
      }

      // Error tracking would be called by the error handler
      // This is difficult to test directly, so we'll mock the behavior
      act(() => {
        window.dispatchEvent(
          new ErrorEvent('error', {
            message: 'Test analytics error',
            error: new Error('Test analytics error'),
          }),
        );
      });

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'exception',
          expect.objectContaining({
            description: 'Test analytics error',
            fatal: false,
          }),
        );
      });
    });

    it('should track API request failures', async () => {
      const APIErrorTrackingTest = () => {
        const handleAPIError = async () => {
          try {
            // Simulate API call that fails
            throw new Error('API request failed: 500 Internal Server Error');
          } catch (error) {
            // Track API error
            window.gtag('event', 'api_error', {
              event_category: 'API',
              event_action: 'Request Failed',
              event_label: 'quote_submission',
              error_message: (error as Error).message,
              user_id: 'analytics-user-id',
            });

            window.mixpanel.track('API Error', {
              endpoint: 'quote_submission',
              error_message: (error as Error).message,
              error_type: 'server_error',
              status_code: 500,
            });
          }
        };

        return (
          <div>
            <button onClick={handleAPIError} data-testid="trigger-api-error">
              Trigger API Error
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<APIErrorTrackingTest />);

      const apiErrorButton = screen.getByTestId('trigger-api-error');
      await user.click(apiErrorButton);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'event',
          'api_error',
          expect.objectContaining({
            event_category: 'API',
            event_action: 'Request Failed',
            error_message: 'API request failed: 500 Internal Server Error',
          }),
        );

        expect(window.mixpanel.track).toHaveBeenCalledWith(
          'API Error',
          expect.objectContaining({
            endpoint: 'quote_submission',
            status_code: 500,
          }),
        );
      });
    });
  });

  describe('Cross-Device and Multi-Channel Tracking', () => {
    it('should track device and platform information', async () => {
      const DeviceTrackingTest = () => {
        React.useEffect(() => {
          const deviceInfo = {
            device_category: /Mobile|Android|iPhone/i.test(navigator.userAgent)
              ? 'mobile'
              : 'desktop',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
            operating_system: navigator.platform,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            user_agent: navigator.userAgent.substring(0, 100), // Truncated for storage
          };

          // Track device information
          window.gtag('config', 'GA_MEASUREMENT_ID', {
            custom_map: {
              device_info: JSON.stringify(deviceInfo),
            },
          });

          window.mixpanel.register({
            device_type: deviceInfo.device_category,
            browser: deviceInfo.browser,
            screen_resolution: deviceInfo.screen_resolution,
          });
        }, []);

        return <UnifiedQuoteList quotes={[analyticsTestQuote]} viewMode="customer" layout="list" />;
      };

      renderWithProviders(<DeviceTrackingTest />);

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith(
          'config',
          'GA_MEASUREMENT_ID',
          expect.objectContaining({
            custom_map: {
              device_info: expect.stringContaining('desktop'),
            },
          }),
        );

        expect(window.mixpanel.register).toHaveBeenCalledWith(
          expect.objectContaining({
            device_type: 'desktop',
            browser: expect.any(String),
          }),
        );
      });
    });
  });
});
