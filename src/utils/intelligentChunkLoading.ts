/**
 * Intelligent Chunk Loading Strategies
 * 
 * Advanced system for predictive chunk loading based on user behavior,
 * connection quality, and usage patterns. Optimizes loading order for
 * better perceived performance.
 */

interface ChunkMetadata {
  name: string;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  routes: string[];
  frequency: number; // How often this chunk is accessed
  lastUsed: number;
}

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  saveData: boolean;
  downlink: number; // Mbps
  rtt: number; // milliseconds
}

interface UserBehaviorPattern {
  visitedRoutes: string[];
  timeOnRoute: Record<string, number>;
  commonFlows: string[][];
  peakUsageTimes: number[];
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

class IntelligentChunkLoader {
  private chunkRegistry = new Map<string, ChunkMetadata>();
  private loadQueue: ChunkMetadata[] = [];
  private loadedChunks = new Set<string>();
  private loadingChunks = new Set<string>();
  private userBehavior: UserBehaviorPattern;
  private connectionInfo: ConnectionInfo | null = null;
  private isLoading = false;

  constructor() {
    this.userBehavior = {
      visitedRoutes: [],
      timeOnRoute: {},
      commonFlows: [],
      peakUsageTimes: [],
      deviceType: this.detectDeviceType(),
    };

    this.initializeConnectionTracking();
    this.initializeBehaviorTracking();
    this.setupChunkRegistry();
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private initializeConnectionTracking() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionInfo = {
        effectiveType: connection.effectiveType || '4g',
        saveData: connection.saveData || false,
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
      };

      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.connectionInfo = {
          effectiveType: connection.effectiveType || '4g',
          saveData: connection.saveData || false,
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
        };
        this.adjustLoadingStrategy();
      });
    }
  }

  private initializeBehaviorTracking() {
    // Track route changes
    if (typeof window !== 'undefined') {
      const trackRouteChange = () => {
        const currentRoute = window.location.pathname;
        const lastRoute = this.userBehavior.visitedRoutes[this.userBehavior.visitedRoutes.length - 1];
        const now = Date.now();

        if (lastRoute && lastRoute !== currentRoute) {
          // Record time spent on previous route
          const timeSpent = now - (this.userBehavior.timeOnRoute[lastRoute] || now);
          this.userBehavior.timeOnRoute[lastRoute] = timeSpent;
        }

        if (currentRoute !== lastRoute) {
          this.userBehavior.visitedRoutes.push(currentRoute);
          this.userBehavior.timeOnRoute[currentRoute] = now;
          this.updateCommonFlows(currentRoute);
          this.predictNextRoutes(currentRoute);
        }
      };

      // Listen for route changes
      window.addEventListener('popstate', trackRouteChange);
      
      // Track initial route
      trackRouteChange();
    }
  }

  private updateCommonFlows(currentRoute: string) {
    const recentRoutes = this.userBehavior.visitedRoutes.slice(-5);
    if (recentRoutes.length >= 2) {
      // Look for common flow patterns
      for (let i = 0; i < recentRoutes.length - 1; i++) {
        const flow = [recentRoutes[i], recentRoutes[i + 1]];
        const existingFlow = this.userBehavior.commonFlows.find(f => 
          f[0] === flow[0] && f[1] === flow[1]
        );
        if (!existingFlow) {
          this.userBehavior.commonFlows.push(flow);
        }
      }
    }
  }

  private setupChunkRegistry() {
    // Register known chunks with metadata
    const chunks: ChunkMetadata[] = [
      {
        name: 'admin-core',
        size: 500000, // ~500KB
        priority: 'high',
        dependencies: ['react-core-vendor', 'ui-core'],
        routes: ['/admin', '/admin/quotes', '/admin/customers'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'admin-tools',
        size: 300000, // ~300KB
        priority: 'medium',
        dependencies: ['admin-core'],
        routes: ['/admin/settings', '/admin/regional-pricing'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'dashboard',
        size: 250000, // ~250KB
        priority: 'high',
        dependencies: ['react-core-vendor', 'ui-core'],
        routes: ['/dashboard', '/dashboard/quotes', '/dashboard/orders'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'ecommerce',
        size: 400000, // ~400KB
        priority: 'critical',
        dependencies: ['forms-vendor', 'ui-core'],
        routes: ['/quote', '/cart', '/checkout'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'payments',
        size: 200000, // ~200KB
        priority: 'high',
        dependencies: ['payments-vendor'],
        routes: ['/checkout', '/payment-success', '/payment-failure'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'content',
        size: 150000, // ~150KB
        priority: 'low',
        dependencies: ['ui-core'],
        routes: ['/about', '/blog', '/help', '/privacy-policy'],
        frequency: 0,
        lastUsed: 0,
      },
      {
        name: 'auth',
        size: 180000, // ~180KB
        priority: 'high',
        dependencies: ['forms-vendor'],
        routes: ['/auth', '/auth/reset', '/auth/confirm'],
        frequency: 0,
        lastUsed: 0,
      },
    ];

    chunks.forEach(chunk => this.chunkRegistry.set(chunk.name, chunk));
  }

  /**
   * Predict which routes user is likely to visit next
   */
  private predictNextRoutes(currentRoute: string): string[] {
    const predictions: string[] = [];

    // Based on common flows
    this.userBehavior.commonFlows.forEach(flow => {
      if (flow[0] === currentRoute) {
        predictions.push(flow[1]);
      }
    });

    // Based on route relationships
    const routeRelationships: Record<string, string[]> = {
      '/': ['/quote', '/auth', '/dashboard'],
      '/quote': ['/dashboard', '/cart', '/auth'],
      '/dashboard': ['/dashboard/quotes', '/dashboard/orders', '/profile'],
      '/admin': ['/admin/quotes', '/admin/customers', '/admin/orders'],
      '/auth': ['/dashboard', '/profile'],
      '/cart': ['/checkout', '/quote'],
      '/checkout': ['/payment-success', '/dashboard'],
    };

    const related = routeRelationships[currentRoute] || [];
    predictions.push(...related);

    // Remove duplicates and current route
    const uniquePredictions = [...new Set(predictions)]
      .filter(route => route !== currentRoute);

    // Preload chunks for predicted routes
    this.preloadForRoutes(uniquePredictions);

    return uniquePredictions;
  }

  /**
   * Preload chunks for specific routes
   */
  preloadForRoutes(routes: string[]) {
    const chunksToPreload = new Set<string>();

    routes.forEach(route => {
      this.chunkRegistry.forEach(chunk => {
        if (chunk.routes.some(r => route.startsWith(r))) {
          chunksToPreload.add(chunk.name);
        }
      });
    });

    chunksToPreload.forEach(chunkName => {
      this.scheduleChunkLoad(chunkName);
    });
  }

  /**
   * Schedule chunk loading based on priority and connection
   */
  private scheduleChunkLoad(chunkName: string) {
    const chunk = this.chunkRegistry.get(chunkName);
    if (!chunk || this.loadedChunks.has(chunkName) || this.loadingChunks.has(chunkName)) {
      return;
    }

    // Check if we should load based on connection and device
    if (!this.shouldLoadChunk(chunk)) {
      return;
    }

    // Add to queue based on priority
    const insertIndex = this.loadQueue.findIndex(
      queuedChunk => this.getPriorityScore(queuedChunk) < this.getPriorityScore(chunk)
    );

    if (insertIndex === -1) {
      this.loadQueue.push(chunk);
    } else {
      this.loadQueue.splice(insertIndex, 0, chunk);
    }

    // Start processing queue
    if (!this.isLoading) {
      this.processLoadQueue();
    }
  }

  private shouldLoadChunk(chunk: ChunkMetadata): boolean {
    if (!this.connectionInfo) return true;

    const { effectiveType, saveData, downlink } = this.connectionInfo;

    // Respect user's data saver preference
    if (saveData && chunk.priority !== 'critical') {
      return false;
    }

    // Adjust based on connection speed
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return chunk.priority === 'critical';
    }

    if (effectiveType === '3g' || downlink < 1.5) {
      return chunk.priority === 'critical' || chunk.priority === 'high';
    }

    // On mobile, be more conservative
    if (this.userBehavior.deviceType === 'mobile' && chunk.size > 300000) {
      return chunk.priority === 'critical' || chunk.priority === 'high';
    }

    return true;
  }

  private getPriorityScore(chunk: ChunkMetadata): number {
    const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    let score = priorityScores[chunk.priority];

    // Boost score based on frequency of use
    score += Math.min(chunk.frequency / 10, 2);

    // Boost score based on recent usage
    const hoursSinceLastUse = (Date.now() - chunk.lastUsed) / (1000 * 60 * 60);
    if (hoursSinceLastUse < 1) score += 1;

    // Penalize large chunks on slow connections
    if (this.connectionInfo?.effectiveType === '3g' && chunk.size > 300000) {
      score -= 1;
    }

    return score;
  }

  private async processLoadQueue() {
    if (this.isLoading || this.loadQueue.length === 0) return;

    this.isLoading = true;

    while (this.loadQueue.length > 0) {
      const chunk = this.loadQueue.shift()!;
      
      if (this.loadedChunks.has(chunk.name) || this.loadingChunks.has(chunk.name)) {
        continue;
      }

      try {
        await this.loadChunk(chunk);
      } catch (error) {
        console.warn(`Failed to preload chunk ${chunk.name}:`, error);
      }
    }

    this.isLoading = false;
  }

  private async loadChunk(chunk: ChunkMetadata): Promise<void> {
    this.loadingChunks.add(chunk.name);

    try {
      // Create link preload element
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = this.getChunkUrl(chunk.name);

      document.head.appendChild(link);

      // Update chunk metadata
      chunk.frequency++;
      chunk.lastUsed = Date.now();

      this.loadedChunks.add(chunk.name);
      
      // Load dependencies if needed
      for (const dep of chunk.dependencies) {
        if (!this.loadedChunks.has(dep)) {
          this.scheduleChunkLoad(dep);
        }
      }

    } finally {
      this.loadingChunks.delete(chunk.name);
    }
  }

  private getChunkUrl(chunkName: string): string {
    // This would be generated based on your build configuration
    return `/assets/${chunkName}-[hash].js`;
  }

  private adjustLoadingStrategy() {
    // Adjust loading behavior based on connection changes
    if (!this.connectionInfo) return;

    const { effectiveType, saveData } = this.connectionInfo;

    // If connection degraded, pause non-critical loading
    if (effectiveType === '2g' || effectiveType === 'slow-2g' || saveData) {
      this.loadQueue = this.loadQueue.filter(chunk => chunk.priority === 'critical');
    }

    // If connection improved, resume loading
    if (effectiveType === '4g' && !saveData) {
      // Re-evaluate and schedule more chunks
      this.predictNextRoutes(window.location.pathname);
    }
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      totalChunks: this.chunkRegistry.size,
      loadedChunks: this.loadedChunks.size,
      queueLength: this.loadQueue.length,
      loadingChunks: this.loadingChunks.size,
      connectionInfo: this.connectionInfo,
      userBehavior: {
        routesVisited: this.userBehavior.visitedRoutes.length,
        commonFlows: this.userBehavior.commonFlows.length,
        deviceType: this.userBehavior.deviceType,
      },
      chunkStats: Array.from(this.chunkRegistry.values()).map(chunk => ({
        name: chunk.name,
        loaded: this.loadedChunks.has(chunk.name),
        frequency: chunk.frequency,
        priority: chunk.priority,
        size: `${Math.round(chunk.size / 1024)}KB`,
      })),
    };
  }

  /**
   * Force load chunk immediately
   */
  forceLoadChunk(chunkName: string) {
    const chunk = this.chunkRegistry.get(chunkName);
    if (chunk && !this.loadedChunks.has(chunkName)) {
      this.loadChunk(chunk);
    }
  }

  /**
   * Clear cache and reset
   */
  reset() {
    this.loadQueue = [];
    this.loadedChunks.clear();
    this.loadingChunks.clear();
    this.userBehavior = {
      visitedRoutes: [],
      timeOnRoute: {},
      commonFlows: [],
      peakUsageTimes: [],
      deviceType: this.detectDeviceType(),
    };
  }
}

// Create singleton instance
export const intelligentChunkLoader = new IntelligentChunkLoader();

// Auto-start intelligent loading
if (typeof window !== 'undefined') {
  // Start after initial page load
  window.addEventListener('load', () => {
    // Preload critical chunks after a short delay
    setTimeout(() => {
      intelligentChunkLoader.preloadForRoutes(['/quote', '/auth', '/dashboard']);
    }, 1000);
  });

  // Log stats in development
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const stats = intelligentChunkLoader.getStats();
        console.group('🧠 Intelligent Chunk Loading Stats');
        console.log('📊 Overview:', {
          totalChunks: stats.totalChunks,
          loadedChunks: stats.loadedChunks,
          queueLength: stats.queueLength,
        });
        console.log('🌐 Connection:', stats.connectionInfo);
        console.log('👤 User Behavior:', stats.userBehavior);
        console.table(stats.chunkStats);
        console.groupEnd();
      }, 3000);
    });
  }
}

export default intelligentChunkLoader;