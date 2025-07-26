import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock Service Worker for offline functionality
const mockServiceWorker = {
  register: vi.fn(),
  unregister: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  postMessage: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  state: 'activated' as ServiceWorkerState,
};

// Mock Service Worker Registration
const mockServiceWorkerRegistration = {
  active: mockServiceWorker,
  installing: null,
  waiting: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  update: vi.fn(),
  unregister: vi.fn(),
};

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    controller: mockServiceWorker,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getRegistration: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
  },
  configurable: true,
});

// Mock online/offline status
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock connection status
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  configurable: true,
});

// Mock IndexedDB for offline storage
const mockIndexedDB = {
  databases: new Map(),
  open: vi.fn().mockImplementation((name: string, version?: number) => {
    return Promise.resolve({
      name,
      version: version || 1,
      objectStoreNames: ['quotes', 'forms', 'assets'],
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue(null),
          getAll: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
          clear: vi.fn().mockResolvedValue(undefined),
          index: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
            getAll: vi.fn().mockResolvedValue([]),
          }),
        }),
        oncomplete: null,
        onerror: null,
        onabort: null,
      }),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }),
  deleteDatabase: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  configurable: true,
});

// Mock Cache API
const mockCacheStorage = new Map();
const mockCache = {
  match: vi.fn(),
  matchAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  addAll: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(true),
  keys: vi.fn().mockResolvedValue([]),
};

Object.defineProperty(window, 'caches', {
  value: {
    open: vi.fn().mockResolvedValue(mockCache),
    match: vi.fn(),
    has: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue(['iwishbag-v1']),
  },
  configurable: true,
});

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

// Test data
const offlineQuote: UnifiedQuote = {
  id: 'offline-quote-001',
  display_id: 'QT-OFF001',
  user_id: 'test-user-id',
  status: 'pending',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 199.99,
  item_price: 149.99,
  sales_tax_price: 12.0,
  merchant_shipping_price: 10.0,
  international_shipping: 18.0,
  customs_and_ecs: 7.5,
  domestic_shipping: 5.0,
  handling_charge: 2.5,
  insurance_amount: 1.5,
  payment_gateway_fee: 2.5,
  vat: 0.0,
  discount: 5.0,
  destination_country: 'CA',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Offline User',
      email: 'offline@example.com',
      phone: '+1-555-0199',
    },
  },
  shipping_address: {
    formatted: '123 Offline Street, Toronto, ON M5H 2N2, Canada',
  },
  items: [
    {
      id: 'offline-item',
      name: 'Offline Product',
      description: 'Product available offline',
      quantity: 1,
      price: 149.99,
      product_url: 'https://amazon.com/offline-product',
      image_url: 'https://example.com/offline.jpg',
    },
  ],
  notes: 'Offline test quote',
  admin_notes: '',
  priority: 'medium',
  in_cart: false,
  attachments: [],
};

// Helper function to render components with providers
const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 1000,
        staleTime: 300000, // 5 minutes
        cacheTime: 600000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 3,
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

// Helper function to simulate network status changes
const setNetworkStatus = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: online,
  });

  // Dispatch online/offline events
  const event = new Event(online ? 'online' : 'offline');
  window.dispatchEvent(event);
};

