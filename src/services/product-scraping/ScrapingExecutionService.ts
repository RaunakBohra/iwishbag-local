/**
 * Scraping Execution Service
 * Handles core scraping execution, MCP bridge integration, and HTTP management
 * Decomposed from BrightDataProductService for focused execution management
 * 
 * RESPONSIBILITIES:
 * - Core scraping engine and HTTP request handling
 * - MCP bridge integration and tool routing
 * - Request queuing and throttling management
 * - Proxy management and rotation
 * - Response validation and error detection
 * - Retry logic and exponential backoff
 * - Session management and anti-bot measures
 * - Performance monitoring and analytics
 */

import { logger } from '@/utils/logger';
import { FetchResult } from '../ProductDataFetchService';

export interface ScrapingRequest {
  platform: string;
  url: string;
  scraperType: string;
  options: ScrapingRequestOptions;
  priority: 'low' | 'normal' | 'high';
  retryCount?: number;
  maxRetries?: number;
}

export interface ScrapingRequestOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  includeSpecifications?: boolean;
  includeFeatures?: boolean;
  includeBreadcrumbs?: boolean;
  includeRelatedProducts?: boolean;
  timeout?: number;
  useProxy?: boolean;
  rotateSession?: boolean;
  country?: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  source: 'scraper' | 'cache' | 'fallback';
  executionTime: number;
  requestId: string;
  retryCount: number;
  proxyUsed?: string;
  rateLimited?: boolean;
}

export interface ExecutionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  rateLimitHits: number;
  proxyRotations: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
}

