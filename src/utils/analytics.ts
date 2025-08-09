/**
 * Comprehensive Analytics Integration System
 * 
 * Integrates Google Analytics 4, Facebook Pixel, Cloudflare Analytics,
 * and custom performance tracking for business intelligence.
 */

// Analytics configuration interface
interface AnalyticsConfig {
  ga4MeasurementId?: string;
  facebookPixelId?: string;
  cloudflareToken?: string;
  enableDebug?: boolean;
}

// Ecommerce event types
interface EcommerceEvent {
  event_name: 'purchase' | 'begin_checkout' | 'add_to_cart' | 'view_item' | 'remove_from_cart' | 'add_payment_info';
  currency: string;
  value: number;
  items: Array<{
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    price: number;
  }>;
  transaction_id?: string;
}

// User engagement events
interface EngagementEvent {
  event_name: 'quote_requested' | 'quote_approved' | 'quote_rejected' | 'user_registration' | 'page_view';
  page_title?: string;
  page_location?: string;
  quote_id?: string;
  quote_value?: number;
  user_type?: 'new' | 'returning' | 'admin';
}

class AnalyticsManager {
  private config: AnalyticsConfig;
  private initialized = false;
  private debug = false;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.debug = config.enableDebug || import.meta.env.DEV;
  }

  /**
   * Initialize all analytics services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize Google Analytics 4
      if (this.config.ga4MeasurementId) {
        await this.initializeGA4();
        this.log('✅ Google Analytics 4 initialized');
      }

      // Initialize Facebook Pixel
      if (this.config.facebookPixelId) {
        await this.initializeFacebookPixel();
        this.log('✅ Facebook Pixel initialized');
      }

      // Initialize Cloudflare Analytics (already configured via token)
      if (this.config.cloudflareToken) {
        this.initializeCloudflareAnalytics();
        this.log('✅ Cloudflare Analytics active');
      }

      // Initialize custom performance tracking
      this.initializePerformanceTracking();
      this.log('✅ Performance tracking initialized');

      this.initialized = true;
      this.log('🎉 All analytics services initialized successfully');
      
      // Track initial page view
      this.trackPageView();

    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  /**
   * Initialize Google Analytics 4
   */
  private async initializeGA4(): Promise<void> {
    const measurementId = this.config.ga4MeasurementId!;
    
    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    return new Promise((resolve) => {
      script.onload = () => {
        // @ts-ignore
        window.dataLayer = window.dataLayer || [];
        // @ts-ignore
        function gtag(...args: any[]) { window.dataLayer.push(args); }
        // @ts-ignore
        window.gtag = gtag;
        
        // @ts-ignore
        gtag('js', new Date());
        
        // Configure GA4 with enhanced ecommerce
        // @ts-ignore
        gtag('config', measurementId, {
          // Enhanced ecommerce settings
          send_page_view: false, // We'll handle page views manually
          allow_google_signals: true,
          allow_ad_personalization_signals: true,
          
          // Custom dimensions for iwishBag
          custom_map: {
            'custom_dimension_1': 'user_type',      // new, returning, admin
            'custom_dimension_2': 'quote_status',    // sent, approved, paid
            'custom_dimension_3': 'destination_country', // IN, NP
            'custom_dimension_4': 'origin_country',  // US, UK, etc
          }
        });
        
        resolve();
      };
    });
  }

  /**
   * Initialize Facebook Pixel
   */
  private async initializeFacebookPixel(): Promise<void> {
    const pixelId = this.config.facebookPixelId!;
    
    // Facebook Pixel initialization code
    // @ts-ignore
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    // @ts-ignore
    fbq('init', pixelId);
    // @ts-ignore
    fbq('track', 'PageView');
  }

  /**
   * Initialize Cloudflare Analytics (passive - already loaded via script tag)
   */
  private initializeCloudflareAnalytics(): void {
    // Cloudflare Analytics is already active via the beacon script
    // We can enhance it by sending custom events if needed
    if (typeof window !== 'undefined' && 'cf' in window) {
      this.log('Cloudflare Analytics is active');
    }
  }

  /**
   * Initialize custom performance tracking
   */
  private initializePerformanceTracking(): void {
    // Listen for Core Web Vitals
    this.trackCoreWebVitals();
    
    // Track custom performance metrics
    this.trackCustomPerformance();
  }

  /**
   * Track page views across all platforms
   */
  trackPageView(page_title?: string, page_location?: string): void {
    const title = page_title || document.title;
    const location = page_location || window.location.href;

    // Google Analytics 4
    if (this.config.ga4MeasurementId && window.gtag) {
      // @ts-ignore
      gtag('event', 'page_view', {
        page_title: title,
        page_location: location,
        user_type: this.getUserType(),
        destination_country: this.getDestinationCountry(),
      });
    }

    // Facebook Pixel
    if (this.config.facebookPixelId && window.fbq) {
      // @ts-ignore
      fbq('track', 'PageView');
    }

    this.log(`📄 Page view tracked: ${title}`);
  }

  /**
   * Track ecommerce events
   */
  trackEcommerce(event: EcommerceEvent): void {
    // Google Analytics 4 Enhanced Ecommerce
    if (this.config.ga4MeasurementId && window.gtag) {
      // @ts-ignore
      gtag('event', event.event_name, {
        currency: event.currency,
        value: event.value,
        items: event.items,
        transaction_id: event.transaction_id,
      });
    }

    // Facebook Pixel ecommerce events
    if (this.config.facebookPixelId && window.fbq) {
      const fbEventMap = {
        'purchase': 'Purchase',
        'begin_checkout': 'InitiateCheckout',
        'add_to_cart': 'AddToCart',
        'view_item': 'ViewContent',
        'add_payment_info': 'AddPaymentInfo'
      };

      const fbEvent = fbEventMap[event.event_name];
      if (fbEvent) {
        // @ts-ignore
        fbq('track', fbEvent, {
          value: event.value,
          currency: event.currency,
          content_ids: event.items.map(item => item.item_id),
          content_type: 'product',
          num_items: event.items.reduce((sum, item) => sum + item.quantity, 0)
        });
      }
    }

    this.log(`💰 Ecommerce event tracked: ${event.event_name} - ${event.value} ${event.currency}`);
  }

  /**
   * Track custom business events
   */
  trackEngagement(event: EngagementEvent): void {
    // Google Analytics 4
    if (this.config.ga4MeasurementId && window.gtag) {
      const eventData: any = {
        event_category: 'engagement',
        event_label: event.event_name,
      };

      // Add custom parameters based on event type
      if (event.quote_id) eventData.quote_id = event.quote_id;
      if (event.quote_value) eventData.value = event.quote_value;
      if (event.user_type) eventData.user_type = event.user_type;

      // @ts-ignore
      gtag('event', event.event_name, eventData);
    }

    // Facebook Pixel custom events
    if (this.config.facebookPixelId && window.fbq) {
      const eventData: any = {};
      
      if (event.quote_value) {
        eventData.value = event.quote_value;
        eventData.currency = 'USD'; // Default currency for FB
      }

      // @ts-ignore
      fbq('trackCustom', event.event_name, eventData);
    }

    this.log(`📈 Engagement event tracked: ${event.event_name}`);
  }

  /**
   * Track Core Web Vitals for performance monitoring
   */
  private trackCoreWebVitals(): void {
    // Track FCP, LCP, FID, CLS when available
    if ('web-vitals' in window) return; // Already loaded

    // Simple Core Web Vitals tracking
    const trackMetric = (name: string, value: number) => {
      if (this.config.ga4MeasurementId && window.gtag) {
        // @ts-ignore
        gtag('event', name, {
          event_category: 'Web Vitals',
          value: Math.round(value),
          non_interaction: true,
        });
      }

      this.log(`⚡ ${name}: ${value.toFixed(2)}`);
    };

    // Track FCP
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          trackMetric('FCP', entry.startTime);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      // Silently handle unsupported browsers
    }
  }

  /**
   * Track custom performance metrics
   */
  private trackCustomPerformance(): void {
    // Track bundle loading performance
    setTimeout(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationEntry && this.config.ga4MeasurementId && window.gtag) {
        // @ts-ignore
        gtag('event', 'page_load_time', {
          event_category: 'Performance',
          value: Math.round(navigationEntry.loadEventEnd - navigationEntry.fetchStart),
          non_interaction: true,
        });
      }
    }, 1000);
  }

  /**
   * Get user type for segmentation
   */
  private getUserType(): string {
    // Check if user is admin
    if (localStorage.getItem('isAdmin') === 'true') return 'admin';
    
    // Check if user is authenticated
    if (localStorage.getItem('supabase.auth.token')) return 'returning';
    
    return 'new';
  }

  /**
   * Get destination country for analytics
   */
  private getDestinationCountry(): string {
    // Try to get from user profile or localStorage
    return localStorage.getItem('userCountry') || 'unknown';
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[Analytics] ${message}`);
    }
  }
}

// Create global analytics instance
const analyticsConfig: AnalyticsConfig = {
  ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID,
  facebookPixelId: import.meta.env.VITE_FACEBOOK_PIXEL_ID,
  cloudflareToken: import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN,
  enableDebug: import.meta.env.DEV,
};

export const analytics = new AnalyticsManager(analyticsConfig);

// Export for use in components
export { AnalyticsManager, type EcommerceEvent, type EngagementEvent };

// Declare global types for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}