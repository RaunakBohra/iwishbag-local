/**
 * Advanced Resource Preloader & Prefetcher
 * 
 * Implements intelligent preloading strategies based on user behavior,
 * connection quality, and performance metrics for optimal loading experience.
 */

interface PreloadConfig {
  priority: 'high' | 'medium' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
  fetchPriority?: 'high' | 'low' | 'auto';
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'document';
  type?: string;
  media?: string;
  sizes?: string;
}

interface ResourceMetrics {
  loadTime: number;
  size: number;
  cacheHit: boolean;
  priority: string;
  timestamp: number;
}

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private prefetchedResources = new Set<string>();
  private resourceMetrics = new Map<string, ResourceMetrics>();
  private connectionInfo: ConnectionInfo | null = null;
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initializeConnectionMonitoring();
    this.initializeIntersectionObserver();
  }

  private initializeConnectionMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };

      connection.addEventListener('change', () => {
        this.connectionInfo = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
        this.adjustPreloadingBehavior();
      });
    }
  }

  private initializeIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              this.handleElementInView(element);
            }
          });
        },
        {
          root: null,
          rootMargin: '50px',
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * Preload critical resources with high priority
   */
  async preloadCritical(resources: Array<{
    href: string;
    as: 'script' | 'style' | 'image' | 'font';
    type?: string;
    crossOrigin?: boolean;
  }>): Promise<void> {
    const promises = resources.map((resource) => 
      this.preloadResource(resource.href, {
        priority: 'high',
        as: resource.as,
        type: resource.type,
        crossOrigin: resource.crossOrigin ? 'anonymous' : undefined,
        fetchPriority: 'high',
      })
    );

    await Promise.allSettled(promises);
    console.log(`🚀 Preloaded ${resources.length} critical resources`);
  }

  /**
   * Preload route-specific resources
   */
  async preloadRoute(route: string): Promise<void> {
    const routeResources = this.getRouteResources(route);
    
    if (routeResources.length === 0) return;

    // Filter resources based on connection and cache
    const resourcesToPreload = routeResources.filter((resource) => 
      this.shouldPreloadResource(resource.href, resource.priority)
    );

    const promises = resourcesToPreload.map((resource) =>
      this.preloadResource(resource.href, resource)
    );

    await Promise.allSettled(promises);
    console.log(`📄 Preloaded ${resourcesToPreload.length} resources for route: ${route}`);
  }

  /**
   * Prefetch resources for future navigation
   */
  async prefetchResources(urls: string[], priority: 'high' | 'low' = 'low'): Promise<void> {
    // Only prefetch if connection is good and user isn't on data saver
    if (!this.shouldPrefetch()) {
      console.log('🚫 Skipping prefetch due to connection constraints');
      return;
    }

    const promises = urls
      .filter((url) => !this.prefetchedResources.has(url))
      .map((url) => this.prefetchResource(url, priority));

    await Promise.allSettled(promises);
    console.log(`⚡ Prefetched ${promises.length} resources`);
  }

  /**
   * Preload resource with performance tracking
   */
  private async preloadResource(href: string, config: PreloadConfig): Promise<void> {
    if (this.preloadedResources.has(href)) return;

    const startTime = performance.now();
    
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      
      if (config.as) link.as = config.as;
      if (config.type) link.type = config.type;
      if (config.crossOrigin) link.crossOrigin = config.crossOrigin;
      if (config.media) link.media = config.media;
      if (config.sizes) link.sizes = config.sizes;
      
      // Set fetch priority if supported
      if ('fetchPriority' in link && config.fetchPriority) {
        (link as any).fetchPriority = config.fetchPriority;
      }

      // Handle load events for metrics
      return new Promise<void>((resolve, reject) => {
        link.onload = () => {
          const loadTime = performance.now() - startTime;
          this.recordResourceMetrics(href, {
            loadTime,
            size: 0, // Will be estimated separately
            cacheHit: loadTime < 50, // Heuristic for cache hit
            priority: config.priority,
            timestamp: Date.now(),
          });
          
          this.preloadedResources.add(href);
          resolve();
        };

        link.onerror = () => {
          console.warn(`❌ Failed to preload: ${href}`);
          reject(new Error(`Failed to preload ${href}`));
        };

        document.head.appendChild(link);
      });
    } catch (error) {
      console.error(`❌ Preload error for ${href}:`, error);
      throw error;
    }
  }

  /**
   * Prefetch resource for future use
   */
  private async prefetchResource(url: string, priority: 'high' | 'low'): Promise<void> {
    if (this.prefetchedResources.has(url)) return;

    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority === 'high' ? 'high' : 'low';
      }

      document.head.appendChild(link);
      this.prefetchedResources.add(url);
    } catch (error) {
      console.error(`❌ Prefetch error for ${url}:`, error);
    }
  }

  /**
   * Get route-specific resources to preload
   */
  private getRouteResources(route: string): Array<PreloadConfig & { href: string }> {
    // In development, we can't predict exact chunk names, so preload common resources
    if (import.meta.env.DEV) {
      const devResourceMap: Record<string, Array<PreloadConfig & { href: string }>> = {
        '/': [
          {
            href: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
            as: 'image',
            priority: 'high',
          },
        ],
      };
      return devResourceMap[route] || [];
    }

    // In production, use dynamic chunk discovery
    const routeChunkMap: Record<string, string[]> = {
      '/': ['react-core-vendor', 'ui-core'],
      '/quote': ['forms-vendor', 'ecommerce', 'components-forms'],
      '/dashboard': ['dashboard', 'charts-vendor', 'components-common'],
      '/admin': ['admin-core', 'admin-components', 'admin-tools'],
      '/checkout': ['payments', 'security-vendor', 'forms-vendor'],
      '/auth': ['auth', 'forms-vendor'],
    };

    const chunks = routeChunkMap[route] || [];
    
    return chunks.map((chunkName) => ({
      href: this.getChunkUrl(chunkName),
      as: 'script' as const,
      priority: this.getChunkPriority(chunkName),
    })).filter(resource => resource.href !== null) as Array<PreloadConfig & { href: string }>;
  }

  /**
   * Get actual chunk URL (will be populated by build process or discovered dynamically)
   */
  private getChunkUrl(chunkName: string): string | null {
    // In production, try to discover actual chunk URLs from link tags or module preloads
    if (typeof document !== 'undefined') {
      // Look for existing preload/modulepreload links that match the chunk name
      const existingLink = document.querySelector(`link[href*="${chunkName}"]`) as HTMLLinkElement;
      if (existingLink) {
        return existingLink.href;
      }

      // Look for script tags that might contain the chunk
      const scripts = Array.from(document.querySelectorAll('script[src*="assets"]'));
      const matchingScript = scripts.find(script => 
        (script as HTMLScriptElement).src.includes(chunkName)
      ) as HTMLScriptElement;
      
      if (matchingScript) {
        return matchingScript.src;
      }
    }

    // Fallback to expected pattern (may not exist)
    return `/assets/${chunkName}-[hash].js`;
  }

  /**
   * Determine chunk priority based on name
   */
  private getChunkPriority(chunkName: string): 'high' | 'medium' | 'low' {
    const highPriorityChunks = ['react-core-vendor', 'ui-core', 'forms-vendor'];
    const mediumPriorityChunks = ['ecommerce', 'dashboard', 'auth', 'payments'];
    
    if (highPriorityChunks.includes(chunkName)) return 'high';
    if (mediumPriorityChunks.includes(chunkName)) return 'medium';
    return 'low';
  }

  /**
   * Determine if resource should be preloaded based on conditions
   */
  private shouldPreloadResource(href: string, priority: string): boolean {
    // Already preloaded
    if (this.preloadedResources.has(href)) return false;

    // Check connection constraints
    if (this.connectionInfo?.saveData && priority !== 'high') return false;
    
    if (this.connectionInfo?.effectiveType === 'slow-2g' || 
        this.connectionInfo?.effectiveType === '2g') {
      return priority === 'high';
    }

    return true;
  }

  /**
   * Determine if prefetching should be allowed
   */
  private shouldPrefetch(): boolean {
    if (!this.connectionInfo) return true;

    const { effectiveType, saveData, downlink } = this.connectionInfo;

    // Respect user's data saver preference
    if (saveData) return false;

    // Only prefetch on good connections
    if (effectiveType === '4g' && downlink >= 2) return true;
    if (effectiveType === '3g' && downlink >= 1) return true;

    return false;
  }

  /**
   * Handle element coming into view
   */
  private handleElementInView(element: HTMLElement): void {
    // Check for data attributes that indicate resources to preload
    const preloadSrc = element.getAttribute('data-preload-src');
    const preloadRoute = element.getAttribute('data-preload-route');
    
    if (preloadSrc) {
      const as = element.getAttribute('data-preload-as') as any || 'image';
      this.preloadResource(preloadSrc, {
        as,
        priority: 'medium',
      });
    }
    
    if (preloadRoute) {
      this.preloadRoute(preloadRoute);
    }

    // Stop observing this element
    this.observer?.unobserve(element);
  }

  /**
   * Observe element for viewport-based preloading
   */
  observeElement(element: HTMLElement): void {
    if (this.observer && element) {
      this.observer.observe(element);
    }
  }

  /**
   * Preload images in viewport with lazy loading
   */
  setupLazyImagePreloading(): void {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    
    lazyImages.forEach((img) => {
      if (this.observer) {
        this.observer.observe(img);
      }
    });
  }

  /**
   * Preload next likely routes based on current route
   */
  preloadLikelyRoutes(currentRoute: string): void {
    const routePredictions: Record<string, string[]> = {
      '/': ['/quote', '/auth', '/dashboard'],
      '/quote': ['/dashboard', '/auth'],
      '/dashboard': ['/dashboard/quotes', '/dashboard/orders'],
      '/admin': ['/admin/quotes', '/admin/customers'],
    };

    const likelyRoutes = routePredictions[currentRoute] || [];
    
    likelyRoutes.forEach((route) => {
      setTimeout(() => {
        this.preloadRoute(route);
      }, 100); // Small delay to not interfere with critical loading
    });
  }

  /**
   * Adjust preloading behavior based on connection changes
   */
  private adjustPreloadingBehavior(): void {
    if (!this.connectionInfo) return;

    const { effectiveType, saveData } = this.connectionInfo;
    
    // If connection degraded, clear prefetch queue
    if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
      // Remove prefetch links
      document.querySelectorAll('link[rel="prefetch"]').forEach((link) => {
        link.remove();
      });
      
      this.prefetchedResources.clear();
      console.log('🚫 Cleared prefetch resources due to connection constraints');
    }
  }

  /**
   * Record performance metrics for resource loading
   */
  private recordResourceMetrics(url: string, metrics: ResourceMetrics): void {
    this.resourceMetrics.set(url, metrics);
    
    // Log in development
    if (import.meta.env.DEV) {
      console.log(`📊 Resource metrics for ${url}:`, metrics);
    }
  }

  /**
   * Get resource loading statistics
   */
  getResourceStats(): {
    preloadedCount: number;
    prefetchedCount: number;
    averageLoadTime: number;
    cacheHitRatio: number;
    totalResources: number;
  } {
    const metrics = Array.from(this.resourceMetrics.values());
    
    const totalLoadTime = metrics.reduce((sum, metric) => sum + metric.loadTime, 0);
    const cacheHits = metrics.filter(metric => metric.cacheHit).length;
    
    return {
      preloadedCount: this.preloadedResources.size,
      prefetchedCount: this.prefetchedResources.size,
      averageLoadTime: metrics.length > 0 ? totalLoadTime / metrics.length : 0,
      cacheHitRatio: metrics.length > 0 ? cacheHits / metrics.length : 0,
      totalResources: metrics.length,
    };
  }

  /**
   * Clear all preloaded and prefetched resources
   */
  clear(): void {
    this.preloadedResources.clear();
    this.prefetchedResources.clear();
    this.resourceMetrics.clear();
    
    // Remove preload/prefetch links
    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach((link) => {
      link.remove();
    });
  }

  /**
   * Cleanup and disconnect observers
   */
  destroy(): void {
    this.observer?.disconnect();
    this.clear();
  }
}

