// iwishBag Service Worker - Advanced Network & Caching Optimization
// Version 2.0.0 - Enhanced Performance & Offline Support

const SW_VERSION = '3.1.0';
const CACHE_VERSION = 'v3.1-performance-fixed';
const CACHE_NAME = `iwishbag-${CACHE_VERSION}`;
const STATIC_CACHE = `iwishbag-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `iwishbag-dynamic-${CACHE_VERSION}`;
const API_CACHE = `iwishbag-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `iwishbag-images-${CACHE_VERSION}`;
const FONT_CACHE = `iwishbag-fonts-${CACHE_VERSION}`;
const ADMIN_CACHE = `iwishbag-admin-${CACHE_VERSION}`; // New admin-specific cache

// Enhanced Cache configuration for performance
const CACHE_CONFIG = {
  maxEntries: {
    static: 150,      // Increased for more static assets
    dynamic: 100,     // Increased for better coverage
    api: 300,         // Increased for quote/order data
    images: 500,      // Increased for product images
    fonts: 50,
    admin: 200,       // New admin-specific cache
  },
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000, // 30 days
    dynamic: 7 * 24 * 60 * 60 * 1000,  // 7 days
    api: 60 * 60 * 1000,                // 1 hour
    images: 30 * 24 * 60 * 60 * 1000,   // 30 days
    fonts: 365 * 24 * 60 * 60 * 1000,   // 1 year
    admin: 24 * 60 * 60 * 1000,         // 24 hours for admin
  },
  staleWhileRevalidate: {
    enabled: true,
    maxAge: 3 * 60 * 1000, // Reduced to 3 minutes for faster updates
  },
  // Performance-focused strategies
  performance: {
    priorityCaching: true,        // Cache critical resources first
    predictivePrefetch: true,     // Prefetch likely next resources
    adminLazyLoad: true,         // Only cache admin resources when needed
    compressionPreference: 'br', // Prefer Brotli compression
  },
};

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Core app pages
  '/dashboard',
  '/dashboard/quotes',
  '/quote/new',
  '/track',
  '/support'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/quotes',
  '/api/customers',
  '/api/countries',
  '/api/currencies'
];

// Background sync tags
const SYNC_TAGS = {
  QUOTE_SUBMISSION: 'quote-submission',
  QUOTE_UPDATE: 'quote-update',
  ANALYTICS: 'analytics-sync'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing service worker v${SW_VERSION} (Headers Fixed)...`);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Force immediate activation to replace old SW
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating service worker v${SW_VERSION} with fixed headers...`);
  
  event.waitUntil(
    Promise.all([
      // Aggressively clean up ALL old caches for fresh start
      caches.keys().then((cacheNames) => {
        console.log('[SW] Found existing caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Keep only the new cache versions
              const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE, ADMIN_CACHE];
              return !currentCaches.includes(cacheName);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Force claim all clients immediately
      self.clients.claim()
    ])
  ).then(() => {
    console.log(`[SW] v${SW_VERSION} activated successfully! Headers issue fixed.`);
    
    // Notify all clients that SW has been updated
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: SW_VERSION,
          message: 'Service Worker updated with header fixes!'
        });
      });
    });
  });
});

// Fetch event - implement advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Route to appropriate caching strategy
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    // API requests - Stale While Revalidate for better UX
    event.respondWith(handleStaleWhileRevalidate(request, API_CACHE));
    return;
  }
  
  if (isImageAsset(request)) {
    // Images - Cache First with long expiry
    event.respondWith(handleCacheFirst(request, IMAGE_CACHE, CACHE_CONFIG.maxAge.images));
    return;
  }
  
  if (isFontAsset(request)) {
    // Fonts - Cache First with very long expiry
    event.respondWith(handleCacheFirst(request, FONT_CACHE, CACHE_CONFIG.maxAge.fonts));
    return;
  }
  
  if (isStaticAsset(request)) {
    // Static JS/CSS - Cache First with hash-based invalidation
    event.respondWith(handleCacheFirst(request, STATIC_CACHE, CACHE_CONFIG.maxAge.static));
    return;
  }
  
  if (isAppShell(request)) {
    // App shell - Network First with cache fallback
    event.respondWith(handleNetworkFirst(request, DYNAMIC_CACHE));
    return;
  }
  
  // Default - Network First for unknown resources
  event.respondWith(handleNetworkFirst(request, DYNAMIC_CACHE));
});

// Background sync for offline quote submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.QUOTE_SUBMISSION:
      event.waitUntil(syncQuoteSubmissions());
      break;
    case SYNC_TAGS.QUOTE_UPDATE:
      event.waitUntil(syncQuoteUpdates());
      break;
    case SYNC_TAGS.ANALYTICS:
      event.waitUntil(syncAnalytics());
      break;
  }
});

