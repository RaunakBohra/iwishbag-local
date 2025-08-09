/**
 * Advanced Service Worker Management System
 * 
 * Provides intelligent service worker registration, lifecycle management,
 * and performance monitoring for optimal caching strategies.
 */

interface ServiceWorkerConfig {
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  cacheStrategy: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
  maxCacheSize: number;
  updateInterval: number;
}

interface PerformanceMetrics {
  cacheHitRatio: number;
  averageResponseTime: number;
  offlineRequests: number;
  backgroundSyncQueue: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateAvailable = false;
  private metrics: PerformanceMetrics = {
    cacheHitRatio: 0,
    averageResponseTime: 0,
    offlineRequests: 0,
    backgroundSyncQueue: 0,
  };

  constructor(config: Partial<ServiceWorkerConfig> = {}) {
    this.config = {
      enableBackgroundSync: true,
      enablePushNotifications: false, // Start disabled for privacy
      cacheStrategy: 'staleWhileRevalidate',
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      updateInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config,
    };
  }

  /**
   * Initialize and register the service worker
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('🚫 Service Worker not supported in this browser');
      return false;
    }

    try {
      await this.registerServiceWorker();
      this.setupEventListeners();
      this.setupPerformanceMonitoring();
      this.scheduleUpdateChecks();
      
      console.log('✅ Service Worker Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Service Worker Manager initialization failed:', error);
      return false;
    }
  }

  private isSupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('🔧 Service Worker registered:', this.registration.scope);

      // Handle different states
      if (this.registration.installing) {
        console.log('📦 Service Worker installing...');
        this.trackInstalling(this.registration.installing);
      } else if (this.registration.waiting) {
        console.log('⏳ Service Worker waiting to activate...');
        this.updateAvailable = true;
      } else if (this.registration.active) {
        console.log('✅ Service Worker active and running');
      }
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for new service worker installations
    this.registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      const newWorker = this.registration!.installing;
      if (newWorker) {
        this.trackInstalling(newWorker);
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed - reloading...');
      window.location.reload();
    });
  }

  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          console.log('🆕 Service Worker update available');
          this.updateAvailable = true;
          this.notifyUpdateAvailable();
        } else {
          // First install
          console.log('🎉 Service Worker installed for the first time');
          this.notifyInstallComplete();
        }
      } else if (worker.state === 'activated') {
        console.log('✅ Service Worker activated');
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor cache performance
    this.monitorCachePerformance();
    
    // Monitor network requests
    this.monitorNetworkRequests();
    
    // Report metrics periodically
    setInterval(() => {
      this.reportMetrics();
    }, 60000); // Every minute
  }

  private monitorCachePerformance(): void {
    // Intercept fetch events to track cache hits/misses
    const originalFetch = window.fetch;
    let totalRequests = 0;
    let cacheHits = 0;
    let totalResponseTime = 0;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      totalRequests++;

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        totalResponseTime += responseTime;

        // Check if response came from cache
        if (response.headers.get('x-cache') === 'HIT' || 
            response.type === 'opaque' ||
            responseTime < 50) { // Likely from cache if very fast
          cacheHits++;
        }

        // Update metrics
        this.metrics.cacheHitRatio = cacheHits / totalRequests;
        this.metrics.averageResponseTime = totalResponseTime / totalRequests;

        return response;
      } catch (error) {
        if (!navigator.onLine) {
          this.metrics.offlineRequests++;
        }
        throw error;
      }
    };
  }

  private monitorNetworkRequests(): void {
    // Monitor network status
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Network connection lost - offline mode active');
    });
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('📦 Cache updated:', data);
        break;
      case 'BACKGROUND_SYNC_SUCCESS':
        console.log('🔄 Background sync completed:', data);
        break;
      case 'BACKGROUND_SYNC_FAILED':
        console.error('❌ Background sync failed:', data);
        break;
      case 'PERFORMANCE_METRICS':
        this.updateMetrics(data);
        break;
      default:
        console.log('📨 Service Worker message:', event.data);
    }
  }

  /**
   * Update the service worker to the latest version
   */
  async updateServiceWorker(): Promise<boolean> {
    if (!this.registration?.waiting) {
      console.log('ℹ️ No service worker update waiting');
      return false;
    }

    try {
      // Tell the waiting service worker to skip waiting and become active
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      console.log('🔄 Service Worker update initiated');
      return true;
    } catch (error) {
      console.error('❌ Service Worker update failed:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('🗑️ All caches cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Get cache usage statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    cacheCount: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      let oldestEntry: Date | null = null;
      let newestEntry: Date | null = null;
      let entryCount = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const date = new Date(dateHeader);
              if (!oldestEntry || date < oldestEntry) {
                oldestEntry = date;
              }
              if (!newestEntry || date > newestEntry) {
                newestEntry = date;
              }
            }
            
            // Estimate size (rough approximation)
            const blob = await response.blob();
            totalSize += blob.size;
            entryCount++;
          }
        }
      }

      return {
        totalSize,
        cacheCount: entryCount,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return {
        totalSize: 0,
        cacheCount: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Schedule background data sync
   */
  scheduleBackgroundSync(tag: string, data?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.registration?.sync) {
        reject(new Error('Background Sync not supported'));
        return;
      }

      // Store data for sync if provided
      if (data) {
        this.storeDataForSync(tag, data);
      }

      this.registration.sync.register(tag)
        .then(() => {
          console.log(`📅 Background sync scheduled: ${tag}`);
          this.metrics.backgroundSyncQueue++;
          resolve();
        })
        .catch(reject);
    });
  }

  private async storeDataForSync(tag: string, data: any): Promise<void> {
    // Store in IndexedDB for background sync
    const request = indexedDB.open('iwishbag-sync', 1);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['sync-data'], 'readwrite');
        const store = transaction.objectStore('sync-data');
        
        store.put({
          tag,
          data,
          timestamp: Date.now(),
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('sync-data', { keyPath: 'tag' });
      };
    });
  }

  private async syncOfflineData(): Promise<void> {
    // Trigger background sync for any pending data
    try {
      await this.scheduleBackgroundSync('offline-data-sync');
    } catch (error) {
      console.error('❌ Failed to sync offline data:', error);
    }
  }

  private scheduleUpdateChecks(): void {
    // Check for updates periodically
    setInterval(async () => {
      if (this.registration) {
        try {
          await this.registration.update();
          console.log('🔍 Service Worker update check completed');
        } catch (error) {
          console.error('❌ Service Worker update check failed:', error);
        }
      }
    }, this.config.updateInterval);
  }

  private updateMetrics(data: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...data };
  }

  private reportMetrics(): void {
    if (import.meta.env.DEV) {
      console.group('📊 Service Worker Performance Metrics');
      console.log('Cache Hit Ratio:', `${(this.metrics.cacheHitRatio * 100).toFixed(1)}%`);
      console.log('Average Response Time:', `${this.metrics.averageResponseTime.toFixed(0)}ms`);
      console.log('Offline Requests:', this.metrics.offlineRequests);
      console.log('Background Sync Queue:', this.metrics.backgroundSyncQueue);
      console.groupEnd();
    }

    // Send metrics to service worker for potential syncing
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'PERFORMANCE_METRICS',
        data: this.metrics,
      });
    }
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('sw-update-available', {
      detail: { updateServiceWorker: () => this.updateServiceWorker() }
    }));
  }

  private notifyInstallComplete(): void {
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('sw-install-complete'));
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if an update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Get service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Unregister service worker (for debugging)
   */
  async unregister(): Promise<boolean> {
    if (this.registration) {
      try {
        const result = await this.registration.unregister();
        console.log('🗑️ Service Worker unregistered');
        return result;
      } catch (error) {
        console.error('❌ Service Worker unregistration failed:', error);
        return false;
      }
    }
    return false;
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager({
  enableBackgroundSync: true,
  enablePushNotifications: false, // Will be enabled based on user consent
  cacheStrategy: 'staleWhileRevalidate',
  maxCacheSize: 50 * 1024 * 1024, // 50MB
});

// Auto-initialize if supported
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  serviceWorkerManager.initialize().then((success) => {
    if (success) {
      console.log('🚀 Service Worker Manager ready');
    }
  });
}

export default serviceWorkerManager;