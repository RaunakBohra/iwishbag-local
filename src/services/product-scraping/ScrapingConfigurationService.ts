/**
 * Scraping Configuration Service
 * Manages platform-specific scraping configurations, fields, and settings
 * Decomposed from BrightDataProductService for focused configuration management
 * 
 * RESPONSIBILITIES:
 * - Platform-specific scraping field configurations
 * - Category mapping and classification rules
 * - Weight field extraction configurations
 * - Currency mapping and detection rules
 * - Anti-bot measure configurations
 * - Rate limiting and throttling settings
 * - Scraper parameter optimization
 */

import { logger } from '@/utils/logger';
import { PlatformCategory } from './PlatformDetectionService';

export interface ScrapingConfig {
  platform: string;
  scraperType: string;
  fields: string[];
  options: ScrapingOptions;
  categoryMapping: Record<string, string>;
  currencyConfig: CurrencyConfig;
  weightConfig: WeightConfig;
  rateLimit: RateLimitConfig;
  antiBot: AntiBotConfig;
}

export interface ScrapingOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  includeSpecifications?: boolean;
  includeFeatures?: boolean;
  includeBreadcrumbs?: boolean;
  includeRelatedProducts?: boolean;
  maxImages?: number;
  maxVariants?: number;
  timeout?: number;
}

export interface CurrencyConfig {
  defaultCurrency: string;
  currencyMap: Record<string, string>;
  currencyDetection: boolean;
  fallbackCurrency?: string;
}

export interface WeightConfig {
  weightFields: string[];
  weightSelectors: string[];
  supportedUnits: string[];
  defaultUnit: string;
  estimationRules: WeightEstimationRule[];
}

export interface WeightEstimationRule {
  category: string;
  titlePatterns: string[];
  baseWeight: number;
  multipliers: Record<string, number>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentRequests: number;
  backoffMultiplier: number;
  maxRetries: number;
}

export interface AntiBotConfig {
  rotateUserAgents: boolean;
  useProxies: boolean;
  randomDelay: { min: number; max: number };
  respectRobotsTxt: boolean;
  sessionRotation: boolean;
}

export class ScrapingConfigurationService {
  private static instance: ScrapingConfigurationService;
  private configCache = new Map<string, ScrapingConfig>();
  private readonly cacheTTL = 30 * 60 * 1000; // 30 minutes cache

  constructor() {
    logger.info('ScrapingConfigurationService initialized');
  }

  static getInstance(): ScrapingConfigurationService {
    if (!ScrapingConfigurationService.instance) {
      ScrapingConfigurationService.instance = new ScrapingConfigurationService();
    }
    return ScrapingConfigurationService.instance;
  }