// Create singleton instance
export const resourcePreloader = new ResourcePreloader();

// Auto-initialize critical resource preloading
if (typeof window !== 'undefined') {
  // Preload critical resources immediately
  document.addEventListener('DOMContentLoaded', () => {
    // Only preload resources that we know exist
    const criticalResources: Array<{
      href: string;
      as: 'script' | 'style' | 'image' | 'font';
      type?: string;
      crossOrigin?: boolean;
    }> = [];

    // Temporarily disabled logo preloading to prevent unused preload warnings
    // The logo loads fast enough without preloading since it's served from Cloudinary CDN
    // const currentPath = window.location.pathname;
    // const logoRoutes = ['/', '/quote', '/dashboard'];
    // 
    // if (logoRoutes.includes(currentPath)) {
    //   criticalResources.push({
    //     href: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    //     as: 'image',
    //   });
    // }

    // Only preload if we have resources to preload
    if (criticalResources.length > 0) {
      resourcePreloader.preloadCritical(criticalResources);
    }
    
    // Setup lazy image preloading
    resourcePreloader.setupLazyImagePreloading();
    
    // Preload likely next routes
    const currentRoute = window.location.pathname;
    resourcePreloader.preloadLikelyRoutes(currentRoute);
  });

  // Log statistics in development
  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const stats = resourcePreloader.getResourceStats();
        console.group('📊 Resource Preloader Statistics');
        console.log('Preloaded Resources:', stats.preloadedCount);
        console.log('Prefetched Resources:', stats.prefetchedCount);
        console.log('Average Load Time:', `${stats.averageLoadTime.toFixed(0)}ms`);
        console.log('Cache Hit Ratio:', `${(stats.cacheHitRatio * 100).toFixed(1)}%`);
        console.log('Total Resources Tracked:', stats.totalResources);
        console.groupEnd();
      }, 2000);
    });
  }
}

export default resourcePreloader;