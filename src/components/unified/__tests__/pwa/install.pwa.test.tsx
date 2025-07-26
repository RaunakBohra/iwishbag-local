import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock BeforeInstallPromptEvent
class MockBeforeInstallPromptEvent extends Event {
  public prompt: () => Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  public userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  public platforms: string[];

  constructor(type: string, eventInitDict?: EventInit) {
    super(type, eventInitDict);
    this.platforms = ['web'];
    this.prompt = vi.fn().mockResolvedValue({ outcome: 'accepted', platform: 'web' });
    this.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  }
}

// Mock Web App Manifest
const mockManifest = {
  name: 'iwishBag - International Shopping Platform',
  short_name: 'iwishBag',
  description: 'Shop from Amazon, Flipkart, eBay, Alibaba and more to India, Nepal and worldwide',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#3b82f6',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'maskable any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable any',
    },
  ],
  categories: ['shopping', 'business'],
  screenshots: [
    {
      src: '/screenshots/desktop-1.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
    },
    {
      src: '/screenshots/mobile-1.png',
      sizes: '375x667',
      type: 'image/png',
      form_factor: 'narrow',
    },
  ],
};

// Mock Web Share API
Object.defineProperty(navigator, 'share', {
  value: vi.fn().mockResolvedValue(undefined),
  configurable: true,
});

// Mock User Agent for different platforms
const mockUserAgents = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  mobile:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
};

// Mock device capabilities
const mockDeviceCapabilities = {
  standalone: false,
  installable: true,
  platform: 'web',
};

// Mock localStorage for install preferences
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
  },
});

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'install-user-id', email: 'install@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Test data
const installTestQuote: UnifiedQuote = {
  id: 'install-quote-001',
  display_id: 'QT-INSTALL001',
  user_id: 'install-user-id',
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
      name: 'Install Test User',
      email: 'install@example.com',
      phone: '+91-9876543210',
    },
  },
  shipping_address: {
    formatted: '123 Install Street, Mumbai, Maharashtra 400001, India',
  },
  items: [
    {
      id: 'install-item',
      name: 'Premium Headphones',
      description: 'High-quality wireless headphones',
      quantity: 1,
      price: 249.99,
      product_url: 'https://amazon.com/premium-headphones',
      image_url: 'https://example.com/headphones.jpg',
    },
  ],
  notes: 'Install test quote',
  admin_notes: '',
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

// Helper function to trigger beforeinstallprompt event
const triggerInstallPrompt = () => {
  const event = new MockBeforeInstallPromptEvent('beforeinstallprompt');
  window.dispatchEvent(event);
  return event;
};