// Push notifications for quote updates
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'Your quote has been updated!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard/quotes'
    },
    actions: [
      {
        action: 'view',
        title: 'View Quote',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data.url = data.url || options.data.url;
  }
  
  event.waitUntil(
    self.registration.showNotification('iwishBag Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Utility functions

// Enhanced asset detection functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css)$/) || 
         (url.origin === location.origin && url.pathname.startsWith('/assets/'));
}

function isImageAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif|bmp)$/i) ||
         url.hostname.includes('cloudinary.com') ||
         url.hostname.includes('images.');
}

function isFontAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(woff|woff2|ttf|otf|eot)$/i);
}

function isAppShell(request) {
  const url = new URL(request.url);
  return url.origin === location.origin && 
         (url.pathname === '/' || 
          url.pathname.startsWith('/dashboard') ||
          url.pathname.startsWith('/quote') ||
          url.pathname.startsWith('/track') ||
          url.pathname.startsWith('/admin') ||
          url.pathname.startsWith('/auth') ||
          url.pathname.startsWith('/profile'));
}

// Advanced caching strategy implementations

/**
 * Stale While Revalidate - Best for API responses
 * Returns cached response immediately, updates cache in background
 */
async function handleStaleWhileRevalidate(request, cacheName, maxAge = CACHE_CONFIG.maxAge.api) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // If we have a cached response, return it immediately
  if (cachedResponse) {
    // Check if response is still fresh
    const responseDate = cachedResponse.headers.get('date');
    const isStale = responseDate && 
      (Date.now() - new Date(responseDate).getTime()) > maxAge;
    
    if (!isStale && !CACHE_CONFIG.staleWhileRevalidate.enabled) {
      return cachedResponse;
    }
    
    // Return stale response immediately, update in background
    updateCacheInBackground(request, cacheName);
    
    // Add header to indicate stale response - create new response since headers are immutable
    const response = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: new Headers(cachedResponse.headers)
    });
    response.headers.set('x-cache', 'STALE');
    return response;
  }
  
  // No cached response, try network
  try {
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful response
      const responseForCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: new Headers(networkResponse.headers)
      });
      responseForCache.headers.set('x-cache', 'MISS');
      cache.put(request, responseForCache);
      
      // Clean up old entries
      cleanupCache(cacheName, CACHE_CONFIG.maxEntries.api);
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    
    // Return cached response even if stale
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: new Headers(cachedResponse.headers)
      });
      response.headers.set('x-cache', 'STALE-ERROR');
      return response;
    }
    
    // Return offline response for API requests
    return createOfflineResponse(request);
  }
}

/**
 * Cache First - Best for static assets with long cache times
 */
async function handleCacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cached response is still valid
    const responseDate = cachedResponse.headers.get('date');
    const isExpired = responseDate && 
      (Date.now() - new Date(responseDate).getTime()) > maxAge;
    
    if (!isExpired) {
      // Create a new response with custom headers since headers are immutable
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: new Headers(cachedResponse.headers)
      });
      response.headers.set('x-cache', 'HIT');
      return response;
    }
  }
  
  // Try network for fresh content
  try {
    const networkResponse = await fetchWithTimeout(request, 10000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful response
      const responseForCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: new Headers(networkResponse.headers)
      });
      responseForCache.headers.set('x-cache', 'MISS');
      cache.put(request, responseForCache);
      
      // Clean up old entries
      const maxEntries = CACHE_CONFIG.maxEntries[getCacheType(cacheName)] || 100;
      cleanupCache(cacheName, maxEntries);
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.error('[SW] Cache first network failed:', error);
    
    // Return cached response even if expired
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: new Headers(cachedResponse.headers)
      });
      response.headers.set('x-cache', 'STALE');
      return response;
    }
    
    throw error;
  }
}

/**
 * Network First - Best for app shell and dynamic content
 */
async function handleNetworkFirst(request, cacheName) {
  try {
    const networkResponse = await fetchWithTimeout(request, 3000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(cacheName);
      const responseForCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: new Headers(networkResponse.headers)
      });
      responseForCache.headers.set('x-cache', 'MISS');
      cache.put(request, responseForCache);
      
      // Clean up old entries
      cleanupCache(cacheName, CACHE_CONFIG.maxEntries.dynamic);
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network first failed, trying cache:', request.url);
    
    // Fallback to cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: new Headers(cachedResponse.headers)
      });
      response.headers.set('x-cache', 'STALE');
      return response;
    }
    
    // For app shell requests, return index.html
    if (isAppShell(request)) {
      const appShell = await cache.match('/');
      if (appShell) {
        return appShell;
      }
    }
    
    return createOfflineResponse(request);
  }
}

