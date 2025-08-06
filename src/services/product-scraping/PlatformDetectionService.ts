/**
 * Platform Detection Service
 * Handles platform identification, URL analysis, and routing logic for scraping
 * Decomposed from BrightDataProductService for focused platform management
 * 
 * RESPONSIBILITIES:
 * - URL pattern matching and platform identification
 * - Country and region detection from URLs
 * - Platform capability detection and routing
 * - Marketplace-specific URL parsing and validation
 * - Platform display name generation
 * - Scraping strategy selection based on platform
 */

import { logger } from '@/utils/logger';

export interface PlatformInfo {
  platform: string;
  country: string;
  marketplace: string;
  isUSMarketplace: boolean;
  displayName: string;
  capabilities: PlatformCapabilities;
  scraperType: string;
}

export interface PlatformCapabilities {
  supportsReviews: boolean;
  supportsImages: boolean;
  supportsVariants: boolean;
  supportsWeight: boolean;
  supportsSpecs: boolean;
  requiresAuth: boolean;
  hasRateLimit: boolean;
  estimatedTime: string;
  pollingInterval: string;
  category: PlatformCategory;
}

export type PlatformCategory = 'general' | 'electronics' | 'fashion' | 'luxury' | 'toys' | 'baby' | 'beauty';

export interface SupportedPlatform {
  key: string;
  name: string;
  scraperType: string;
  urlPatterns: string[];
  defaultCountry: string;
  defaultCurrency: string;
  category: PlatformCategory;
  capabilities: Omit<PlatformCapabilities, 'category'>;
}

export class PlatformDetectionService {
  private static instance: PlatformDetectionService;
  private platformCache = new Map<string, PlatformInfo>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes cache for platform detection

  constructor() {
    logger.info('PlatformDetectionService initialized');
  }

  static getInstance(): PlatformDetectionService {
    if (!PlatformDetectionService.instance) {
      PlatformDetectionService.instance = new PlatformDetectionService();
    }
    return PlatformDetectionService.instance;
  }