describe('PWA Installation Tests', () => {
  let mockInstallPromptEvent: MockBeforeInstallPromptEvent | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstallPromptEvent = null;
    Object.keys(mockLocalStorage).forEach((key) => {
      delete mockLocalStorage[key];
    });

    // Set default user agent to Chrome
    setUserAgent(mockUserAgents.chrome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Installation Prompt Detection', () => {
    it('should detect PWA installation capability', async () => {
      const InstallDetectionTest = () => {
        const [isInstallable, setIsInstallable] = React.useState(false);
        const [installPrompt, setInstallPrompt] = React.useState<any>(null);

        React.useEffect(() => {
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            setIsInstallable(true);
          };

          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

          return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          };
        }, []);

        return (
          <div>
            <div data-testid="installable-status">
              {isInstallable ? 'installable' : 'not-installable'}
            </div>
            <div data-testid="prompt-available">{installPrompt ? 'prompt-ready' : 'no-prompt'}</div>
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<InstallDetectionTest />);

      // Initially not installable
      expect(screen.getByTestId('installable-status')).toHaveTextContent('not-installable');

      // Trigger install prompt
      act(() => {
        mockInstallPromptEvent = triggerInstallPrompt();
      });

      await waitFor(() => {
        expect(screen.getByTestId('installable-status')).toHaveTextContent('installable');
        expect(screen.getByTestId('prompt-available')).toHaveTextContent('prompt-ready');
      });
    });

    it('should detect if app is already installed', async () => {
      // Mock standalone mode
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        configurable: true,
      });

      const InstallStatusTest = () => {
        const [isInstalled, setIsInstalled] = React.useState(false);

        React.useEffect(() => {
          // Check if app is in standalone mode
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
          // Check if launched from home screen (iOS)
          const isIosStandalone = (window.navigator as any).standalone === true;

          setIsInstalled(isStandalone || isIosStandalone);
        }, []);

        return (
          <div>
            <div data-testid="install-status">{isInstalled ? 'installed' : 'not-installed'}</div>
            <UnifiedQuoteList quotes={[installTestQuote]} viewMode="customer" layout="list" />
          </div>
        );
      };

      renderWithProviders(<InstallStatusTest />);

      await waitFor(() => {
        expect(screen.getByTestId('install-status')).toHaveTextContent('installed');
      });
    });
  });

  describe('Platform-Specific Installation UI', () => {
    it('should show Chrome installation banner', async () => {
      setUserAgent(mockUserAgents.chrome);

      const ChromeInstallTest = () => {
        const [showInstallBanner, setShowInstallBanner] = React.useState(false);
        const [installPrompt, setInstallPrompt] = React.useState<any>(null);

        React.useEffect(() => {
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);

            // Check if user previously dismissed
            const dismissed = localStorage.getItem('install-prompt-dismissed');
            if (!dismissed) {
              setShowInstallBanner(true);
            }
          };

          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }, []);

        const handleInstall = async () => {
          if (installPrompt) {
            const result = await installPrompt.prompt();
            if (result.outcome === 'accepted') {
              setShowInstallBanner(false);
              localStorage.setItem('install-accepted', 'true');
            }
          }
        };

        const handleDismiss = () => {
          setShowInstallBanner(false);
          localStorage.setItem('install-prompt-dismissed', 'true');
        };

        return (
          <div>
            {showInstallBanner && (
              <div data-testid="install-banner" className="bg-blue-100 p-4">
                <p>Install iwishBag for easier access and offline features!</p>
                <button onClick={handleInstall} data-testid="install-button">
                  Install App
                </button>
                <button onClick={handleDismiss} data-testid="dismiss-button">
                  Not Now
                </button>
              </div>
            )}
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<ChromeInstallTest />);

      // Trigger install prompt
      act(() => {
        mockInstallPromptEvent = triggerInstallPrompt();
      });

      await waitFor(() => {
        expect(screen.getByTestId('install-banner')).toBeInTheDocument();
      });

      // Test install action
      await user.click(screen.getByTestId('install-button'));

      await waitFor(() => {
        expect(mockInstallPromptEvent?.prompt).toHaveBeenCalled();
        expect(localStorage.setItem).toHaveBeenCalledWith('install-accepted', 'true');
      });
    });

    it('should show Safari installation instructions', async () => {
      setUserAgent(mockUserAgents.safari);

      const SafariInstallTest = () => {
        const [showSafariInstructions, setShowSafariInstructions] = React.useState(false);
        const [isIOS, setIsIOS] = React.useState(false);

        React.useEffect(() => {
          const userAgent = navigator.userAgent;
          const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
          const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);

          setIsIOS(isIOSDevice);

          if ((isIOSDevice || isSafari) && !(window.navigator as any).standalone) {
            const dismissed = localStorage.getItem('safari-install-dismissed');
            if (!dismissed) {
              setShowSafariInstructions(true);
            }
          }
        }, []);

        const handleDismiss = () => {
          setShowSafariInstructions(false);
          localStorage.setItem('safari-install-dismissed', 'true');
        };

        return (
          <div>
            {showSafariInstructions && (
              <div data-testid="safari-instructions" className="bg-gray-100 p-4">
                <h3>Install iwishBag</h3>
                <p>
                  To install this app on your {isIOS ? 'iOS device' : 'Mac'}, tap the share button
                  and then "Add to Home Screen".
                </p>
                <div className="instructions">
                  <ol>
                    <li>Tap the Share button in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" in the top right corner</li>
                  </ol>
                </div>
                <button onClick={handleDismiss} data-testid="dismiss-safari">
                  Got it
                </button>
              </div>
            )}
            <div data-testid="platform-info">{isIOS ? 'iOS' : 'Desktop Safari'}</div>
            <UnifiedQuoteList quotes={[installTestQuote]} viewMode="customer" layout="compact" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<SafariInstallTest />);

      await waitFor(() => {
        expect(screen.getByTestId('safari-instructions')).toBeInTheDocument();
        expect(screen.getByText('To install this app on your Mac')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('dismiss-safari'));

      expect(localStorage.setItem).toHaveBeenCalledWith('safari-install-dismissed', 'true');
    });

    it('should show mobile-specific installation prompts', async () => {
      setUserAgent(mockUserAgents.mobile);

      const MobileInstallTest = () => {
        const [isMobile, setIsMobile] = React.useState(false);
        const [showMobilePrompt, setShowMobilePrompt] = React.useState(false);

        React.useEffect(() => {
          const checkMobile = () => {
            const userAgent = navigator.userAgent;
            const isMobileDevice =
              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

            setIsMobile(isMobileDevice);

            if (isMobileDevice) {
              const hasSeenPrompt = localStorage.getItem('mobile-install-seen');
              if (!hasSeenPrompt) {
                // Show prompt after 3 seconds on mobile
                setTimeout(() => {
                  setShowMobilePrompt(true);
                  localStorage.setItem('mobile-install-seen', 'true');
                }, 3000);
              }
            }
          };

          checkMobile();
        }, []);

        return (
          <div>
            <div data-testid="device-type">{isMobile ? 'mobile' : 'desktop'}</div>
            {showMobilePrompt && (
              <div
                data-testid="mobile-install-prompt"
                className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4"
              >
                <p>Get the full iwishBag experience - install our app!</p>
                <div className="flex gap-2 mt-2">
                  <button className="bg-white text-blue-600 px-4 py-2 rounded">Install</button>
                  <button
                    onClick={() => setShowMobilePrompt(false)}
                    className="border border-white px-4 py-2 rounded"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="compact" />
          </div>
        );
      };

      renderWithProviders(<MobileInstallTest />);

      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('mobile');
      });

      // Wait for mobile prompt to appear
      await waitFor(
        () => {
          expect(screen.getByTestId('mobile-install-prompt')).toBeInTheDocument();
        },
        { timeout: 4000 },
      );

      expect(localStorage.setItem).toHaveBeenCalledWith('mobile-install-seen', 'true');
    });
  });

  describe('Installation Analytics and Tracking', () => {
    it('should track installation events', async () => {
      const mockAnalytics = {
        track: vi.fn(),
      };

      // Mock gtag
      Object.defineProperty(window, 'gtag', {
        value: vi.fn(),
        configurable: true,
      });

      const InstallAnalyticsTest = () => {
        const [installPrompt, setInstallPrompt] = React.useState<any>(null);

        React.useEffect(() => {
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);

            // Track install prompt shown
            window.gtag('event', 'install_prompt_shown', {
              platform: 'web',
              source: 'auto',
            });
          };

          const handleAppInstalled = () => {
            // Track successful installation
            window.gtag('event', 'app_installed', {
              platform: 'web',
              method: 'browser_prompt',
            });
          };

          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.addEventListener('appinstalled', handleAppInstalled);

          return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
          };
        }, []);

        const handleInstallClick = async () => {
          if (installPrompt) {
            // Track install attempt
            window.gtag('event', 'install_attempt', {
              platform: 'web',
              trigger: 'user_action',
            });

            const result = await installPrompt.prompt();

            // Track result
            window.gtag('event', 'install_prompt_result', {
              outcome: result.outcome,
              platform: result.platform,
            });
          }
        };

        return (
          <div>
            {installPrompt && (
              <button onClick={handleInstallClick} data-testid="tracked-install">
                Install App
              </button>
            )}
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<InstallAnalyticsTest />);

      // Trigger install prompt
      act(() => {
        mockInstallPromptEvent = triggerInstallPrompt();
      });

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith('event', 'install_prompt_shown', {
          platform: 'web',
          source: 'auto',
        });
      });

      // Click install button
      await user.click(screen.getByTestId('tracked-install'));

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith('event', 'install_attempt', {
          platform: 'web',
          trigger: 'user_action',
        });
      });

      // Simulate successful installation
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith('event', 'app_installed', {
          platform: 'web',
          method: 'browser_prompt',
        });
      });
    });

    it('should track installation funnel metrics', async () => {
      const InstallFunnelTest = () => {
        const [funnelStep, setFunnelStep] = React.useState<string>('landing');

        React.useEffect(() => {
          // Track funnel progression
          const trackFunnelStep = (step: string) => {
            window.gtag('event', 'install_funnel', {
              step,
              timestamp: Date.now(),
              user_agent: navigator.userAgent.substring(0, 100),
            });
          };

          // Initial landing
          trackFunnelStep('landing');
          setFunnelStep('landing');

          // Simulate user engagement
          const engagementTimer = setTimeout(() => {
            trackFunnelStep('engaged');
            setFunnelStep('engaged');
          }, 2000);

          // Simulate intent (scroll or interaction)
          const intentTimer = setTimeout(() => {
            trackFunnelStep('intent_shown');
            setFunnelStep('intent_shown');
          }, 5000);

          return () => {
            clearTimeout(engagementTimer);
            clearTimeout(intentTimer);
          };
        }, []);

        return (
          <div>
            <div data-testid="funnel-step">{funnelStep}</div>
            <UnifiedQuoteList quotes={[installTestQuote]} viewMode="customer" layout="list" />
          </div>
        );
      };

      renderWithProviders(<InstallFunnelTest />);

      // Check initial tracking
      await waitFor(() => {
        expect(window.gtag).toHaveBeenCalledWith('event', 'install_funnel', {
          step: 'landing',
          timestamp: expect.any(Number),
          user_agent: expect.any(String),
        });
      });

      // Wait for engagement tracking
      await waitFor(
        () => {
          expect(screen.getByTestId('funnel-step')).toHaveTextContent('engaged');
        },
        { timeout: 3000 },
      );

      // Wait for intent tracking
      await waitFor(
        () => {
          expect(screen.getByTestId('funnel-step')).toHaveTextContent('intent_shown');
        },
        { timeout: 6000 },
      );
    });
  });

  describe('Post-Installation Experience', () => {
    it('should show welcome screen after installation', async () => {
      const PostInstallTest = () => {
        const [showWelcome, setShowWelcome] = React.useState(false);
        const [installMethod, setInstallMethod] = React.useState<string>('');

        React.useEffect(() => {
          const handleAppInstalled = (e: Event) => {
            setInstallMethod('browser_prompt');
            setShowWelcome(true);

            // Store installation info
            localStorage.setItem('app_installed', 'true');
            localStorage.setItem('install_date', new Date().toISOString());
            localStorage.setItem('install_method', 'browser_prompt');

            // Show welcome screen for 5 seconds
            setTimeout(() => {
              setShowWelcome(false);
            }, 5000);
          };

          window.addEventListener('appinstalled', handleAppInstalled);
          return () => window.removeEventListener('appinstalled', handleAppInstalled);
        }, []);

        return (
          <div>
            {showWelcome && (
              <div
                data-testid="welcome-screen"
                className="fixed inset-0 bg-blue-600 text-white flex items-center justify-center"
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-4">Welcome to iwishBag!</h1>
                  <p className="text-lg mb-4">
                    Thanks for installing our app. You can now access iwishBag offline and get
                    faster performance.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-sm opacity-80">Installed via: {installMethod}</div>
                  </div>
                </div>
              </div>
            )}
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<PostInstallTest />);

      // Simulate app installation
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
        expect(screen.getByText('Welcome to iwishBag!')).toBeInTheDocument();
        expect(screen.getByText('Installed via: browser_prompt')).toBeInTheDocument();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('app_installed', 'true');
      expect(localStorage.setItem).toHaveBeenCalledWith('install_method', 'browser_prompt');
    });

    it('should update app functionality after installation', async () => {
      const PostInstallFeaturesTest = () => {
        const [isInstalled, setIsInstalled] = React.useState(false);
        const [features, setFeatures] = React.useState<string[]>([]);

        React.useEffect(() => {
          const checkInstallStatus = () => {
            const installed = localStorage.getItem('app_installed') === 'true';
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

            setIsInstalled(installed || isStandalone);

            if (installed || isStandalone) {
              setFeatures([
                'Offline Access',
                'Push Notifications',
                'Background Sync',
                'Faster Loading',
                'Home Screen Icon',
              ]);
            }
          };

          checkInstallStatus();

          // Check on focus (when returning to app)
          window.addEventListener('focus', checkInstallStatus);
          return () => window.removeEventListener('focus', checkInstallStatus);
        }, []);

        return (
          <div>
            <div data-testid="app-status">{isInstalled ? 'installed' : 'browser'}</div>
            <div data-testid="features-count">{features.length}</div>
            {features.length > 0 && (
              <div data-testid="app-features">
                <h3>Available Features:</h3>
                <ul>
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            <UnifiedQuoteList quotes={[installTestQuote]} viewMode="customer" layout="list" />
          </div>
        );
      };

      renderWithProviders(<PostInstallFeaturesTest />);

      // Simulate installed state
      localStorage.setItem('app_installed', 'true');

      // Trigger focus event to check install status
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('app-status')).toHaveTextContent('installed');
        expect(screen.getByTestId('features-count')).toHaveTextContent('5');
        expect(screen.getByTestId('app-features')).toBeInTheDocument();
      });

      // Verify features are listed
      expect(screen.getByText('Offline Access')).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      expect(screen.getByText('Background Sync')).toBeInTheDocument();
    });
  });

  describe('Installation Error Handling', () => {
    it('should handle installation failures gracefully', async () => {
      const InstallErrorTest = () => {
        const [installError, setInstallError] = React.useState<string | null>(null);
        const [installPrompt, setInstallPrompt] = React.useState<any>(null);

        React.useEffect(() => {
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            // Mock a failing prompt
            const failingPrompt = {
              prompt: vi.fn().mockRejectedValue(new Error('Installation failed')),
              userChoice: Promise.reject(new Error('User choice failed')),
            };
            setInstallPrompt(failingPrompt);
          };

          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }, []);

        const handleInstallAttempt = async () => {
          try {
            if (installPrompt) {
              await installPrompt.prompt();
            }
          } catch (error) {
            setInstallError('Installation failed. Please try again later.');

            // Track error
            window.gtag('event', 'install_error', {
              error_message: (error as Error).message,
              platform: 'web',
            });
          }
        };

        return (
          <div>
            {installError && (
              <div data-testid="install-error" className="bg-red-100 p-2 text-red-800">
                {installError}
              </div>
            )}
            {installPrompt && (
              <button onClick={handleInstallAttempt} data-testid="failing-install">
                Install App
              </button>
            )}
            <UnifiedQuoteCard quote={installTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<InstallErrorTest />);

      // Trigger install prompt
      act(() => {
        triggerInstallPrompt();
      });

      await waitFor(() => {
        expect(screen.getByTestId('failing-install')).toBeInTheDocument();
      });

      // Attempt installation (will fail)
      await user.click(screen.getByTestId('failing-install'));

      await waitFor(() => {
        expect(screen.getByTestId('install-error')).toBeInTheDocument();
        expect(
          screen.getByText('Installation failed. Please try again later.'),
        ).toBeInTheDocument();
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'install_error', {
        error_message: 'Installation failed',
        platform: 'web',
      });
    });
  });
});