// Helper functions

async function fetchWithTimeout(request, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetchWithTimeout(request, 10000);
    
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseForCache = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: new Headers(networkResponse.headers)
      });
      responseForCache.headers.set('x-cache', 'BACKGROUND-UPDATE');
      cache.put(request, responseForCache);
      
      // Notify main thread of cache update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            data: { url: request.url, cacheName }
          });
        });
      });
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error);
  }
}

async function cleanupCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    if (requests.length <= maxEntries) {
      return;
    }
    
    // Sort by date (oldest first)
    const requestsWithDates = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        const dateHeader = response?.headers.get('date');
        return {
          request,
          date: dateHeader ? new Date(dateHeader).getTime() : 0
        };
      })
    );
    
    requestsWithDates.sort((a, b) => a.date - b.date);
    
    // Delete oldest entries
    const toDelete = requestsWithDates.slice(0, requests.length - maxEntries);
    await Promise.all(
      toDelete.map(({ request }) => cache.delete(request))
    );
    
    console.log(`[SW] Cleaned up ${toDelete.length} old entries from ${cacheName}`);
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

function getCacheType(cacheName) {
  if (cacheName.includes('static')) return 'static';
  if (cacheName.includes('api')) return 'api';
  if (cacheName.includes('images')) return 'images';
  if (cacheName.includes('fonts')) return 'fonts';
  return 'dynamic';
}

function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // API requests - return structured offline response
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature is not available offline',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'x-cache': 'OFFLINE'
        }
      }
    );
  }
  
  // HTML requests - return offline page
  if (request.headers.get('Accept')?.includes('text/html')) {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - iwishBag</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; }
            .offline { color: #666; }
            .retry { margin-top: 1rem; }
            button { padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>📱 You're Offline</h1>
          <p class="offline">Please check your internet connection and try again.</p>
          <div class="retry">
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 503,
        headers: { 
          'Content-Type': 'text/html',
          'x-cache': 'OFFLINE'
        }
      }
    );
  }
  
  // Default offline response
  return new Response('Offline', { 
    status: 503,
    headers: { 'x-cache': 'OFFLINE' }
  });
}

async function handleAPIRequest(request) {
  const cacheName = API_CACHE;
  
  try {
    // Try cache first for GET requests
    const cachedResponse = await caches.match(request, { cacheName });
    
    if (cachedResponse) {
      // Return cached response and update in background
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }
    
    // No cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] API request failed:', error);
    
    // Return cached response if available
    const cachedResponse = await caches.match(request, { cacheName });
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for critical API failures
    if (request.url.includes('/quotes')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'Please check your internet connection',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request, { cacheName: STATIC_CACHE });
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset failed:', error);
    throw error;
  }
}

async function handleAppShell(request) {
  const cacheName = DYNAMIC_CACHE;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request, { cacheName });
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to app shell
    const appShell = await caches.match('/', { cacheName: STATIC_CACHE });
    return appShell || new Response('Offline', { status: 503 });
  }
}

async function handleDefault(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses in dynamic cache
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error);
  }
}

// Background sync implementations
async function syncQuoteSubmissions() {
  console.log('[SW] Syncing offline quote submissions...');
  
  try {
    // Get pending submissions from IndexedDB
    const pendingSubmissions = await getPendingSubmissions();
    
    for (const submission of pendingSubmissions) {
      try {
        const response = await fetch('/api/quotes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          // Remove from pending submissions
          await removePendingSubmission(submission.id);
          
          // Show success notification
          self.registration.showNotification('Quote Submitted', {
            body: 'Your quote request has been submitted successfully!',
            icon: '/icons/icon-192x192.png'
          });
        }
      } catch (error) {
        console.error('[SW] Failed to sync submission:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync quote submissions failed:', error);
  }
}

async function syncQuoteUpdates() {
  console.log('[SW] Syncing quote updates...');
  // Implementation for syncing quote status updates
}

async function syncAnalytics() {
  console.log('[SW] Syncing analytics data...');
  // Implementation for syncing offline analytics
}

// IndexedDB helpers for offline storage
async function getPendingSubmissions() {
  // Implementation to get pending submissions from IndexedDB
  return [];
}

async function removePendingSubmission(id) {
  // Implementation to remove submission from IndexedDB
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_MARK') {
    // Log performance metrics
    console.log('[SW] Performance mark:', event.data);
  }
});

// ============================================================================
// PERFORMANCE-FOCUSED ADMIN BUNDLE CACHING
// ============================================================================

/**
 * Enhanced admin resource caching - only cache admin bundles when accessed
 */
