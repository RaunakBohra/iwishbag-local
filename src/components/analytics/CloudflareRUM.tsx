/**
 * Cloudflare Real User Monitoring (RUM) Component
 * 
 * Tracks Core Web Vitals and user experience metrics
 * Provides detailed performance insights
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

// RUM configuration
const RUM_CONFIG = {
  // Sample rate (percentage of sessions to track)
  sampleRate: 100,
  
  // Custom dimensions
  dimensions: {
    app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE,
    user_type: 'guest', // Will be updated based on auth
  },
  
  // Performance thresholds
  thresholds: {
    lcp: 2500, // Largest Contentful Paint
    fid: 100,  // First Input Delay
    cls: 0.1,  // Cumulative Layout Shift
    ttfb: 800, // Time to First Byte
  },
};

declare global {
  interface Window {
    __cfRUM?: any;
    CF_BEACON_DATA?: {
      token: string;
      rum?: boolean;
    };
  }
}

export function CloudflareRUM() {
  useEffect(() => {
    // Initialize RUM
    initializeRUM();
    
    // Track custom metrics
    trackCustomMetrics();
    
    // Monitor Core Web Vitals
    monitorCoreWebVitals();
    
    // Track user interactions
    trackUserInteractions();
    
    // Monitor API performance
    monitorAPIPerformance();
    
  }, []);
  
  return null;
}

/**
 * Initialize Cloudflare RUM
 */
function initializeRUM() {
  // Check if already initialized
  if (window.__cfRUM) {
    logger.info('Cloudflare RUM already initialized', null, 'RUM');
    return;
  }
  
  // Create RUM script
  const script = document.createElement('script');
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.defer = true;
  
  // Configure RUM
  window.CF_BEACON_DATA = {
    token: import.meta.env.VITE_CLOUDFLARE_RUM_TOKEN || '',
    rum: true,
  };
  
  // Add custom RUM configuration
  script.onload = () => {
    if (window.__cfRUM) {
      // Set custom dimensions
      window.__cfRUM.setDimension('app_version', RUM_CONFIG.dimensions.app_version);
      window.__cfRUM.setDimension('environment', RUM_CONFIG.dimensions.environment);
      
      // Set user type based on auth
      const userType = localStorage.getItem('sb-auth-token') ? 'authenticated' : 'guest';
      window.__cfRUM.setDimension('user_type', userType);
      
      logger.info('Cloudflare RUM initialized', RUM_CONFIG, 'RUM');
    }
  };
  
  document.head.appendChild(script);
}

/**
 * Track custom application metrics
 */
function trackCustomMetrics() {
  // Track page load performance
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const ttfb = perfData.responseStart - perfData.navigationStart;
      const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      
      // Send custom metrics
      if (window.__cfRUM) {
        window.__cfRUM.trackMetric('page_load_time', pageLoadTime);
        window.__cfRUM.trackMetric('ttfb', ttfb);
        window.__cfRUM.trackMetric('dom_ready', domReady);
      }
      
      // Log performance data
      logger.info('Page performance metrics', {
        pageLoadTime,
        ttfb,
        domReady,
        exceeds_ttfb_threshold: ttfb > RUM_CONFIG.thresholds.ttfb,
      }, 'RUM');
    });
  }
}

/**
 * Monitor Core Web Vitals
 */
function monitorCoreWebVitals() {
  // Use PerformanceObserver for Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const lcp = lastEntry.startTime;
      
      if (window.__cfRUM) {
        window.__cfRUM.trackMetric('lcp', lcp);
      }
      
      if (lcp > RUM_CONFIG.thresholds.lcp) {
        logger.warn('LCP exceeds threshold', { lcp, threshold: RUM_CONFIG.thresholds.lcp }, 'RUM');
      }
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }
    
    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        
        if (window.__cfRUM) {
          window.__cfRUM.trackMetric('fid', fid);
        }
        
        if (fid > RUM_CONFIG.thresholds.fid) {
          logger.warn('FID exceeds threshold', { fid, threshold: RUM_CONFIG.thresholds.fid }, 'RUM');
        }
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }
    
    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      
      if (window.__cfRUM) {
        window.__cfRUM.trackMetric('cls', clsValue);
      }
      
      if (clsValue > RUM_CONFIG.thresholds.cls) {
        logger.warn('CLS exceeds threshold', { cls: clsValue, threshold: RUM_CONFIG.thresholds.cls }, 'RUM');
      }
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }
  }
}

/**
 * Track user interactions
 */
function trackUserInteractions() {
  // Track clicks on important elements
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Track button clicks
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      const button = target.closest('button');
      const action = button?.getAttribute('data-action') || button?.textContent?.trim() || 'unknown';
      
      if (window.__cfRUM) {
        window.__cfRUM.trackEvent('button_click', { action });
      }
    }
    
    // Track navigation clicks
    if (target.tagName === 'A' || target.closest('a')) {
      const link = target.closest('a');
      const href = link?.getAttribute('href') || 'unknown';
      
      if (window.__cfRUM) {
        window.__cfRUM.trackEvent('navigation_click', { href });
      }
    }
  });
  
  // Track form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    const formName = form.getAttribute('name') || form.getAttribute('id') || 'unknown';
    
    if (window.__cfRUM) {
      window.__cfRUM.trackEvent('form_submit', { form: formName });
    }
  });
  
  // Track search interactions
  const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i]');
  searchInputs.forEach(input => {
    input.addEventListener('change', (event) => {
      const searchTerm = (event.target as HTMLInputElement).value;
      
      if (window.__cfRUM && searchTerm) {
        window.__cfRUM.trackEvent('search', { term_length: searchTerm.length });
      }
    });
  });
}

/**
 * Monitor API performance
 */
function monitorAPIPerformance() {
  // Intercept fetch requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = performance.now() - startTime;
      
      // Track API performance
      if (window.__cfRUM) {
        const endpoint = new URL(url, window.location.origin).pathname;
        window.__cfRUM.trackMetric('api_response_time', duration, {
          endpoint,
          status: response.status,
          method: args[1]?.method || 'GET',
        });
      }
      
      // Log slow APIs
      if (duration > 1000) {
        logger.warn('Slow API response', {
          url,
          duration,
          status: response.status,
        }, 'RUM');
      }
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track API errors
      if (window.__cfRUM) {
        window.__cfRUM.trackEvent('api_error', {
          url,
          duration,
          error: error.message,
        });
      }
      
      throw error;
    }
  };
}

/**
 * Track custom business metrics
 */
export function trackBusinessMetric(metric: string, value: number, dimensions?: Record<string, any>) {
  if (window.__cfRUM) {
    window.__cfRUM.trackMetric(metric, value, dimensions);
  }
}

/**
 * Track custom events
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (window.__cfRUM) {
    window.__cfRUM.trackEvent(event, properties);
  }
}

/**
 * Set user ID for tracking
 */
export function setRUMUser(userId: string) {
  if (window.__cfRUM) {
    window.__cfRUM.setDimension('user_id', userId);
  }
}

/**
 * Track page views
 */
export function trackPageView(page: string, properties?: Record<string, any>) {
  if (window.__cfRUM) {
    window.__cfRUM.trackEvent('page_view', {
      page,
      ...properties,
    });
  }
}