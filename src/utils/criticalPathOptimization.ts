/**
 * Critical Rendering Path Optimization
 * 
 * Optimizes the critical rendering path by:
 * - Identifying critical resources for initial render
 * - Preloading essential chunks based on route
 * - Deferring non-critical resources
 * - Minimizing render-blocking resources
 */

interface CriticalResource {
  type: 'css' | 'js' | 'font' | 'image';
  url: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  async?: boolean;
  defer?: boolean;
  crossOrigin?: string;
}

interface RouteOptimization {
  route: string;
  criticalChunks: string[];
  preloadChunks: string[];
  deferChunks: string[];
  criticalCSS?: string;
}

class CriticalPathOptimizer {
  private routeOptimizations = new Map<string, RouteOptimization>();
  private criticalResources: CriticalResource[] = [];
  private isOptimized = new Set<string>();

  constructor() {
    this.setupRouteOptimizations();
    this.setupCriticalResources();
  }

  private setupRouteOptimizations() {
    const optimizations: RouteOptimization[] = [
      {
        route: '/',
        criticalChunks: ['react-core-vendor', 'ui-core'],
        preloadChunks: ['ecommerce', 'auth'],
        deferChunks: ['admin-core', 'demo', 'content'],
        criticalCSS: 'home-critical',
      },
      {
        route: '/quote',
        criticalChunks: ['react-core-vendor', 'forms-vendor', 'ecommerce'],
        preloadChunks: ['dashboard', 'auth'],
        deferChunks: ['admin-core', 'content'],
        criticalCSS: 'quote-critical',
      },
      {
        route: '/dashboard',
        criticalChunks: ['react-core-vendor', 'dashboard', 'ui-core'],
        preloadChunks: ['ecommerce', 'utils-core'],
        deferChunks: ['admin-core', 'demo'],
        criticalCSS: 'dashboard-critical',
      },
      {
        route: '/admin',
        criticalChunks: ['react-core-vendor', 'admin-core', 'ui-core'],
        preloadChunks: ['admin-tools', 'admin-components'],
        deferChunks: ['demo', 'content'],
        criticalCSS: 'admin-critical',
      },
      {
        route: '/auth',
        criticalChunks: ['react-core-vendor', 'auth', 'forms-vendor'],
        preloadChunks: ['dashboard', 'ui-core'],
        deferChunks: ['admin-core', 'demo'],
        criticalCSS: 'auth-critical',
      },
      {
        route: '/checkout',
        criticalChunks: ['react-core-vendor', 'payments', 'forms-vendor'],
        preloadChunks: ['ecommerce', 'payments-vendor'],
        deferChunks: ['admin-core', 'demo', 'content'],
        criticalCSS: 'checkout-critical',
      },
    ];

    optimizations.forEach(opt => {
      this.routeOptimizations.set(opt.route, opt);
    });
  }

  private setupCriticalResources() {
    this.criticalResources = [
      // Critical CSS (inlined)
      {
        type: 'css',
        url: '/assets/css/critical.css',
        priority: 'critical',
      },
      
      // Critical fonts
      {
        type: 'font',
        url: '/assets/fonts/inter-var.woff2',
        priority: 'critical',
        crossOrigin: 'anonymous',
      },
      
      // Logo and key images
      {
        type: 'image',
        url: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
        priority: 'high',
      },
      
      // Core React chunk
      {
        type: 'js',
        url: '/assets/react-core-vendor-[hash].js',
        priority: 'critical',
      },
    ];
  }

  /**
   * Optimize critical path for a specific route
   */
  optimizeRoute(route: string): void {
    if (this.isOptimized.has(route)) return;

    const optimization = this.routeOptimizations.get(route) || this.getDefaultOptimization(route);
    
    // Preload critical chunks immediately
    this.preloadCriticalChunks(optimization.criticalChunks);
    
    // Schedule preload chunks for later
    this.schedulePreloadChunks(optimization.preloadChunks);
    
    // Defer non-critical chunks
    this.deferChunks(optimization.deferChunks);
    
    // Inline critical CSS if available
    this.inlineCriticalCSS(optimization.criticalCSS);
    
    this.isOptimized.add(route);
  }

  private getDefaultOptimization(route: string): RouteOptimization {
    // Fallback optimization for unknown routes
    return {
      route,
      criticalChunks: ['react-core-vendor', 'ui-core'],
      preloadChunks: [],
      deferChunks: [],
    };
  }

