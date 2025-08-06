/**
 * Bright Data Product Service (Refactored)
 * Enhanced product scraping using Bright Data MCP tools
 * Supports Amazon, eBay, Walmart, Best Buy, Etsy, and 20+ more platforms
 * 
 * This is a refactored version of the original 5,045-line service,
 * now broken down into focused, single-responsibility services
 */

import { ProductData, FetchResult } from './ProductDataFetchService';
import { urlAnalysisService } from './UrlAnalysisService';

// Import our refactored services
import { ProductSearchService } from './product-scraping/ProductSearchService';
import { ProductCacheService } from './product-scraping/ProductCacheService';
import { ProductValidationService } from './product-scraping/ProductValidationService';
import { ProductDataService } from './product-scraping/ProductDataService';
import { BrightDataConfig, ScrapeOptions } from './product-scraping/types';

export { BrightDataConfig, ScrapeOptions };

export class BrightDataProductServiceRefactored {
  private searchService: ProductSearchService;
  private cacheService: ProductCacheService;
  private validationService: ProductValidationService;
  private dataService: ProductDataService;

  constructor(private config: BrightDataConfig) {
    // Initialize all our focused services
    this.searchService = ProductSearchService.getInstance();
    this.cacheService = ProductCacheService.getInstance({
      defaultTimeout: config.cacheTimeout || 30 * 60 * 1000 // 30 minutes
    });
    this.validationService = ProductValidationService.getInstance();
    this.dataService = ProductDataService.getInstance();
  }

  /**
   * Main method to fetch product data
   * Now much cleaner and focused on orchestration
   */
  async fetchProductData(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    try {
      // Step 1: Check cache first (using dedicated cache service)
      const cached = this.cacheService.get(url);
      if (cached) {
        console.log('✓ Cache hit for URL:', url);
        return cached;
      }

      // Step 2: Validate URL and detect platform (using search service)
      if (!this.searchService.isPlatformSupported(url)) {
        return {
          success: false,
          error: 'Unsupported platform. We support Amazon, eBay, Walmart, Best Buy, and 20+ other major retailers.',
          source: 'validation'
        };
      }

      const platform = this.searchService.detectPlatform(url)!;
      console.log('🔍 Detected platform:', platform);

      // Step 3: Scrape data (using data service)
      const result = await this.dataService.scrapeProductData(url, options);

      // Step 4: Validate and enhance data if scraping was successful
      if (result.success && result.data) {
        const platformConfig = this.searchService.getPlatformConfig(platform);
        
        // Validate data quality
        const validation = this.validationService.validateProduct(
          result.data,
          platform,
          platformConfig || undefined
        );

        // Enhance data if validation passed
        if (validation.isValid) {
          const enhancement = this.validationService.enhanceProduct(result.data, {
            normalizeTitle: true,
            standardizeCurrency: true,
            validateWeight: true,
            enhanceImages: true
          });

          result.data = enhancement.enhancedData;
          
          // Add metadata about data quality
          (result as any).validation = {
            confidence: validation.confidence,
            qualityScore: enhancement.qualityScore,
            warnings: validation.warnings,
            enhancements: enhancement.enhancements
          };
        } else {
          // Still return data but with warnings
          (result as any).validation = {
            confidence: validation.confidence,
            errors: validation.errors,
            warnings: validation.warnings
          };
        }

        // Step 5: Cache successful results
        this.cacheService.set(url, result, platform);
        console.log('💾 Cached result for platform:', platform);
      }

      return result;

    } catch (error) {
      console.error('🚨 BrightData fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: 'service'
      };
    }
  }

  /**
   * Get platform-specific timing information for user feedback
   * Delegates to search service
   */
  getPlatformTimingInfo(url: string) {
    return this.searchService.getPlatformTimingInfo(url);
  }