  /**
   * Get scraping configuration for platform
   */
  getScrapingConfig(platform: string): ScrapingConfig | null {
    try {
      const cacheKey = this.createCacheKey('scraping_config', { platform });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached scraping config');
        return cached;
      }

      const config = this.buildScrapingConfig(platform);
      if (config) {
        this.setCache(cacheKey, config);
        logger.info(`Generated scraping config for platform: ${platform}`);
      }

      return config;

    } catch (error) {
      logger.error('Failed to get scraping config:', error);
      return null;
    }
  }

  /**
   * Build comprehensive scraping configuration for platform
   */
  private buildScrapingConfig(platform: string): ScrapingConfig | null {
    const configs = this.getPlatformConfigs();
    const baseConfig = configs[platform];
    
    if (!baseConfig) {
      logger.warn(`No configuration found for platform: ${platform}`);
      return null;
    }

    return {
      platform,
      scraperType: baseConfig.scraperType,
      fields: baseConfig.fields,
      options: baseConfig.options,
      categoryMapping: baseConfig.categoryMapping,
      currencyConfig: baseConfig.currencyConfig,
      weightConfig: baseConfig.weightConfig,
      rateLimit: baseConfig.rateLimit,
      antiBot: baseConfig.antiBot
    };
  }

  /**
   * Get all platform configurations
   */
  private getPlatformConfigs(): Record<string, any> {
    return {
      amazon: {
        scraperType: 'amazon_product',
        fields: ['title', 'price', 'currency', 'images', 'weight', 'brand', 'availability', 'rating', 'reviews_count'],
        options: {
          includeReviews: true,
          includeImages: true,
          includeVariants: true,
          includeSpecifications: true,
          maxImages: 8,
          maxVariants: 10,
          timeout: 60000
        },
        categoryMapping: {
          'Electronics': 'electronics',
          'Computers': 'electronics',
          'Cell Phones': 'electronics',
          'Clothing': 'fashion',
          'Shoes': 'footwear',
          'Books': 'books',
          'Home & Kitchen': 'home',
          'Sports': 'sports',
          'Toys & Games': 'toys',
          'Beauty': 'beauty'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₹': 'INR' },
          currencyDetection: true,
          fallbackCurrency: 'USD'
        },
        weightConfig: {
          weightFields: ['shipping_weight', 'item_weight', 'package_weight'],
          weightSelectors: ['.shipping-weight', '.item-weight', '.weight'],
          supportedUnits: ['g', 'kg', 'oz', 'lb', 'lbs', 'pounds'],
          defaultUnit: 'kg',
          estimationRules: [
            {
              category: 'electronics',
              titlePatterns: ['phone', 'smartphone'],
              baseWeight: 0.2,
              multipliers: { 'mini': 0.7, 'plus': 1.3, 'pro': 1.2 }
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 10,
          requestsPerHour: 200,
          concurrentRequests: 3,
          backoffMultiplier: 2.0,
          maxRetries: 3
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 2000, max: 5000 },
          respectRobotsTxt: true,
          sessionRotation: true
        }
      },

      ebay: {
        scraperType: 'ebay_product',
        fields: ['title', 'price', 'currency', 'images', 'condition', 'shipping'],
        options: {
          includeReviews: false,
          includeImages: true,
          includeVariants: true,
          maxImages: 6,
          timeout: 45000
        },
        categoryMapping: {
          'Electronics': 'electronics',
          'Fashion': 'fashion',
          'Collectibles': 'general',
          'Home & Garden': 'home',
          'Sporting Goods': 'sports',
          'Toys & Hobbies': 'toys',
          'Motors': 'automotive'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD', '£': 'GBP', '€': 'EUR' },
          currencyDetection: true
        },
        weightConfig: {
          weightFields: ['shipping_weight'],
          weightSelectors: ['.weight-info'],
          supportedUnits: ['g', 'kg', 'oz', 'lb'],
          defaultUnit: 'kg',
          estimationRules: []
        },
        rateLimit: {
          requestsPerMinute: 8,
          requestsPerHour: 150,
          concurrentRequests: 2,
          backoffMultiplier: 2.5,
          maxRetries: 3
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 3000, max: 6000 },
          respectRobotsTxt: true,
          sessionRotation: false
        }
      },

      walmart: {
        scraperType: 'walmart_product',
        fields: ['title', 'price', 'images', 'brand', 'model', 'specifications'],
        options: {
          includeReviews: true,
          includeImages: true,
          includeSpecifications: true,
          maxImages: 8,
          timeout: 50000
        },
        categoryMapping: {
          'Electronics': 'electronics',
          'Clothing': 'fashion',
          'Home': 'home',
          'Health & Wellness': 'beauty',
          'Sports & Recreation': 'sports'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD' },
          currencyDetection: false
        },
        weightConfig: {
          weightFields: ['shipping_weight', 'weight'],
          weightSelectors: ['.weight', '.shipping-weight'],
          supportedUnits: ['oz', 'lb', 'lbs'],
          defaultUnit: 'lb',
          estimationRules: []
        },
        rateLimit: {
          requestsPerMinute: 12,
          requestsPerHour: 300,
          concurrentRequests: 4,
          backoffMultiplier: 1.5,
          maxRetries: 2
        },
        antiBot: {
          rotateUserAgents: false,
          useProxies: false,
          randomDelay: { min: 1000, max: 3000 },
          respectRobotsTxt: false,
          sessionRotation: false
        }
      },

      bestbuy: {
        scraperType: 'bestbuy_product',
        fields: [
          'title', 'final_price', 'initial_price', 'currency', 'discount', 'images',
          'brand', 'model', 'sku', 'product_specifications', 'availability',
          'rating', 'reviews_count', 'features', 'breadcrumbs'
        ],
        options: {
          includeReviews: true,
          includeImages: true,
          includeSpecifications: true,
          includeFeatures: true,
          includeBreadcrumbs: true,
          maxImages: 10,
          timeout: 60000
        },
        categoryMapping: {
          'Computer Desks': 'home',
          'Office Furniture': 'home',
          'Laptops': 'electronics',
          'Desktop Computers': 'electronics',
          'Gaming': 'electronics',
          'TV & Home Theater': 'electronics',
          'Audio': 'electronics',
          'Cameras': 'electronics',
          'Cell Phones': 'electronics'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD' },
          currencyDetection: false
        },
        weightConfig: {
          weightFields: ['Product Weight', 'Shipping Weight', 'Weight'],
          weightSelectors: ['.weight-spec', '.product-weight'],
          supportedUnits: ['oz', 'lb', 'lbs', 'pounds'],
          defaultUnit: 'lb',
          estimationRules: [
            {
              category: 'electronics',
              titlePatterns: ['laptop'],
              baseWeight: 4.4, // 2kg in lbs
              multipliers: { 'ultrabook': 0.7, 'gaming': 1.5 }
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 15,
          requestsPerHour: 400,
          concurrentRequests: 5,
          backoffMultiplier: 1.2,
          maxRetries: 2
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: false,
          randomDelay: { min: 1500, max: 4000 },
          respectRobotsTxt: false,
          sessionRotation: false
        }
      },

      // Fashion platforms
      ae: {
        scraperType: 'ae_product',
        fields: ['product_name', 'final_price', 'currency', 'main_image', 'brand', 'description', 'availability', 'color', 'size'],
        options: {
          includeImages: true,
          includeVariants: true,
          maxImages: 6,
          timeout: 180000 // 3 minutes for fashion sites
        },
        categoryMapping: {
          'T-Shirts': 'fashion',
          'Shirts': 'fashion',
          'Hoodies & Sweatshirts': 'fashion',
          'Jeans': 'fashion',
          'Dresses': 'fashion'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD' },
          currencyDetection: false
        },
        weightConfig: {
          weightFields: [],
          weightSelectors: [],
          supportedUnits: ['g', 'kg'],
          defaultUnit: 'kg',
          estimationRules: [
            {
              category: 'fashion',
              titlePatterns: ['t-shirt', 'shirt'],
              baseWeight: 0.3,
              multipliers: { 'xs': 0.8, 's': 0.9, 'l': 1.1, 'xl': 1.2 }
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 2, // Slower for fashion sites
          requestsPerHour: 30,
          concurrentRequests: 1,
          backoffMultiplier: 3.0,
          maxRetries: 2
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 10000, max: 20000 }, // Longer delays
          respectRobotsTxt: true,
          sessionRotation: true
        }
      },

      myntra: {
        scraperType: 'myntra_product',
        fields: ['title', 'final_price', 'currency', 'images', 'brand', 'specifications', 'offers'],
        options: {
          includeImages: true,
          includeVariants: true,
          includeSpecifications: true,
          maxImages: 8,
          timeout: 45000
        },
        categoryMapping: {
          'Topwear': 'fashion',
          'Bottomwear': 'fashion',
          'Footwear': 'footwear',
          'Accessories': 'fashion'
        },
        currencyConfig: {
          defaultCurrency: 'INR',
          currencyMap: { '₹': 'INR' },
          currencyDetection: false
        },
        weightConfig: {
          weightFields: [],
          weightSelectors: [],
          supportedUnits: ['g', 'kg'],
          defaultUnit: 'kg',
          estimationRules: [
            {
              category: 'fashion',
              titlePatterns: ['kurta', 'saree'],
              baseWeight: 0.4,
              multipliers: {}
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 6,
          requestsPerHour: 100,
          concurrentRequests: 2,
          backoffMultiplier: 2.0,
          maxRetries: 3
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 2000, max: 5000 },
          respectRobotsTxt: true,
          sessionRotation: true
        }
      },

      // Luxury platforms
      hermes: {
        scraperType: 'hermes_product',
        fields: [
          'product_name', 'initial_price', 'final_price', 'currency', 'image_urls',
          'main_image', 'description', 'in_stock', 'size', 'color', 'brand',
          'material', 'country', 'product_details'
        ],
        options: {
          includeImages: true,
          includeVariants: true,
          includeSpecifications: true,
          maxImages: 12,
          timeout: 90000
        },
        categoryMapping: {
          'Bags': 'luxury-bags',
          'Scarves': 'luxury-accessories',
          'Jewelry': 'luxury-jewelry',
          'Watches': 'luxury-watches',
          'Perfume': 'luxury-fragrance'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD', '€': 'EUR' },
          currencyDetection: true
        },
        weightConfig: {
          weightFields: [],
          weightSelectors: [],
          supportedUnits: ['g', 'kg'],
          defaultUnit: 'kg',
          estimationRules: [
            {
              category: 'luxury',
              titlePatterns: ['bag', 'handbag'],
              baseWeight: 0.8,
              multipliers: { 'mini': 0.5, 'small': 0.7, 'large': 1.3 }
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 3,
          requestsPerHour: 50,
          concurrentRequests: 1,
          backoffMultiplier: 4.0,
          maxRetries: 2
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 15000, max: 30000 },
          respectRobotsTxt: true,
          sessionRotation: true
        }
      },

      flipkart: {
        scraperType: 'flipkart_product',
        fields: ['title', 'final_price', 'currency', 'brand', 'specifications', 'highlights', 'rating'],
        options: {
          includeSpecifications: true,
          includeImages: true,
          fallbackToMarkdown: true,
          maxImages: 6,
          timeout: 45000
        },
        categoryMapping: {
          'Electronics': 'electronics',
          'Fashion': 'fashion',
          'Home': 'home',
          'Books': 'books'
        },
        currencyConfig: {
          defaultCurrency: 'INR',
          currencyMap: { '₹': 'INR' },
          currencyDetection: false
        },
        weightConfig: {
          weightFields: ['weight'],
          weightSelectors: ['.weight'],
          supportedUnits: ['g', 'kg'],
          defaultUnit: 'kg',
          estimationRules: []
        },
        rateLimit: {
          requestsPerMinute: 8,
          requestsPerHour: 200,
          concurrentRequests: 3,
          backoffMultiplier: 2.0,
          maxRetries: 3
        },
        antiBot: {
          rotateUserAgents: true,
          useProxies: true,
          randomDelay: { min: 3000, max: 7000 },
          respectRobotsTxt: true,
          sessionRotation: true
        }
      },

      // Toys and baby
      lego: {
        scraperType: 'lego_product',
        fields: [
          'product_name', 'initial_price', 'final_price', 'currency', 'image_urls',
          'rating', 'reviews_count', 'description', 'in_stock', 'age_range',
          'piece_count', 'product_code', 'features'
        ],
        options: {
          includeFeatures: true,
          includeReviews: true,
          includeImages: true,
          includeRelatedProducts: true,
          maxImages: 8,
          timeout: 45000
        },
        categoryMapping: {
          'Architecture': 'building-sets',
          'City': 'building-sets',
          'Star Wars': 'building-sets',
          'DUPLO': 'early-learning'
        },
        currencyConfig: {
          defaultCurrency: 'USD',
          currencyMap: { '$': 'USD', '€': 'EUR' },
          currencyDetection: true
        },
        weightConfig: {
          weightFields: [],
          weightSelectors: [],
          supportedUnits: ['g', 'kg'],
          defaultUnit: 'kg',
          estimationRules: [
            {
              category: 'toys',
              titlePatterns: ['lego', 'building set'],
              baseWeight: 0.5,
              multipliers: { 'duplo': 0.3, 'technic': 1.2 }
            }
          ]
        },
        rateLimit: {
          requestsPerMinute: 10,
          requestsPerHour: 240,
          concurrentRequests: 3,
          backoffMultiplier: 1.5,
          maxRetries: 2
        },
        antiBot: {
          rotateUserAgents: false,
          useProxies: false,
          randomDelay: { min: 2000, max: 4000 },
          respectRobotsTxt: false,
          sessionRotation: false
        }
      }
    };
  }

  /**
   * Get category mapping for platform
   */
  getCategoryMapping(platform: string): Record<string, string> {
    const config = this.getScrapingConfig(platform);
    return config?.categoryMapping || {};
  }

  /**
   * Get currency configuration for platform
   */
  getCurrencyConfig(platform: string): CurrencyConfig | null {
    const config = this.getScrapingConfig(platform);
    return config?.currencyConfig || null;
  }

  /**
   * Get weight configuration for platform
   */
  getWeightConfig(platform: string): WeightConfig | null {
    const config = this.getScrapingConfig(platform);
    return config?.weightConfig || null;
  }

  /**
   * Get rate limit configuration for platform
   */
  getRateLimitConfig(platform: string): RateLimitConfig | null {
    const config = this.getScrapingConfig(platform);
    return config?.rateLimit || null;
  }

  /**
   * Get anti-bot configuration for platform
   */
  getAntiBotConfig(platform: string): AntiBotConfig | null {
    const config = this.getScrapingConfig(platform);
    return config?.antiBot || null;
  }

  /**
   * Get optimized scraping options for platform
   */
  getOptimizedScrapingOptions(platform: string, requestedOptions: Partial<ScrapingOptions> = {}): ScrapingOptions {
    const config = this.getScrapingConfig(platform);
    const defaultOptions = config?.options || {};
    
    return {
      ...defaultOptions,
      ...requestedOptions
    };
  }

  /**
   * Check if platform supports specific field
   */
  isFieldSupported(platform: string, field: string): boolean {
    const config = this.getScrapingConfig(platform);
    return config?.fields.includes(field) || false;
  }

  /**
   * Get supported fields for platform
   */
  getSupportedFields(platform: string): string[] {
    const config = this.getScrapingConfig(platform);
    return config?.fields || [];
  }

  /**
   * Calculate delay based on anti-bot configuration
   */
  calculateDelay(platform: string): number {
    const config = this.getAntiBotConfig(platform);
    if (!config?.randomDelay) {
      return 1000; // Default 1 second
    }

    const { min, max } = config.randomDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Check if rate limit allows request
   */
  checkRateLimit(platform: string, requestsInLastMinute: number, requestsInLastHour: number): boolean {
    const config = this.getRateLimitConfig(platform);
    if (!config) return true;

    return requestsInLastMinute < config.requestsPerMinute && 
           requestsInLastHour < config.requestsPerHour;
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        keyParts.push(`${key}:${params[key]}`);
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.configCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.configCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.configCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    logger.info('Scraping configuration cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.configCache.size,
      entries: Array.from(this.configCache.keys())
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('ScrapingConfigurationService disposed');
  }
}

export default ScrapingConfigurationService;