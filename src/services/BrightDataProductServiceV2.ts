/**
 * BrightData Product Service V2 - Orchestrator
 * Coordinates specialized services for product scraping operations
 * Clean, focused orchestrator replacing the original 5,046-line monolithic service
 * 
 * ARCHITECTURE:
 * - Service orchestration and coordination
 * - High-level API for product scraping
 * - Error handling and recovery management
 * - Performance monitoring and optimization
 * - Clean separation of concerns
 * 
 * SERVICES COORDINATED:
 * - PlatformDetectionService: Platform identification and routing
 * - ScrapingConfigurationService: Platform-specific configurations
 * - ScrapingExecutionService: Core scraping and MCP integration
 * - ProductDataTransformationService: Data normalization and quality scoring
 * - ProductCacheService: Multi-layer caching strategy
 * - ScrapingErrorService: Error handling and recovery
 */

import { logger } from '@/utils/logger';
import { ProductData, FetchResult } from './ProductDataFetchService';
import { urlAnalysisService } from './UrlAnalysisService';

// Import all specialized services
import PlatformDetectionService from './product-scraping/PlatformDetectionService';
import ScrapingConfigurationService from './product-scraping/ScrapingConfigurationService';
import ScrapingExecutionService from './product-scraping/ScrapingExecutionService';
import ProductDataTransformationService from './product-scraping/ProductDataTransformationService';
import ProductCacheService from './product-scraping/ProductCacheService';
import ScrapingErrorService from './product-scraping/ScrapingErrorService';

export interface BrightDataConfig {
  apiToken: string;
  cacheTimeout?: number;
  enableCache?: boolean;
  maxRetries?: number;
  enableFallback?: boolean;
}

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  includeSpecifications?: boolean;
  includeFeatures?: boolean;
  includeBreadcrumbs?: boolean;
  includeRelatedProducts?: boolean;
  enhanceWithAI?: boolean;
  deliveryCountry?: string;
  priority?: 'low' | 'normal' | 'high';
  useProxy?: boolean;
  timeout?: number;
}

export interface ScrapingMetrics {
  totalRequests: number;
  successfulRequests: number;
  cacheHits: number;
  averageResponseTime: number;
  errorRate: number;
  platformStats: Record<string, { requests: number; successes: number; errors: number }>;
}

export class BrightDataProductServiceV2 {
  private static instance: BrightDataProductServiceV2;
  private platformDetection: PlatformDetectionService;
  private scrapingConfig: ScrapingConfigurationService;
  private scrapingExecution: ScrapingExecutionService;
  private dataTransformation: ProductDataTransformationService;
  private cacheService: ProductCacheService;
  private errorService: ScrapingErrorService;
  
  private config: BrightDataConfig = {
    apiToken: '',
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
    enableCache: true,
    maxRetries: 3,
    enableFallback: true
  };
  