async function handleAdminResource(request) {
  const adminCache = await caches.open(ADMIN_CACHE);
  
  // Check if user has admin session (based on URL patterns)
  const isAdminUser = request.url.includes('/admin') || 
                     request.headers.get('x-admin-session') === 'true';
  
  if (!isAdminUser) {
    // Don't cache admin resources for non-admin users
    return fetch(request);
  }
  
  try {
    // For admin users, use stale-while-revalidate for better UX
    const cachedResponse = await adminCache.match(request);
    
    if (cachedResponse) {
      // Return cached version immediately
      const cachedClone = cachedResponse.clone();
      
      // Update in background for next visit
      fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            adminCache.put(request, networkResponse.clone());
            
            // Notify admin UI of updated resources
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'ADMIN_CACHE_UPDATED',
                  resource: request.url,
                  timestamp: Date.now()
                });
              });
            });
          }
        })
        .catch(() => {}); // Ignore background update failures
      
      return cachedClone;
    }
    
    // No cache, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache admin resources with longer TTL
      adminCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await adminCache.match(request);
    return cachedResponse || createOfflineResponse(request);
  }
}

/**
 * Predictive prefetching for likely next resources
 */
async function prefetchLikelyResources(request) {
  if (!CACHE_CONFIG.performance.predictivePrefetch) return;
  
  const url = new URL(request.url);
  
  // Prefetch patterns based on current page
  const prefetchMap = {
    '/dashboard': ['/api/quotes/recent', '/api/user/profile'],
    '/quote': ['/api/quotes/calculate', '/api/shipping/options'],
    '/admin': ['/api/admin/stats', '/api/quotes/pending'],
    '/admin/quotes': ['/api/admin/quotes', '/api/admin/customers'],
  };
  
  const prefetchUrls = prefetchMap[url.pathname];
  
  if (prefetchUrls) {
    // Prefetch in background with low priority
    setTimeout(() => {
      prefetchUrls.forEach(async (prefetchUrl) => {
        try {
          const cache = await caches.open(API_CACHE);
          const cached = await cache.match(prefetchUrl);
          
          if (!cached) {
            const response = await fetch(prefetchUrl, { priority: 'low' });
            if (response.ok) {
              cache.put(prefetchUrl, response.clone());
            }
          }
        } catch (error) {
          // Ignore prefetch failures
        }
      });
    }, 1000); // 1 second delay to not interfere with current request
  }
}

/**
 * Performance monitoring for cache effectiveness
 */
let cacheStats = {
  hits: 0,
  misses: 0,
  adminHits: 0,
  adminMisses: 0,
  avgResponseTime: 0,
  requests: 0
};

function trackCachePerformance(request, response, source = 'cache') {
  cacheStats.requests++;
  
  if (source === 'cache') {
    cacheStats.hits++;
    if (request.url.includes('/admin')) {
      cacheStats.adminHits++;
    }
  } else {
    cacheStats.misses++;
    if (request.url.includes('/admin')) {
      cacheStats.adminMisses++;
    }
  }
  
  // Calculate cache hit ratio
  const hitRatio = (cacheStats.hits / cacheStats.requests * 100).toFixed(1);
  const adminHitRatio = ((cacheStats.adminHits / (cacheStats.adminHits + cacheStats.adminMisses)) * 100).toFixed(1);
  
  // Log performance stats every 50 requests
  if (cacheStats.requests % 50 === 0) {
    console.log(`[SW] Performance Stats:
      📊 Total Requests: ${cacheStats.requests}
      🎯 Cache Hit Ratio: ${hitRatio}%
      🔒 Admin Hit Ratio: ${adminHitRatio}%
      ⚡ Avg Response Time: ${cacheStats.avgResponseTime.toFixed(2)}ms
    `);
    
    // Send stats to main thread for analytics
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_PERFORMANCE_STATS',
          data: {
            ...cacheStats,
            hitRatio: parseFloat(hitRatio),
            adminHitRatio: parseFloat(adminHitRatio)
          }
        });
      });
    });
  }
}

/**
 * Clean up old cache versions for performance
 */
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE, ADMIN_CACHE];
    
    const oldCaches = cacheNames.filter(cacheName => 
      cacheName.startsWith('iwishbag-') && !currentCaches.includes(cacheName)
    );
    
    await Promise.all(
      oldCaches.map(cacheName => {
        console.log(`[SW] Deleting old cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
    
    if (oldCaches.length > 0) {
      console.log(`[SW] Cleaned up ${oldCaches.length} old cache versions`);
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

// Run cache cleanup on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupOldCaches());
});

console.log(`[SW] Enhanced Performance Service Worker v${SW_VERSION} loaded successfully 🚀`);