/**
 * Product Search Service
 * Handles platform detection, URL analysis, and search-related functionality
 * Extracted from BrightDataProductService for better maintainability
 */

export interface PlatformConfig {
  scraperType: string;
  fields: string[];
  defaultCurrency: string;
  estimatedTime: string;
  pollingInterval: string;
  fashionFocus?: boolean;
  handmadeFocus?: boolean;
  luxuryFocus?: boolean;
  weightSelectors?: string[];
  weightFields?: string[];
  currencyMap?: Record<string, string>;
  currencyDetection?: boolean;
  categoryMapping?: Record<string, string>;
}

export interface PlatformTimingInfo {
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
    pollingInterval: '15 seconds',
    defaultCurrency: 'USD'
  },
  ebay: {
    scraperType: 'ebay_product',
    fields: ['title', 'price', 'currency', 'images', 'condition', 'shipping'],
    currencyDetection: true,
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds',
    defaultCurrency: 'USD'
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
  lego: {
    scraperType: 'lego_product',
    fields: [
      'product_name', 'price', 'currency', 'images', 'product_code', 'age_range',
      'pieces_count', 'availability', 'theme', 'description', 'features',
      'product_details', 'building_instructions', 'reviews', 'rating'
    ],
    defaultCurrency: 'USD',
    categoryMapping: {
      'Architecture': 'toys-building',
      'City': 'toys-building',
      'Creator': 'toys-building',
      'Friends': 'toys-building',
      'Technic': 'toys-building',
      'Star Wars': 'toys-collectible'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  hermes: {
    scraperType: 'hermes_product',
    fields: [
      'title', 'price', 'currency', 'images', 'description', 'materials',
      'dimensions', 'availability', 'product_code', 'category', 'color'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Bags': 'luxury-bags',
      'Scarves': 'luxury-accessories',
      'Jewelry': 'luxury-jewelry',
      'Watches': 'luxury-watches',
      'Ready-to-wear': 'luxury-fashion',
      'Perfume': 'luxury-fragrance'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  flipkart: {
    scraperType: 'flipkart_product',
    fields: [
      'title', 'final_price', 'initial_price', 'currency', 'discount', 'images',
      'brand', 'specifications', 'highlights', 'rating', 'reviews_count',
      'availability', 'seller_name', 'emi_options', 'offers'
    ],
    defaultCurrency: 'INR',
    categoryMapping: {
      'Electronics': 'electronics',
      'Fashion': 'fashion',
      'Home & Kitchen': 'home',
      'Books': 'books',
      'Sports': 'sports',
      'Toys': 'toys'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  toysrus: {
    scraperType: 'toysrus_product',
    fields: [
      'title', 'price', 'currency', 'images', 'brand', 'age_range', 'category',
      'description', 'features', 'specifications', 'availability', 'rating'
    ],
    defaultCurrency: 'USD',
    categoryMapping: {
      'Action Figures': 'toys-action',
      'Building Sets': 'toys-building',
      'Dolls': 'toys-dolls',
      'Games': 'toys-games',
      'Outdoor Play': 'toys-outdoor',
      'Learning': 'toys-educational'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  carters: {
    scraperType: 'carters_product',
    fields: [
      'title', 'price', 'currency', 'images', 'size', 'color', 'description',
      'age_range', 'material', 'care_instructions', 'availability'
    ],
    fashionFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Baby Girl': 'fashion-baby',
      'Baby Boy': 'fashion-baby',
      'Toddler Girl': 'fashion-toddler',
      'Toddler Boy': 'fashion-toddler',
      'Kids': 'fashion-kids'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  prada: {
    scraperType: 'prada_product',
    fields: [
      'title', 'price', 'currency', 'images', 'description', 'materials',
      'color', 'size', 'product_code', 'availability', 'category'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Handbags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Ready-to-wear': 'luxury-fashion',
      'Accessories': 'luxury-accessories',
      'Eyewear': 'luxury-eyewear',
      'Fragrance': 'luxury-fragrance'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  ysl: {
    scraperType: 'ysl_product',
    fields: [
      'title', 'price', 'currency', 'images', 'description', 'shade',
      'size', 'category', 'availability', 'product_code'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Makeup': 'luxury-beauty',
      'Skincare': 'luxury-beauty',
      'Fragrance': 'luxury-fragrance',
      'Handbags': 'luxury-bags',
      'Ready-to-wear': 'luxury-fashion'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  balenciaga: {
    scraperType: 'balenciaga_product',
    fields: [
      'title', 'price', 'currency', 'images', 'description', 'color',
      'size', 'materials', 'product_code', 'availability'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Ready-to-wear': 'luxury-fashion',
      'Shoes': 'luxury-footwear',
      'Bags': 'luxury-bags',
      'Accessories': 'luxury-accessories'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  dior: {
    scraperType: 'dior_product',
    fields: [
      'title', 'price', 'currency', 'images', 'description', 'shade',
      'size', 'fragrance_notes', 'product_code', 'availability'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Makeup': 'luxury-beauty',
      'Skincare': 'luxury-beauty',
      'Fragrance': 'luxury-fragrance',
      'Fashion': 'luxury-fashion',
      'Jewelry': 'luxury-jewelry'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  chanel: {
    scraperType: 'chanel_product',
    fields: [
      'product_name', 'product_description', 'country', 'currency', 'color',
      'variations[]', 'free_sample', 'image_slider[]', 'loyalty_points',
      'member_price', 'pdp_plus', 'product_brand', 'product_gift[]',
      'product_url', 'regular_price', 'retailer_price', 'material',
      'product_category', 'image', 'shade', 'sku', 'stock', 'stock_availability',
      'type', 'volume', 'video[]', 'breadcrumbs[]', 'url'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Kính mát dáng phi công': 'luxury-eyewear',
      'Mắt kính': 'luxury-eyewear',
      'Kính mát': 'luxury-eyewear',
      'Make-up': 'luxury-beauty',
      'Parfum': 'luxury-fragrance',
      'Handbags': 'luxury-bags',
      'Ready-to-wear': 'luxury-fashion',
      'Jewelry': 'luxury-jewelry',
      'Watches': 'luxury-watches'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  }
};

export class ProductSearchService {
  private static instance: ProductSearchService;

  private constructor() {}

  static getInstance(): ProductSearchService {
    if (!ProductSearchService.instance) {
      ProductSearchService.instance = new ProductSearchService();
    }
    return ProductSearchService.instance;
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. prefix for matching
      const domain = hostname.replace(/^www\./, '');
      
      const platformMappings: Record<string, string> = {
        'amazon.com': 'amazon',
        'amazon.co.uk': 'amazon',
        'amazon.de': 'amazon',
        'amazon.fr': 'amazon',
        'amazon.it': 'amazon',
        'amazon.es': 'amazon',
        'amazon.ca': 'amazon',
        'amazon.com.au': 'amazon',
        'amazon.in': 'amazon',
        'amazon.co.jp': 'amazon',
        'amazon.com.br': 'amazon',
        'amazon.com.mx': 'amazon',
        'ebay.com': 'ebay',
        'ebay.co.uk': 'ebay',
        'ebay.de': 'ebay',
        'ebay.fr': 'ebay',
        'ebay.it': 'ebay',
        'ebay.es': 'ebay',
        'ebay.ca': 'ebay',
        'ebay.com.au': 'ebay',
        'walmart.com': 'walmart',
        'bestbuy.com': 'bestbuy',
        'ae.com': 'ae',
        'myntra.com': 'myntra',
        'target.com': 'target',
        'hm.com': 'hm',
        'asos.com': 'asos',
        'etsy.com': 'etsy',
        'zara.com': 'zara',
        'lego.com': 'lego',
        'hermes.com': 'hermes',
        'flipkart.com': 'flipkart',
        'toysrus.com': 'toysrus',
        'toysrus.ca': 'toysrus',
        'carters.com': 'carters',
        'prada.com': 'prada',
        'ysl.com': 'ysl',
        'yslbeauty.com': 'ysl',
        'balenciaga.com': 'balenciaga',
        'dior.com': 'dior',
        'chanel.com': 'chanel'
      };
      
      return platformMappings[domain] || null;
    } catch (error) {
      console.error('Error detecting platform from URL:', error);
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
  getPlatformTimingInfo(url: string): PlatformTimingInfo {
    const platform = this.detectPlatform(url);
    if (!platform) {
      return { estimatedTime: '15-60 seconds', pollingInterval: '15 seconds' };
    }

    const config = PLATFORM_CONFIGS[platform];
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
  private getPlatformDisplayName(platform: string | null): string {
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
      'lego': 'LEGO',
      'hermes': 'Hermès',
      'flipkart': 'Flipkart',
      'toysrus': 'Toys"R"Us',
      'carters': 'Carter\'s',
      'prada': 'Prada',
      'ysl': 'Yves Saint Laurent',
      'balenciaga': 'Balenciaga',
      'dior': 'Dior',
      'chanel': 'Chanel'
    };
    return displayNames[platform || ''] || 'Unknown Platform';
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): string[] {
    return Object.keys(PLATFORM_CONFIGS);
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(url: string): boolean {
    const platform = this.detectPlatform(url);
    return platform !== null && platform in PLATFORM_CONFIGS;
  }

  /**
   * Get platform category mapping
   */
  getPlatformCategoryMapping(platform: string): Record<string, string> | null {
    const config = PLATFORM_CONFIGS[platform];
    return config?.categoryMapping || null;
  }

  /**
   * Get platform characteristics
   */
  getPlatformCharacteristics(platform: string): {
    isFashion: boolean;
    isHandmade: boolean;
    isLuxury: boolean;
    supportsCurrency: boolean;
    supportsWeight: boolean;
  } {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      return {
        isFashion: false,
        isHandmade: false,
        isLuxury: false,
        supportsCurrency: false,
        supportsWeight: false
      };
    }

    return {
      isFashion: config.fashionFocus || false,
      isHandmade: config.handmadeFocus || false,
      isLuxury: config.luxuryFocus || false,
      supportsCurrency: config.currencyDetection || Boolean(config.currencyMap),
      supportsWeight: Boolean(config.weightFields || config.weightSelectors)
    };
  }
}