  /**
   * Get supported platforms configuration
   */
  getSupportedPlatforms(): SupportedPlatform[] {
    return [
      {
        key: 'amazon',
        name: 'Amazon',
        scraperType: 'amazon_product',
        urlPatterns: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.ca', 'amazon.in', 'amazon.co.jp', 'amazon.com.au'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'general',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: true,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'ebay',
        name: 'eBay',
        scraperType: 'ebay_product',
        urlPatterns: ['ebay.com', 'ebay.co.uk', 'ebay.de', 'ebay.fr', 'ebay.ca', 'ebay.com.au'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'general',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'walmart',
        name: 'Walmart',
        scraperType: 'walmart_product',
        urlPatterns: ['walmart.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'general',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'bestbuy',
        name: 'Best Buy',
        scraperType: 'bestbuy_product',
        urlPatterns: ['bestbuy.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'electronics',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: true,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'ae',
        name: 'American Eagle',
        scraperType: 'ae_product',
        urlPatterns: ['ae.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'fashion',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '5-30 minutes',
          pollingInterval: '5 minutes'
        }
      },
      {
        key: 'myntra',
        name: 'Myntra',
        scraperType: 'myntra_product',
        urlPatterns: ['myntra.com'],
        defaultCountry: 'IN',
        defaultCurrency: 'INR',
        category: 'fashion',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'target',
        name: 'Target',
        scraperType: 'target_product',
        urlPatterns: ['target.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'general',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'hm',
        name: 'H&M',
        scraperType: 'hm_product',
        urlPatterns: ['hm.com'],
        defaultCountry: 'SE',
        defaultCurrency: 'SEK',
        category: 'fashion',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'asos',
        name: 'ASOS',
        scraperType: 'asos_product',
        urlPatterns: ['asos.com'],
        defaultCountry: 'GB',
        defaultCurrency: 'GBP',
        category: 'fashion',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'etsy',
        name: 'Etsy',
        scraperType: 'etsy_product',
        urlPatterns: ['etsy.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'general',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: false,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'zara',
        name: 'Zara',
        scraperType: 'zara_product',
        urlPatterns: ['zara.com'],
        defaultCountry: 'ES',
        defaultCurrency: 'EUR',
        category: 'fashion',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'lego',
        name: 'LEGO',
        scraperType: 'lego_product',
        urlPatterns: ['lego.com'],
        defaultCountry: 'DK',
        defaultCurrency: 'USD',
        category: 'toys',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: false,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'hermes',
        name: 'Hermès',
        scraperType: 'hermes_product',
        urlPatterns: ['hermes.com'],
        defaultCountry: 'FR',
        defaultCurrency: 'USD',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'flipkart',
        name: 'Flipkart',
        scraperType: 'flipkart_product',
        urlPatterns: ['flipkart.com'],
        defaultCountry: 'IN',
        defaultCurrency: 'INR',
        category: 'general',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'toysrus',
        name: 'Toys"R"Us',
        scraperType: 'toysrus_product',
        urlPatterns: ['toysrus.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'toys',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: true,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'carters',
        name: 'Carter\'s',
        scraperType: 'carters_product',
        urlPatterns: ['carters.com'],
        defaultCountry: 'US',
        defaultCurrency: 'USD',
        category: 'baby',
        capabilities: {
          supportsReviews: true,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'prada',
        name: 'Prada',
        scraperType: 'prada_product',
        urlPatterns: ['prada.com'],
        defaultCountry: 'IT',
        defaultCurrency: 'EUR',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'ysl',
        name: 'Yves Saint Laurent',
        scraperType: 'ysl_product',
        urlPatterns: ['ysl.com'],
        defaultCountry: 'FR',
        defaultCurrency: 'USD',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'balenciaga',
        name: 'Balenciaga',
        scraperType: 'balenciaga_product',
        urlPatterns: ['balenciaga.com'],
        defaultCountry: 'FR',
        defaultCurrency: 'USD',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'dior',
        name: 'Dior',
        scraperType: 'dior_product',
        urlPatterns: ['dior.com'],
        defaultCountry: 'FR',
        defaultCurrency: 'EUR',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      },
      {
        key: 'chanel',
        name: 'Chanel',
        scraperType: 'chanel_product',
        urlPatterns: ['chanel.com'],
        defaultCountry: 'FR',
        defaultCurrency: 'VND',
        category: 'luxury',
        capabilities: {
          supportsReviews: false,
          supportsImages: true,
          supportsVariants: true,
          supportsWeight: false,
          supportsSpecs: true,
          requiresAuth: false,
          hasRateLimit: true,
          estimatedTime: '15-60 seconds',
          pollingInterval: '15 seconds'
        }
      }
    ];
  }

  /**
   * Detect platform from URL with comprehensive analysis
   */
  detectPlatform(url: string): PlatformInfo | null {
    try {
      const cacheKey = this.createCacheKey('platform_detection', { url });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached platform detection');
        return cached;
      }

      const urlLower = url.toLowerCase();
      const supportedPlatforms = this.getSupportedPlatforms();

      // Find matching platform
      const matchedPlatform = supportedPlatforms.find(platform =>
        platform.urlPatterns.some(pattern => urlLower.includes(pattern))
      );

      if (!matchedPlatform) {
        logger.warn(`Unsupported platform for URL: ${url}`);
        return null;
      }

      // Detect country and region
      const country = this.detectCountryFromUrl(url, matchedPlatform);
      const isUSMarketplace = this.isUSMarketplace(url);
      const displayName = this.generateDisplayName(matchedPlatform.key, country);

      const platformInfo: PlatformInfo = {
        platform: matchedPlatform.key,
        country,
        marketplace: matchedPlatform.name,
        isUSMarketplace,
        displayName,
        capabilities: {
          ...matchedPlatform.capabilities,
          category: matchedPlatform.category
        },
        scraperType: matchedPlatform.scraperType
      };

      this.setCache(cacheKey, platformInfo);
      logger.info(`Detected platform: ${platformInfo.platform} (${country}) for ${url}`);
      return platformInfo;

    } catch (error) {
      logger.error('Platform detection failed:', error);
      return null;
    }
  }

  /**
   * Detect country from marketplace URL
   */
  private detectCountryFromUrl(url: string, platform: SupportedPlatform): string {
    const urlLower = url.toLowerCase();

    switch (platform.key) {
      case 'amazon':
        return this.detectAmazonCountry(urlLower);
      case 'hm':
        return this.detectHMCountry(urlLower);
      case 'asos':
        return this.detectAsosCountry(urlLower);
      case 'ebay':
        return this.detectEbayCountry(urlLower);
      default:
        return platform.defaultCountry;
    }
  }

  /**
   * Amazon country detection
   */
  private detectAmazonCountry(urlLower: string): string {
    const amazonCountryMap = {
      'amazon.com': 'US',
      'amazon.co.uk': 'GB',
      'amazon.de': 'DE',
      'amazon.fr': 'FR',
      'amazon.ca': 'CA',
      'amazon.com.au': 'AU',
      'amazon.co.jp': 'JP',
      'amazon.in': 'IN',
      'amazon.it': 'IT',
      'amazon.es': 'ES',
      'amazon.com.mx': 'MX',
      'amazon.com.br': 'BR',
      'amazon.nl': 'NL',
      'amazon.se': 'SE'
    };

    for (const [domain, country] of Object.entries(amazonCountryMap)) {
      if (urlLower.includes(domain)) {
        return country;
      }
    }

    return 'US'; // Default to US for Amazon
  }

  /**
   * H&M country detection
   */
  private detectHMCountry(urlLower: string): string {
    // Pattern: /en_{country_code} or /{lang}_{country}
    const hmCountryMatch = urlLower.match(/\/en_([a-z]{2})/);
    if (hmCountryMatch) {
      return hmCountryMatch[1].toUpperCase();
    }

    const hmLocaleMatch = urlLower.match(/\/([a-z]{2})_([a-z]{2})/);
    if (hmLocaleMatch) {
      return hmLocaleMatch[2].toUpperCase();
    }

    // Fallback patterns
    const hmFallbacks = {
      '/en_us/': 'US',
      '/en_gb/': 'GB',
      '/en_in/': 'IN',
      '/en_ca/': 'CA',
      '/en_au/': 'AU',
      '/de_de/': 'DE',
      '/fr_fr/': 'FR',
      '/es_es/': 'ES',
      '/it_it/': 'IT'
    };

    for (const [pattern, country] of Object.entries(hmFallbacks)) {
      if (urlLower.includes(pattern)) {
        return country;
      }
    }

    return 'SE'; // H&M default (Swedish company)
  }

  /**
   * ASOS country detection
   */
  private detectAsosCountry(urlLower: string): string {
    // Pattern: asos.com/{country}/
    const asosCountryMatch = urlLower.match(/asos\.com\/([a-z]{2})\//);
    if (asosCountryMatch) {
      return asosCountryMatch[1].toUpperCase();
    }

    return 'GB'; // ASOS default (UK company)
  }

  /**
   * eBay country detection
   */
  private detectEbayCountry(urlLower: string): string {
    const ebayCountryMap = {
      'ebay.com': 'US',
      'ebay.co.uk': 'GB',
      'ebay.de': 'DE',
      'ebay.fr': 'FR',
      'ebay.ca': 'CA',
      'ebay.com.au': 'AU',
      'ebay.it': 'IT',
      'ebay.es': 'ES'
    };

    for (const [domain, country] of Object.entries(ebayCountryMap)) {
      if (urlLower.includes(domain)) {
        return country;
      }
    }

    return 'US'; // Default to US for eBay
  }

  /**
   * Check if URL represents a US marketplace
   */
  private isUSMarketplace(url: string): boolean {
    const urlLower = url.toLowerCase();
    const usMarketplaces = [
      'walmart.com',
      'bestbuy.com',
      'target.com',
      'ae.com',
      'toysrus.com',
      'carters.com'
    ];

    // Check direct US marketplaces
    if (usMarketplaces.some(marketplace => urlLower.includes(marketplace))) {
      return true;
    }

    // Check Amazon US
    if (urlLower.includes('amazon.com') && !urlLower.includes('amazon.com.')) {
      return true;
    }

    // Check eBay US
    if (urlLower.includes('ebay.com') && !urlLower.includes('ebay.co.')) {
      return true;
    }

    return false;
  }

  /**
   * Generate display name for platform
   */
  private generateDisplayName(platform: string, country?: string): string {
    const displayNames = {
      amazon: 'Amazon Product',
      ebay: 'eBay Listing',
      walmart: 'Walmart Product',
      bestbuy: 'Best Buy Item',
      ae: 'American Eagle Item',
      myntra: 'Myntra Fashion',
      target: 'Target Product',
      hm: 'H&M Fashion',
      asos: 'ASOS Fashion',
      etsy: 'Etsy Handmade',
      zara: 'Zara Fashion',
      lego: 'LEGO Set',
      hermes: 'Hermès Luxury',
      flipkart: 'Flipkart Product',
      toysrus: 'Toys"R"Us Item',
      carters: 'Carter\'s Baby',
      prada: 'Prada Luxury',
      ysl: 'YSL Luxury',
      balenciaga: 'Balenciaga Luxury',
      dior: 'Dior Luxury',
      chanel: 'Chanel Luxury'
    };

    const baseName = displayNames[platform as keyof typeof displayNames] || 'Product';
    return country ? `${baseName} (${country})` : baseName;
  }

  /**
   * Check if platform supports specific capability
   */
  isPlatformCapable(platform: string, capability: keyof PlatformCapabilities): boolean {
    const platformConfig = this.getSupportedPlatforms().find(p => p.key === platform);
    if (!platformConfig) return false;

    return platformConfig.capabilities[capability as keyof typeof platformConfig.capabilities] || false;
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: string): SupportedPlatform | null {
    return this.getSupportedPlatforms().find(p => p.key === platform) || null;
  }

  /**
   * Get platforms by category
   */
  getPlatformsByCategory(category: PlatformCategory): SupportedPlatform[] {
    return this.getSupportedPlatforms().filter(p => p.category === category);
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
    const cached = this.platformCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.platformCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.platformCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear platform detection cache
   */
  clearCache(): void {
    this.platformCache.clear();
    logger.info('Platform detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.platformCache.size,
      entries: Array.from(this.platformCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.platformCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.platformCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired platform detection cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('PlatformDetectionService disposed');
  }
}

export default PlatformDetectionService;