  private preloadCriticalChunks(chunks: string[]): void {
    chunks.forEach(chunkName => {
      this.preloadResource({
        type: 'js',
        url: this.getChunkUrl(chunkName),
        priority: 'critical',
      });
    });
  }

  private schedulePreloadChunks(chunks: string[]): void {
    // Preload after critical resources with requestIdleCallback
    const preloadChunks = () => {
      chunks.forEach(chunkName => {
        this.preloadResource({
          type: 'js',
          url: this.getChunkUrl(chunkName),
          priority: 'high',
        });
      });
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(preloadChunks, { timeout: 2000 });
    } else {
      setTimeout(preloadChunks, 100);
    }
  }

  private deferChunks(chunks: string[]): void {
    // These chunks will only be loaded when actually needed
    chunks.forEach(chunkName => {
      this.markChunkAsDeferred(chunkName);
    });
  }

  private preloadResource(resource: CriticalResource): void {
    if (typeof document === 'undefined') return;

    const existingLink = document.querySelector(`link[href="${resource.url}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = resource.type === 'css' ? 'preload' : 'modulepreload';
    link.as = resource.type === 'css' ? 'style' : 'script';
    link.href = resource.url;

    if (resource.crossOrigin) {
      link.crossOrigin = resource.crossOrigin;
    }

    // Set fetch priority if supported
    if ('fetchPriority' in link) {
      (link as any).fetchPriority = resource.priority === 'critical' ? 'high' : 'low';
    }

    document.head.appendChild(link);
  }

  private inlineCriticalCSS(criticalCSSName?: string): void {
    if (!criticalCSSName || typeof document === 'undefined') return;

    const existingStyle = document.querySelector(`style[data-critical="${criticalCSSName}"]`);
    if (existingStyle) return;

    // This would contain your critical CSS extracted during build
    const criticalCSS = this.getCriticalCSS(criticalCSSName);
    if (!criticalCSS) return;

    const style = document.createElement('style');
    style.setAttribute('data-critical', criticalCSSName);
    style.textContent = criticalCSS;
    
    // Insert before first stylesheet or in head
    const firstStylesheet = document.querySelector('link[rel="stylesheet"]');
    if (firstStylesheet) {
      document.head.insertBefore(style, firstStylesheet);
    } else {
      document.head.appendChild(style);
    }
  }

  private getCriticalCSS(name: string): string {
    // In a real implementation, this would be populated during build
    // with extracted critical CSS for each route
    const criticalStyles: Record<string, string> = {
      'home-critical': `
        /* Critical CSS for home page */
        body { margin: 0; font-family: 'Inter', sans-serif; }
        .hero { display: flex; align-items: center; min-height: 70vh; }
        .loading { opacity: 0; }
      `,
      'quote-critical': `
        /* Critical CSS for quote page */
        .quote-form { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .form-field { margin-bottom: 1.5rem; }
      `,
      'dashboard-critical': `
        /* Critical CSS for dashboard */
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      `,
      'admin-critical': `
        /* Critical CSS for admin */
        .admin-layout { display: flex; min-height: 100vh; }
        .admin-sidebar { width: 250px; background: #1f2937; }
        .admin-content { flex: 1; padding: 2rem; }
      `,
      'auth-critical': `
        /* Critical CSS for auth pages */
        .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .auth-form { width: 100%; max-width: 400px; padding: 2rem; }
      `,
      'checkout-critical': `
        /* Critical CSS for checkout */
        .checkout-layout { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; }
        .payment-form { background: white; padding: 2rem; border-radius: 8px; }
      `,
    };

    return criticalStyles[name] || '';
  }

  private getChunkUrl(chunkName: string): string {
    // This would be populated with actual chunk URLs from your build
    return `/assets/${chunkName}-[hash].js`;
  }

  private markChunkAsDeferred(chunkName: string): void {
    // Mark chunk as deferred - it will only load when explicitly requested
    if (typeof window !== 'undefined') {
      (window as any).__deferredChunks = (window as any).__deferredChunks || new Set();
      (window as any).__deferredChunks.add(chunkName);
    }
  }

  /**
   * Preload resources for the next likely route
   */
  preloadNextRoute(currentRoute: string): void {
    const nextRoutes = this.predictNextRoutes(currentRoute);
    
    nextRoutes.forEach((route, index) => {
      const delay = index * 200; // Stagger preloads
      setTimeout(() => {
        const optimization = this.routeOptimizations.get(route);
        if (optimization) {
          this.schedulePreloadChunks(optimization.preloadChunks);
        }
      }, delay);
    });
  }

  private predictNextRoutes(currentRoute: string): string[] {
    // Simple route prediction based on common user flows
    const routeFlow: Record<string, string[]> = {
      '/': ['/quote', '/auth', '/dashboard'],
      '/quote': ['/dashboard', '/auth', '/cart'],
      '/dashboard': ['/dashboard/quotes', '/dashboard/orders', '/profile'],
      '/admin': ['/admin/quotes', '/admin/customers', '/admin/orders'],
      '/auth': ['/dashboard', '/'],
      '/checkout': ['/payment-success', '/dashboard'],
    };

    return routeFlow[currentRoute] || [];
  }

  /**
   * Optimize for Core Web Vitals
   */
  optimizeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Optimize for Largest Contentful Paint (LCP)
    this.optimizeLCP();
    
    // Optimize for First Input Delay (FID)
    this.optimizeFID();
    
    // Optimize for Cumulative Layout Shift (CLS)
    this.optimizeCLS();
  }

  private optimizeLCP(): void {
    // Preload LCP elements
    const lcpElements = [
      'img[data-lcp="true"]',
      '.hero-image',
      '.main-logo',
    ];

    lcpElements.forEach(selector => {
      const element = document.querySelector(selector) as HTMLImageElement;
      if (element && element.src) {
        this.preloadResource({
          type: 'image',
          url: element.src,
          priority: 'critical',
        });
      }
    });
  }

  private optimizeFID(): void {
    // Defer non-critical JavaScript
    const scripts = document.querySelectorAll('script[data-defer="true"]');
    scripts.forEach(script => {
      if (!script.hasAttribute('defer')) {
        script.setAttribute('defer', '');
      }
    });

    // Break up long tasks
    this.breakUpLongTasks();
  }

  private optimizeCLS(): void {
    // Ensure images have dimensions
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (img instanceof HTMLImageElement && img.naturalWidth > 0) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });

    // Reserve space for dynamic content
    this.reserveSpaceForDynamicContent();
  }

  private breakUpLongTasks(): void {
    // Use scheduler.postTask if available, otherwise setTimeout
    const scheduleTask = (callback: () => void) => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(callback, { priority: 'user-blocking' });
      } else {
        setTimeout(callback, 0);
      }
    };

    // Example: Break up heavy initialization
    const heavyTasks = [
      () => this.preloadCriticalChunks(['react-core-vendor']),
      () => this.optimizeRoute(window.location.pathname),
      () => this.preloadNextRoute(window.location.pathname),
    ];

    heavyTasks.forEach((task, index) => {
      scheduleTask(() => {
        requestIdleCallback(task, { timeout: 1000 });
      });
    });
  }

  private reserveSpaceForDynamicContent(): void {
    // Add placeholder dimensions for known dynamic content
    const dynamicContainers = document.querySelectorAll('[data-dynamic="true"]');
    dynamicContainers.forEach(container => {
      if (!container.hasAttribute('style')) {
        (container as HTMLElement).style.minHeight = '200px';
      }
    });
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      optimizedRoutes: Array.from(this.isOptimized),
      totalRouteOptimizations: this.routeOptimizations.size,
      criticalResources: this.criticalResources.length,
      preloadedResources: document.querySelectorAll('link[rel="preload"], link[rel="modulepreload"]').length,
    };
  }

  /**
   * Reset optimizations (for testing)
   */
  reset(): void {
    this.isOptimized.clear();
    
    // Remove preload links
    document.querySelectorAll('link[rel="preload"], link[rel="modulepreload"]').forEach(link => {
      link.remove();
    });
    
    // Remove critical CSS
    document.querySelectorAll('style[data-critical]').forEach(style => {
      style.remove();
    });
  }
}

// Create singleton instance
export const criticalPathOptimizer = new CriticalPathOptimizer();

// Auto-optimize on page load
if (typeof window !== 'undefined') {
  const initializeOptimization = () => {
    const currentRoute = window.location.pathname;
    
    // Optimize current route immediately
    criticalPathOptimizer.optimizeRoute(currentRoute);
    
    // Optimize for Core Web Vitals
    criticalPathOptimizer.optimizeWebVitals();
    
    // Preload next likely routes after initial load
    setTimeout(() => {
      criticalPathOptimizer.preloadNextRoute(currentRoute);
    }, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOptimization);
  } else {
    initializeOptimization();
  }

  // Listen for route changes (SPA navigation)
  let currentPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      criticalPathOptimizer.optimizeRoute(currentPath);
      criticalPathOptimizer.preloadNextRoute(currentPath);
    }
  }, 100);
}

export default criticalPathOptimizer;