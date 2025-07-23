// iwishBag Service Worker - Progressive Web App Features
// Version 1.0.0 - Unified Quote System

const CACHE_NAME = 'iwishbag-v1.0.0';
const STATIC_CACHE = 'iwishbag-static-v1.0.0';
const DYNAMIC_CACHE = 'iwishbag-dynamic-v1.0.0';
const API_CACHE = 'iwishbag-api-v1.0.0';

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
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('iwishbag-') && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
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
  
  // API requests - Cache First with Network Fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Static assets - Cache First
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // App shell and pages - Stale While Revalidate
  if (isAppShell(request)) {
    event.respondWith(handleAppShell(request));
    return;
  }
  
  // Default - Network First
  event.respondWith(handleDefault(request));
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

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
}

function isAppShell(request) {
  const url = new URL(request.url);
  return url.origin === location.origin && 
         (url.pathname === '/' || 
          url.pathname.startsWith('/dashboard') ||
          url.pathname.startsWith('/quote') ||
          url.pathname.startsWith('/track') ||
          url.pathname.startsWith('/admin'));
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

console.log('[SW] Service worker loaded successfully');