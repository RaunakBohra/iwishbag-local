/**
 * Performance Optimization Service
 * 
 * Manages performance improvements for large components including:
 * - Lazy loading strategies
 * - Bundle size optimization
 * - Component-level code splitting
 * - Memory leak prevention
 */

import React from 'react';

interface ComponentMetrics {
  name: string;
  bundleSize: number;
  loadTime: number;
  memoryUsage: number;
  renderCount: number;
  lastLoaded: Date;
}

interface ChunkInfo {
  name: string;
  size: number;
  gzipSize: number;
  loadTime?: number;
  dependencies: string[];
}

class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private componentMetrics = new Map<string, ComponentMetrics>();
  private chunkMetrics = new Map<string, ChunkInfo>();
  private performanceObserver?: PerformanceObserver;

  private constructor() {
    this.initializePerformanceTracking();
  }

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  private initializePerformanceTracking(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackResourceLoading(entry);
        }
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  private trackResourceLoading(entry: PerformanceEntry): void {
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;
      const url = resourceEntry.name;
      
      // Track chunk loading times
      if (url.includes('/assets/') && url.endsWith('.js')) {
        const chunkName = this.extractChunkName(url);
        const loadTime = resourceEntry.loadEventEnd - resourceEntry.loadEventStart;
        
        this.updateChunkMetrics(chunkName, {
          loadTime,
          size: resourceEntry.transferSize || 0,
        });
      }
    }
  }

  private extractChunkName(url: string): string {
    const match = url.match(/\/assets\/([^-]+)/);
    return match ? match[1] : 'unknown';
  }

  private updateChunkMetrics(chunkName: string, updates: Partial<ChunkInfo>): void {
    const existing = this.chunkMetrics.get(chunkName) || {
      name: chunkName,
      size: 0,
      gzipSize: 0,
      dependencies: [],
    };

    this.chunkMetrics.set(chunkName, { ...existing, ...updates });
  }

  /**
   * Track component performance metrics
   */
  trackComponentLoad(componentName: string, loadTime: number, memoryUsage?: number): void {
    const existing = this.componentMetrics.get(componentName);
    
    this.componentMetrics.set(componentName, {
      name: componentName,
      bundleSize: existing?.bundleSize || 0,
      loadTime,
      memoryUsage: memoryUsage || (existing?.memoryUsage || 0),
      renderCount: (existing?.renderCount || 0) + 1,
      lastLoaded: new Date(),
    });
  }

  /**
   * Get performance metrics for a component
   */
  getComponentMetrics(componentName: string): ComponentMetrics | undefined {
    return this.componentMetrics.get(componentName);
  }

  /**
   * Get all tracked performance metrics
   */
  getAllMetrics(): {
    components: ComponentMetrics[];
    chunks: ChunkInfo[];
    summary: {
      totalComponents: number;
      avgLoadTime: number;
      largestChunk: ChunkInfo | null;
      slowestComponent: ComponentMetrics | null;
    };
  } {
    const components = Array.from(this.componentMetrics.values());
    const chunks = Array.from(this.chunkMetrics.values());

    const avgLoadTime = components.length > 0 
      ? components.reduce((sum, c) => sum + c.loadTime, 0) / components.length 
      : 0;

    const largestChunk = chunks.reduce((largest, chunk) => 
      (!largest || chunk.size > largest.size) ? chunk : largest, null as ChunkInfo | null);

    const slowestComponent = components.reduce((slowest, component) => 
      (!slowest || component.loadTime > slowest.loadTime) ? component : slowest, null as ComponentMetrics | null);

    return {
      components,
      chunks,
      summary: {
        totalComponents: components.length,
        avgLoadTime,
        largestChunk,
        slowestComponent,
      },
    };
  }

  /**
   * Get recommendations for performance optimization
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getAllMetrics();

    // Check for large components
    const largeComponents = metrics.components.filter(c => c.loadTime > 1000);
    if (largeComponents.length > 0) {
      recommendations.push(
        `Consider lazy loading these slow components: ${largeComponents.map(c => c.name).join(', ')}`
      );
    }

    // Check for large chunks
    const largeChunks = metrics.chunks.filter(c => c.size > 500000); // 500KB
    if (largeChunks.length > 0) {
      recommendations.push(
        `These chunks are large and should be split: ${largeChunks.map(c => c.name).join(', ')}`
      );
    }

    // Check for frequently re-rendering components
    const frequentComponents = metrics.components.filter(c => c.renderCount > 10);
    if (frequentComponents.length > 0) {
      recommendations.push(
        `Consider memoization for frequently rendering components: ${frequentComponents.map(c => c.name).join(', ')}`
      );
    }

    // Memory usage warnings
    const memoryHeavyComponents = metrics.components.filter(c => c.memoryUsage > 10000000); // 10MB
    if (memoryHeavyComponents.length > 0) {
      recommendations.push(
        `High memory usage detected in: ${memoryHeavyComponents.map(c => c.name).join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const metrics = this.getAllMetrics();
    const recommendations = this.getOptimizationRecommendations();

    return `
# Performance Report

## Summary
- Total Components Tracked: ${metrics.summary.totalComponents}
- Average Load Time: ${metrics.summary.avgLoadTime.toFixed(2)}ms
- Largest Chunk: ${metrics.summary.largestChunk?.name || 'N/A'} (${(metrics.summary.largestChunk?.size || 0) / 1000}KB)
- Slowest Component: ${metrics.summary.slowestComponent?.name || 'N/A'} (${metrics.summary.slowestComponent?.loadTime || 0}ms)

## Component Performance
${metrics.components.map(c => 
  `- ${c.name}: ${c.loadTime}ms (${c.renderCount} renders)`
).join('\n')}

## Chunk Sizes
${metrics.chunks.map(c => 
  `- ${c.name}: ${(c.size / 1000).toFixed(1)}KB${c.loadTime ? ` (${c.loadTime}ms)` : ''}`
).join('\n')}

## Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}
    `.trim();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.componentMetrics.clear();
    this.chunkMetrics.clear();
  }

  /**
   * Measure memory usage of the current page
   */
  measureMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Check if a component should be lazy loaded based on its metrics
   */
  shouldLazyLoad(componentName: string): boolean {
    const metrics = this.getComponentMetrics(componentName);
    if (!metrics) return false;

    // Lazy load if:
    // - Component is large (>100KB estimated)
    // - Component is slow to load (>500ms)
    // - Component is rarely used (less than 2 renders per session)
    return (
      metrics.bundleSize > 100000 ||
      metrics.loadTime > 500 ||
      metrics.renderCount < 2
    );
  }

  /**
   * Start performance monitoring for a component
   */
  startComponentTimer(componentName: string): () => void {
    const startTime = performance.now();
    const startMemory = this.measureMemoryUsage();

    return () => {
      const endTime = performance.now();
      const endMemory = this.measureMemoryUsage();
      const loadTime = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      this.trackComponentLoad(componentName, loadTime, memoryDelta);
    };
  }

  /**
   * Cleanup performance tracking
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Create and export singleton instance
export const performanceOptimizationService = PerformanceOptimizationService.getInstance();

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const [isLoading, setIsLoading] = React.useState(true);
  const timerRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    // Start timer when component mounts
    timerRef.current = performanceOptimizationService.startComponentTimer(componentName);
    setIsLoading(false);

    return () => {
      // Stop timer when component unmounts
      if (timerRef.current) {
        timerRef.current();
      }
    };
  }, [componentName]);

  const getMetrics = React.useCallback(() => {
    return performanceOptimizationService.getComponentMetrics(componentName);
  }, [componentName]);

  return {
    isLoading,
    getMetrics,
    shouldLazyLoad: performanceOptimizationService.shouldLazyLoad(componentName),
  };
}

export default PerformanceOptimizationService;