  /**
   * Get user-friendly status message for a platform
   * Delegates to search service
   */
  getPlatformStatusMessage(url: string, status: 'starting' | 'polling' | 'completed' | 'failed'): string {
    return this.searchService.getPlatformStatusMessage(url, status);
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): string[] {
    return this.searchService.getSupportedPlatforms();
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(url: string): boolean {
    return this.searchService.isPlatformSupported(url);
  }

  /**
   * Get platform characteristics (fashion, luxury, etc.)
   */
  getPlatformCharacteristics(url: string) {
    const platform = this.searchService.detectPlatform(url);
    return platform ? this.searchService.getPlatformCharacteristics(platform) : null;
  }

  /**
   * Validate product data
   */
  validateProductData(data: ProductData, platform: string) {
    const config = this.searchService.getPlatformConfig(platform);
    return this.validationService.validateProduct(data, platform, config || undefined);
  }

  /**
   * Enhance product data
   */
  enhanceProductData(data: ProductData, options: any = {}) {
    return this.validationService.enhanceProduct(data, options);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Clear cache for specific platform
   */
  clearPlatformCache(platform: string): number {
    return this.cacheService.invalidatePlatform(platform);
  }

  /**
   * Get cached data for a URL
   */
  getCachedData(url: string): FetchResult | null {
    return this.cacheService.get(url);
  }

  /**
   * Check if URL is cached
   */
  isCached(url: string): boolean {
    return this.cacheService.has(url);
  }

  /**
   * Set cache timeout for a platform
   */
  setPlatformCacheTimeout(platform: string, timeoutMs: number): void {
    this.cacheService.setPlatformTimeout(platform, timeoutMs);
  }

  /**
   * Export cache data (for persistence)
   */
  exportCache() {
    return this.cacheService.export();
  }

  /**
   * Import cache data (from persistence)
   */
  importCache(entries: any[]) {
    this.cacheService.import(entries);
  }

  /**
   * Batch process multiple URLs
   */
  async batchFetchProductData(
    urls: string[], 
    options: ScrapeOptions = {},
    concurrency: number = 3
  ): Promise<Array<{ url: string; result: FetchResult }>> {
    const results: Array<{ url: string; result: FetchResult }> = [];
    
    // Process in batches to avoid overwhelming the service
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(async (url) => ({
        url,
        result: await this.fetchProductData(url, options)
      }));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    const cacheStats = this.cacheService.getStats();
    const supportedPlatforms = this.searchService.getSupportedPlatforms();
    
    return {
      status: 'healthy',
      version: '2.0.0',
      supportedPlatforms: supportedPlatforms.length,
      platforms: supportedPlatforms,
      cache: {
        enabled: true,
        entries: cacheStats.totalEntries,
        hitRatio: cacheStats.hitRatio,
        size: cacheStats.cacheSize
      },
      services: {
        search: 'active',
        cache: 'active',
        validation: 'active',
        data: 'active'
      }
    };
  }

  /**
   * Get platform-specific recommendations
   */
  getPlatformRecommendations(url: string) {
    const platform = this.searchService.detectPlatform(url);
    if (!platform) return null;

    const characteristics = this.searchService.getPlatformCharacteristics(platform);
    const config = this.searchService.getPlatformConfig(platform);
    
    const recommendations = [];
    
    if (characteristics.isFashion) {
      recommendations.push('Fashion item: Include size and color variants');
      recommendations.push('Consider seasonal pricing variations');
    }
    
    if (characteristics.isLuxury) {
      recommendations.push('Luxury item: Verify authenticity and materials');
      recommendations.push('Higher cache timeout recommended due to price stability');
    }
    
    if (characteristics.supportsWeight) {
      recommendations.push('Weight information available for shipping calculations');
    }
    
    if (config?.estimatedTime) {
      recommendations.push(`Estimated scraping time: ${config.estimatedTime}`);
    }
    
    return {
      platform,
      characteristics,
      recommendations,
      estimatedTime: config?.estimatedTime,
      pollingInterval: config?.pollingInterval
    };
  }
}

// Create singleton instance for backward compatibility
export const brightDataProductServiceRefactored = new BrightDataProductServiceRefactored({
  apiToken: process.env.BRIGHT_DATA_API_TOKEN || 'mock-token',
  cacheTimeout: 30 * 60 * 1000 // 30 minutes
});