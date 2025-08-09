/**
 * Asset Preloader - Intelligent preloading system for critical assets
 * 
 * Preloads critical images and assets based on user behavior and route changes.
 * Implements priority queuing and connection-aware loading strategies.
 */

interface PreloadItem {
  src: string;
  type: 'image' | 'script' | 'style' | 'font';
  priority: 'critical' | 'high' | 'medium' | 'low';
  preloadAs?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  saveData: boolean;
  downlink: number;
  rtt: number;
}

class AssetPreloader {
  private preloadQueue: PreloadItem[] = [];
  private preloadedAssets = new Set<string>();
  private isPreloading = false;
  private maxConcurrentPreloads = 3;
  private activePreloads = 0;

  constructor() {
    this.bindEvents();
  }

  private bindEvents() {
    // Preload assets on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.preloadQueue.length > 0) {
        this.processQueue();
      }
    });

    // Preload on user interaction (mouse move, scroll)
    let interactionDetected = false;
    const handleInteraction = () => {
      if (!interactionDetected) {
        interactionDetected = true;
        setTimeout(() => this.processQueue(), 1000); // Delay to avoid blocking interaction
        
        // Remove listeners after first interaction
        document.removeEventListener('mousemove', handleInteraction);
        document.removeEventListener('scroll', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
      }
    };

    document.addEventListener('mousemove', handleInteraction, { passive: true });
    document.addEventListener('scroll', handleInteraction, { passive: true });
    document.addEventListener('touchstart', handleInteraction, { passive: true });
  }

  private getConnectionInfo(): ConnectionInfo | null {
    const nav = navigator as any;
    if (!nav.connection) return null;

    return {
      effectiveType: nav.connection.effectiveType || '4g',
      saveData: nav.connection.saveData || false,
      downlink: nav.connection.downlink || 10,
      rtt: nav.connection.rtt || 100,
    };
  }

  private shouldPreload(item: PreloadItem): boolean {
    const connection = this.getConnectionInfo();
    
    // Don't preload if user has data saver enabled
    if (connection?.saveData) {
      return item.priority === 'critical';
    }

    // Adjust preloading based on connection quality
    if (connection) {
      const { effectiveType, downlink } = connection;
      
      // Slow connections - only critical assets
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
        return item.priority === 'critical';
      }
      
      // Medium connections - critical and high priority
      if (effectiveType === '3g' || downlink < 1.5) {
        return item.priority === 'critical' || item.priority === 'high';
      }
    }

    // Fast connections or unknown - preload all except low priority
    return item.priority !== 'low';
  }

  /**
   * Add assets to preload queue
   */
  addToQueue(items: PreloadItem | PreloadItem[]) {
    const itemsArray = Array.isArray(items) ? items : [items];
    
    for (const item of itemsArray) {
      if (!this.preloadedAssets.has(item.src)) {
        this.preloadQueue.push(item);
      }
    }

    // Sort queue by priority
    this.preloadQueue.sort((a, b) => {
      const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorities[a.priority] - priorities[b.priority];
    });

    // Start processing if not already running
    if (!this.isPreloading) {
      // Delay initial processing to avoid blocking main thread
      requestIdleCallback(() => this.processQueue(), { timeout: 2000 });
    }
  }

  private async processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) return;
    
    this.isPreloading = true;

    while (this.preloadQueue.length > 0 && this.activePreloads < this.maxConcurrentPreloads) {
      const item = this.preloadQueue.shift()!;
      
      if (this.shouldPreload(item) && !this.preloadedAssets.has(item.src)) {
        this.preloadAsset(item);
      }
    }

    this.isPreloading = false;
  }

  private async preloadAsset(item: PreloadItem) {
    this.activePreloads++;

    try {
      await this.createPreloadLink(item);
      this.preloadedAssets.add(item.src);
    } catch (error) {
      console.warn(`Failed to preload asset: ${item.src}`, error);
    } finally {
      this.activePreloads--;
      
      // Continue processing queue if there are more items
      if (this.preloadQueue.length > 0) {
        requestIdleCallback(() => this.processQueue());
      }
    }
  }

  private createPreloadLink(item: PreloadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already preloaded
      const existing = document.querySelector(`link[href="${item.src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = item.src;
      
      if (item.preloadAs) {
        link.as = item.preloadAs;
      } else {
        // Set default 'as' attribute based on type
        switch (item.type) {
          case 'image':
            link.as = 'image';
            break;
          case 'script':
            link.as = 'script';
            break;
          case 'style':
            link.as = 'style';
            break;
          case 'font':
            link.as = 'font';
            break;
        }
      }

      if (item.crossOrigin) {
        link.crossOrigin = item.crossOrigin;
      }

      // Handle load/error events
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${item.src}`));

      // Append to head
      document.head.appendChild(link);

      // Fallback timeout
      setTimeout(() => resolve(), 10000);
    });
  }

  /**
   * Preload critical app assets
   */
  preloadCriticalAssets() {
    const criticalAssets: PreloadItem[] = [
      {
        src: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
        type: 'image',
        priority: 'critical',
        crossOrigin: 'anonymous',
      },
      // Add more critical assets as needed
    ];

    this.addToQueue(criticalAssets);
  }

  /**
   * Preload route-specific assets
   */
  preloadRouteAssets(route: string) {
    const routeAssets: Record<string, PreloadItem[]> = {
      '/admin': [
        {
          src: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
          type: 'image',
          priority: 'high',
        },
      ],
      '/dashboard': [
        // Dashboard specific assets
      ],
      '/quotes': [
        // Quote page specific assets
      ],
    };

    const assets = routeAssets[route];
    if (assets) {
      this.addToQueue(assets);
    }
  }

  /**
   * Get preload statistics
   */
  getStats() {
    return {
      queueLength: this.preloadQueue.length,
      preloadedCount: this.preloadedAssets.size,
      activePreloads: this.activePreloads,
      isPreloading: this.isPreloading,
    };
  }

  /**
   * Clear preload queue and reset
   */
  reset() {
    this.preloadQueue = [];
    this.preloadedAssets.clear();
    this.isPreloading = false;
    this.activePreloads = 0;
  }
}

// Create singleton instance
export const assetPreloader = new AssetPreloader();

// Auto-start critical asset preloading
if (typeof window !== 'undefined') {
  // Preload critical assets after initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      assetPreloader.preloadCriticalAssets();
    });
  } else {
    assetPreloader.preloadCriticalAssets();
  }
}

export default assetPreloader;