export class ScrapingExecutionService {
  private static instance: ScrapingExecutionService;
  private requestQueue: ScrapingRequest[] = [];
  private processingRequests = new Map<string, ScrapingRequest>();
  private rateLimitTracker = new Map<string, { requests: number; resetTime: number }>();
  private proxyPool: string[] = [];
  private currentProxyIndex = 0;
  private metrics: ExecutionMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageExecutionTime: 0,
    cacheHitRate: 0,
    rateLimitHits: 0,
    proxyRotations: 0
  };
  
  private readonly maxConcurrentRequests = 5;
  private readonly defaultTimeout = 60000; // 1 minute
  private mcpBridge: any = null;

  constructor() {
    this.initializeMCPBridge();
    logger.info('ScrapingExecutionService initialized');
  }

  static getInstance(): ScrapingExecutionService {
    if (!ScrapingExecutionService.instance) {
      ScrapingExecutionService.instance = new ScrapingExecutionService();
    }
    return ScrapingExecutionService.instance;
  }

  /**
   * Initialize MCP bridge connection
   */
  private async initializeMCPBridge(): Promise<void> {
    try {
      const { mcpBrightDataBridge } = await import('../MCPBrightDataBridge');
      this.mcpBridge = mcpBrightDataBridge;
      logger.info('MCP bridge initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MCP bridge:', error);
    }
  }

  /**
   * Execute scraping request
   */
  async executeScrapingRequest(request: ScrapingRequest): Promise<ScrapingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.metrics.totalRequests++;
      
      // Check rate limits
      if (!this.checkRateLimit(request.platform)) {
        this.metrics.rateLimitHits++;
        return {
          success: false,
          error: 'Rate limit exceeded for platform',
          source: 'scraper',
          executionTime: Date.now() - startTime,
          requestId,
          retryCount: request.retryCount || 0,
          rateLimited: true
        };
      }

      // Add to processing queue
      this.processingRequests.set(requestId, request);
      
      // Execute the actual scraping
      const result = await this.performScraping(request, requestId, startTime);
      
      // Update metrics
      if (result.success) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }
      
      this.updateAverageExecutionTime(result.executionTime);
      this.processingRequests.delete(requestId);
      
      return result;

    } catch (error) {
      this.metrics.failedRequests++;
      this.processingRequests.delete(requestId);
      
      logger.error(`Scraping execution failed for ${request.platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        source: 'scraper',
        executionTime: Date.now() - startTime,
        requestId,
        retryCount: request.retryCount || 0
      };
    }
  }

  /**
   * Perform the actual scraping operation
   */
  private async performScraping(request: ScrapingRequest, requestId: string, startTime: number): Promise<ScrapingResult> {
    const { platform, url, scraperType, options } = request;
    
    try {
      // Apply anti-bot measures
      await this.applyAntiBotMeasures(platform, options);
      
      // Route to appropriate scraper
      let mcpResult: any;
      
      switch (scraperType) {
        case 'amazon_product':
          mcpResult = await this.scrapeAmazonProduct(url, options);
          break;
        case 'ebay_product':
          mcpResult = await this.scrapeEbayProduct(url, options);
          break;
        case 'walmart_product':
          mcpResult = await this.scrapeWalmartProduct(url, options);
          break;
        case 'bestbuy_product':
          mcpResult = await this.scrapeBestBuyProduct(url, options);
          break;
        case 'ae_product':
          mcpResult = await this.scrapeAEProduct(url, options);
          break;
        case 'myntra_product':
          mcpResult = await this.scrapeMyntraProduct(url, options);
          break;
        case 'target_product':
          mcpResult = await this.scrapeTargetProduct(url, options);
          break;
        case 'hm_product':
          mcpResult = await this.scrapeHMProduct(url, options);
          break;
        case 'asos_product':
          mcpResult = await this.scrapeASOSProduct(url, options);
          break;
        case 'etsy_product':
          mcpResult = await this.scrapeEtsyProduct(url, options);
          break;
        case 'zara_product':
          mcpResult = await this.scrapeZaraProduct(url, options);
          break;
        case 'lego_product':
          mcpResult = await this.scrapeLegoProduct(url, options);
          break;
        case 'hermes_product':
          mcpResult = await this.scrapeHermesProduct(url, options);
          break;
        case 'flipkart_product':
          mcpResult = await this.scrapeFlipkartProduct(url, options);
          break;
        case 'toysrus_product':
          mcpResult = await this.scrapeToysrusProduct(url, options);
          break;
        case 'carters_product':
          mcpResult = await this.scrapeCartersProduct(url, options);
          break;
        case 'prada_product':
          mcpResult = await this.scrapePradaProduct(url, options);
          break;
        case 'ysl_product':
          mcpResult = await this.scrapeYSLProduct(url, options);
          break;
        case 'balenciaga_product':
          mcpResult = await this.scrapeBalenciagaProduct(url, options);
          break;
        case 'dior_product':
          mcpResult = await this.scrapeDiorProduct(url, options);
          break;
        case 'chanel_product':
          mcpResult = await this.scrapeChanelProduct(url, options);
          break;
        default:
          mcpResult = await this.scrapeGeneric(url, options);
      }

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || `${scraperType} scraping failed`);
      }

      return {
        success: true,
        data: mcpResult.data,
        source: 'scraper',
        executionTime: Date.now() - startTime,
        requestId,
        retryCount: request.retryCount || 0,
        proxyUsed: this.getCurrentProxy()
      };

    } catch (error) {
      // Implement retry logic for transient errors
      if (this.shouldRetry(error, request)) {
        logger.warn(`Scraping failed, retrying: ${error instanceof Error ? error.message : 'Unknown error'}`);
        const retryRequest = {
          ...request,
          retryCount: (request.retryCount || 0) + 1
        };
        
        // Add exponential backoff delay
        const backoffDelay = this.calculateBackoffDelay(retryRequest.retryCount);
        await this.delay(backoffDelay);
        
        return await this.performScraping(retryRequest, requestId, startTime);
      }

      throw error;
    }
  }

  /**
   * Platform-specific scraping methods
   */
  private async scrapeAmazonProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeAmazonProduct(url, {
      include_reviews: options.includeReviews || false,
      include_images: options.includeImages !== false,
      country: options.country || this.detectCountryFromUrl(url)
    });
  }

  private async scrapeEbayProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeEbayProduct(url, {
      include_seller_info: true,
      include_shipping: true
    });
  }

  private async scrapeWalmartProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeWalmartProduct(url, {
      include_specifications: options.includeSpecifications !== false,
      include_availability: true
    });
  }

  private async scrapeBestBuyProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeBestBuyProduct(url, {
      include_reviews: options.includeReviews !== false,
      include_images: options.includeImages !== false,
      include_specifications: options.includeSpecifications !== false,
      include_features: options.includeFeatures !== false,
      include_breadcrumbs: options.includeBreadcrumbs !== false
    });
  }

  private async scrapeAEProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeAEProduct(url, {
      include_variants: options.includeVariants !== false,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeMyntraProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeMyntraProduct(url, {
      include_specifications: options.includeSpecifications !== false,
      include_variants: options.includeVariants !== false
    });
  }

  private async scrapeTargetProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeTargetProduct(url, {
      include_reviews: options.includeReviews !== false,
      include_specifications: options.includeSpecifications !== false
    });
  }

  private async scrapeHMProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeHMProduct(url, {
      include_variants: options.includeVariants !== false,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeASOSProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeASOSProduct(url, {
      include_reviews: options.includeReviews !== false,
      include_variants: options.includeVariants !== false
    });
  }

  private async scrapeEtsyProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeEtsyProduct(url, {
      include_seller_info: true,
      include_variants: options.includeVariants !== false
    });
  }

  private async scrapeZaraProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeZaraProduct(url, {
      include_variants: options.includeVariants !== false
    });
  }

  private async scrapeLegoProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeLegoProduct(url, {
      include_features: options.includeFeatures !== false,
      include_reviews: options.includeReviews !== false,
      include_images: options.includeImages !== false,
      include_related_products: options.includeRelatedProducts !== false
    });
  }

  private async scrapeHermesProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeHermesProduct(url, {
      include_materials: true,
      include_product_details: true,
      include_dimensions: true,
      include_craftsmanship: true
    });
  }

  private async scrapeFlipkartProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeFlipkartProduct(url, {
      include_specifications: options.includeSpecifications !== false,
      include_highlights: true,
      include_rating: true
    });
  }

  private async scrapeToysrusProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeToysrusProduct(url, {
      include_specifications: options.includeSpecifications !== false,
      include_reviews: options.includeReviews !== false,
      include_images: options.includeImages !== false,
      include_variants: options.includeVariants !== false
    });
  }

  private async scrapeCartersProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeCartersProduct(url, {
      include_features: options.includeFeatures !== false,
      include_similar_products: options.includeVariants !== false,
      include_reviews: options.includeReviews !== false,
      include_images: options.includeImages !== false,
      include_attributes: true
    });
  }

  private async scrapePradaProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapePradaProduct(url, {
      include_variations: options.includeVariants !== false,
      include_materials: true,
      include_details: true,
      include_images: options.includeImages !== false,
      include_breadcrumbs: options.includeBreadcrumbs !== false
    });
  }

  private async scrapeYSLProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeYSLProduct(url, {
      include_variations: options.includeVariants !== false,
      include_materials: true,
      include_details: true,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeBalenciagaProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeBalenciagaProduct(url, {
      include_variations: options.includeVariants !== false,
      include_materials: true,
      include_details: true,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeDiorProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeDiorProduct(url, {
      include_variations: options.includeVariants !== false,
      include_materials: true,
      include_details: true,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeChanelProduct(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    return await this.mcpBridge.scrapeChanelProduct(url, {
      include_variations: options.includeVariants !== false,
      include_materials: true,
      include_details: true,
      include_images: options.includeImages !== false
    });
  }

  private async scrapeGeneric(url: string, options: ScrapingRequestOptions): Promise<any> {
    if (!this.mcpBridge) {
      throw new Error('MCP bridge not initialized');
    }
    
    // Fallback to markdown scraping for unsupported platforms
    return await this.mcpBridge.scrapeAsMarkdown(url);
  }

  /**
   * Anti-bot measures and rate limiting
   */
  private async applyAntiBotMeasures(platform: string, options: ScrapingRequestOptions): Promise<void> {
    // Apply random delay based on platform configuration
    const delay = this.calculateRandomDelay(platform);
    if (delay > 0) {
      await this.delay(delay);
    }

    // Rotate proxy if configured
    if (options.useProxy) {
      this.rotateProxy();
    }

    // Update rate limiting tracker
    this.updateRateLimitTracker(platform);
  }

  /**
   * Rate limiting management
   */
  private checkRateLimit(platform: string): boolean {
    const tracker = this.rateLimitTracker.get(platform);
    const now = Date.now();
    
    if (!tracker) {
      this.rateLimitTracker.set(platform, {
        requests: 1,
        resetTime: now + (60 * 1000) // Reset after 1 minute
      });
      return true;
    }
    
    // Reset if time window has passed
    if (now > tracker.resetTime) {
      this.rateLimitTracker.set(platform, {
        requests: 1,
        resetTime: now + (60 * 1000)
      });
      return true;
    }
    
    // Check if within limits (basic implementation - could be enhanced with platform-specific limits)
    const maxRequestsPerMinute = this.getMaxRequestsPerMinute(platform);
    return tracker.requests < maxRequestsPerMinute;
  }

  private updateRateLimitTracker(platform: string): void {
    const tracker = this.rateLimitTracker.get(platform);
    if (tracker) {
      tracker.requests++;
    }
  }

  private getMaxRequestsPerMinute(platform: string): number {
    const limits: Record<string, number> = {
      amazon: 10,
      ebay: 8,
      walmart: 12,
      bestbuy: 15,
      ae: 2, // Fashion sites are more restrictive
      myntra: 6,
      hermes: 3, // Luxury sites are very restrictive
      flipkart: 8,
      lego: 10
    };
    
    return limits[platform] || 5; // Default limit
  }

  /**
   * Proxy management
   */
  private rotateProxy(): void {
    if (this.proxyPool.length === 0) return;
    
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyPool.length;
    this.metrics.proxyRotations++;
    
    logger.debug(`Rotated to proxy ${this.currentProxyIndex + 1}/${this.proxyPool.length}`);
  }

  private getCurrentProxy(): string | undefined {
    if (this.proxyPool.length === 0) return undefined;
    return this.proxyPool[this.currentProxyIndex];
  }

  /**
   * Retry logic
   */
  private shouldRetry(error: any, request: ScrapingRequest): boolean {
    const maxRetries = request.maxRetries || 3;
    const currentRetries = request.retryCount || 0;
    
    if (currentRetries >= maxRetries) {
      return false;
    }
    
    // Retry on transient errors
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    const retryableErrors = [
      'timeout',
      'network error',
      'connection reset',
      'temporarily unavailable',
      'rate limit'
    ];
    
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
  }

  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3; // 30% jitter
    
    return Math.floor(exponentialDelay * (1 + jitter));
  }

  /**
   * Utility methods
   */
  private calculateRandomDelay(platform: string): number {
    const delayRanges: Record<string, { min: number; max: number }> = {
      amazon: { min: 2000, max: 5000 },
      ebay: { min: 3000, max: 6000 },
      walmart: { min: 1000, max: 3000 },
      bestbuy: { min: 1500, max: 4000 },
      ae: { min: 10000, max: 20000 }, // Fashion sites need longer delays
      myntra: { min: 2000, max: 5000 },
      hermes: { min: 15000, max: 30000 }, // Luxury sites need much longer delays
      flipkart: { min: 3000, max: 7000 }
    };
    
    const range = delayRanges[platform] || { min: 1000, max: 3000 };
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  private detectCountryFromUrl(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.co.uk')) return 'GB';
    if (urlLower.includes('.de')) return 'DE';
    if (urlLower.includes('.fr')) return 'FR';
    if (urlLower.includes('.in')) return 'IN';
    if (urlLower.includes('.ca')) return 'CA';
    if (urlLower.includes('.co.jp')) return 'JP';
    if (urlLower.includes('.com.au')) return 'AU';
    
    return 'US'; // Default
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateAverageExecutionTime(executionTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    const currentAverage = this.metrics.averageExecutionTime;
    
    this.metrics.averageExecutionTime = 
      ((currentAverage * (totalRequests - 1)) + executionTime) / totalRequests;
  }

  /**
   * Queue management
   */
  addToQueue(request: ScrapingRequest): void {
    // Insert based on priority
    if (request.priority === 'high') {
      this.requestQueue.unshift(request);
    } else {
      this.requestQueue.push(request);
    }
    
    logger.debug(`Added request to queue. Queue size: ${this.requestQueue.length}`);
  }

  getQueueStats(): QueueStats {
    return {
      pending: this.requestQueue.length,
      processing: this.processingRequests.size,
      completed: this.metrics.successfulRequests,
      failed: this.metrics.failedRequests,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  private calculateAverageWaitTime(): number {
    // Simplified calculation - could be enhanced with actual wait time tracking
    const queueSize = this.requestQueue.length;
    const avgExecutionTime = this.metrics.averageExecutionTime;
    
    return (queueSize * avgExecutionTime) / this.maxConcurrentRequests;
  }

  /**
   * Metrics and monitoring
   */
  getExecutionMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0,
      rateLimitHits: 0,
      proxyRotations: 0
    };
    
    logger.info('Execution metrics reset');
  }

  /**
   * Configuration management
   */
  setProxyPool(proxies: string[]): void {
    this.proxyPool = [...proxies];
    this.currentProxyIndex = 0;
    logger.info(`Proxy pool updated with ${proxies.length} proxies`);
  }

  clearProxyPool(): void {
    this.proxyPool = [];
    this.currentProxyIndex = 0;
    logger.info('Proxy pool cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const queueStats = this.getQueueStats();
      const metrics = this.getExecutionMetrics();
      const mcpStatus = this.mcpBridge ? 'connected' : 'disconnected';
      
      const healthScore = this.calculateHealthScore(metrics, queueStats);
      
      return {
        status: healthScore > 0.7 ? 'healthy' : healthScore > 0.4 ? 'degraded' : 'unhealthy',
        details: {
          mcpBridge: mcpStatus,
          queue: queueStats,
          metrics,
          healthScore,
          proxyPoolSize: this.proxyPool.length
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private calculateHealthScore(metrics: ExecutionMetrics, queue: QueueStats): number {
    const successRate = metrics.totalRequests > 0 ? 
      metrics.successfulRequests / metrics.totalRequests : 1;
      
    const queueHealthScore = queue.pending < 100 ? 1 : 
      queue.pending < 500 ? 0.7 : 0.3;
      
    const rateLimitScore = metrics.rateLimitHits < (metrics.totalRequests * 0.1) ? 1 : 0.5;
    
    return (successRate * 0.5) + (queueHealthScore * 0.3) + (rateLimitScore * 0.2);
  }

  /**
   * Cleanup and disposal
   */
  dispose(): void {
    this.requestQueue = [];
    this.processingRequests.clear();
    this.rateLimitTracker.clear();
    this.proxyPool = [];
    this.mcpBridge = null;
    
    logger.info('ScrapingExecutionService disposed');
  }
}

export default ScrapingExecutionService;