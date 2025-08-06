/**
 * Data Normalization Service
 * Platform-specific data normalization and transformation
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { ProductData } from '../ProductDataFetchService';
import { SupportedPlatform } from './PlatformDetectionService';

export interface NormalizationOptions {
  enforceDataTypes?: boolean;
  validateRequiredFields?: boolean;
  includeRawData?: boolean;
}

export interface CategoryMapping {
  [key: string]: string;
}

export interface CurrencyMapping {
  [symbol: string]: string;
}

export class DataNormalizationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Platform-specific category mappings
  private readonly CATEGORY_MAPPINGS: Record<SupportedPlatform, CategoryMapping> = {
    amazon: {
      'Electronics': 'electronics',
      'Computers': 'electronics',
      'Cell Phones & Accessories': 'electronics',
      'Clothing, Shoes & Jewelry': 'fashion',
      'Sports & Outdoors': 'sports',
      'Home & Kitchen': 'home',
      'Toys & Games': 'toys',
      'Books': 'books',
      'Health & Personal Care': 'beauty-health',
      'Beauty & Personal Care': 'beauty-health',
    },
    ebay: {
      'Consumer Electronics': 'electronics',
      'Fashion': 'fashion',
      'Clothing, Shoes & Accessories': 'fashion',
      'Sporting Goods': 'sports',
      'Home & Garden': 'home',
      'Toys & Hobbies': 'toys',
      'Health & Beauty': 'beauty-health',
      'Collectibles': 'collectibles',
      'Motors': 'automotive',
    },
    walmart: {
      'Electronics': 'electronics',
      'Clothing': 'fashion',
      'Sports & Recreation': 'sports',
      'Home': 'home',
      'Toys': 'toys',
      'Health & Wellness': 'beauty-health',
    },
    bestbuy: {
      'Computer Desks': 'home',
      'Office Furniture': 'home',
      'Laptops': 'electronics',
      'Desktop Computers': 'electronics',
      'Gaming': 'electronics',
      'TV & Home Theater': 'electronics',
      'Cell Phones': 'electronics',
    },
    target: {
      'Electronics': 'electronics',
      'Clothing': 'fashion',
      'Sports & Outdoors': 'sports',
      'Home': 'home',
      'Toys': 'toys',
      'Beauty': 'beauty-health',
    },
    etsy: {
      'Art & Collectibles': 'art',
      'Jewelry': 'jewelry',
      'Clothing': 'fashion',
      'Home & Living': 'home',
      'Craft Supplies': 'crafts',
      'Vintage': 'vintage',
      'Wedding': 'wedding',
      'Toys & Games': 'toys',
    },
    ae: {
      'T-Shirts': 'fashion',
      'Jeans': 'fashion',
      'Dresses': 'fashion',
    },
    myntra: {
      'Men': 'fashion-men',
      'Women': 'fashion-women',
      'Kids': 'fashion-kids',
    },
    hm: {
      'Women': 'fashion',
      'Men': 'fashion',
      'Kids': 'fashion',
      'Home': 'home',
      'Beauty': 'beauty-health',
    },
    asos: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
    },
    zara: {
      'WOMAN': 'fashion-women',
      'MAN': 'fashion-men',
      'KIDS': 'fashion-kids',
      'SHOES': 'footwear',
      'BAGS': 'bags',
    },
    lego: {
      'Architecture': 'toys-building',
      'City': 'toys-building',
      'Creator': 'toys-building',
      'Friends': 'toys-building',
      'Star Wars': 'toys-building',
      'Technic': 'toys-building',
    },
    hermes: {
      'Bags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Jewelry': 'luxury-jewelry',
      'Watches': 'luxury-watches',
    },
    flipkart: {
      'Electronics': 'electronics',
      'Fashion': 'fashion',
      'Home': 'home',
      'Sports': 'sports',
    },
    toysrus: {
      'Action Figures': 'toys-action',
      'Building Sets': 'toys-building',
      'Dolls': 'toys-dolls',
      'Educational': 'toys-educational',
      'Games': 'toys-games',
    },
    carters: {
      'Baby Girl': 'baby-clothing',
      'Baby Boy': 'baby-clothing',
      'Toddler Girl': 'baby-clothing',
      'Toddler Boy': 'baby-clothing',
      'Pajamas': 'baby-sleepwear',
    },
    prada: {
      'Handbags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Accessories': 'luxury-accessories',
    },
    ysl: {
      'Handbags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Beauty': 'luxury-beauty',
    },
    balenciaga: {
      'Sneakers': 'luxury-sneakers',
      'Bags': 'luxury-bags',
      'Ready-to-wear': 'luxury-fashion',
      'Accessories': 'luxury-accessories',
    },
    dior: {
      'Bags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Fragrance': 'luxury-fragrance',
      'Makeup': 'luxury-beauty',
    },
    chanel: {
      'Bags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Fragrance': 'luxury-fragrance',
      'Makeup': 'luxury-beauty',
      'Watches': 'luxury-watches',
      'Jewelry': 'luxury-jewelry',
    },
    aliexpress: {
      'Consumer Electronics': 'electronics',
      'Women\'s Clothing': 'fashion-women',
      'Men\'s Clothing': 'fashion-men',
      'Home & Garden': 'home',
      'Sports & Entertainment': 'sports',
    },
    alibaba: {
      'Electronics': 'electronics',
      'Apparel': 'fashion',
      'Home & Garden': 'home',
      'Sports & Entertainment': 'sports',
    },
    dhgate: {
      'Electronics': 'electronics',
      'Fashion': 'fashion',
      'Home & Garden': 'home',
      'Sports': 'sports',
    },
    wish: {
      'Electronics': 'electronics',
      'Fashion': 'fashion',
      'Home': 'home',
      'Gadgets': 'electronics',
    },
    shein: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
      'Kids': 'fashion-kids',
      'Home': 'home',
    },
    romwe: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
      'Home': 'home',
    },
    nordstrom: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
      'Kids': 'fashion-kids',
      'Shoes': 'footwear',
      'Beauty': 'beauty-health',
    },
    macys: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
      'Kids': 'fashion-kids',
      'Home': 'home',
      'Beauty': 'beauty-health',
    },
    bloomingdales: {
      'Women': 'fashion-women',
      'Men': 'fashion-men',
      'Kids': 'fashion-kids',
      'Home': 'home',
      'Beauty': 'beauty-health',
    },
    saks: {
      'Women': 'luxury-fashion-women',
      'Men': 'luxury-fashion-men',
      'Shoes': 'luxury-footwear',
      'Bags': 'luxury-bags',
      'Beauty': 'luxury-beauty',
    },
    neimanmarcus: {
      'Women': 'luxury-fashion-women',
      'Men': 'luxury-fashion-men',
      'Shoes': 'luxury-footwear',
      'Handbags': 'luxury-bags',
      'Beauty': 'luxury-beauty',
    },
  };

  // Currency symbol to code mapping
  private readonly CURRENCY_MAPPINGS: CurrencyMapping = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '¥': 'JPY',
    '₹': 'INR',
    'C$': 'CAD',
    'A$': 'AUD',
    'kr': 'SEK',
    '₩': 'KRW',
    '¢': 'USD', // cents
    'USD': 'USD',
    'GBP': 'GBP',
    'EUR': 'EUR',
    'JPY': 'JPY',
    'INR': 'INR',
    'CAD': 'CAD',
    'AUD': 'AUD',
    'SEK': 'SEK',
    'KRW': 'KRW',
  };

  constructor() {
    logger.info('DataNormalizationService initialized');
  }

  /**
   * Normalize product data for any platform
   */
  normalizeProductData(
    rawData: any,
    platform: SupportedPlatform,
    url: string,
    options: NormalizationOptions = {}
  ): ProductData {
    try {
      const cacheKey = this.getCacheKey(platform, url, JSON.stringify(rawData));
      const cached = this.getFromCache<ProductData>(cacheKey);
      if (cached) return cached;

      let normalizedData: ProductData;

      switch (platform) {
        case 'amazon':
          normalizedData = this.normalizeAmazonData(rawData, url);
          break;
        case 'ebay':
          normalizedData = this.normalizeEbayData(rawData, url);
          break;
        case 'walmart':
          normalizedData = this.normalizeWalmartData(rawData, url);
          break;
        case 'bestbuy':
          normalizedData = this.normalizeBestBuyData(rawData, url);
          break;
        case 'target':
          normalizedData = this.normalizeTargetData(rawData, url);
          break;
        case 'etsy':
          normalizedData = this.normalizeEtsyData(rawData, url);
          break;
        case 'ae':
          normalizedData = this.normalizeAEData(rawData, url);
          break;
        case 'myntra':
          normalizedData = this.normalizeMyntraData(rawData, url);
          break;
        case 'hm':
          normalizedData = this.normalizeHMData(rawData, url);
          break;
        case 'asos':
          normalizedData = this.normalizeASOSData(rawData, url);
          break;
        case 'zara':
          normalizedData = this.normalizeZaraData(rawData, url);
          break;
        case 'lego':
          normalizedData = this.normalizeLegoData(rawData, url);
          break;
        case 'hermes':
          normalizedData = this.normalizeHermesData(rawData, url);
          break;
        case 'flipkart':
          normalizedData = this.normalizeFlipkartData(rawData, url);
          break;
        case 'toysrus':
          normalizedData = this.normalizeToysrusData(rawData, url);
          break;
        case 'carters':
          normalizedData = this.normalizeCartersData(rawData, url);
          break;
        case 'prada':
          normalizedData = this.normalizePradaData(rawData, url);
          break;
        case 'ysl':
          normalizedData = this.normalizeYSLData(rawData, url);
          break;
        case 'balenciaga':
          normalizedData = this.normalizeBalenciagaData(rawData, url);
          break;
        case 'dior':
          normalizedData = this.normalizeDiorData(rawData, url);
          break;
        case 'chanel':
          normalizedData = this.normalizeChanelData(rawData, url);
          break;
        default:
          normalizedData = this.normalizeGenericData(rawData, url, platform);
      }

      // Post-processing
      if (options.enforceDataTypes) {
        normalizedData = this.enforceDataTypes(normalizedData);
      }

      if (options.validateRequiredFields) {
        this.validateRequiredFields(normalizedData);
      }

      // Include raw data if requested
      if (options.includeRawData) {
        (normalizedData as any).rawData = rawData;
      }

      this.setCache(cacheKey, normalizedData);
      return normalizedData;

    } catch (error) {
      logger.error(`Data normalization failed for ${platform}:`, error);
      
      // Return fallback data
      return this.createFallbackData(rawData, url, platform);
    }
  }

  /**
   * Platform-specific normalization methods
   */
  private normalizeAmazonData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || rawData.product_title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || rawData.price || '0'),
      currency: this.normalizeCurrency(rawData.currency) || this.detectCurrencyFromUrl(url),
      weight: this.extractWeight(rawData, ['shipping_weight', 'item_weight', 'package_weight'], url),
      weight_value: rawData.weight_value,
      weight_unit: rawData.weight_unit || (this.isUSMarketplace(url) ? 'lbs' : 'kg'),
      weight_raw: rawData.weight_raw,
      images: this.normalizeImages(rawData.images || []),
      brand: rawData.brand || this.extractBrandFromTitle(rawData.title),
      category: this.mapCategory('amazon', rawData.category) || this.inferCategory(rawData.title || ''),
      availability: this.normalizeAvailability(rawData.is_available, rawData.availability),
      description: rawData.description || '',
      url,
      platform: 'amazon',
      variants: this.normalizeVariants(rawData.variations),
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.specifications,
    };
  }

  private normalizeEbayData(rawData: any, url: string): ProductData {
    const detectedCountry = this.detectCountryFromUrl(url);
    const detectedCurrency = this.getCountryCurrency(detectedCountry);
    
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.price || rawData.final_price || '0'),
      currency: this.normalizeCurrency(rawData.currency) || detectedCurrency,
      weight: this.estimateWeight(rawData.title || '', this.mapCategory('ebay', rawData.root_category) || 'general'),
      images: this.normalizeImages(rawData.images || [], 8), // Limit to 8 images
      brand: this.extractBrandFromSpecs(rawData.product_specifications) || this.extractBrandFromTitle(rawData.title),
      category: this.mapCategory('ebay', rawData.root_category) || this.inferCategory(rawData.title || ''),
      availability: this.normalizeEbayAvailability(rawData.condition, rawData.available_count),
      description: rawData.description_from_the_seller || rawData.description_from_the_seller_parsed || '',
      url,
      platform: 'ebay',
      specifications: rawData.product_specifications,
    };
  }

  private normalizeWalmartData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: 'USD',
      weight: this.extractWeight(rawData, ['weight'], url),
      images: this.normalizeImages(rawData.images || []),
      brand: rawData.brand || this.extractBrandFromTitle(rawData.title),
      category: this.mapCategory('walmart', rawData.category) || this.inferCategory(rawData.title || ''),
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.description || '',
      url,
      platform: 'walmart',
      specifications: rawData.specifications,
    };
  }

  private normalizeBestBuyData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || '0'),
      currency: 'USD',
      weight: this.extractWeightFromSpecs(rawData.product_specifications, ['Product Weight', 'Shipping Weight', 'Weight']),
      images: this.normalizeImages(rawData.images || []),
      brand: rawData.brand || this.extractBrandFromTitle(rawData.title),
      category: this.mapCategory('bestbuy', rawData.root_category) || 'electronics',
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.product_description || '',
      url,
      platform: 'bestbuy',
      variants: this.normalizeVariants(rawData.variations),
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.product_specifications,
    };
  }

  // Add more platform-specific normalizers...
  private normalizeGenericData(rawData: any, url: string, platform: SupportedPlatform): ProductData {
    return {
      title: rawData.title || rawData.product_name || rawData.name || 'Unknown Product',
      price: this.parsePrice(rawData.price || rawData.final_price || '0'),
      currency: this.normalizeCurrency(rawData.currency) || this.detectCurrencyFromUrl(url),
      images: this.normalizeImages(rawData.images || rawData.image_urls || []),
      brand: rawData.brand || this.extractBrandFromTitle(rawData.title || rawData.product_name),
      category: this.inferCategory(rawData.title || rawData.product_name || ''),
      availability: this.normalizeAvailability(rawData.availability || rawData.in_stock),
      description: rawData.description || '',
      url,
      platform,
    };
  }

  /**
   * Helper methods for data transformation
   */
  private parsePrice(priceStr: string | number): number {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    
    const cleanPrice = String(priceStr).replace(/[^\d.,]/g, '');
    return parseFloat(cleanPrice.replace(',', '')) || 0;
  }

  private normalizeCurrency(currency?: string): string | undefined {
    if (!currency) return undefined;
    
    const normalized = this.CURRENCY_MAPPINGS[currency.trim()];
    return normalized || currency.toUpperCase();
  }

  private normalizeImages(images: any[], limit: number = 10): string[] {
    if (!Array.isArray(images)) return [];
    
    return images
      .filter(img => typeof img === 'string' && img.startsWith('http'))
      .slice(0, limit);
  }

  private normalizeAvailability(available?: any, availability?: string): 'in_stock' | 'out_of_stock' | 'unknown' {
    if (available === true || available === 'true') return 'in_stock';
    if (available === false || available === 'false') return 'out_of_stock';
    
    if (availability) {
      const avail = availability.toLowerCase();
      if (avail.includes('in stock') || avail.includes('available')) return 'in_stock';
      if (avail.includes('out of stock') || avail.includes('unavailable')) return 'out_of_stock';
    }
    
    return 'unknown';
  }

  private normalizeEbayAvailability(condition?: string, availableCount?: number): 'in_stock' | 'out_of_stock' | 'unknown' {
    if (availableCount === 0) return 'out_of_stock';
    if (availableCount && availableCount > 0) return 'in_stock';
    if (condition === 'New') return 'in_stock';
    return 'unknown';
  }

  private normalizeVariants(variations?: any[]): Array<{ name: string; options: string[] }> | undefined {
    if (!Array.isArray(variations) || variations.length === 0) return undefined;
    
    return variations.map(v => ({
      name: v.name || v.type || 'Variant',
      options: Array.isArray(v.options) ? v.options : [v.value || v.color || v.size || 'Default'].filter(Boolean)
    }));
  }

  private normalizeReviews(rating?: number | string, count?: number | string): { rating: number; count: number } | undefined {
    const ratingNum = typeof rating === 'string' ? parseFloat(rating) : rating;
    const countNum = typeof count === 'string' ? parseInt(count) : count;
    
    if (ratingNum && countNum) {
      return { rating: ratingNum, count: countNum };
    }
    
    return undefined;
  }

  private mapCategory(platform: SupportedPlatform, category?: string): string | undefined {
    if (!category) return undefined;
    
    const mapping = this.CATEGORY_MAPPINGS[platform];
    return mapping[category] || undefined;
  }

  private inferCategory(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('laptop') || titleLower.includes('computer') || titleLower.includes('phone')) return 'electronics';
    if (titleLower.includes('shirt') || titleLower.includes('dress') || titleLower.includes('jeans')) return 'fashion';
    if (titleLower.includes('book')) return 'books';
    if (titleLower.includes('toy') || titleLower.includes('game')) return 'toys';
    if (titleLower.includes('home') || titleLower.includes('furniture')) return 'home';
    if (titleLower.includes('beauty') || titleLower.includes('cosmetic')) return 'beauty-health';
    
    return 'general';
  }

  private extractWeight(rawData: any, fields: string[], url: string): number | undefined {
    for (const field of fields) {
      if (rawData[field]) {
        return this.parseWeight(rawData[field], url);
      }
    }
    return undefined;
  }

  private parseWeight(weightStr: string, url: string): number {
    const match = String(weightStr).match(/([\d.]+)\s*(kg|lbs|g|oz|pounds?|kilograms?)?/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();
    
    // Convert to kg
    switch (unit) {
      case 'lbs':
      case 'pounds':
      case 'pound':
        return value * 0.453592;
      case 'g':
        return value / 1000;
      case 'oz':
        return value * 0.0283495;
      case 'kg':
      case 'kilograms':
      case 'kilogram':
      default:
        return value;
    }
  }

  private extractBrandFromTitle(title?: string): string | undefined {
    if (!title) return undefined;
    
    // Common brand extraction patterns
    const brandPatterns = [
      /^([A-Z][a-z]+)\s+/,  // First capitalized word
      /\b([A-Z]{2,})\b/,    // All caps words
    ];
    
    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private extractBrandFromSpecs(specs?: any[]): string | undefined {
    if (!Array.isArray(specs)) return undefined;
    
    const brandSpec = specs.find(spec => 
      spec.specification_name?.toLowerCase() === 'brand' ||
      spec.name?.toLowerCase() === 'brand'
    );
    
    return brandSpec?.specification_value || brandSpec?.value;
  }

  private extractWeightFromSpecs(specs?: any[], weightFields: string[] = []): number | undefined {
    if (!Array.isArray(specs)) return undefined;
    
    for (const field of weightFields) {
      const weightSpec = specs.find(spec => 
        spec.specification_name?.includes(field) ||
        spec.name?.includes(field)
      );
      
      if (weightSpec) {
        return this.parseWeight(weightSpec.specification_value || weightSpec.value || '', '');
      }
    }
    
    return undefined;
  }

  private estimateWeight(title: string, category: string): number {
    // Basic weight estimation based on category
    const categoryWeights: Record<string, number> = {
      'electronics': 0.5,
      'fashion': 0.3,
      'books': 0.2,
      'toys': 0.4,
      'home': 1.0,
      'beauty-health': 0.2,
      'luxury-bags': 0.8,
      'luxury-footwear': 0.7,
      'luxury-jewelry': 0.1,
    };
    
    return categoryWeights[category] || 0.5;
  }

  private detectCurrencyFromUrl(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.co.uk') || urlLower.includes('/gb/')) return 'GBP';
    if (urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it') || urlLower.includes('.es')) return 'EUR';
    if (urlLower.includes('.co.jp') || urlLower.includes('/jp/')) return 'JPY';
    if (urlLower.includes('.in') || urlLower.includes('myntra') || urlLower.includes('flipkart')) return 'INR';
    if (urlLower.includes('.ca')) return 'CAD';
    if (urlLower.includes('.com.au')) return 'AUD';
    
    return 'USD'; // Default
  }

  private detectCountryFromUrl(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.co.uk') || urlLower.includes('/gb/')) return 'GB';
    if (urlLower.includes('.de')) return 'DE';
    if (urlLower.includes('.fr')) return 'FR';
    if (urlLower.includes('.it')) return 'IT';
    if (urlLower.includes('.es')) return 'ES';
    if (urlLower.includes('.co.jp')) return 'JP';
    if (urlLower.includes('.in') || urlLower.includes('myntra') || urlLower.includes('flipkart')) return 'IN';
    if (urlLower.includes('.ca')) return 'CA';
    if (urlLower.includes('.com.au')) return 'AU';
    
    return 'US'; // Default
  }

  private getCountryCurrency(countryCode: string): string {
    const currencyMap: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD',
      'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR',
      'SE': 'SEK', 'DK': 'DKK', 'NO': 'NOK',
      'IN': 'INR', 'JP': 'JPY',
    };
    
    return currencyMap[countryCode] || 'USD';
  }

  private isUSMarketplace(url: string): boolean {
    const urlLower = url.toLowerCase();
    
    const usMarketplaces = [
      'amazon.com', 'amazon.ca', 'walmart.com', 'bestbuy.com',
      'target.com', 'ae.com', 'ebay.com'
    ];
    
    return usMarketplaces.some(domain => urlLower.includes(domain));
  }

  private enforceDataTypes(data: ProductData): ProductData {
    return {
      ...data,
      price: typeof data.price === 'number' ? data.price : parseFloat(String(data.price)) || 0,
      weight: data.weight !== undefined ? (typeof data.weight === 'number' ? data.weight : parseFloat(String(data.weight)) || undefined) : undefined,
      images: Array.isArray(data.images) ? data.images : [],
    };
  }

  private validateRequiredFields(data: ProductData): void {
    const required = ['title', 'price', 'currency'];
    
    for (const field of required) {
      if (!data[field as keyof ProductData]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
  }

  private createFallbackData(rawData: any, url: string, platform: SupportedPlatform): ProductData {
    return {
      title: rawData.title || rawData.name || 'Unknown Product',
      price: 0,
      currency: 'USD',
      images: [],
      brand: undefined,
      category: 'general',
      availability: 'unknown',
      description: '',
      url,
      platform,
    };
  }

  /**
   * Cache management
   */
  private getCacheKey(platform: SupportedPlatform, url: string, rawDataHash: string): string {
    return `normalize_${platform}_${encodeURIComponent(url)}_${rawDataHash.slice(0, 10)}`;
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
    logger.info('DataNormalizationService cleanup completed');
  }
}

export default DataNormalizationService;