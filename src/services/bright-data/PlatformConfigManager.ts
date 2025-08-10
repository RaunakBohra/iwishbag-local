/**
 * Platform Configuration Manager
 * Manages platform-specific scraping configurations and detection
 */

import { logger } from '@/utils/logger';

export interface PlatformConfig {
  scraperType: string;
  fields: string[];
  defaultCurrency?: string;
  currencyMap?: Record<string, string>;
  currencyDetection?: boolean;
  fashionFocus?: boolean;
  handmadeFocus?: boolean;
  weightSelectors?: string[];
  weightFields?: string[];
  categoryMapping?: Record<string, string>;
  estimatedTime: string;
  pollingInterval: string;
}

/**
 * Platform-specific scraping configurations
 */
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  amazon: {
    scraperType: 'amazon_product',
    fields: ['title', 'price', 'currency', 'images', 'weight', 'brand', 'availability', 'rating', 'reviews_count'],
    weightSelectors: ['shipping_weight', 'item_weight', 'package_weight'],
    currencyMap: { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY' },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  ebay: {
    scraperType: 'ebay_product',
    fields: ['title', 'price', 'currency', 'images', 'condition', 'shipping'],
    currencyDetection: true,
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  walmart: {
    scraperType: 'walmart_product',
    fields: ['title', 'price', 'images', 'brand', 'model', 'specifications'],
    defaultCurrency: 'USD',
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  bestbuy: {
    scraperType: 'bestbuy_products',
    fields: [
      'title', 'final_price', 'initial_price', 'currency', 'discount', 'images', 
      'brand', 'model', 'sku', 'upc', 'product_specifications', 'availability',
      'rating', 'reviews_count', 'questions_count', 'highlights', 'variations',
      'product_description', 'features', 'whats_included', 'breadcrumbs', 'root_category'
    ],
    defaultCurrency: 'USD',
    weightFields: ['Product Weight', 'Shipping Weight', 'Weight'],
    categoryMapping: {
      'Computer Desks': 'home',
      'Office Furniture': 'home',
      'Furniture & Decor': 'home',
      'Laptops': 'electronics',
      'Desktop Computers': 'electronics',
      'Gaming': 'electronics',
      'TV & Home Theater': 'electronics',
      'Audio': 'electronics',
      'Cameras': 'electronics',
      'Cell Phones': 'electronics',
      'Video Games': 'electronics'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  ae: {
    scraperType: 'ae_product',
    fields: ['product_name', 'final_price', 'currency', 'main_image', 'brand', 'description', 'availability', 'color', 'size'],
    fashionFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'T-Shirts': 'fashion',
      'Shirts': 'fashion', 
      'Hoodies & Sweatshirts': 'fashion',
      'Sweaters': 'fashion',
      'Jeans': 'fashion',
      'Pants': 'fashion',
      'Dresses': 'fashion',
      'Tops': 'fashion',
      'Clearance': 'fashion'
    },
    estimatedTime: '5-30 minutes',
    pollingInterval: '5 minutes'
  },
  myntra: {
    scraperType: 'myntra_product',
    fields: ['title', 'final_price', 'currency', 'images', 'brand', 'specifications', 'offers'],
    fashionFocus: true,
    defaultCurrency: 'INR',
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  target: {
    scraperType: 'target_product',
    fields: [
      'title', 'final_price', 'initial_price', 'currency', 'images', 'brand', 
      'specifications', 'availability', 'weight', 'rating', 'reviews_count', 
      'highlights', 'product_description', 'breadcrumbs', 'category'
    ],
    defaultCurrency: 'USD',
    weightFields: ['Product Weight', 'Shipping Weight', 'Weight'],
    categoryMapping: {
      'Electronics': 'electronics',
      'Clothing': 'fashion',
      'Home': 'home',
      'Sports & Outdoors': 'sports',
      'Beauty': 'beauty-health',
      'Toys': 'toys',
      'Books': 'books'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  hm: {
    scraperType: 'hm_product',
    fields: [
      'product_name', 'final_price', 'initial_price', 'currency', 'image_urls', 'brand',
      'specifications', 'in_stock', 'rating', 'reviews_count', 'description',
      'category', 'color', 'size', 'product_code', 'seller_name', 'category_tree'
    ],
    defaultCurrency: 'USD',
    fashionFocus: true,
    categoryMapping: {
      'Women': 'fashion',
      'Men': 'fashion', 
      'Kids': 'fashion',
      'Baby': 'fashion',
      'Home': 'home',
      'Beauty': 'beauty-health',
      'Sport': 'sports'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  asos: {
    scraperType: 'asos_product',
    fields: ['name', 'price', 'currency', 'image', 'brand', 'color', 'size', 'availability'],
    fashionFocus: true,
    defaultCurrency: 'USD',
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  etsy: {
    scraperType: 'etsy_product',
    fields: [
      'title', 'final_price', 'initial_price', 'currency', 'images', 'rating',
      'reviews_count_item', 'reviews_count_shop', 'seller_name', 'seller_shop_name',
      'product_id', 'specifications', 'variations', 'top_reviews', 'category_tree',
      'breadcrumbs', 'item_details', 'shipping_return_policies', 'discount_percentage'
    ],
    handmadeFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Art & Collectibles': 'art',
      'Prints': 'art',
      'Digital Prints': 'art',
      'Jewelry': 'jewelry',
      'Clothing': 'fashion',
      'Home & Living': 'home',
      'Craft Supplies': 'crafts',
      'Vintage': 'vintage',
      'Wedding': 'wedding',
      'Toys & Games': 'toys'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  zara: {
    scraperType: 'zara_product',
    fields: [
      'product_name', 'price', 'currency', 'colour', 'color', 'size', 'description', 
      'image[]', 'availability', 'low_on_stock', 'sku', 'product_id', 'section',
      'product_family', 'product_subfamily', 'care', 'materials', 'dimension'
    ],
    fashionFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'WOMAN': 'fashion-women',
      'MAN': 'fashion-men', 
      'KIDS': 'fashion-kids',
      'KID': 'fashion-kids',
      'DRESS': 'fashion',
      'SHIRT': 'fashion',
      'PANTS': 'fashion',
      'JACKET': 'fashion',
      'SKIRT': 'fashion',
      'SHOES': 'footwear',
      'ACCESSORIES': 'accessories',
      'BAGS': 'bags'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  aliexpress: {
    scraperType: 'aliexpress_product',
    fields: ['title', 'current_price', 'original_price', 'currency', 'images', 'brand', 'specifications', 'variants', 'store_name', 'rating', 'review_count', 'sold_count'],
    defaultCurrency: 'USD',
    currencyDetection: true,
    weightFields: ['Weight', 'Product Weight', 'Net Weight'],
    categoryMapping: {
      'consumer electronics': 'electronics',
      'computers': 'electronics',
      'phones': 'electronics',
      'clothing': 'fashion',
      'shoes': 'footwear',
      'bags': 'accessories',
      'jewelry': 'accessories',
      'home & garden': 'home',
      'tools': 'tools',
      'automotive': 'automotive',
      'sports': 'sports'
    },
    estimatedTime: '30-90 seconds',
    pollingInterval: '30 seconds'
  }
};

export class PlatformConfigManager {
  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): string | null {
    try {
      const urlObj = new URL(url.toLowerCase());
      const domain = urlObj.hostname.replace(/^www\./, '');

      // Direct domain mappings
      const domainMappings: Record<string, string> = {
        'amazon.com': 'amazon',
        'amazon.co.uk': 'amazon',
        'amazon.in': 'amazon',
        'amazon.ca': 'amazon',
        'amazon.de': 'amazon',
        'amazon.fr': 'amazon',
        'amazon.it': 'amazon',
        'amazon.es': 'amazon',
        'amazon.com.au': 'amazon',
        'amazon.co.jp': 'amazon',
        'ebay.com': 'ebay',
        'ebay.co.uk': 'ebay',
        'ebay.de': 'ebay',
        'walmart.com': 'walmart',
        'bestbuy.com': 'bestbuy',
        'ae.com': 'ae',
        'myntra.com': 'myntra',
        'target.com': 'target',
        'hm.com': 'hm',
        'asos.com': 'asos',
        'etsy.com': 'etsy',
        'zara.com': 'zara',
        'aliexpress.com': 'aliexpress',
        'aliexpress.us': 'aliexpress',
        'es.aliexpress.com': 'aliexpress',
        'fr.aliexpress.com': 'aliexpress',
        'de.aliexpress.com': 'aliexpress',
        'pt.aliexpress.com': 'aliexpress',
        'it.aliexpress.com': 'aliexpress',
        'nl.aliexpress.com': 'aliexpress',
        'ja.aliexpress.com': 'aliexpress',
        'ko.aliexpress.com': 'aliexpress',
        'tr.aliexpress.com': 'aliexpress',
        'ru.aliexpress.com': 'aliexpress'
      };

      // Check direct mapping first
      if (domainMappings[domain]) {
        return domainMappings[domain];
      }

      // Check for partial matches
      for (const [domainPattern, platform] of Object.entries(domainMappings)) {
        if (domain.includes(domainPattern.split('.')[0])) {
          return platform;
        }
      }

      logger.warn('Unknown platform detected:', domain);
      return null;
    } catch (error) {
      logger.error('Error detecting platform from URL:', url, error);
      return null;
    }
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: string): PlatformConfig | null {
    return PLATFORM_CONFIGS[platform] || null;
  }

  /**
   * Get platform-specific timing information
   */
  getPlatformTimingInfo(url: string): { estimatedTime: string; pollingInterval: string } {
    const platform = this.detectPlatform(url);
    if (!platform) {
      return { estimatedTime: '15-60 seconds', pollingInterval: '15 seconds' };
    }

    const config = this.getPlatformConfig(platform);
    return {
      estimatedTime: config?.estimatedTime || '15-60 seconds',
      pollingInterval: config?.pollingInterval || '15 seconds'
    };
  }

  /**
   * Get user-friendly status message for a platform
   */
  getPlatformStatusMessage(url: string, status: 'starting' | 'polling' | 'completed' | 'failed'): string {
    const platform = this.detectPlatform(url);
    const platformName = this.getPlatformDisplayName(platform);
    const timing = this.getPlatformTimingInfo(url);

    switch (status) {
      case 'starting':
        return `Starting ${platformName} product data collection. Expected time: ${timing.estimatedTime}...`;
      case 'polling':
        return `Collecting ${platformName} product data (checking every ${timing.pollingInterval})...`;
      case 'completed':
        return `Successfully collected ${platformName} product data!`;
      case 'failed':
        return `Failed to collect ${platformName} product data. Please try again.`;
      default:
        return `Processing ${platformName} product data...`;
    }
  }

  /**
   * Get display-friendly platform name
   */
  getPlatformDisplayName(platform: string | null): string {
    const displayNames: Record<string, string> = {
      'amazon': 'Amazon',
      'ebay': 'eBay',
      'walmart': 'Walmart',
      'bestbuy': 'Best Buy',
      'ae': 'American Eagle',
      'myntra': 'Myntra',
      'target': 'Target',
      'hm': 'H&M',
      'asos': 'ASOS',
      'etsy': 'Etsy',
      'zara': 'Zara',
      'aliexpress': 'AliExpress'
    };
    
    return displayNames[platform || 'unknown'] || 'Product';
  }

  /**
   * Check if platform supports specific features
   */
  platformSupportsFeature(platform: string, feature: 'reviews' | 'images' | 'variants' | 'weight'): boolean {
    const config = this.getPlatformConfig(platform);
    if (!config) return false;

    switch (feature) {
      case 'reviews':
        return config.fields.some(field => 
          field.includes('review') || field.includes('rating')
        );
      case 'images':
        return config.fields.some(field => 
          field.includes('image') || field.includes('photo')
        );
      case 'variants':
        return config.fields.some(field => 
          field.includes('variation') || field.includes('color') || field.includes('size')
        );
      case 'weight':
        return !!(config.weightFields?.length || config.weightSelectors?.length);
      default:
        return false;
    }
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): string[] {
    return Object.keys(PLATFORM_CONFIGS);
  }

  /**
   * Check if URL is supported
   */
  isUrlSupported(url: string): boolean {
    return this.detectPlatform(url) !== null;
  }
}

// Export singleton instance
export const platformConfigManager = new PlatformConfigManager();