  private metrics: ScrapingMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    errorRate: 0,
    platformStats: {}
  };

  constructor(config: Partial<BrightDataConfig> = {}) {
    this.config = { ...this.config, ...config };
    
    // Initialize all specialized services
    this.platformDetection = PlatformDetectionService.getInstance();
    this.scrapingConfig = ScrapingConfigurationService.getInstance();
    this.scrapingExecution = ScrapingExecutionService.getInstance();
    this.dataTransformation = ProductDataTransformationService.getInstance();
    this.cacheService = ProductCacheService.getInstance();
    this.errorService = ScrapingErrorService.getInstance();
    
    logger.info('BrightDataProductServiceV2 initialized with orchestrated services');
  }

  static getInstance(config?: Partial<BrightDataConfig>): BrightDataProductServiceV2 {
    if (!BrightDataProductServiceV2.instance) {
      BrightDataProductServiceV2.instance = new BrightDataProductServiceV2(config);
    }
    return BrightDataProductServiceV2.instance;
  }

  /**
   * Main product scraping orchestration method
   */
  async scrapeProduct(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;
      
      // Step 1: Platform detection and validation
      const platformInfo = this.platformDetection.detectPlatform(url);
      if (!platformInfo) {
        throw new Error(`Unsupported platform for URL: ${url}`);
      }
      
      this.updatePlatformStats(platformInfo.platform, 'request');
      logger.info(`Scraping ${platformInfo.platform} product: ${url}`);
      
      // Step 2: Check cache first (if enabled)
      if (this.config.enableCache) {
        const cachedResult = await this.cacheService.getCachedData(url, platformInfo.platform);
        if (cachedResult) {
          this.metrics.cacheHits++;
          logger.debug(`Cache hit for ${platformInfo.platform} product`);
          
          return {
            success: true,
            data: cachedResult,
            source: 'cache',
            platform: platformInfo.platform,
            executionTime: Date.now() - startTime
          };
        }
      }
      
      // Step 3: Get scraping configuration
      const config = this.scrapingConfig.getScrapingConfig(platformInfo.platform);
      if (!config) {
        throw new Error(`No scraping configuration found for platform: ${platformInfo.platform}`);
      }
      
      // Step 4: Execute scraping with error handling
      const scrapingResult = await this.executeScrapingWithRetry(
        url, 
        platformInfo.platform, 
        config.scraperType, 
        options
      );
      
      if (!scrapingResult.success) {
        throw new Error(scrapingResult.error || 'Scraping failed');
      }
      
      // Step 5: Transform and validate data
      const transformationResult = await this.dataTransformation.transformProductData(
        scrapingResult.data,
        platformInfo.platform,
        url,
        {
          enhanceWithAI: options.enhanceWithAI,
          deliveryCountry: options.deliveryCountry,
          includePricing: true,
          includeWeight: true,
          validateRequired: true
        }
      );
      
      if (!transformationResult.success) {
        logger.warn(`Data transformation failed: ${transformationResult.error}`);
      }
      
      // Step 6: Cache successful results
      if (this.config.enableCache && transformationResult.data) {
        await this.cacheService.setCachedData(
          url, 
          transformationResult.data, 
          platformInfo.platform, 
          options.priority || 'normal'
        );
      }
      
      // Step 7: Update metrics and return
      this.metrics.successfulRequests++;
      this.updatePlatformStats(platformInfo.platform, 'success');
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return {
        success: true,
        data: transformationResult.data || scrapingResult.data,
        source: 'scraper',
        platform: platformInfo.platform,
        executionTime: Date.now() - startTime,
        qualityScore: transformationResult.qualityMetrics?.overallScore,
        transformationApplied: transformationResult.success
      };
      
    } catch (error) {
      return await this.handleScrapingError(error, url, startTime);
    }
  }

  /**
   * Execute scraping with retry logic
   */
  private async executeScrapingWithRetry(
    url: string,
    platform: string,
    scraperType: string,
    options: ScrapeOptions,
    retryCount: number = 0
  ): Promise<any> {
    try {
      const scrapingRequest = {
        platform,
        url,
        scraperType,
        options: {
          includeReviews: options.includeReviews,
          includeImages: options.includeImages,
          includeVariants: options.includeVariants,
          includeSpecifications: options.includeSpecifications,
          includeFeatures: options.includeFeatures,
          includeBreadcrumbs: options.includeBreadcrumbs,
          includeRelatedProducts: options.includeRelatedProducts,
          timeout: options.timeout,
          useProxy: options.useProxy,
          country: options.deliveryCountry
        },
        priority: options.priority || 'normal',
        retryCount,
        maxRetries: this.config.maxRetries || 3
      };
      
      return await this.scrapingExecution.executeScrapingRequest(scrapingRequest);
      
    } catch (error) {
      // Process error and determine recovery strategy
      const scrapingError = this.errorService.processError(error, url, platform, retryCount);
      const recoveryResult = await this.errorService.determineRecovery(scrapingError);
      
      if (recoveryResult.shouldRetry && retryCount < (this.config.maxRetries || 3)) {
        logger.info(`Retrying scraping after ${recoveryResult.nextRetryDelay || 0}ms`);
        
        if (recoveryResult.nextRetryDelay) {
          await this.delay(recoveryResult.nextRetryDelay);
        }
        
        return await this.executeScrapingWithRetry(url, platform, scraperType, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Handle scraping errors with fallback strategies
   */
  private async handleScrapingError(error: any, url: string, startTime: number): Promise<FetchResult> {
    const executionTime = Date.now() - startTime;
    this.updateAverageResponseTime(executionTime);
    this.updateErrorRate();
    
    // Try fallback scraping if enabled
    if (this.config.enableFallback) {
      try {
        logger.info('Attempting fallback scraping strategy');
        const fallbackResult = await this.attemptFallbackScraping(url);
        
        if (fallbackResult.success) {
          logger.info('Fallback scraping succeeded');
          return {
            ...fallbackResult,
            executionTime,
            fallbackUsed: true
          };
        }
      } catch (fallbackError) {
        logger.warn('Fallback scraping also failed:', fallbackError);
      }
    }
    
    logger.error(`Product scraping failed for URL: ${url}`, error);
    
    return {
      success: false,
      error: error.message || 'Product scraping failed',
      source: 'error',
      executionTime,
      platform: 'unknown'
    };
  }

  /**
   * Attempt fallback scraping strategies
   */
  private async attemptFallbackScraping(url: string): Promise<FetchResult> {
    try {
      // Use URL analysis service as fallback
      const analysis = await urlAnalysisService.analyzeProductUrl(url);
      
      if (analysis.productData) {
        return {
          success: true,
          data: analysis.productData,
          source: 'fallback',
          platform: analysis.platform || 'unknown',
          executionTime: 0
        };
      }
      
      throw new Error('Fallback analysis did not yield product data');
      
    } catch (error) {
      throw new Error(`Fallback scraping failed: ${error.message}`);
    }
  }

  /**
   * Bulk scraping with queue management
   */
  async scrapeMultipleProducts(urls: string[], options: ScrapeOptions = {}): Promise<FetchResult[]> {
    logger.info(`Starting bulk scraping for ${urls.length} URLs`);
    
    const results: FetchResult[] = [];
    const concurrencyLimit = 3; // Process 3 URLs concurrently
    
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(url => 
        this.scrapeProduct(url, options).catch(error => ({
          success: false,
          error: error.message,
          source: 'error',
          executionTime: 0,
          platform: 'unknown'
        } as FetchResult))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful
      if (i + concurrencyLimit < urls.length) {
        await this.delay(1000);
      }
    }
    
    logger.info(`Bulk scraping completed. ${results.filter(r => r.success).length}/${urls.length} successful`);
    return results;
  }

  /**
   * Health check and diagnostics
   */
  async getHealthStatus(): Promise<{ status: string; details: any }> {
    try {
      const [
        executionHealth,
        cacheHealth,
        errorHealth
      ] = await Promise.all([
        this.scrapingExecution.healthCheck(),
        this.cacheService.healthCheck(),
        Promise.resolve(this.errorService.getHealthStatus())
      ]);
      
      const overallHealthScore = (
        (executionHealth.details.healthScore || 0.5) * 0.4 +
        (cacheHealth.details.healthScore || 0.5) * 0.3 +
        (errorHealth.status === 'healthy' ? 1 : errorHealth.status === 'degraded' ? 0.7 : 0.3) * 0.3
      );
      
      const status = overallHealthScore > 0.8 ? 'healthy' : 
                    overallHealthScore > 0.6 ? 'degraded' : 'critical';
      
      return {
        status,
        details: {
          overallHealthScore,
          metrics: this.metrics,
          services: {
            execution: executionHealth,
            cache: cacheHealth,
            errors: errorHealth
          },
          platformStats: this.metrics.platformStats
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get comprehensive service metrics
   */
  getMetrics(): ScrapingMetrics {
    return {
      ...this.metrics,
      platformStats: { ...this.metrics.platformStats }
    };
  }

  /**
   * Get detailed cache statistics
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get error statistics and recent errors
   */
  getErrorStats() {
    return {
      stats: this.errorService.getErrorStats(),
      recentErrors: this.errorService.getErrorHistory(10)
    };
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    await this.cacheService.clearCache();
    logger.info('All caches cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BrightDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Service configuration updated');
  }

  /**
   * Private utility methods
   */
  private updatePlatformStats(platform: string, type: 'request' | 'success' | 'error'): void {
    if (!this.metrics.platformStats[platform]) {
      this.metrics.platformStats[platform] = { requests: 0, successes: 0, errors: 0 };
    }
    
    this.metrics.platformStats[platform][type === 'request' ? 'requests' : 
                                        type === 'success' ? 'successes' : 'errors']++;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    const currentAverage = this.metrics.averageResponseTime;
    
    this.metrics.averageResponseTime = 
      ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  private updateErrorRate(): void {
    const totalRequests = this.metrics.totalRequests;
    const failedRequests = totalRequests - this.metrics.successfulRequests;
    
    this.metrics.errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and disposal
   */
  dispose(): void {
    this.scrapingExecution.dispose();
    this.cacheService.dispose();
    this.errorService.dispose();
    
    logger.info('BrightDataProductServiceV2 disposed');
  }
}

export default BrightDataProductServiceV2;