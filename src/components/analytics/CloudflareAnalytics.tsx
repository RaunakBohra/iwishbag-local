import { useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * Cloudflare Web Analytics Component
 * 
 * Features:
 * - Privacy-first analytics (no cookies)
 * - Core Web Vitals tracking
 * - Real-time visitor insights
 * - Geographic distribution
 * - Page performance metrics
 */

interface CloudflareAnalyticsProps {
  token?: string; // Optional: Override default token
}

export const CloudflareAnalytics: React.FC<CloudflareAnalyticsProps> = ({ token }) => {
  useEffect(() => {
    // Get token from props or environment
    const analyticsToken = token || import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;
    
    if (!analyticsToken) {
      logger.warn('Cloudflare Analytics token not found');
      return;
    }

    // Only load in production
    if (import.meta.env.DEV) {
      logger.debug('Cloudflare Analytics disabled in development');
      return;
    }

    // Create and inject the analytics script
    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.defer = true;
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: analyticsToken }));
    
    // Add to head
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [token]);

  return null; // This component doesn't render anything
};

/**
 * Track custom events (for future use with Cloudflare Analytics API)
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Cloudflare Web Analytics doesn't support custom events yet
  // This is a placeholder for when they add this feature
  if (import.meta.env.DEV) {
    logger.debug('Analytics Event:', eventName, properties);
  }
};

/**
 * Track page views manually (useful for SPAs)
 */
export const trackPageView = (path?: string) => {
  // Cloudflare automatically tracks page views
  // This is for manual tracking if needed
  if (window.location && path) {
    window.history.pushState({}, '', path);
  }
};

export default CloudflareAnalytics;