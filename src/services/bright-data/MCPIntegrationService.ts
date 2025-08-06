/**
 * MCP Integration Service
 * Bright Data MCP bridge for unified scraping interface
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { SupportedPlatform } from './PlatformDetectionService';
import * as Sentry from '@sentry/react';

export interface MCPRequest {
  tool: string;
  parameters: Record<string, any>;
  timeout?: number;
  retries?: number;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    dataSize: number;
    platform: SupportedPlatform;
    cached: boolean;
  };
}

export interface MCPConfig {
  maxRetries: number;
  defaultTimeout: number;
  rateLimitDelay: number;
  enableMocking: boolean;
}

export interface MCPStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsByPlatform: Record<SupportedPlatform, number>;
}

export class MCPIntegrationService {
  private config: MCPConfig;
  private stats: MCPStats;
  private requestQueue: MCPRequest[] = [];
  private activeRequests = new Set<string>();
  private rateLimitQueue = new Map<SupportedPlatform, number>();

  // Platform-specific MCP tool mappings
  private readonly PLATFORM_TOOLS: Record<SupportedPlatform, string> = {
    amazon: 'amazon_product',
    ebay: 'ebay_product',
    walmart: 'walmart_product',
    bestbuy: 'bestbuy_product',
    target: 'target_product',
    etsy: 'etsy_product',
    ae: 'ae_product',
    myntra: 'myntra_product',
    hm: 'hm_product',
    asos: 'asos_product',
    zara: 'zara_product',
    lego: 'lego_product',
    hermes: 'hermes_product',
    flipkart: 'flipkart_product',
    toysrus: 'toysrus_product',
    carters: 'carters_product',
    prada: 'prada_product',
    ysl: 'ysl_product',
    balenciaga: 'balenciaga_product',
    dior: 'dior_product',
    chanel: 'chanel_product',
    aliexpress: 'aliexpress_product',
    alibaba: 'alibaba_product',
    dhgate: 'dhgate_product',
    wish: 'wish_product',
    shein: 'shein_product',
    romwe: 'romwe_product',
    nordstrom: 'nordstrom_product',
    macys: 'macys_product',
    bloomingdales: 'bloomingdales_product',
    saks: 'saks_product',
    neimanmarcus: 'neimanmarcus_product',
  };

  // Rate limits per platform (requests per minute)
  private readonly RATE_LIMITS: Record<SupportedPlatform, number> = {
    amazon: 30, ebay: 40, walmart: 35, bestbuy: 30, target: 30,
    etsy: 25, ae: 20, myntra: 25, hm: 20, asos: 25, zara: 20,
    lego: 15, hermes: 10, flipkart: 30, toysrus: 20, carters: 20,
    prada: 10, ysl: 10, balenciaga: 10, dior: 10, chanel: 10,
    aliexpress: 60, alibaba: 45, dhgate: 40, wish: 50, shein: 40,
    romwe: 35, nordstrom: 25, macys: 25, bloomingdales: 25,
    saks: 15, neimanmarcus: 15,
  };

  constructor(config: Partial<MCPConfig> = {}) {
    this.config = {
      maxRetries: 3,
      defaultTimeout: 60000,
      rateLimitDelay: 1000,
      enableMocking: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      requestsByPlatform: {} as Record<SupportedPlatform, number>,
    };

    logger.info('MCPIntegrationService initialized', { config: this.config });
  }

  /**
   * Execute MCP request for a specific platform
   */
  async executeRequest(
    platform: SupportedPlatform,
    url: string,
    options: Record<string, any> = {},
    requestOptions: Partial<MCPRequest> = {}
  ): Promise<MCPResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check rate limits
      await this.enforceRateLimit(platform);

      // Prepare MCP request
      const tool = this.PLATFORM_TOOLS[platform];
      if (!tool) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const request: MCPRequest = {
        tool,
        parameters: {
          url,
          ...options,
        },
        timeout: requestOptions.timeout || this.config.defaultTimeout,
        retries: requestOptions.retries || this.config.maxRetries,
      };

      // Track active request
      this.activeRequests.add(requestId);
      
      // Execute with retries
      const response = await this.executeWithRetries(request, platform);
      
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(platform, true, processingTime);

      // Enhance response with metadata
      response.metadata = {
        processingTime,
        dataSize: this.estimateDataSize(response.data),
        platform,
        cached: false,
      };

      logger.debug(`MCP request completed for ${platform}`, {
        processingTime,
        success: response.success,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(platform, false, processingTime);
      
      logger.error(`MCP request failed for ${platform}:`, error);
      Sentry.captureException(error, {
        extra: { platform, url, requestId },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MCP error',
        metadata: {
          processingTime,
          dataSize: 0,
          platform,
          cached: false,
        },
      };

    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Execute batch requests for multiple platforms
   */
  async executeBatch(
    requests: Array<{
      platform: SupportedPlatform;
      url: string;
      options?: Record<string, any>;
    }>
  ): Promise<MCPResponse[]> {
    const batchStartTime = Date.now();
    logger.info(`Executing batch MCP request with ${requests.length} items`);

    try {
      // Execute all requests in parallel with concurrency limit
      const concurrencyLimit = 5;
      const results: MCPResponse[] = [];
      
      for (let i = 0; i < requests.length; i += concurrencyLimit) {
        const batch = requests.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(req =>
          this.executeRequest(req.platform, req.url, req.options)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Batch request failed',
            });
          }
        }
      }

      const totalTime = Date.now() - batchStartTime;
      logger.info(`Batch MCP request completed`, {
        totalRequests: requests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalTime,
      });

      return results;

    } catch (error) {
      logger.error('Batch MCP request failed:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats(): MCPStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      requestsByPlatform: {} as Record<SupportedPlatform, number>,
    };
    
    logger.info('MCP statistics reset');
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(platform: SupportedPlatform): boolean {
    return platform in this.PLATFORM_TOOLS;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): SupportedPlatform[] {
    return Object.keys(this.PLATFORM_TOOLS) as SupportedPlatform[];
  }

  /**
   * Private implementation methods
   */
  private async executeWithRetries(request: MCPRequest, platform: SupportedPlatform): Promise<MCPResponse> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= request.retries!) {
      try {
        if (attempt > 0) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.debug(`Retrying MCP request for ${platform} (attempt ${attempt + 1})`);
        }

        const response = await this.executeMCPCall(request, platform);
        
        if (response.success) {
          if (attempt > 0) {
            logger.info(`MCP request succeeded after ${attempt} retries for ${platform}`);
          }
          return response;
        }

        // If not successful but no error, treat as failure
        throw new Error(response.error || 'MCP request returned unsuccessful result');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;
        
        if (attempt <= request.retries!) {
          logger.warn(`MCP request attempt ${attempt} failed for ${platform}:`, lastError.message);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private async executeMCPCall(request: MCPRequest, platform: SupportedPlatform): Promise<MCPResponse> {
    // If mocking is enabled, return mock data
    if (this.config.enableMocking) {
      return this.generateMockResponse(platform, request.parameters.url);
    }

    // In a real implementation, this would call the actual Bright Data MCP
    // For now, we'll simulate the call structure
    return new Promise((resolve, reject) => {
      // Simulate network delay
      const delay = 1000 + Math.random() * 2000;
      
      setTimeout(() => {
        // Simulate occasional failures
        if (Math.random() < 0.05) {
          reject(new Error('Simulated MCP network error'));
          return;
        }

        // Simulate timeout
        if (delay > request.timeout! * 0.8) {
          reject(new Error('MCP request timeout'));
          return;
        }

        resolve({
          success: true,
          data: this.generateMockProductData(platform, request.parameters.url),
        });
      }, Math.min(delay, request.timeout!));
    });
  }

  private generateMockResponse(platform: SupportedPlatform, url: string): MCPResponse {
    // Simulate processing delay
    const processingDelay = 500 + Math.random() * 1500;
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: Math.random() > 0.1, // 90% success rate
          data: Math.random() > 0.1 ? this.generateMockProductData(platform, url) : undefined,
          error: Math.random() > 0.1 ? undefined : 'Mock error for testing',
        });
      }, processingDelay);
    }) as Promise<MCPResponse>;
  }

  private generateMockProductData(platform: SupportedPlatform, url: string): any {
    const platformNames: Record<SupportedPlatform, string> = {
      amazon: 'Amazon', ebay: 'eBay', walmart: 'Walmart', bestbuy: 'Best Buy',
      target: 'Target', etsy: 'Etsy', ae: 'American Eagle', myntra: 'Myntra',
      hm: 'H&M', asos: 'ASOS', zara: 'Zara', lego: 'LEGO', hermes: 'Hermès',
      flipkart: 'Flipkart', toysrus: 'Toys"R"Us', carters: 'Carter\'s',
      prada: 'Prada', ysl: 'YSL', balenciaga: 'Balenciaga', dior: 'Dior',
      chanel: 'Chanel', aliexpress: 'AliExpress', alibaba: 'Alibaba',
      dhgate: 'DHgate', wish: 'Wish', shein: 'SHEIN', romwe: 'ROMWE',
      nordstrom: 'Nordstrom', macys: 'Macy\'s', bloomingdales: 'Bloomingdale\'s',
      saks: 'Saks', neimanmarcus: 'Neiman Marcus',
    };

    return {
      title: `Sample ${platformNames[platform]} Product`,
      price: Math.floor(Math.random() * 1000) + 10,
      currency: this.getPlatformCurrency(platform),
      images: [
        `https://example.com/${platform}/image1.jpg`,
        `https://example.com/${platform}/image2.jpg`,
      ],
      brand: `Mock Brand`,
      category: this.getPlatformCategory(platform),
      availability: Math.random() > 0.2 ? 'in-stock' : 'out-of-stock',
      description: `This is a sample product from ${platformNames[platform]} for testing purposes.`,
      rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
      reviews_count: Math.floor(Math.random() * 1000),
      specifications: {
        'Material': 'Mock Material',
        'Color': ['Red', 'Blue', 'Green'][Math.floor(Math.random() * 3)],
        'Size': ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)],
      },
      scraped_at: new Date().toISOString(),
    };
  }

  private getPlatformCurrency(platform: SupportedPlatform): string {
    const currencyMap: Partial<Record<SupportedPlatform, string>> = {
      myntra: 'INR',
      flipkart: 'INR',
      hermes: 'EUR',
      prada: 'EUR',
      dior: 'EUR',
      chanel: 'EUR',
    };

    return currencyMap[platform] || 'USD';
  }

  private getPlatformCategory(platform: SupportedPlatform): string {
    const categoryMap: Partial<Record<SupportedPlatform, string>> = {
      bestbuy: 'electronics',
      lego: 'toys',
      toysrus: 'toys',
      carters: 'baby-clothing',
      ae: 'fashion',
      myntra: 'fashion',
      hm: 'fashion',
      asos: 'fashion',
      zara: 'fashion',
      hermes: 'luxury',
      prada: 'luxury',
      ysl: 'luxury',
      balenciaga: 'luxury',
      dior: 'luxury',
      chanel: 'luxury',
    };

    return categoryMap[platform] || 'general';
  }

  private async enforceRateLimit(platform: SupportedPlatform): Promise<void> {
    const rateLimit = this.RATE_LIMITS[platform] || 30;
    const lastRequest = this.rateLimitQueue.get(platform) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    const minInterval = 60000 / rateLimit; // Convert per minute to milliseconds

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting ${platform}: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.rateLimitQueue.set(platform, Date.now());
  }

  private updateStats(platform: SupportedPlatform, success: boolean, processingTime: number): void {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update platform-specific stats
    this.stats.requestsByPlatform[platform] = 
      (this.stats.requestsByPlatform[platform] || 0) + 1;

    // Update average response time
    const totalTime = (this.stats.averageResponseTime * (this.stats.totalRequests - 1)) + processingTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    // Update error rate
    this.stats.errorRate = (this.stats.failedRequests / this.stats.totalRequests) * 100;
  }

  private estimateDataSize(data: any): number {
    if (!data) return 0;
    
    try {
      return JSON.stringify(data).length * 2; // Rough estimate in bytes
    } catch {
      return 0;
    }
  }

  private generateRequestId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Cancel all active requests
    this.activeRequests.clear();
    this.requestQueue.length = 0;
    this.rateLimitQueue.clear();
    
    logger.info('MCPIntegrationService disposed');
  }
}

export default MCPIntegrationService;