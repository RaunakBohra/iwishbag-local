/**
 * Bright Data Product Service (Refactored)
 * Main orchestrating service that uses decomposed components
 */

import { logger } from '@/utils/logger';
import { platformConfigManager } from './PlatformConfigManager';
import { productScrapingEngine, ProductData, FetchResult, ScrapeOptions } from './ProductScrapingEngine';
import { dataValidationService, ValidationOptions, ValidationResult } from './DataValidationService';
import { weightEstimationService, WeightEstimationData } from './WeightEstimationService';
import { cacheService } from './CacheService';

export interface BrightDataOptions extends ScrapeOptions {
  useCache?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  validateData?: boolean;
  validationOptions?: ValidationOptions;
  estimateWeight?: boolean;
  learningEnabled?: boolean;
}

export interface EnhancedFetchResult extends FetchResult {
  validation?: ValidationResult;
  cacheHit?: boolean;
  processingTime?: number;
  platform?: string;
}

/**
 * Main Bright Data Product Service
 * Orchestrates all the decomposed components for a complete product scraping solution
 */
export class BrightDataProductService {
  private readonly defaultOptions: BrightDataOptions = {
    useCache: true,
    cacheEnabled: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    validateData: true,
    validationOptions: {
      requireImages: false,
      requireWeight: false,
      strictMode: false
    },
    estimateWeight: true,
    learningEnabled: true,
    includeReviews: false,
    includeImages: true,
    enhanceWithAI: false,
    timeout: 60000
  };

  constructor(options: Partial<BrightDataOptions> = {}) {
    // Merge options with defaults
    Object.assign(this.defaultOptions, options);
    
    logger.info('BrightDataProductService initialized', {
      cacheEnabled: this.defaultOptions.cacheEnabled,
      validationEnabled: this.defaultOptions.validateData,
      weightEstimationEnabled: this.defaultOptions.estimateWeight
    });
  }

  /**
   * Main method to fetch product data with full pipeline
   */
  async fetchProductData(url: string, options: BrightDataOptions = {}): Promise<EnhancedFetchResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      logger.info('Fetching product data', { url, platform: this.detectPlatform(url) });

      // Step 1: Check cache first
      if (opts.useCache && opts.cacheEnabled) {
        const cached = cacheService.getCachedProductData(url);
        if (cached) {
          logger.info('Cache hit for product data', { url });
          return {
            ...cached,
            cacheHit: true,
            processingTime: Date.now() - startTime,
            platform: this.detectPlatform(url)
          };
        }
      }

      // Step 2: Scrape product data
      const scrapingResult = await productScrapingEngine.scrapeProduct(url, opts);
      
      if (!scrapingResult.success) {
        return {
          ...scrapingResult,
          cacheHit: false,
          processingTime: Date.now() - startTime,
          platform: this.detectPlatform(url)
        };
      }

      let productData = scrapingResult.data!;
      let validationResult: ValidationResult | undefined;

      // Step 3: Validate and sanitize data
      if (opts.validateData && productData) {
        validationResult = dataValidationService.validateProductData(productData, opts.validationOptions);
        productData = validationResult.sanitizedData;
        
        logger.info('Data validation completed', {
          isValid: validationResult.isValid,
          quality: validationResult.quality.score,
          errors: validationResult.errors.length
        });
      }

      // Step 4: Estimate weight if missing
      if (opts.estimateWeight && (!productData.weight || productData.weight === 0)) {
        const weightData: WeightEstimationData = {
          title: productData.title,
          category: productData.category,
          brand: productData.brand,
          price: productData.price,
          specifications: productData.specifications,
          platform: this.detectPlatform(url)
        };

        const weightPrediction = weightEstimationService.estimateWeight(weightData);
        productData.weight = weightPrediction.weight;
        productData.weight_unit = weightPrediction.unit;
        
        logger.info('Weight estimation completed', {
          weight: weightPrediction.weight,
          confidence: weightPrediction.confidence,
          method: weightPrediction.method
        });
      }

      // Step 5: Create enhanced result
      const enhancedResult: EnhancedFetchResult = {
        success: true,
        data: productData,
        source: scrapingResult.source,
        validation: validationResult,
        cacheHit: false,
        processingTime: Date.now() - startTime,
        platform: this.detectPlatform(url)
      };

      // Step 6: Cache the result
      if (opts.cacheEnabled && enhancedResult.success) {
        cacheService.cacheProductData(url, {
          success: enhancedResult.success,
          data: enhancedResult.data,
          source: enhancedResult.source
        }, opts.cacheTTL);
      }

      // Step 7: Learn from the data if enabled
      if (opts.learningEnabled && productData.weight && productData.weight > 0) {
        this.learnFromProductData(url, productData);
      }

      logger.info('Product data fetch completed', {
        success: enhancedResult.success,
        platform: enhancedResult.platform,
        processingTime: enhancedResult.processingTime,
        cacheHit: enhancedResult.cacheHit
      });

