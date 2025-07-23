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

// Browser-specific user agents for testing
const browserUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  mobile_chrome: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  mobile_safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
};

// Browser-specific feature detection
const browserFeatures = {
  chrome: {
    supportsWebGL: true,
    supportsWebAssembly: true,
    supportsServiceWorker: true,
    supportsIntersectionObserver: true,
    supportsResizeObserver: true,
    supportsCustomElements: true,
    supportsCSS: {
      grid: true,
      flexbox: true,
      customProperties: true,
      containerQueries: true,
      aspectRatio: true
    }
  },
  firefox: {
    supportsWebGL: true,
    supportsWebAssembly: true,
    supportsServiceWorker: true,
    supportsIntersectionObserver: true,
    supportsResizeObserver: true,
    supportsCustomElements: true,
    supportsCSS: {
      grid: true,
      flexbox: true,
      customProperties: true,
      containerQueries: false, // Limited support
      aspectRatio: true
    }
  },
  safari: {
    supportsWebGL: true,
    supportsWebAssembly: true,
    supportsServiceWorker: true,
    supportsIntersectionObserver: true,
    supportsResizeObserver: true,
    supportsCustomElements: true,
    supportsCSS: {
      grid: true,
      flexbox: true,
      customProperties: true,
      containerQueries: false, // Limited support
      aspectRatio: true
    }
  },
  edge: {
    supportsWebGL: true,
    supportsWebAssembly: true,
    supportsServiceWorker: true,
    supportsIntersectionObserver: true,
    supportsResizeObserver: true,
    supportsCustomElements: true,
    supportsCSS: {
      grid: true,
      flexbox: true,
      customProperties: true,
      containerQueries: true,
      aspectRatio: true
    }
  }
};

// Mock browser-specific APIs
const mockBrowserAPIs = (browser: keyof typeof browserFeatures) => {
  const features = browserFeatures[browser];

  // Mock IntersectionObserver
  if (features.supportsIntersectionObserver) {
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
        }, 100);
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }

  // Mock ResizeObserver
  if (features.supportsResizeObserver) {
    global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn((target) => {
        setTimeout(() => {
          callback([{
            target,
            contentRect: { width: 800, height: 600 },
            borderBoxSize: [{ inlineSize: 800, blockSize: 600 }],
            contentBoxSize: [{ inlineSize: 800, blockSize: 600 }],
            devicePixelContentBoxSize: [{ inlineSize: 1600, blockSize: 1200 }]
          }]);
        }, 100);
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }

  // Mock Service Worker
  if (features.supportsServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue({
          active: { state: 'activated' },
          waiting: null,
          installing: null,
          addEventListener: vi.fn(),
          update: vi.fn()
        }),
        ready: Promise.resolve({
          active: { state: 'activated' },
          sync: { register: vi.fn() }
        }),
        controller: { state: 'activated' },
        addEventListener: vi.fn()
      },
      configurable: true
    });
  }

  // Mock CSS support checks
  Object.defineProperty(CSS, 'supports', {
    value: vi.fn().mockImplementation((property: string, value?: string) => {
      const prop = value ? `${property}: ${value}` : property;
      
      if (prop.includes('display: grid')) return features.supportsCSS.grid;
      if (prop.includes('display: flex')) return features.supportsCSS.flexbox;
      if (prop.includes('--')) return features.supportsCSS.customProperties;
      if (prop.includes('container-type')) return features.supportsCSS.containerQueries;
      if (prop.includes('aspect-ratio')) return features.supportsCSS.aspectRatio;
      
      return true; // Default to supported
    }),
    configurable: true
  });
};

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'cross-browser-user-id', email: 'crossbrowser@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Test data
const crossBrowserTestQuote: UnifiedQuote = {
  id: 'cross-browser-quote-001',
  display_id: 'QT-CB001',
  user_id: 'cross-browser-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 799.99,
  item_price: 649.99,
  sales_tax_price: 52.00,
  merchant_shipping_price: 25.00,
  international_shipping: 49.99,
  customs_and_ecs: 32.50,
  domestic_shipping: 15.99,
  handling_charge: 9.99,
  insurance_amount: 7.99,
  payment_gateway_fee: 9.99,
  vat: 0.00,
  discount: 30.00,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Cross Browser Test User',
      email: 'crossbrowser@example.com',
      phone: '+91-9876543210'
    }
  },
  shipping_address: {
    formatted: '123 Cross Browser Street, Mumbai, Maharashtra 400001, India'
  },
  items: [{
    id: 'cross-browser-item',
    name: 'Professional Laptop',
    description: 'High-performance laptop for professionals',
    quantity: 1,
    price: 649.99,
    product_url: 'https://amazon.com/professional-laptop',
    image_url: 'https://example.com/laptop.jpg'
  }],
  notes: 'Cross-browser compatibility test quote',
  admin_notes: 'Testing across all major browsers',
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

