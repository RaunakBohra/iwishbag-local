/**
 * Image Performance Tracker
 * 
 * Tracks and measures the performance impact of image optimizations.
 * Provides metrics for loading times, bandwidth savings, and user experience improvements.
 */

interface ImageLoadMetrics {
  id: string;
  src: string;
  width?: number;
  height?: number;
  format: string;
  loadStartTime: number;
  loadEndTime?: number;
  loadDuration?: number;
  fileSize?: number;
  isOptimized: boolean;
  loadMethod: 'eager' | 'lazy' | 'progressive';
  placeholder?: 'blur' | 'shimmer' | 'none';
  compressionRatio?: number;
}

interface PerformanceReport {
  totalImages: number;
  optimizedImages: number;
  averageLoadTime: number;
  totalBandwidthSaved: number;
  lazyLoadedImages: number;
  progressiveImages: number;
  formatDistribution: Record<string, number>;
  loadMethodDistribution: Record<string, number>;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
}

class ImagePerformanceTracker {
  private metrics: Map<string, ImageLoadMetrics> = new Map();
  private observer?: PerformanceObserver;
  private intersectionObserver?: IntersectionObserver;
  private isTracking = false;

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    if (typeof window === 'undefined') return;

    // Track resource loading times
    this.initializeResourceTracking();
    
    // Track Largest Contentful Paint
    this.initializeLCPTracking();
    
    // Track Cumulative Layout Shift
    this.initializeCLSTracking();
    