      return enhancedResult;

    } catch (error) {
      logger.error('Product data fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'api',
        cacheHit: false,
        processingTime: Date.now() - startTime,
        platform: this.detectPlatform(url)
      };
    }
  }

  /**
   * Batch fetch multiple products
   */
  async fetchMultipleProducts(
    urls: string[], 
    options: BrightDataOptions = {},
    concurrency = 5
  ): Promise<Array<{ url: string; result: EnhancedFetchResult }>> {
    logger.info('Batch fetching products', { count: urls.length, concurrency });

    const results: Array<{ url: string; result: EnhancedFetchResult }> = [];
    
    // Process URLs in batches to control concurrency
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async url => {
        const result = await this.fetchProductData(url, options);
        return { url, result };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to be respectful to servers
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.result.success).length;
    logger.info('Batch fetch completed', { 
      total: urls.length, 
      successful: successCount,
      failed: urls.length - successCount 
    });

    return results;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): string[] {
    return platformConfigManager.getSupportedPlatforms();
  }

  /**
   * Check if URL is supported
   */
  isUrlSupported(url: string): boolean {
    return platformConfigManager.isUrlSupported(url);
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): string | null {
    return platformConfigManager.detectPlatform(url);
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(url: string): string {
    const platform = this.detectPlatform(url);
    return platformConfigManager.getPlatformDisplayName(platform);
  }

  /**
   * Get platform timing information
   */
  getPlatformTimingInfo(url: string): { estimatedTime: string; pollingInterval: string } {
    return platformConfigManager.getPlatformTimingInfo(url);
  }

  /**
   * Get platform status message
   */
  getPlatformStatusMessage(url: string, status: 'starting' | 'polling' | 'completed' | 'failed'): string {
    return platformConfigManager.getPlatformStatusMessage(url, status);
  }

  /**
   * Validate product data manually
   */
  validateProductData(data: ProductData, options: ValidationOptions = {}): ValidationResult {
    return dataValidationService.validateProductData(data, options);
  }

  /**
   * Estimate weight for product data
   */
  estimateProductWeight(data: WeightEstimationData) {
    return weightEstimationService.estimateWeight(data);
  }

  /**
   * Learn from actual weight data
   */
  learnFromActualWeight(data: WeightEstimationData, actualWeight: number): void {
    if (this.defaultOptions.learningEnabled) {
      weightEstimationService.learnFromActualWeight(data, actualWeight);
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    cache: any;
    weightLearning: any;
    platforms: string[];
  } {
    return {
      cache: cacheService.getStats(),
      weightLearning: weightEstimationService.getLearningStats(),
      platforms: this.getSupportedPlatforms()
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    cacheService.clear();
    logger.info('All caches cleared');
  }

  /**
   * Preload cache with common URLs
   */
  async preloadCache(urls: string[]): Promise<void> {
    await cacheService.preloadUrls(urls, (url) => this.fetchProductData(url, { useCache: false }));
  }

  /**
   * Export service data for backup
   */
  exportData(): any {
    return {
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      cache: cacheService.exportCache(),
      stats: this.getServiceStats()
    };
  }

  /**
   * Import service data from backup
   */
  importData(backupData: any): void {
    if (backupData.cache) {
      cacheService.importCache(backupData.cache);
    }
    logger.info('Service data import completed');
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check cache service
      const cacheStats = cacheService.getStats();
      details.cache = {
        entries: cacheStats.totalEntries,
        hitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage
      };

      if (cacheStats.memoryUsage > 90) {
        status = 'degraded';
        details.cache.warning = 'High memory usage';
      }

      // Check weight estimation service
      const weightStats = weightEstimationService.getLearningStats();
      details.weightEstimation = {
        samples: weightStats.totalSamples,
        accuracy: weightStats.averageAccuracy
      };

      // Check platform support
      details.platforms = {
        supported: this.getSupportedPlatforms().length,
        list: this.getSupportedPlatforms()
      };

      // Test a simple operation
      const testUrl = 'https://www.amazon.com/test';
      const isSupported = this.isUrlSupported(testUrl);
      details.test = { platformDetection: isSupported };

    } catch (error) {
      status = 'unhealthy';
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return { status, details };
  }

  /**
   * Private helper methods
   */
  private async learnFromProductData(url: string, productData: ProductData): void {
    try {
      if (!productData.weight || productData.weight <= 0) return;

      const weightData: WeightEstimationData = {
        title: productData.title,
        category: productData.category,
        brand: productData.brand,
        price: productData.price,
        specifications: productData.specifications,
        platform: this.detectPlatform(url)
      };

      weightEstimationService.learnFromActualWeight(weightData, productData.weight);
    } catch (error) {
      logger.warn('Learning from product data failed:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    cacheService.destroy();
    logger.info('BrightDataProductService destroyed');
  }
}

// Export singleton instance
export const brightDataProductService = new BrightDataProductService();