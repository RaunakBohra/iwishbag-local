import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Cloudflare Browser Insights
 * 
 * Tracks JavaScript errors and performance issues
 * Provides detailed debugging information in Cloudflare Dashboard
 */

export const CloudflareBrowserInsights: React.FC = () => {
  useEffect(() => {
    // Browser Insights is automatically injected by Cloudflare
    // when enabled in the dashboard - no script needed!
    
    // However, we can enhance error reporting
    const originalError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Log to our internal logger as well
      logger.error('Browser Error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      }, 'BrowserInsights');
      
      // Call original handler
      if (originalError) {
        return originalError.apply(this, arguments as any);
      }
      return false;
    };

    // Also catch unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      }, 'BrowserInsights');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Log performance metrics
    if ('performance' in window && 'PerformanceObserver' in window) {
      try {
        // Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            logger.debug('Performance Metric', {
              name: entry.name,
              value: Math.round(entry.startTime),
              type: entry.entryType
            }, 'Performance');
          }
        });

        // Observe various performance metrics
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // Some browsers don't support all metrics
        console.log('Performance Observer not fully supported');
      }
    }

    // Cleanup
    return () => {
      window.onerror = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
};

export default CloudflareBrowserInsights;