describe('PWA Offline Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to online state
    setNetworkStatus(true);
    mockCacheStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Worker Registration and Management', () => {
    it('should register service worker on app initialization', async () => {
      const mockOnServiceWorkerUpdate = vi.fn();

      const ServiceWorkerTestComponent = () => {
        const [swRegistration, setSwRegistration] =
          React.useState<ServiceWorkerRegistration | null>(null);
        const [updateAvailable, setUpdateAvailable] = React.useState(false);

        React.useEffect(() => {
          const registerServiceWorker = async () => {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js');
              setSwRegistration(registration);

              // Listen for updates
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      setUpdateAvailable(true);
                      mockOnServiceWorkerUpdate();
                    }
                  });
                }
              });
            } catch (error) {
              console.error('SW registration failed:', error);
            }
          };

          registerServiceWorker();
        }, []);

        return (
          <div>
            <div data-testid="sw-status">{swRegistration ? 'registered' : 'not-registered'}</div>
            <div data-testid="update-status">
              {updateAvailable ? 'update-available' : 'no-update'}
            </div>
            <UnifiedQuoteCard quote={offlineQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<ServiceWorkerTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('sw-status')).toHaveTextContent('registered');
      });

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle service worker update cycle', async () => {
      const ServiceWorkerUpdateTest = () => {
        const [updateReady, setUpdateReady] = React.useState(false);

        React.useEffect(() => {
          const handleControllerChange = () => {
            setUpdateReady(true);
          };

          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

          return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          };
        }, []);

        const skipWaiting = () => {
          if (mockServiceWorkerRegistration.waiting) {
            mockServiceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        return (
          <div>
            {updateReady && (
              <div data-testid="update-banner">
                <span>New version available!</span>
                <button onClick={skipWaiting}>Update Now</button>
              </div>
            )}
            <UnifiedQuoteList quotes={[offlineQuote]} viewMode="customer" layout="list" />
          </div>
        );
      };

      renderWithProviders(<ServiceWorkerUpdateTest />);

      // Simulate service worker update
      act(() => {
        const controllerChangeEvent = new Event('controllerchange');
        navigator.serviceWorker.dispatchEvent(controllerChangeEvent);
      });

      await waitFor(() => {
        expect(screen.getByTestId('update-banner')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Now');
      const user = userEvent.setup();
      await user.click(updateButton);

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });

  describe('Offline Data Storage and Retrieval', () => {
    it('should store quote data locally when offline', async () => {
      const mockOfflineStorage = {
        saveQuote: vi.fn().mockResolvedValue(true),
        getQuotes: vi.fn().mockResolvedValue([offlineQuote]),
        deleteQuote: vi.fn().mockResolvedValue(true),
      };

      const OfflineStorageTest = () => {
        const [isOffline, setIsOffline] = React.useState(false);
        const [offlineQuotes, setOfflineQuotes] = React.useState<UnifiedQuote[]>([]);

        React.useEffect(() => {
          const handleOnline = () => setIsOffline(false);
          const handleOffline = () => setIsOffline(true);

          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);

          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);

        React.useEffect(() => {
          if (isOffline) {
            // Load offline quotes
            mockOfflineStorage.getQuotes().then(setOfflineQuotes);
          }
        }, [isOffline]);

        const saveOfflineQuote = async () => {
          await mockOfflineStorage.saveQuote(offlineQuote);
          setOfflineQuotes([offlineQuote]);
        };

        return (
          <div>
            <div data-testid="network-status">{isOffline ? 'offline' : 'online'}</div>
            <div data-testid="offline-quotes-count">{offlineQuotes.length}</div>
            <button onClick={saveOfflineQuote} data-testid="save-offline">
              Save Offline
            </button>
            <UnifiedQuoteList quotes={offlineQuotes} viewMode="customer" layout="list" />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<OfflineStorageTest />);

      // Initially online
      expect(screen.getByTestId('network-status')).toHaveTextContent('online');

      // Save quote offline
      await user.click(screen.getByTestId('save-offline'));

      // Go offline
      act(() => {
        setNetworkStatus(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent('offline');
        expect(screen.getByTestId('offline-quotes-count')).toHaveTextContent('1');
      });

      expect(mockOfflineStorage.saveQuote).toHaveBeenCalledWith(offlineQuote);
      expect(mockOfflineStorage.getQuotes).toHaveBeenCalled();
    });

    it('should sync offline data when coming back online', async () => {
      const mockSyncService = {
        syncOfflineData: vi.fn().mockResolvedValue({ synced: 1, failed: 0 }),
        getOfflineChanges: vi
          .fn()
          .mockResolvedValue([{ type: 'create', data: offlineQuote, timestamp: Date.now() }]),
      };

      const OfflineSyncTest = () => {
        const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'synced' | 'error'>(
          'idle',
        );
        const [syncedCount, setSyncedCount] = React.useState(0);

        React.useEffect(() => {
          const handleOnline = async () => {
            setSyncStatus('syncing');

            try {
              const result = await mockSyncService.syncOfflineData();
              setSyncedCount(result.synced);
              setSyncStatus('synced');
            } catch (error) {
              setSyncStatus('error');
            }
          };

          window.addEventListener('online', handleOnline);
          return () => window.removeEventListener('online', handleOnline);
        }, []);

        return (
          <div>
            <div data-testid="sync-status">{syncStatus}</div>
            <div data-testid="synced-count">{syncedCount}</div>
            <UnifiedQuoteCard quote={offlineQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<OfflineSyncTest />);

      // Start offline
      act(() => {
        setNetworkStatus(false);
      });

      // Come back online
      act(() => {
        setNetworkStatus(true);
      });

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('synced');
        expect(screen.getByTestId('synced-count')).toHaveTextContent('1');
      });

      expect(mockSyncService.syncOfflineData).toHaveBeenCalled();
    });
  });

  describe('Offline Form Submission', () => {
    it('should queue form submissions when offline', async () => {
      const mockOfflineQueue = {
        add: vi.fn().mockResolvedValue('queued-123'),
        process: vi.fn().mockResolvedValue({ success: true }),
        getQueueSize: vi.fn().mockReturnValue(1),
      };

      const OfflineFormTest = () => {
        const [isOffline, setIsOffline] = React.useState(false);
        const [queueSize, setQueueSize] = React.useState(0);
        const [submitStatus, setSubmitStatus] = React.useState<string>('');

        React.useEffect(() => {
          const handleOffline = () => setIsOffline(true);
          const handleOnline = () => setIsOffline(false);

          window.addEventListener('offline', handleOffline);
          window.addEventListener('online', handleOnline);

          return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
          };
        }, []);

        const handleSubmit = async (formData: any) => {
          if (isOffline) {
            await mockOfflineQueue.add(formData);
            setQueueSize(mockOfflineQueue.getQueueSize());
            setSubmitStatus('queued');
          } else {
            setSubmitStatus('submitted');
          }
        };

        return (
          <div>
            <div data-testid="network-status">{isOffline ? 'offline' : 'online'}</div>
            <div data-testid="queue-size">{queueSize}</div>
            <div data-testid="submit-status">{submitStatus}</div>
            <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={handleSubmit} />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<OfflineFormTest />);

      // Go offline
      act(() => {
        setNetworkStatus(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId('network-status')).toHaveTextContent('offline');
      });

      // Fill and submit form
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('submit-status')).toHaveTextContent('queued');
        expect(screen.getByTestId('queue-size')).toHaveTextContent('1');
      });

      expect(mockOfflineQueue.add).toHaveBeenCalled();
    });

    it('should show offline indicators in form', async () => {
      const OfflineIndicatorTest = () => {
        const [isOffline, setIsOffline] = React.useState(false);

        React.useEffect(() => {
          const handleOffline = () => setIsOffline(true);
          const handleOnline = () => setIsOffline(false);

          window.addEventListener('offline', handleOffline);
          window.addEventListener('online', handleOnline);

          return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
          };
        }, []);

        return (
          <div>
            {isOffline && (
              <div data-testid="offline-banner" className="bg-yellow-100 p-2">
                <span>You're offline. Form submissions will be queued.</span>
              </div>
            )}
            <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={vi.fn()} />
          </div>
        );
      };

      renderWithProviders(<OfflineIndicatorTest />);

      // Should not show offline banner initially
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();

      // Go offline
      act(() => {
        setNetworkStatus(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
      });

      expect(
        screen.getByText("You're offline. Form submissions will be queued."),
      ).toBeInTheDocument();
    });
  });

  describe('Offline Asset Caching', () => {
    it('should cache and serve assets when offline', async () => {
      const mockAssetCache = {
        cacheAssets: vi.fn().mockResolvedValue(true),
        getAsset: vi.fn().mockResolvedValue(new Response('cached-content')),
        hasAsset: vi.fn().mockResolvedValue(true),
      };

      const OfflineAssetTest = () => {
        const [assetStatus, setAssetStatus] = React.useState<'loading' | 'cached' | 'offline'>(
          'loading',
        );
        const [imageUrl, setImageUrl] = React.useState('');

        React.useEffect(() => {
          const loadAssets = async () => {
            if (navigator.onLine) {
              await mockAssetCache.cacheAssets();
              setAssetStatus('cached');
              setImageUrl('https://example.com/cached-image.jpg');
            } else {
              const hasAsset = await mockAssetCache.hasAsset(
                'https://example.com/cached-image.jpg',
              );
              if (hasAsset) {
                setAssetStatus('cached');
                setImageUrl('https://example.com/cached-image.jpg');
              } else {
                setAssetStatus('offline');
              }
            }
          };

          loadAssets();
        }, []);

        return (
          <div>
            <div data-testid="asset-status">{assetStatus}</div>
            <UnifiedQuoteCard
              quote={{
                ...offlineQuote,
                items: [
                  {
                    ...offlineQuote.items[0],
                    image_url: imageUrl,
                  },
                ],
              }}
              viewMode="customer"
              layout="detail"
            />
          </div>
        );
      };

      renderWithProviders(<OfflineAssetTest />);

      // Should cache assets when online
      await waitFor(() => {
        expect(screen.getByTestId('asset-status')).toHaveTextContent('cached');
      });

      expect(mockAssetCache.cacheAssets).toHaveBeenCalled();

      // Go offline and test asset serving
      act(() => {
        setNetworkStatus(false);
      });

      // Should still show cached assets
      expect(screen.getByTestId('asset-status')).toHaveTextContent('cached');
    });

    it('should handle asset loading fallbacks', async () => {
      const AssetFallbackTest = () => {
        const [imageError, setImageError] = React.useState(false);
        const [isOffline, setIsOffline] = React.useState(false);

        React.useEffect(() => {
          const handleOffline = () => setIsOffline(true);
          window.addEventListener('offline', handleOffline);
          return () => window.removeEventListener('offline', handleOffline);
        }, []);

        const handleImageError = () => {
          setImageError(true);
        };

        return (
          <div>
            <div data-testid="network-status">{isOffline ? 'offline' : 'online'}</div>
            <div data-testid="image-status">{imageError ? 'fallback' : 'original'}</div>
            <UnifiedQuoteCard
              quote={{
                ...offlineQuote,
                items: [
                  {
                    ...offlineQuote.items[0],
                    image_url: imageError
                      ? '/assets/fallback-image.jpg'
                      : 'https://example.com/image.jpg',
                  },
                ],
              }}
              viewMode="customer"
              layout="detail"
            />
            {/* Simulate image load error */}
            <img
              src="https://example.com/image.jpg"
              onError={handleImageError}
              style={{ display: 'none' }}
              data-testid="test-image"
            />
          </div>
        );
      };

      renderWithProviders(<AssetFallbackTest />);

      // Go offline
      act(() => {
        setNetworkStatus(false);
      });

      // Simulate image load error
      const testImage = screen.getByTestId('test-image');
      fireEvent.error(testImage);

      await waitFor(() => {
        expect(screen.getByTestId('image-status')).toHaveTextContent('fallback');
      });
    });
  });

  describe('Background Sync', () => {
    it('should register background sync when offline', async () => {
      const mockBackgroundSync = {
        register: vi.fn().mockResolvedValue(undefined),
        getTags: vi.fn().mockResolvedValue(['quote-sync']),
      };

      // Mock Background Sync API
      Object.defineProperty(mockServiceWorkerRegistration, 'sync', {
        value: mockBackgroundSync,
        configurable: true,
      });

      const BackgroundSyncTest = () => {
        const [syncRegistered, setSyncRegistered] = React.useState(false);

        React.useEffect(() => {
          const registerBackgroundSync = async () => {
            if (
              'serviceWorker' in navigator &&
              'sync' in window.ServiceWorkerRegistration.prototype
            ) {
              const registration = await navigator.serviceWorker.ready;
              await registration.sync.register('quote-sync');
              setSyncRegistered(true);
            }
          };

          if (!navigator.onLine) {
            registerBackgroundSync();
          }
        }, []);

        return (
          <div>
            <div data-testid="sync-registered">
              {syncRegistered ? 'registered' : 'not-registered'}
            </div>
            <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={vi.fn()} />
          </div>
        );
      };

      renderWithProviders(<BackgroundSyncTest />);

      // Go offline to trigger background sync registration
      act(() => {
        setNetworkStatus(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId('sync-registered')).toHaveTextContent('registered');
      });

      expect(mockBackgroundSync.register).toHaveBeenCalledWith('quote-sync');
    });
  });

  describe('Offline Error Handling', () => {
    it('should display appropriate error messages when offline', async () => {
      const OfflineErrorTest = () => {
        const [isOffline, setIsOffline] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          const handleOffline = () => {
            setIsOffline(true);
            setError('You are currently offline. Some features may not be available.');
          };

          const handleOnline = () => {
            setIsOffline(false);
            setError(null);
          };

          window.addEventListener('offline', handleOffline);
          window.addEventListener('online', handleOnline);

          return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
          };
        }, []);

        const handleAction = async () => {
          if (isOffline) {
            setError('This action requires an internet connection.');
          }
        };

        return (
          <div>
            {error && (
              <div data-testid="offline-error" className="bg-red-100 p-2">
                {error}
              </div>
            )}
            <UnifiedQuoteCard
              quote={offlineQuote}
              viewMode="customer"
              layout="detail"
              onAction={handleAction}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<OfflineErrorTest />);

      // Go offline
      act(() => {
        setNetworkStatus(false);
      });

      await waitFor(() => {
        expect(screen.getByTestId('offline-error')).toBeInTheDocument();
        expect(
          screen.getByText('You are currently offline. Some features may not be available.'),
        ).toBeInTheDocument();
      });

      // Try to perform an action while offline
      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(
          screen.getByText('This action requires an internet connection.'),
        ).toBeInTheDocument();
      });
    });

    it('should retry failed requests when coming back online', async () => {
      const mockRetryService = {
        addFailedRequest: vi.fn(),
        retryFailedRequests: vi.fn().mockResolvedValue({ retried: 2, failed: 0 }),
      };

      const RetryTest = () => {
        const [retryStatus, setRetryStatus] = React.useState<'idle' | 'retrying' | 'completed'>(
          'idle',
        );
        const [retriedCount, setRetriedCount] = React.useState(0);

        React.useEffect(() => {
          const handleOnline = async () => {
            setRetryStatus('retrying');

            const result = await mockRetryService.retryFailedRequests();
            setRetriedCount(result.retried);
            setRetryStatus('completed');
          };

          window.addEventListener('online', handleOnline);
          return () => window.removeEventListener('online', handleOnline);
        }, []);

        return (
          <div>
            <div data-testid="retry-status">{retryStatus}</div>
            <div data-testid="retried-count">{retriedCount}</div>
          </div>
        );
      };

      renderWithProviders(<RetryTest />);

      // Simulate coming back online
      act(() => {
        setNetworkStatus(true);
      });

      await waitFor(() => {
        expect(screen.getByTestId('retry-status')).toHaveTextContent('completed');
        expect(screen.getByTestId('retried-count')).toHaveTextContent('2');
      });

      expect(mockRetryService.retryFailedRequests).toHaveBeenCalled();
    });
  });
});
