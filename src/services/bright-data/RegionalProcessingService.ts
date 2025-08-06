/**
 * Regional Processing Service
 * Handles regional URL transformations and country-specific processing
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { SupportedPlatform } from './PlatformDetectionService';

export interface RegionalConfig {
  country: string;
  currency: string;
  weightUnit: 'kg' | 'lbs';
  priceFormat: string;
  taxRate?: number;
  shippingMultiplier?: number;
}

export interface URLTransformation {
  originalUrl: string;
  transformedUrl: string;
  targetCountry: string;
  confidence: number; // 0-100
  changes: string[];
}

export interface CountryMapping {
  [domain: string]: string[];
}

export interface RegionalPricing {
  originalPrice: number;
  originalCurrency: string;
  regionalPrice?: number;
  regionalCurrency: string;
  exchangeRate?: number;
  priceVariation?: number; // Percentage difference from original
}

export class RegionalProcessingService {
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Regional configurations by country
  private readonly REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
    'US': {
      country: 'United States',
      currency: 'USD',
      weightUnit: 'lbs',
      priceFormat: '$#,##0.00',
      taxRate: 0.08,
      shippingMultiplier: 1.0,
    },
    'GB': {
      country: 'United Kingdom',
      currency: 'GBP',
      weightUnit: 'kg',
      priceFormat: '£#,##0.00',
      taxRate: 0.20,
      shippingMultiplier: 1.2,
    },
    'CA': {
      country: 'Canada',
      currency: 'CAD',
      weightUnit: 'kg',
      priceFormat: 'C$#,##0.00',
      taxRate: 0.13,
      shippingMultiplier: 1.1,
    },
    'AU': {
      country: 'Australia',
      currency: 'AUD',
      weightUnit: 'kg',
      priceFormat: 'A$#,##0.00',
      taxRate: 0.10,
      shippingMultiplier: 1.3,
    },
    'DE': {
      country: 'Germany',
      currency: 'EUR',
      weightUnit: 'kg',
      priceFormat: '#,##0.00 €',
      taxRate: 0.19,
      shippingMultiplier: 1.15,
    },
    'FR': {
      country: 'France',
      currency: 'EUR',
      weightUnit: 'kg',
      priceFormat: '#,##0.00 €',
      taxRate: 0.20,
      shippingMultiplier: 1.15,
    },
    'IT': {
      country: 'Italy',
      currency: 'EUR',
      weightUnit: 'kg',
      priceFormat: '#,##0.00 €',
      taxRate: 0.22,
      shippingMultiplier: 1.18,
    },
    'ES': {
      country: 'Spain',
      currency: 'EUR',
      weightUnit: 'kg',
      priceFormat: '#,##0.00 €',
      taxRate: 0.21,
      shippingMultiplier: 1.16,
    },
    'IN': {
      country: 'India',
      currency: 'INR',
      weightUnit: 'kg',
      priceFormat: '₹#,##0.00',
      taxRate: 0.18,
      shippingMultiplier: 0.8,
    },
    'JP': {
      country: 'Japan',
      currency: 'JPY',
      weightUnit: 'kg',
      priceFormat: '¥#,##0',
      taxRate: 0.10,
      shippingMultiplier: 1.4,
    },
    'SE': {
      country: 'Sweden',
      currency: 'SEK',
      weightUnit: 'kg',
      priceFormat: '#,##0.00 kr',
      taxRate: 0.25,
      shippingMultiplier: 1.25,
    },
  };

  // Platform-specific URL transformation patterns
  private readonly URL_PATTERNS: Record<SupportedPlatform, {
    domainPattern: RegExp;
    countryCodeExtraction: RegExp;
    transformationRules: Record<string, (url: string, targetCountry: string) => string>;
  }> = {
    amazon: {
      domainPattern: /amazon\.([a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})/i,
      countryCodeExtraction: /amazon\.(?:co\.)?([a-z]{2,3})/i,
      transformationRules: {
        'US': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.com'),
        'GB': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.co.uk'),
        'CA': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.ca'),
        'DE': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.de'),
        'FR': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.fr'),
        'IT': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.it'),
        'ES': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.es'),
        'AU': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.com.au'),
        'JP': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.co.jp'),
        'IN': (url) => url.replace(/amazon\.[^\/]+/i, 'amazon.in'),
      },
    },
    ebay: {
      domainPattern: /ebay\.([a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})/i,
      countryCodeExtraction: /ebay\.(?:co\.)?([a-z]{2,3})/i,
      transformationRules: {
        'US': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.com'),
        'GB': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.co.uk'),
        'CA': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.ca'),
        'DE': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.de'),
        'FR': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.fr'),
        'AU': (url) => url.replace(/ebay\.[^\/]+/i, 'ebay.com.au'),
      },
    },
    hm: {
      domainPattern: /hm\.com/i,
      countryCodeExtraction: /\/([a-z]{2})_([a-z]{2})\//i,
      transformationRules: {
        'US': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/en_us/'),
        'GB': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/en_gb/'),
        'CA': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/en_ca/'),
        'DE': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/de_de/'),
        'FR': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/fr_fr/'),
        'IT': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/it_it/'),
        'ES': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/es_es/'),
        'SE': (url) => url.replace(/\/[a-z]{2}_[a-z]{2}\//i, '/sv_se/'),
      },
    },
    asos: {
      domainPattern: /asos\.com/i,
      countryCodeExtraction: /asos\.com\/([a-z]{2})\//i,
      transformationRules: {
        'US': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/us/'),
        'GB': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/gb/'),
        'CA': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/ca/'),
        'DE': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/de/'),
        'FR': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/fr/'),
        'AU': (url) => url.replace(/asos\.com\/[a-z]{2}\//i, 'asos.com/au/'),
      },
    },
    // Add other platforms as needed
    walmart: { domainPattern: /walmart\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    bestbuy: { domainPattern: /bestbuy\.(com|ca)/i, countryCodeExtraction: /bestbuy\.([a-z]{2,3})/i, transformationRules: {} },
    target: { domainPattern: /target\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    etsy: { domainPattern: /etsy\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    ae: { domainPattern: /ae\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    myntra: { domainPattern: /myntra\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    zara: { domainPattern: /zara\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    lego: { domainPattern: /lego\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    hermes: { domainPattern: /hermes\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    flipkart: { domainPattern: /flipkart\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    toysrus: { domainPattern: /toysrus\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    carters: { domainPattern: /carters\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    prada: { domainPattern: /prada\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    ysl: { domainPattern: /ysl\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    balenciaga: { domainPattern: /balenciaga\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    dior: { domainPattern: /dior\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    chanel: { domainPattern: /chanel\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    aliexpress: { domainPattern: /aliexpress\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    alibaba: { domainPattern: /alibaba\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    dhgate: { domainPattern: /dhgate\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    wish: { domainPattern: /wish\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    shein: { domainPattern: /shein\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    romwe: { domainPattern: /romwe\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    nordstrom: { domainPattern: /nordstrom\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    macys: { domainPattern: /macys\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    bloomingdales: { domainPattern: /bloomingdales\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    saks: { domainPattern: /saksfifthavenue\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
    neimanmarcus: { domainPattern: /neimanmarcus\.com/i, countryCodeExtraction: /()/, transformationRules: {} },
  };

  constructor() {
    logger.info('RegionalProcessingService initialized');
  }

  /**
   * Transform URL to target a specific country
   */
  transformUrlForCountry(
    url: string,
    platform: SupportedPlatform,
    targetCountry: string
  ): URLTransformation {
    try {
      const cacheKey = this.getCacheKey('transform', url, platform, targetCountry);
      const cached = this.getFromCache<URLTransformation>(cacheKey);
      if (cached) return cached;

      const changes: string[] = [];
      let transformedUrl = url;
      let confidence = 100;

      // Get platform-specific patterns
      const platformConfig = this.URL_PATTERNS[platform];
      if (!platformConfig) {
        return {
          originalUrl: url,
          transformedUrl: url,
          targetCountry,
          confidence: 0,
          changes: ['Platform not supported for regional transformation'],
        };
      }

      // Check if URL matches platform pattern
      if (!platformConfig.domainPattern.test(url)) {
        confidence -= 50;
        changes.push('URL does not match expected platform pattern');
      }

      // Apply transformation rules
      const transformRule = platformConfig.transformationRules[targetCountry];
      if (transformRule) {
        const newUrl = transformRule(url, targetCountry);
        if (newUrl !== url) {
          transformedUrl = newUrl;
          changes.push(`Domain transformed for ${targetCountry}`);
          confidence = Math.max(confidence, 85);
        }
      } else {
        confidence -= 30;
        changes.push(`No transformation rule for ${targetCountry}`);
      }

      // Validate transformation
      if (transformedUrl !== url) {
        const currentCountry = this.detectCountryFromUrl(url, platform);
        if (currentCountry === targetCountry) {
          confidence -= 20;
          changes.push('URL already targets the desired country');
        }
      }

      const result: URLTransformation = {
        originalUrl: url,
        transformedUrl,
        targetCountry,
        confidence: Math.max(0, confidence),
        changes,
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('URL transformation failed:', error);
      return {
        originalUrl: url,
        transformedUrl: url,
        targetCountry,
        confidence: 0,
        changes: [`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Detect country from URL
   */
  detectCountryFromUrl(url: string, platform?: SupportedPlatform): string {
    try {
      const cacheKey = this.getCacheKey('detect', url, platform || 'unknown');
      const cached = this.getFromCache<string>(cacheKey);
      if (cached) return cached;

      const urlLower = url.toLowerCase();
      let detectedCountry = 'US'; // Default

      // Platform-specific country detection
      if (platform && this.URL_PATTERNS[platform]) {
        const config = this.URL_PATTERNS[platform];
        const match = url.match(config.countryCodeExtraction);
        if (match && match[1]) {
          detectedCountry = this.normalizeCountryCode(match[1]);
        }
      }

      // Generic patterns for major platforms
      if (detectedCountry === 'US') {
        detectedCountry = this.detectCountryFromGenericPatterns(urlLower);
      }

      this.setCache(cacheKey, detectedCountry);
      return detectedCountry;

    } catch (error) {
      logger.error('Country detection failed:', error);
      return 'US';
    }
  }

  /**
   * Get regional configuration for a country
   */
  getRegionalConfig(countryCode: string): RegionalConfig | null {
    return this.REGIONAL_CONFIGS[countryCode] || null;
  }

  /**
   * Calculate regional pricing adjustments
   */
  calculateRegionalPricing(
    originalPrice: number,
    originalCurrency: string,
    targetCountry: string,
    exchangeRate?: number
  ): RegionalPricing {
    const config = this.getRegionalConfig(targetCountry);
    if (!config) {
      return {
        originalPrice,
        originalCurrency,
        regionalCurrency: originalCurrency,
      };
    }

    let regionalPrice = originalPrice;
    let priceVariation = 0;

    // Apply exchange rate if different currency
    if (config.currency !== originalCurrency && exchangeRate) {
      regionalPrice = originalPrice * exchangeRate;
    }

    // Apply regional adjustments (taxes, market differences)
    if (config.taxRate) {
      const taxAdjustment = regionalPrice * config.taxRate;
      regionalPrice += taxAdjustment;
      priceVariation += config.taxRate * 100;
    }

    // Apply shipping multiplier for cost estimation
    if (config.shippingMultiplier && config.shippingMultiplier !== 1.0) {
      const shippingAdjustment = regionalPrice * (config.shippingMultiplier - 1) * 0.1; // 10% of multiplier impact
      regionalPrice += shippingAdjustment;
      priceVariation += (config.shippingMultiplier - 1) * 10;
    }

    return {
      originalPrice,
      originalCurrency,
      regionalPrice: Math.round(regionalPrice * 100) / 100,
      regionalCurrency: config.currency,
      exchangeRate,
      priceVariation: Math.round(priceVariation * 100) / 100,
    };
  }

  /**
   * Get supported countries for a platform
   */
  getSupportedCountries(platform: SupportedPlatform): string[] {
    const config = this.URL_PATTERNS[platform];
    if (!config || !config.transformationRules) {
      return ['US']; // Default fallback
    }

    return Object.keys(config.transformationRules);
  }

  /**
   * Check if country transformation is supported
   */
  isTransformationSupported(platform: SupportedPlatform, targetCountry: string): boolean {
    const config = this.URL_PATTERNS[platform];
    return config && config.transformationRules[targetCountry] !== undefined;
  }

  /**
   * Get all available regional configurations
   */
  getAllRegionalConfigs(): Record<string, RegionalConfig> {
    return { ...this.REGIONAL_CONFIGS };
  }

  /**
   * Private helper methods
   */
  private detectCountryFromGenericPatterns(urlLower: string): string {
    // Amazon patterns
    if (urlLower.includes('amazon.')) {
      if (urlLower.includes('amazon.co.uk')) return 'GB';
      if (urlLower.includes('amazon.de')) return 'DE';
      if (urlLower.includes('amazon.fr')) return 'FR';
      if (urlLower.includes('amazon.ca')) return 'CA';
      if (urlLower.includes('amazon.com.au')) return 'AU';
      if (urlLower.includes('amazon.co.jp')) return 'JP';
      if (urlLower.includes('amazon.in')) return 'IN';
      if (urlLower.includes('amazon.it')) return 'IT';
      if (urlLower.includes('amazon.es')) return 'ES';
      if (urlLower.includes('amazon.com')) return 'US';
    }

    // eBay patterns
    if (urlLower.includes('ebay.')) {
      if (urlLower.includes('ebay.co.uk')) return 'GB';
      if (urlLower.includes('ebay.de')) return 'DE';
      if (urlLower.includes('ebay.fr')) return 'FR';
      if (urlLower.includes('ebay.ca')) return 'CA';
      if (urlLower.includes('ebay.com.au')) return 'AU';
      if (urlLower.includes('ebay.com')) return 'US';
    }

    // H&M patterns
    if (urlLower.includes('hm.com')) {
      const hmMatch = urlLower.match(/\/en_([a-z]{2})/);
      if (hmMatch) return hmMatch[1].toUpperCase();
      
      const localeMatch = urlLower.match(/\/([a-z]{2})_([a-z]{2})/);
      if (localeMatch) return localeMatch[2].toUpperCase();
    }

    // ASOS patterns
    if (urlLower.includes('asos.com')) {
      const asosMatch = urlLower.match(/asos\.com\/([a-z]{2})\//);
      if (asosMatch) return asosMatch[1].toUpperCase();
    }

    // Country-specific domains
    if (urlLower.includes('myntra.com') || urlLower.includes('flipkart.com')) return 'IN';
    if (urlLower.includes('target.com') || urlLower.includes('walmart.com') || urlLower.includes('bestbuy.com')) return 'US';

    return 'US'; // Default fallback
  }

  private normalizeCountryCode(code: string): string {
    const mapping: Record<string, string> = {
      'uk': 'GB',
      'com': 'US',
      'ca': 'CA',
      'de': 'DE',
      'fr': 'FR',
      'it': 'IT',
      'es': 'ES',
      'au': 'AU',
      'jp': 'JP',
      'in': 'IN',
      'se': 'SE',
    };

    return mapping[code.toLowerCase()] || code.toUpperCase();
  }

  /**
   * Cache management
   */
  private getCacheKey(...parts: (string | undefined)[]): string {
    return `regional_${parts.filter(Boolean).join('_')}`;
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

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('RegionalProcessingService cleanup completed');
  }
}

export default RegionalProcessingService;