// Helper function to set browser environment
const setBrowserEnvironment = (browser: keyof typeof browserUserAgents) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: browserUserAgents[browser],
    configurable: true
  });

  mockBrowserAPIs(browser);
};

describe('Cross-Browser Compatibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chrome Browser Compatibility', () => {
    beforeEach(() => {
      setBrowserEnvironment('chrome');
    });

    it('should render UnifiedQuoteCard correctly in Chrome', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={crossBrowserTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      // Test Chrome-specific features
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('QT-CB001')).toBeInTheDocument();
      expect(screen.getByText('$799.99')).toBeInTheDocument();

      // Test CSS Grid support
      const cardElement = screen.getByRole('article');
      expect(CSS.supports('display', 'grid')).toBe(true);
      expect(cardElement).toHaveClass('grid');
    });

    it('should handle form interactions in Chrome', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={mockSubmit}
        />
      );

      // Test Chrome form validation
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
      expect(emailInput.validity?.valid).toBe(true);
    });

    it('should support Chrome-specific performance features', async () => {
      const PerformanceTest = () => {
        React.useEffect(() => {
          // Test Performance Observer API
          if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
              list.getEntries().forEach(entry => {
                if (entry.entryType === 'measure') {
                  console.log('Performance measure:', entry);
                }
              });
            });
            observer.observe({ entryTypes: ['measure'] });
          }
        }, []);

        return (
          <UnifiedQuoteList
            quotes={[crossBrowserTestQuote]}
            viewMode="customer"
            layout="list"
          />
        );
      };

      renderWithProviders(<PerformanceTest />);
      
      // Verify Performance Observer is available
      expect(window.PerformanceObserver).toBeDefined();
    });
  });

  describe('Firefox Browser Compatibility', () => {
    beforeEach(() => {
      setBrowserEnvironment('firefox');
    });

    it('should render UnifiedQuoteCard correctly in Firefox', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={crossBrowserTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Professional Laptop')).toBeInTheDocument();

      // Test Firefox-specific rendering
      const userAgent = navigator.userAgent;
      expect(userAgent).toContain('Firefox');
    });

    it('should handle Firefox input validation differences', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      // Firefox handles email validation slightly differently
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      
      // Firefox should still show validation error
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid');
      });
    });

    it('should work with Firefox flexbox implementation', async () => {
      const FlexboxTest = () => (
        <div className="flex flex-col gap-4" data-testid="firefox-flex">
          <UnifiedQuoteBreakdown
            quote={crossBrowserTestQuote}
            viewMode="customer"
          />
        </div>
      );

      renderWithProviders(<FlexboxTest />);

      const flexContainer = screen.getByTestId('firefox-flex');
      expect(flexContainer).toHaveClass('flex', 'flex-col');
      
      // Verify flexbox is supported
      expect(CSS.supports('display', 'flex')).toBe(true);
    });

    it('should handle Firefox-specific event handling', async () => {
      const mockAction = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <UnifiedQuoteActions
          quote={crossBrowserTestQuote}
          viewMode="customer"
          onAction={mockAction}
        />
      );

      const approveButton = screen.getByText('Approve Quote');
      
      // Firefox handles focus events slightly differently
      fireEvent.focus(approveButton);
      await user.click(approveButton);

      expect(mockAction).toHaveBeenCalledWith('approve');
    });
  });

  describe('Safari Browser Compatibility', () => {
    beforeEach(() => {
      setBrowserEnvironment('safari');
    });

    it('should render UnifiedQuoteCard correctly in Safari', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={crossBrowserTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
      
      // Test Safari-specific user agent
      expect(navigator.userAgent).toContain('Safari');
      expect(navigator.userAgent).not.toContain('Chrome');
    });

    it('should handle Safari date input limitations', async () => {
      const SafariDateTest = () => {
        const [dateValue, setDateValue] = React.useState('');

        return (
          <div>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              data-testid="safari-date"
            />
            <div data-testid="date-value">{dateValue}</div>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<SafariDateTest />);

      const dateInput = screen.getByTestId('safari-date');
      
      // Safari might handle date input differently
      await user.type(dateInput, '2024-01-15');
      
      await waitFor(() => {
        expect(screen.getByTestId('date-value')).toHaveTextContent('2024-01-15');
      });
    });

    it('should work with Safari CSS custom properties', async () => {
      const CustomPropertiesTest = () => (
        <div 
          style={{ 
            '--primary-color': '#3b82f6',
            color: 'var(--primary-color)'
          }}
          data-testid="safari-custom-props"
        >
          <UnifiedQuoteBreakdown
            quote={crossBrowserTestQuote}
            viewMode="customer"
          />
        </div>
      );

      renderWithProviders(<CustomPropertiesTest />);

      // Verify CSS custom properties are supported
      expect(CSS.supports('--custom-property', 'value')).toBe(true);
      
      const element = screen.getByTestId('safari-custom-props');
      expect(element).toBeInTheDocument();
    });

    it('should handle Safari Service Worker limitations', async () => {
      const ServiceWorkerTest = () => {
        const [swSupported, setSwSupported] = React.useState(false);

        React.useEffect(() => {
          if ('serviceWorker' in navigator) {
            setSwSupported(true);
          }
        }, []);

        return (
          <div data-testid="sw-support">
            {swSupported ? 'supported' : 'not-supported'}
          </div>
        );
      };

      renderWithProviders(<ServiceWorkerTest />);

      await waitFor(() => {
        expect(screen.getByTestId('sw-support')).toHaveTextContent('supported');
      });
    });
  });

  describe('Edge Browser Compatibility', () => {
    beforeEach(() => {
      setBrowserEnvironment('edge');
    });

    it('should render UnifiedQuoteCard correctly in Edge', async () => {
      renderWithProviders(
        <UnifiedQuoteCard
          quote={crossBrowserTestQuote}
          viewMode="customer"
          layout="detail"
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
      
      // Test Edge-specific user agent
      expect(navigator.userAgent).toContain('Edg');
    });

    it('should handle Edge-specific fetch implementation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test' })
      });
      
      global.fetch = mockFetch;

      const FetchTest = () => {
        const [data, setData] = React.useState<string>('');

        React.useEffect(() => {
          fetch('/api/test')
            .then(res => res.json())
            .then(result => setData(result.data));
        }, []);

        return <div data-testid="fetch-result">{data}</div>;
      };

      renderWithProviders(<FetchTest />);

      await waitFor(() => {
        expect(screen.getByTestId('fetch-result')).toHaveTextContent('test');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test');
    });

    it('should work with Edge CSS container queries', async () => {
      const ContainerQueriesTest = () => (
        <div 
          className="container-type-inline-size"
          data-testid="edge-container"
        >
          <UnifiedQuoteList
            quotes={[crossBrowserTestQuote]}
            viewMode="customer"
            layout="list"
          />
        </div>
      );

      renderWithProviders(<ContainerQueriesTest />);

      // Edge should support container queries
      expect(CSS.supports('container-type', 'inline-size')).toBe(true);
    });
  });

  describe('Mobile Browser Compatibility', () => {
    it('should work correctly on mobile Chrome', async () => {
      setBrowserEnvironment('mobile_chrome');

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });

      renderWithProviders(
        <UnifiedQuoteCard
          quote={crossBrowserTestQuote}
          viewMode="customer"
          layout="compact"
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(navigator.userAgent).toContain('Mobile');
    });

    it('should work correctly on mobile Safari', async () => {
      setBrowserEnvironment('mobile_safari');

      // Mock iOS-specific properties
      Object.defineProperty(navigator, 'standalone', { value: false, configurable: true });

      renderWithProviders(
        <UnifiedQuoteForm
          mode="create"
          viewMode="guest"
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/product url/i)).toBeInTheDocument();
      expect(navigator.userAgent).toContain('iPhone');
    });

    it('should handle touch events on mobile', async () => {
      setBrowserEnvironment('mobile_chrome');
      
      const TouchEventTest = () => {
        const [touched, setTouched] = React.useState(false);

        const handleTouch = () => {
          setTouched(true);
        };

        return (
          <div
            onTouchStart={handleTouch}
            data-testid="touch-element"
          >
            <UnifiedQuoteActions
              quote={crossBrowserTestQuote}
              viewMode="customer"
              onAction={vi.fn()}
            />
            <div data-testid="touch-status">
              {touched ? 'touched' : 'not-touched'}
            </div>
          </div>
        );
      };

      renderWithProviders(<TouchEventTest />);

      const touchElement = screen.getByTestId('touch-element');
      
      // Simulate touch event
      fireEvent.touchStart(touchElement);

      await waitFor(() => {
        expect(screen.getByTestId('touch-status')).toHaveTextContent('touched');
      });
    });
  });

  describe('Feature Detection and Polyfills', () => {
    it('should detect and handle missing features gracefully', async () => {
      // Mock environment with limited feature support
      setBrowserEnvironment('safari'); // Safari has some limitations
      
      const FeatureDetectionTest = () => {
        const [features, setFeatures] = React.useState<Record<string, boolean>>({});

        React.useEffect(() => {
          const detectedFeatures = {
            intersectionObserver: 'IntersectionObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webGL: !!document.createElement('canvas').getContext('webgl'),
            customElements: 'customElements' in window,
            cssGrid: CSS.supports('display', 'grid'),
            cssFlexbox: CSS.supports('display', 'flex'),
            cssCustomProperties: CSS.supports('--custom', 'property'),
            containerQueries: CSS.supports('container-type', 'inline-size')
          };

          setFeatures(detectedFeatures);
        }, []);

        return (
          <div>
            {Object.entries(features).map(([feature, supported]) => (
              <div key={feature} data-testid={`feature-${feature}`}>
                {feature}: {supported ? 'supported' : 'not-supported'}
              </div>
            ))}
            <UnifiedQuoteCard
              quote={crossBrowserTestQuote}
              viewMode="customer"
              layout="detail"
            />
          </div>
        );
      };

      renderWithProviders(<FeatureDetectionTest />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-intersectionObserver')).toHaveTextContent('supported');
        expect(screen.getByTestId('feature-cssGrid')).toHaveTextContent('supported');
        expect(screen.getByTestId('feature-cssFlexbox')).toHaveTextContent('supported');
        
        // Container queries might not be supported in Safari
        expect(screen.getByTestId('feature-containerQueries')).toHaveTextContent('not-supported');
      });
    });

    it('should provide fallbacks for unsupported features', async () => {
      const FallbackTest = () => {
        const [useModernFeatures, setUseModernFeatures] = React.useState(true);

        React.useEffect(() => {
          // Check if modern features are supported
          const hasContainerQueries = CSS.supports('container-type', 'inline-size');
          setUseModernFeatures(hasContainerQueries);
        }, []);

        return (
          <div data-testid="fallback-container">
            {useModernFeatures ? (
              <div className="container-type-inline-size">
                Modern layout with container queries
              </div>
            ) : (
              <div className="responsive-grid">
                Fallback layout with media queries
              </div>
            )}
            <UnifiedQuoteBreakdown
              quote={crossBrowserTestQuote}
              viewMode="customer"
            />
          </div>
        );
      };

      // Test with Safari (limited container query support)
      setBrowserEnvironment('safari');
      renderWithProviders(<FallbackTest />);

      await waitFor(() => {
        expect(screen.getByText('Fallback layout with media queries')).toBeInTheDocument();
      });

      // Test with Chrome (full support)
      setBrowserEnvironment('chrome');
      renderWithProviders(<FallbackTest />);

      await waitFor(() => {
        expect(screen.getByText('Modern layout with container queries')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Browser Event Handling', () => {
    it('should handle click events consistently across browsers', async () => {
      const browsers: (keyof typeof browserUserAgents)[] = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        setBrowserEnvironment(browser);
        
        const mockAction = vi.fn();
        const user = userEvent.setup();

        const { unmount } = renderWithProviders(
          <UnifiedQuoteActions
            quote={crossBrowserTestQuote}
            viewMode="customer"
            onAction={mockAction}
          />
        );

        const approveButton = screen.getByText('Approve Quote');
        await user.click(approveButton);

        expect(mockAction).toHaveBeenCalledWith('approve');
        
        unmount();
        vi.clearAllMocks();
      }
    });

    it('should handle keyboard events consistently across browsers', async () => {
      const browsers: (keyof typeof browserUserAgents)[] = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        setBrowserEnvironment(browser);
        
        const user = userEvent.setup();

        const { unmount } = renderWithProviders(
          <UnifiedQuoteForm
            mode="create"
            viewMode="guest"
            onSubmit={vi.fn()}
          />
        );

        const nameInput = screen.getByLabelText(/your name/i);
        await user.type(nameInput, 'Test User');

        expect(nameInput).toHaveValue('Test User');
        
        unmount();
      }
    });

    it('should handle form validation consistently across browsers', async () => {
      const browsers: (keyof typeof browserUserAgents)[] = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        setBrowserEnvironment(browser);
        
        const user = userEvent.setup();

        const { unmount } = renderWithProviders(
          <UnifiedQuoteForm
            mode="create"
            viewMode="guest"
            onSubmit={vi.fn()}
          />
        );

        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(emailInput, 'invalid-email');
        fireEvent.blur(emailInput);

        await waitFor(() => {
          expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        });
        
        unmount();
        vi.clearAllMocks();
      }
    });
  });
});