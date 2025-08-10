/**
 * Platform Detection Service
 * Handles URL analysis and platform detection for product scraping
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { urlAnalysisService } from '../UrlAnalysisService';
import * as Sentry from '@sentry/react';

export type SupportedPlatform = 
  | 'amazon' | 'ebay' | 'walmart' | 'bestbuy' | 'ae' | 'myntra' | 'target' 
  | 'hm' | 'asos' | 'etsy' | 'zara' | 'lego' | 'hermes' | 'flipkart' 
  | 'toysrus' | 'carters' | 'prada' | 'ysl' | 'balenciaga' | 'dior' | 'chanel'
  | 'aliexpress' | 'alibaba' | 'dhgate' | 'wish' | 'shein' | 'romwe'
  | 'nordstrom' | 'macys' | 'bloomingdales' | 'saks' | 'neimanmarcus';

export interface PlatformInfo {
  platform: SupportedPlatform;
  displayName: string;
  category: 'marketplace' | 'fashion' | 'electronics' | 'luxury' | 'department' | 'toys' | 'baby' | 'home';
  defaultCurrency: string;
  regions: string[];
  estimatedTime: string;
  pollingInterval: string;
  supportedFeatures: {
    reviews: boolean;
    variants: boolean;
    specifications: boolean;
    regionalPricing: boolean;
    weightExtraction: boolean;
  };
}

export interface PlatformDetectionResult {
  platform: SupportedPlatform | null;
  confidence: number; // 0-100
  fallbackOptions: SupportedPlatform[];
  metadata: {
    domain: string;
    subdomain?: string;
    tld: string;
    pathSegments: string[];
    queryParams: Record<string, string>;
  };
}

export interface URLValidationResult {
  isValid: boolean;
  isProductURL: boolean;
  productIdentifiers: {
    asin?: string;
    productId?: string;
    sku?: string;
    itemId?: string;
  };
  warnings: string[];
  suggestions: string[];
}

export class PlatformDetectionService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Platform configurations with comprehensive metadata
  private readonly PLATFORM_INFO: Record<SupportedPlatform, PlatformInfo> = {
    amazon: {
      platform: 'amazon',
      displayName: 'Amazon',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'IN', 'JP', 'AU'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: true,
      },
    },
    ebay: {
      platform: 'ebay',
      displayName: 'eBay',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'DE', 'AU', 'FR', 'IT', 'ES'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: false,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    walmart: {
      platform: 'walmart',
      displayName: 'Walmart',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: true,
      },
    },
    bestbuy: {
      platform: 'bestbuy',
      displayName: 'Best Buy',
      category: 'electronics',
      defaultCurrency: 'USD',
      regions: ['US', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: true,
      },
    },
    target: {
      platform: 'target',
      displayName: 'Target',
      category: 'department',
      defaultCurrency: 'USD',
      regions: ['US'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: true,
      },
    },
    etsy: {
      platform: 'etsy',
      displayName: 'Etsy',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU', 'DE', 'FR'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    ae: {
      platform: 'ae',
      displayName: 'American Eagle',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'CA'],
      estimatedTime: '5-30 minutes',
      pollingInterval: '5 minutes',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: false,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    hm: {
      platform: 'hm',
      displayName: 'H&M',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'SE', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    zara: {
      platform: 'zara',
      displayName: 'Zara',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'DE', 'FR', 'IT', 'ES'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    asos: {
      platform: 'asos',
      displayName: 'ASOS',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'AU', 'DE', 'FR', 'IT', 'ES'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    myntra: {
      platform: 'myntra',
      displayName: 'Myntra',
      category: 'fashion',
      defaultCurrency: 'INR',
      regions: ['IN'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    flipkart: {
      platform: 'flipkart',
      displayName: 'Flipkart',
      category: 'marketplace',
      defaultCurrency: 'INR',
      regions: ['IN'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    lego: {
      platform: 'lego',
      displayName: 'LEGO',
      category: 'toys',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'AU'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: false,
        specifications: true,
        regionalPricing: true,
        weightExtraction: true,
      },
    },
    toysrus: {
      platform: 'toysrus',
      displayName: 'Toys"R"Us',
      category: 'toys',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: false,
        specifications: true,
        regionalPricing: false,
        weightExtraction: true,
      },
    },
    carters: {
      platform: 'carters',
      displayName: 'Carter\'s',
      category: 'baby',
      defaultCurrency: 'USD',
      regions: ['US', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    hermes: {
      platform: 'hermes',
      displayName: 'Hermès',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    chanel: {
      platform: 'chanel',
      displayName: 'Chanel',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    dior: {
      platform: 'dior',
      displayName: 'Dior',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    prada: {
      platform: 'prada',
      displayName: 'Prada',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    ysl: {
      platform: 'ysl',
      displayName: 'Yves Saint Laurent',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    balenciaga: {
      platform: 'balenciaga',
      displayName: 'Balenciaga',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'FR', 'DE', 'IT', 'JP'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: false,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    aliexpress: {
      platform: 'aliexpress',
      displayName: 'AliExpress',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES'],
      estimatedTime: '2-5 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    alibaba: {
      platform: 'alibaba',
      displayName: 'Alibaba',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU', 'DE', 'FR'],
      estimatedTime: '1-3 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: true,
      },
    },
    dhgate: {
      platform: 'dhgate',
      displayName: 'DHgate',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU'],
      estimatedTime: '1-3 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    wish: {
      platform: 'wish',
      displayName: 'Wish',
      category: 'marketplace',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU'],
      estimatedTime: '1-3 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: false,
        specifications: false,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    shein: {
      platform: 'shein',
      displayName: 'SHEIN',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU', 'DE', 'FR'],
      estimatedTime: '1-3 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    romwe: {
      platform: 'romwe',
      displayName: 'ROMWE',
      category: 'fashion',
      defaultCurrency: 'USD',
      regions: ['US', 'UK', 'CA', 'AU'],
      estimatedTime: '1-3 minutes',
      pollingInterval: '30 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: false,
        regionalPricing: true,
        weightExtraction: false,
      },
    },
    nordstrom: {
      platform: 'nordstrom',
      displayName: 'Nordstrom',
      category: 'department',
      defaultCurrency: 'USD',
      regions: ['US', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    macys: {
      platform: 'macys',
      displayName: 'Macy\'s',
      category: 'department',
      defaultCurrency: 'USD',
      regions: ['US'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    bloomingdales: {
      platform: 'bloomingdales',
      displayName: 'Bloomingdale\'s',
      category: 'department',
      defaultCurrency: 'USD',
      regions: ['US'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    saks: {
      platform: 'saks',
      displayName: 'Saks Fifth Avenue',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US', 'CA'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
    neimanmarcus: {
      platform: 'neimanmarcus',
      displayName: 'Neiman Marcus',
      category: 'luxury',
      defaultCurrency: 'USD',
      regions: ['US'],
      estimatedTime: '15-60 seconds',
      pollingInterval: '15 seconds',
      supportedFeatures: {
        reviews: true,
        variants: true,
        specifications: true,
        regionalPricing: false,
        weightExtraction: false,
      },
    },
  };

  // Domain patterns for platform detection
  private readonly DOMAIN_PATTERNS: Record<string, SupportedPlatform[]> = {
    'amazon.com': ['amazon'],
    'amazon.co.uk': ['amazon'],
    'amazon.ca': ['amazon'],
    'amazon.de': ['amazon'],
    'amazon.fr': ['amazon'],
    'amazon.it': ['amazon'],
    'amazon.es': ['amazon'],
    'amazon.in': ['amazon'],
    'amazon.co.jp': ['amazon'],
    'amazon.com.au': ['amazon'],
    'ebay.com': ['ebay'],
    'ebay.co.uk': ['ebay'],
    'ebay.ca': ['ebay'],
    'ebay.de': ['ebay'],
    'ebay.com.au': ['ebay'],
    'walmart.com': ['walmart'],
    'bestbuy.com': ['bestbuy'],
    'bestbuy.ca': ['bestbuy'],
    'target.com': ['target'],
    'etsy.com': ['etsy'],
    'ae.com': ['ae'],
    'hm.com': ['hm'],
    'zara.com': ['zara'],
    'asos.com': ['asos'],
    'myntra.com': ['myntra'],
    'flipkart.com': ['flipkart'],
    'lego.com': ['lego'],
    'toysrus.com': ['toysrus'],
    'carters.com': ['carters'],
    'hermes.com': ['hermes'],
    'chanel.com': ['chanel'],
    'dior.com': ['dior'],
    'prada.com': ['prada'],
    'ysl.com': ['ysl'],
    'balenciaga.com': ['balenciaga'],
    'aliexpress.com': ['aliexpress'],
    'aliexpress.us': ['aliexpress'],
    'es.aliexpress.com': ['aliexpress'],
    'fr.aliexpress.com': ['aliexpress'],
    'de.aliexpress.com': ['aliexpress'],
    'pt.aliexpress.com': ['aliexpress'],
    'it.aliexpress.com': ['aliexpress'],
    'nl.aliexpress.com': ['aliexpress'],
    'ja.aliexpress.com': ['aliexpress'],
    'ko.aliexpress.com': ['aliexpress'],
    'tr.aliexpress.com': ['aliexpress'],
    'ru.aliexpress.com': ['aliexpress'],
    'alibaba.com': ['alibaba'],
    'dhgate.com': ['dhgate'],
    'wish.com': ['wish'],
    'shein.com': ['shein'],
    'romwe.com': ['romwe'],
    'nordstrom.com': ['nordstrom'],
    'macys.com': ['macys'],
    'bloomingdales.com': ['bloomingdales'],
    'saksfifthavenue.com': ['saks'],
    'neimanmarcus.com': ['neimanmarcus'],
  };

  constructor() {
    logger.info('PlatformDetectionService initialized');
  }

  /**
   * Detect platform from URL with comprehensive analysis
   */
  detectPlatform(url: string): PlatformDetectionResult {
    try {
      const cacheKey = this.getCacheKey('detect', url);
      const cached = this.getFromCache<PlatformDetectionResult>(cacheKey);
      if (cached) return cached;

      // Parse URL
      const parsedUrl = this.parseURL(url);
      if (!parsedUrl) {
        return {
          platform: null,
          confidence: 0,
          fallbackOptions: [],
          metadata: {
            domain: '',
            tld: '',
            pathSegments: [],
            queryParams: {},
          },
        };
      }

      // Check direct domain matches first
      const directMatch = this.findDirectMatch(parsedUrl.domain);
      if (directMatch) {
        const result = {
          platform: directMatch,
          confidence: 95,
          fallbackOptions: [],
          metadata: parsedUrl,
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // Check subdomain patterns
      const subdomainMatch = this.findSubdomainMatch(parsedUrl.subdomain, parsedUrl.domain);
      if (subdomainMatch) {
        const result = {
          platform: subdomainMatch,
          confidence: 85,
          fallbackOptions: [],
          metadata: parsedUrl,
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // Check path-based detection
      const pathMatch = this.findPathMatch(parsedUrl.pathSegments, parsedUrl.domain);
      if (pathMatch.platform) {
        const result = {
          platform: pathMatch.platform,
          confidence: pathMatch.confidence,
          fallbackOptions: pathMatch.alternatives,
          metadata: parsedUrl,
        };
        this.setCache(cacheKey, result);
        return result;
      }

      // Use URL analysis service as fallback
      const fallbackResult = this.getFallbackDetection(url, parsedUrl);
      this.setCache(cacheKey, fallbackResult);
      return fallbackResult;

    } catch (error) {
      logger.error('Platform detection error:', error);
      Sentry.captureException(error);
      return {
        platform: null,
        confidence: 0,
        fallbackOptions: [],
        metadata: {
          domain: '',
          tld: '',
          pathSegments: [],
          queryParams: {},
        },
      };
    }
  }

  /**
   * Get platform information
   */
  getPlatformInfo(platform: SupportedPlatform): PlatformInfo {
    return this.PLATFORM_INFO[platform];
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): SupportedPlatform[] {
    return Object.keys(this.PLATFORM_INFO) as SupportedPlatform[];
  }

  /**
   * Get platforms by category
   */
  getPlatformsByCategory(category: string): SupportedPlatform[] {
    return Object.entries(this.PLATFORM_INFO)
      .filter(([, info]) => info.category === category)
      .map(([platform]) => platform as SupportedPlatform);
  }

  /**
   * Get platform timing information
   */
  getPlatformTiming(platform: SupportedPlatform): { estimatedTime: string; pollingInterval: string } {
    const info = this.PLATFORM_INFO[platform];
    return {
      estimatedTime: info.estimatedTime,
      pollingInterval: info.pollingInterval,
    };
  }

  /**
   * Get platform status message
   */
  getPlatformStatusMessage(
    platform: SupportedPlatform,
    status: 'starting' | 'polling' | 'completed' | 'failed'
  ): string {
    const info = this.PLATFORM_INFO[platform];
    
    switch (status) {
      case 'starting':
        return `Starting ${info.displayName} product data collection. Expected time: ${info.estimatedTime}...`;
      case 'polling':
        return `Collecting ${info.displayName} product data (checking every ${info.pollingInterval})...`;
      case 'completed':
        return `Successfully collected ${info.displayName} product data!`;
      case 'failed':
        return `Failed to collect ${info.displayName} product data. Please try again.`;
      default:
        return `Processing ${info.displayName} product data...`;
    }
  }

  /**
   * Validate product URL
   */
  validateProductURL(url: string): URLValidationResult {
    try {
      const detection = this.detectPlatform(url);
      
      if (!detection.platform) {
        return {
          isValid: false,
          isProductURL: false,
          productIdentifiers: {},
          warnings: ['Unsupported platform detected'],
          suggestions: ['Please use a supported platform URL'],
        };
      }

      const productIds = this.extractProductIdentifiers(url, detection.platform);
      const hasValidProductId = Object.keys(productIds).length > 0;

      return {
        isValid: true,
        isProductURL: hasValidProductId,
        productIdentifiers: productIds,
        warnings: hasValidProductId ? [] : ['No product identifier found in URL'],
        suggestions: hasValidProductId ? [] : ['Ensure the URL points to a specific product page'],
      };

    } catch (error) {
      logger.error('URL validation error:', error);
      return {
        isValid: false,
        isProductURL: false,
        productIdentifiers: {},
        warnings: ['URL validation failed'],
        suggestions: ['Please check the URL format'],
      };
    }
  }

  /**
   * Private helper methods
   */
  private parseURL(url: string): PlatformDetectionResult['metadata'] | null {
    try {
      const urlObj = new URL(url);
      const domainParts = urlObj.hostname.toLowerCase().split('.');
      const tld = domainParts.slice(-1)[0];
      const domain = domainParts.slice(-2).join('.');
      const subdomain = domainParts.length > 2 ? domainParts.slice(0, -2).join('.') : undefined;

      return {
        domain,
        subdomain,
        tld,
        pathSegments: urlObj.pathname.split('/').filter(Boolean),
        queryParams: Object.fromEntries(urlObj.searchParams.entries()),
      };
    } catch (error) {
      return null;
    }
  }

  private findDirectMatch(domain: string): SupportedPlatform | null {
    const matches = this.DOMAIN_PATTERNS[domain.toLowerCase()];
    return matches ? matches[0] : null;
  }

  private findSubdomainMatch(subdomain: string | undefined, domain: string): SupportedPlatform | null {
    if (!subdomain) return null;
    
    // Check if subdomain + domain combination exists
    const fullDomain = `${subdomain}.${domain}`;
    return this.findDirectMatch(fullDomain);
  }

  private findPathMatch(pathSegments: string[], domain: string): {
    platform: SupportedPlatform | null;
    confidence: number;
    alternatives: SupportedPlatform[];
  } {
    // Amazon-specific path detection
    if (domain.includes('amazon')) {
      const hasASIN = pathSegments.some(segment => 
        /^[A-Z0-9]{10}$/.test(segment) || segment.includes('/dp/') || segment.includes('/gp/product/')
      );
      if (hasASIN) {
        return { platform: 'amazon', confidence: 90, alternatives: [] };
      }
    }

    // eBay-specific path detection
    if (domain.includes('ebay')) {
      const hasItemId = pathSegments.some(segment => 
        /^\d{12,}$/.test(segment) || segment.includes('itm')
      );
      if (hasItemId) {
        return { platform: 'ebay', confidence: 90, alternatives: [] };
      }
    }

    return { platform: null, confidence: 0, alternatives: [] };
  }

  private getFallbackDetection(url: string, metadata: PlatformDetectionResult['metadata']): PlatformDetectionResult {
    // Use existing URL analysis service as fallback
    const urlAnalysis = urlAnalysisService.analyzeUrl(url);
    
    if (urlAnalysis.platform && this.PLATFORM_INFO[urlAnalysis.platform as SupportedPlatform]) {
      return {
        platform: urlAnalysis.platform as SupportedPlatform,
        confidence: 70, // Lower confidence for fallback
        fallbackOptions: [],
        metadata,
      };
    }

    return {
      platform: null,
      confidence: 0,
      fallbackOptions: [],
      metadata,
    };
  }

  private extractProductIdentifiers(url: string, platform: SupportedPlatform): URLValidationResult['productIdentifiers'] {
    const identifiers: URLValidationResult['productIdentifiers'] = {};

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = urlObj.searchParams;

      switch (platform) {
        case 'amazon':
          // Extract ASIN from various Amazon URL formats
          const asinMatch = path.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/([A-Z0-9]{10})(?:\/|$)/);
          if (asinMatch) {
            identifiers.asin = asinMatch[1] || asinMatch[2] || asinMatch[3];
            identifiers.productId = identifiers.asin;
          }
          break;

        case 'ebay':
          // Extract eBay item ID
          const itemIdMatch = path.match(/\/itm\/(\d+)|\/(\d{12,})/);
          if (itemIdMatch) {
            identifiers.itemId = itemIdMatch[1] || itemIdMatch[2];
            identifiers.productId = identifiers.itemId;
          }
          break;

        case 'walmart':
          // Extract Walmart product ID
          const walmartIdMatch = path.match(/\/ip\/[^\/]+\/(\d+)/);
          if (walmartIdMatch) {
            identifiers.productId = walmartIdMatch[1];
          }
          break;

        case 'bestbuy':
          // Extract Best Buy SKU
          const skuMatch = path.match(/\/site\/[^\/]+\/(\d+)\.p/);
          if (skuMatch) {
            identifiers.sku = skuMatch[1];
            identifiers.productId = identifiers.sku;
          }
          break;

        default:
          // Generic product ID extraction
          const genericMatch = path.match(/\/(\d{6,})|product[_-]?(\d+)|item[_-]?(\d+)/i);
          if (genericMatch) {
            identifiers.productId = genericMatch[1] || genericMatch[2] || genericMatch[3];
          }
          break;
      }
    } catch (error) {
      logger.error('Product identifier extraction error:', error);
    }

    return identifiers;
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, url: string): string {
    return `platform_detection_${operation}_${encodeURIComponent(url)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('PlatformDetectionService cleanup completed');
  }
}

export default PlatformDetectionService;