    // Track intersection for lazy loaded images
    this.initializeIntersectionTracking();
  }

  private initializeResourceTracking() {
    if (!('PerformanceObserver' in window)) return;

    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i)) {
          this.recordResourceLoad(entry as PerformanceResourceTiming);
        }
      });
    });

    try {
      this.observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Failed to initialize resource tracking:', error);
    }
  }

  private initializeLCPTracking() {
    if (!('PerformanceObserver' in window)) return;

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      if (lastEntry && lastEntry.element?.tagName === 'IMG') {
        this.recordLCP(lastEntry.startTime);
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Failed to initialize LCP tracking:', error);
    }
  }

  private initializeCLSTracking() {
    if (!('PerformanceObserver' in window)) return;

    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      if (clsValue > 0) {
        this.recordCLS(clsValue);
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Failed to initialize CLS tracking:', error);
    }
  }

  private initializeIntersectionTracking() {
    if (!('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.tagName === 'IMG') {
            this.recordImageVisible(entry.target as HTMLImageElement);
          }
        });
      },
      { threshold: 0.1 }
    );
  }

  /**
   * Start tracking an image load
   */
  startImageLoad(id: string, config: {
    src: string;
    width?: number;
    height?: number;
    isOptimized?: boolean;
    loadMethod?: 'eager' | 'lazy' | 'progressive';
    placeholder?: 'blur' | 'shimmer' | 'none';
  }): void {
    const metric: ImageLoadMetrics = {
      id,
      src: config.src,
      width: config.width,
      height: config.height,
      format: this.extractFormat(config.src),
      loadStartTime: performance.now(),
      isOptimized: config.isOptimized || this.isUrlOptimized(config.src),
      loadMethod: config.loadMethod || 'lazy',
      placeholder: config.placeholder,
    };

    this.metrics.set(id, metric);
  }

  /**
   * Complete tracking for an image load
   */
  completeImageLoad(id: string, success = true): void {
    const metric = this.metrics.get(id);
    if (!metric) return;

    const endTime = performance.now();
    metric.loadEndTime = endTime;
    metric.loadDuration = endTime - metric.loadStartTime;

    if (!success) {
      metric.loadDuration = -1; // Mark as failed
    }

    this.metrics.set(id, metric);
  }

  /**
   * Track an image element for intersection-based metrics
   */
  trackImageElement(img: HTMLImageElement, config?: {
    isOptimized?: boolean;
    loadMethod?: 'eager' | 'lazy' | 'progressive';
  }): void {
    const id = this.generateImageId(img);
    
    this.startImageLoad(id, {
      src: img.src,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      isOptimized: config?.isOptimized,
      loadMethod: config?.loadMethod,
    });

    // Track when image enters viewport
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(img);
    }

    // Track when image loads
    if (img.complete) {
      this.completeImageLoad(id, true);
    } else {
      img.addEventListener('load', () => this.completeImageLoad(id, true), { once: true });
      img.addEventListener('error', () => this.completeImageLoad(id, false), { once: true });
    }
  }

  private recordResourceLoad(entry: PerformanceResourceTiming): void {
    const id = this.generateUrlId(entry.name);
    const metric = this.metrics.get(id);
    
    if (metric) {
      metric.loadDuration = entry.duration;
      metric.fileSize = entry.transferSize;
      this.metrics.set(id, metric);
    }
  }

  private recordLCP(value: number): void {
    // Store LCP value for reporting
    (window as any).__imageOptimization_LCP = value;
  }

  private recordCLS(value: number): void {
    // Accumulate CLS value
    const current = (window as any).__imageOptimization_CLS || 0;
    (window as any).__imageOptimization_CLS = current + value;
  }

  private recordImageVisible(img: HTMLImageElement): void {
    const id = this.generateImageId(img);
    const metric = this.metrics.get(id);
    
    if (metric) {
      // Record when image became visible (useful for lazy loading analysis)
      metric.loadStartTime = performance.now();
    }
  }

  private extractFormat(url: string): string {
    if (url.includes('f_webp') || url.includes('format=webp')) return 'webp';
    if (url.includes('f_avif') || url.includes('format=avif')) return 'avif';
    if (url.includes('f_auto') || url.includes('format=auto')) return 'auto';
    
    const match = url.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)(\?|$)/i);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  private isUrlOptimized(url: string): boolean {
    // Check for optimization indicators
    return url.includes('cloudinary.com') && (
      url.includes('f_auto') ||
      url.includes('f_webp') ||
      url.includes('f_avif') ||
      url.includes('q_') ||
      url.includes('w_') ||
      url.includes('h_')
    );
  }

  private generateImageId(img: HTMLImageElement): string {
    return `img_${img.src}_${img.width}_${img.height}`;
  }

  private generateUrlId(url: string): string {
    return `url_${url.split('?')[0]}`;
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const metricsArray = Array.from(this.metrics.values());
    const validMetrics = metricsArray.filter(m => m.loadDuration && m.loadDuration > 0);

    const report: PerformanceReport = {
      totalImages: metricsArray.length,
      optimizedImages: metricsArray.filter(m => m.isOptimized).length,
      averageLoadTime: validMetrics.length > 0 
        ? validMetrics.reduce((sum, m) => sum + (m.loadDuration || 0), 0) / validMetrics.length
        : 0,
      totalBandwidthSaved: this.calculateBandwidthSavings(metricsArray),
      lazyLoadedImages: metricsArray.filter(m => m.loadMethod === 'lazy').length,
      progressiveImages: metricsArray.filter(m => m.loadMethod === 'progressive').length,
      formatDistribution: this.calculateFormatDistribution(metricsArray),
      loadMethodDistribution: this.calculateLoadMethodDistribution(metricsArray),
      largestContentfulPaint: (window as any).__imageOptimization_LCP,
      cumulativeLayoutShift: (window as any).__imageOptimization_CLS,
    };

    return report;
  }

  private calculateBandwidthSavings(metrics: ImageLoadMetrics[]): number {
    // Estimate bandwidth savings based on optimization
    return metrics.reduce((total, metric) => {
      if (metric.isOptimized && metric.fileSize) {
        // Assume 30-50% savings for optimized images
        const estimatedOriginalSize = metric.fileSize / 0.7; // Assume 30% savings
        const savings = estimatedOriginalSize - metric.fileSize;
        return total + savings;
      }
      return total;
    }, 0);
  }

  private calculateFormatDistribution(metrics: ImageLoadMetrics[]): Record<string, number> {
    return metrics.reduce((dist, metric) => {
      dist[metric.format] = (dist[metric.format] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
  }

  private calculateLoadMethodDistribution(metrics: ImageLoadMetrics[]): Record<string, number> {
    return metrics.reduce((dist, metric) => {
      dist[metric.loadMethod] = (dist[metric.loadMethod] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    const report = this.generateReport();
    
    console.group('🖼️ Image Optimization Performance Report');
    console.log(`📊 Total Images: ${report.totalImages}`);
    console.log(`✅ Optimized Images: ${report.optimizedImages} (${Math.round(report.optimizedImages / report.totalImages * 100)}%)`);
    console.log(`⏱️ Average Load Time: ${Math.round(report.averageLoadTime)}ms`);
    console.log(`💾 Estimated Bandwidth Saved: ${Math.round(report.totalBandwidthSaved / 1024)}KB`);
    console.log(`🦥 Lazy Loaded Images: ${report.lazyLoadedImages}`);
    console.log(`📈 Progressive Images: ${report.progressiveImages}`);
    console.log(`🎨 Format Distribution:`, report.formatDistribution);
    console.log(`🚀 Load Method Distribution:`, report.loadMethodDistribution);
    
    if (report.largestContentfulPaint) {
      console.log(`🎯 Largest Contentful Paint: ${Math.round(report.largestContentfulPaint)}ms`);
    }
    
    if (report.cumulativeLayoutShift) {
      console.log(`📐 Cumulative Layout Shift: ${report.cumulativeLayoutShift.toFixed(3)}`);
    }
    
    console.groupEnd();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      report: this.generateReport(),
      rawMetrics: Array.from(this.metrics.values()),
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  reset(): void {
    this.metrics.clear();
    (window as any).__imageOptimization_LCP = undefined;
    (window as any).__imageOptimization_CLS = undefined;
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.observer?.disconnect();
    this.intersectionObserver?.disconnect();
    this.isTracking = false;
  }
}

// Create singleton instance
export const imagePerformanceTracker = new ImagePerformanceTracker();

// Auto-log report in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Log report after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      imagePerformanceTracker.logReport();
    }, 3000); // Wait 3 seconds after load to capture more metrics
  });
}

export default imagePerformanceTracker;