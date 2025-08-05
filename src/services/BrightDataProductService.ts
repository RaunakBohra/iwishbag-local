/**
 * Bright Data Product Service
 * Enhanced product scraping using Bright Data MCP tools
 * Supports Amazon, eBay, Walmart, Best Buy, Etsy, and more
 */

import { ProductData, FetchResult } from './ProductDataFetchService';
import { urlAnalysisService } from './UrlAnalysisService';

export interface BrightDataConfig {
  apiToken: string;
  cacheTimeout?: number;
}

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  enhanceWithAI?: boolean;
  deliveryCountry?: string; // For regional URL processing (e.g., 'IN', 'US', 'GB')
}

/**
 * Platform-specific scraping configurations
 */
const PLATFORM_CONFIGS = {
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
    defaultCurrency: 'USD', // H&M supports multiple currencies
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
      'product_name', 'initial_price', 'final_price', 'currency', 'image_urls[]', 
      'main_image', 'rating', 'reviews_count', 'description', 'in_stock',
      'age_range', 'piece_count', 'product_code', 'features[]', 'brand',
      'manufacturer', 'category', 'bullet_text', 'vip_points'
    ],
    toysFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Architecture': 'building-sets',
      'City': 'building-sets',
      'Creator': 'building-sets', 
      'Friends': 'building-sets',
      'Star Wars': 'building-sets',
      'Technic': 'building-sets',
      'DUPLO': 'early-learning',
      'Classic': 'building-sets',
      'Ninjago': 'building-sets',
      'Harry Potter': 'building-sets',
      'Disney': 'building-sets'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  hermes: {
    scraperType: 'hermes_product',
    fields: [
      'product_name', 'initial_price', 'final_price', 'currency', 'image_urls[]',
      'main_image', 'description', 'in_stock', 'size', 'color', 'brand',
      'category_name', 'sku', 'material', 'country', 'product_details'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Bags': 'luxury-bags',
      'Scarves': 'luxury-accessories',
      'Jewelry': 'luxury-jewelry',
      'Watches': 'luxury-watches',
      'Belts': 'luxury-accessories',
      'Perfume': 'luxury-fragrance',
      'Ready-to-wear': 'luxury-fashion',
      'Shoes': 'luxury-footwear',
      'Home': 'luxury-home'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  flipkart: {
    scraperType: 'flipkart_product',
    fields: ['title', 'final_price', 'currency', 'brand', 'specifications', 'highlights', 'rating'],
    defaultCurrency: 'INR',
    fallbackToMarkdown: true,
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  toysrus: {
    scraperType: 'toysrus_product',
    fields: [
      'product_name', 'brand', 'initial_price', 'final_price', 'currency', 'image_urls[]',
      'main_image', 'description', 'in_stock', 'weight', 'model_number', 'rating',
      'reviews_count', 'category_tree[]', 'delivery[]', 'gtin_ean_pn'
    ],
    toysFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Home': 'toys-general',
      'Outdoor': 'outdoor-toys', 
      'Educational': 'educational-toys',
      'Action Figures': 'action-figures',
      'Dolls': 'dolls',
      'Building': 'building-sets',
      'Electronic': 'electronic-toys'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  carters: {
    scraperType: 'carters_product',
    fields: [
      'product_name', 'description', 'in_stock', 'color', 'size', 'reviews_count',
      'category', 'features[]', 'similar_products[]', 'other_attributes[]',
      'image_urls[]', 'brand', 'initial_price', 'final_price', 'currency'
    ],
    babyClothingFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Baby': 'baby-clothing',
      'Toddler': 'toddler-clothing', 
      'Kids': 'kids-clothing',
      'Newborn': 'newborn-clothing',
      'Pajamas': 'sleepwear',
      'Accessories': 'baby-accessories',
      'Socks & Tights': 'baby-socks'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  prada: {
    scraperType: 'prada_product',
    fields: [
      'product_name', 'description', 'in_stock', 'size', 'color', 'initial_price',
      'final_price', 'currency', 'image_urls[]', 'brand', 'category_name',
      'breadcrumbs[]', 'sku', 'material', 'product_details', 'variations[]',
      'features', 'dimensions', 'tags'
    ],
    luxuryFocus: true,
    defaultCurrency: 'EUR',
    categoryMapping: {
      'Totes': 'luxury-bags',
      'Handbags': 'luxury-bags',
      'Shoes': 'luxury-footwear',
      'Sneakers': 'luxury-sneakers',
      'Ready-to-wear': 'luxury-fashion',
      'Accessories': 'luxury-accessories',
      'Eyewear': 'luxury-eyewear'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  ysl: {
    scraperType: 'ysl_product',
    fields: [
      'product_name', 'description', 'in_stock', 'size', 'color', 'initial_price',
      'final_price', 'currency', 'image_urls[]', 'brand', 'category_name',
      'breadcrumbs[]', 'sku', 'material', 'product_details', 'features[]',
      'dimensions', 'tags[]', 'variations[]'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'small-leather-goods-women': 'luxury-accessories',
      'handbags-woman': 'luxury-bags',
      'shoes-woman': 'luxury-footwear',
      'ready-to-wear-woman': 'luxury-fashion',
      'beauty': 'luxury-beauty',
      'fragrance': 'luxury-fragrance',
      'jewelry': 'luxury-jewelry'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  balenciaga: {
    scraperType: 'balenciaga_product',
    fields: [
      'product_name', 'description', 'country', 'currency', 'in_stock', 'size', 
      'color', 'main_image', 'category_url', 'category_name', 'category_path',
      'url', 'sku', 'root_category_url', 'root_category_name', 'breadcrumbs[]',
      'seller', 'brand', 'image_urls[]', 'product_details', 'product_story',
      'features[]', 'dimensions', 'variations[]', 'tags[]', 'gtin', 'mpn',
      'material', 'product_id', 'initial_price', 'final_price', 'reviews_count', 'top_reviews[]'
    ],
    luxuryFocus: true,
    defaultCurrency: 'USD',
    categoryMapping: {
      'Sneakers': 'luxury-sneakers',
      'Shoes': 'luxury-footwear',
      'Bags': 'luxury-bags',
      'Handbags': 'luxury-bags',
      'Ready-to-wear': 'luxury-fashion',
      'Accessories': 'luxury-accessories',
      'Jewelry': 'luxury-jewelry',
      'Sunglasses': 'luxury-eyewear'
    },
    estimatedTime: '15-60 seconds',
    pollingInterval: '15 seconds'
  },
  dior: {
    scraperType: 'dior_product',
    fields: [
      'timestamp', 'product_name', 'description', 'country', 'currency', 'in_stock',
      'size', 'color', 'main_image', 'category_url', 'category_name', 'category_path',
      'url', 'sku', 'root_category_url', 'root_category_name', 'breadcrumbs[]',
      'seller', 'brand', 'image_urls[]', 'product_details', 'product_story',
      'features[]', 'dimensions', 'variations[]', 'tags[]', 'gtin', 'mpn',
      'material', 'product_id', 'initial_price', 'final_price', 'reviews_count', 'top_reviews[]'
    ],
    luxuryFocus: true,
    defaultCurrency: 'EUR',
    categoryMapping: {
      'Sakkos': 'luxury-fashion',
      'Jacken': 'luxury-fashion',
      'Hemden': 'luxury-fashion',
      'Hosen': 'luxury-fashion',
      'Schuhe': 'luxury-footwear',
      'Taschen': 'luxury-bags',
      'Accessories': 'luxury-accessories',
      'Parfum': 'luxury-fragrance',
      'Make-up': 'luxury-beauty',
      'Schmuck': 'luxury-jewelry'
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
    defaultCurrency: 'VND', // Chanel has VND pricing in sample data
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

class BrightDataProductService {
  private cache: Map<string, { data: FetchResult; timestamp: number }> = new Map();
  private cacheTimeout: number;

  constructor(private config: BrightDataConfig) {
    this.cacheTimeout = config.cacheTimeout || 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Get platform-specific timing information for user feedback
   */
  getPlatformTimingInfo(url: string): { estimatedTime: string; pollingInterval: string } {
    const platform = this.detectPlatform(url);
    if (!platform) {
      return { estimatedTime: '15-60 seconds', pollingInterval: '15 seconds' };
    }

    const config = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
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
    
    return displayNames[platform || 'unknown'] || 'Product';
  }

  /**
   * Main method to fetch product data using Bright Data
   */
  async fetchProductData(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    try {
      // Check cache first
      const cached = this.getFromCache(url);
      if (cached) return cached;

      // Detect platform
      const platform = this.detectPlatform(url);
      if (!platform) {
        return {
          success: false,
          error: 'Unsupported platform',
          source: 'api'
        };
      }

      // Use appropriate Bright Data scraper
      let result: FetchResult;
      
      switch (platform) {
        case 'amazon':
          result = await this.scrapeAmazonProduct(url, options);
          break;
        case 'ebay':
          result = await this.scrapeEbayProduct(url, options);
          break;
        case 'walmart':
          result = await this.scrapeWalmartProduct(url, options);
          break;
        case 'bestbuy':
          result = await this.scrapeBestBuyProduct(url, options);
          break;
        case 'ae':
          result = await this.scrapeAEProduct(url, options);
          break;
        case 'myntra':
          result = await this.scrapeMyntraProduct(url, options);
          break;
        case 'target':
          result = await this.scrapeTargetProduct(url, options);
          break;
        case 'hm':
          result = await this.scrapeHMProduct(url, options);
          break;
        case 'asos':
          result = await this.scrapeASOSProduct(url, options);
          break;
        case 'etsy':
          result = await this.scrapeEtsyProduct(url, options);
          break;
        case 'zara':
          result = await this.scrapeZaraProduct(url, options);
          break;
        case 'lego':
          result = await this.scrapeLegoProduct(url, options);
          break;
        case 'hermes':
          result = await this.scrapeHermesProduct(url, options);
          break;
        case 'flipkart':
          result = await this.scrapeFlipkartProduct(url, options);
          break;
        case 'toysrus':
          result = await this.scrapeToysrusProduct(url, options);
          break;
        case 'carters':
          result = await this.scrapeCartersProduct(url, options);
          break;
        case 'prada':
          result = await this.scrapePradaProduct(url, options);
          break;
        case 'ysl':
          result = await this.scrapeYSLProduct(url, options);
          break;
        case 'balenciaga':
          result = await this.scrapeBalenciagaProduct(url, options);
          break;
        case 'dior':
          result = await this.scrapeDiorProduct(url, options);
          break;
        case 'chanel':
          result = await this.scrapeChanelProduct(url, options);
          break;
        default:
          result = await this.scrapeGenericProduct(url, options);
      }

      // Enhance with AI if requested
      if (options.enhanceWithAI && result.success && result.data) {
        result.data = await this.enhanceWithAI(result.data, url);
      }

      // Cache successful results
      if (result.success) {
        this.saveToCache(url, result);
      }

      return result;

    } catch (error) {
      console.error('Bright Data fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'api'
      };
    }
  }

  /**
   * Scrape Amazon product using Bright Data MCP
   */
  private async scrapeAmazonProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      // This would use the actual Bright Data MCP call
      // For now, I'll create the structure that would work with MCP
      
      const mcpResult = await this.callBrightDataMCP('amazon_product', {
        url,
        include_reviews: options.includeReviews || false,
        include_images: options.includeImages !== false, // Default true
        country: this.detectCountryFromUrl(url)
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Amazon scraping failed');
      }

      const productData = this.normalizeAmazonData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Amazon scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape eBay product using Bright Data MCP
   */
  private async scrapeEbayProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('ebay_product', {
        url,
        include_seller_info: true,
        include_shipping: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'eBay scraping failed');
      }

      const productData = this.normalizeEbayData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'eBay scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Walmart product using Bright Data MCP
   */
  private async scrapeWalmartProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('walmart_product', {
        url,
        include_specifications: true,
        include_availability: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Walmart scraping failed');
      }

      const productData = this.normalizeWalmartData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Walmart scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Best Buy product using Bright Data MCP
   */
  private async scrapeBestBuyProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('bestbuy_product', {
        url,
        include_specifications: true,
        include_availability: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_highlights: true,
        include_variations: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Best Buy scraping failed');
      }

      const productData = this.normalizeBestBuyData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Best Buy scraping failed',
        source: 'scraper'
      };
    }
  }


  /**
   * Scrape American Eagle product using Bright Data MCP
   */
  private async scrapeAEProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('ae_product', {
        url,
        include_images: options.includeImages !== false,
        include_variants: options.includeVariants !== false,
        include_availability: true,
        include_reviews: options.includeReviews !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'American Eagle scraping failed');
      }

      const productData = this.normalizeAEData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'American Eagle scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Myntra product using Bright Data MCP
   */
  private async scrapeMyntraProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('myntra_product', {
        url,
        include_specifications: true,
        include_offers: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Myntra scraping failed');
      }

      const productData = this.normalizeMyntraData(mcpResult.data);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Myntra scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Target product using Bright Data MCP
   */
  private async scrapeTargetProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('target_product', {
        url,
        include_specifications: true,
        include_availability: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_highlights: true,
        include_variations: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Target scraping failed');
      }

      const productData = this.normalizeTargetData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Target scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape H&M product using Bright Data MCP
   */
  private async scrapeHMProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('hm_product', {
        url,
        include_specifications: true,
        include_availability: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_category_tree: true,
        include_variants: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'H&M scraping failed');
      }

      const productData = this.normalizeHMData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'H&M scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape ASOS product using Bright Data MCP
   */
  private async scrapeASOSProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('asos_product', {
        url,
        include_specifications: true,
        include_availability: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_category_tree: true,
        include_variants: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'ASOS scraping failed');
      }

      const productData = this.normalizeASOSData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ASOS scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Etsy product using Bright Data MCP
   */
  private async scrapeEtsyProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('etsy_product', {
        url,
        include_specifications: true,
        include_variations: options.includeVariants !== false,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_seller_info: true,
        include_shipping_policies: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Etsy scraping failed');
      }

      const productData = this.normalizeEtsyData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Etsy scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Zara product using Bright Data MCP
   */
  private async scrapeZaraProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      // Process URL to ensure correct regional format for better scraping
      let processedUrl = url;
      if (options.deliveryCountry) {
        processedUrl = urlAnalysisService.processUrlForCountry(url, options.deliveryCountry);
        console.log(`🌍 Zara URL processed for ${options.deliveryCountry}: ${url} -> ${processedUrl}`);
      }
      
      const mcpResult = await this.callBrightDataMCP('zara_product', {
        url: processedUrl,
        include_sections: true,
        include_materials: options.includeVariants !== false,
        include_care_instructions: true,
        include_size_variants: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Zara scraping failed');
      }

      const productData = this.normalizeZaraData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Zara scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape LEGO product using Bright Data MCP
   */
  private async scrapeLegoProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('lego_product', {
        url,
        include_features: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_related_products: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'LEGO scraping failed');
      }

      const productData = this.normalizeLegoData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LEGO scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Hermes product using Bright Data MCP
   */
  private async scrapeHermesProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('hermes_product', {
        url,
        include_materials: true,
        include_product_details: true,
        include_dimensions: true,
        include_craftsmanship: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Hermes scraping failed');
      }

      const productData = this.normalizeHermesData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hermes scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Flipkart product using Bright Data MCP
   */
  private async scrapeFlipkartProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('flipkart_product', {
        url,
        include_specifications: true,
        include_highlights: true,
        include_rating: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Flipkart scraping failed');
      }

      const productData = this.normalizeFlipkartData(mcpResult.data);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Flipkart scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Toys"R"Us product using Bright Data MCP
   */
  private async scrapeToysrusProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('toysrus_product', {
        url,
        include_specifications: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_variants: options.includeVariants !== false
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Toys"R"Us scraping failed');
      }

      const productData = this.normalizeToysrusData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Toys"R"Us scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Carter's product using Bright Data MCP
   */
  private async scrapeCartersProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('carters_product', {
        url,
        include_features: true,
        include_similar_products: options.includeVariants !== false,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_attributes: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Carter\'s scraping failed');
      }

      const productData = this.normalizeCartersData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Carter\'s scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Prada product using Bright Data MCP
   */
  private async scrapePradaProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('prada_product', {
        url,
        include_variations: options.includeVariants !== false,
        include_materials: true,
        include_details: true,
        include_images: options.includeImages !== false,
        include_breadcrumbs: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Prada scraping failed');
      }

      const productData = this.normalizePradaData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Prada scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape YSL product using Bright Data MCP
   */
  private async scrapeYSLProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('ysl_product', {
        url,
        include_features: true,
        include_variations: options.includeVariants !== false,
        include_materials: true,
        include_dimensions: true,
        include_images: options.includeImages !== false,
        include_tags: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'YSL scraping failed');
      }

      const productData = this.normalizeYSLData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'YSL scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Balenciaga product using Bright Data MCP
   */
  private async scrapeBalenciagaProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('balenciaga_product', {
        url,
        include_features: true,
        include_variations: options.includeVariants !== false,
        include_materials: true,
        include_dimensions: true,
        include_images: options.includeImages !== false,
        include_tags: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Balenciaga scraping failed');
      }

      const productData = this.normalizeBalenciagaData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balenciaga scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Dior product using Bright Data MCP
   */
  private async scrapeDiorProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('dior_product', {
        url,
        include_features: true,
        include_variations: options.includeVariants !== false,
        include_materials: true,
        include_dimensions: true,
        include_images: options.includeImages !== false,
        include_tags: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Dior scraping failed');
      }

      const productData = this.normalizeDiorData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Dior scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Chanel product using Bright Data MCP
   */
  private async scrapeChanelProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('chanel_product', {
        url,
        include_images: options.includeImages !== false,
        include_variations: options.includeVariants !== false,
        include_material: true,
        include_color: true,
        include_breadcrumbs: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Chanel scraping failed');
      }

      const productData = this.normalizeChanelData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chanel scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Generic product scraping using scrape_as_markdown
   */
  private async scrapeGenericProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('scrape_as_markdown', { url });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Generic scraping failed');
      }

      // Use AI to extract product data from markdown content
      const productData = await this.parseMarkdownForProductData(mcpResult.data, url);
      
      return {
        success: true,
        data: productData,
        source: 'scraper'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generic scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Call Bright Data MCP using the bridge
   */
  private async callBrightDataMCP(tool: string, params: any): Promise<any> {
    const { mcpBrightDataBridge } = await import('./MCPBrightDataBridge');
    
    switch (tool) {
      case 'amazon_product':
        return await mcpBrightDataBridge.scrapeAmazonProduct(params.url, params);
      case 'ebay_product':
        return await mcpBrightDataBridge.scrapeEbayProduct(params.url, params);
      case 'walmart_product':
        return await mcpBrightDataBridge.scrapeWalmartProduct(params.url, params);
      case 'bestbuy_product':
        return await mcpBrightDataBridge.scrapeBestBuyProduct(params.url, params);
      case 'ae_product':
        return await mcpBrightDataBridge.scrapeAEProduct(params.url, params);
      case 'myntra_product':
        return await mcpBrightDataBridge.scrapeMyntraProduct(params.url, params);
      case 'target_product':
        return await mcpBrightDataBridge.scrapeTargetProduct(params.url, params);
      case 'hm_product':
        return await mcpBrightDataBridge.scrapeHMProduct(params.url, params);
      case 'asos_product':
        return await mcpBrightDataBridge.scrapeASOSProduct(params.url, params);
      case 'etsy_product':
        return await mcpBrightDataBridge.scrapeEtsyProduct(params.url, params);
      case 'zara_product':
        return await mcpBrightDataBridge.scrapeZaraProduct(params.url, params);
      case 'lego_product':
        return await mcpBrightDataBridge.scrapeLegoProduct(params.url, params);
      case 'hermes_product':
        return await mcpBrightDataBridge.scrapeHermesProduct(params.url, params);
      case 'flipkart_product':
        return await mcpBrightDataBridge.scrapeFlipkartProduct(params.url, params);
      case 'toysrus_product':
        return await mcpBrightDataBridge.scrapeToysRUsProduct(params.url, params);
      case 'carters_product':
        return await mcpBrightDataBridge.scrapeCartersProduct(params.url, params);
      case 'prada_product':
        return await mcpBrightDataBridge.scrapePradaProduct(params.url, params);
      case 'ysl_product':
        return await mcpBrightDataBridge.scrapeYSLProduct(params.url, params);
      case 'balenciaga_product':
        return await mcpBrightDataBridge.scrapeBalenciagaProduct(params.url, params);
      case 'dior_product':
        return await mcpBrightDataBridge.scrapeDiorProduct(params.url, params);
      case 'chanel_product':
        return await mcpBrightDataBridge.scrapeChanelProduct(params.url, params);
      case 'scrape_as_markdown':
        return await mcpBrightDataBridge.scrapeAsMarkdown(params.url);
      default:
        return {
          success: false,
          error: `Unknown MCP tool: ${tool}`,
          data: null
        };
    }
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): string | null {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('amazon.')) return 'amazon';
    if (urlLower.includes('ebay.')) return 'ebay';
    if (urlLower.includes('walmart.com')) return 'walmart';
    if (urlLower.includes('bestbuy.com')) return 'bestbuy';
    if (urlLower.includes('ae.com')) return 'ae';
    if (urlLower.includes('myntra.com')) return 'myntra';
    if (urlLower.includes('target.com')) return 'target';
    if (urlLower.includes('hm.com')) return 'hm';
    if (urlLower.includes('asos.com')) return 'asos';
    if (urlLower.includes('etsy.com')) return 'etsy';
    if (urlLower.includes('zara.com')) return 'zara';
    if (urlLower.includes('lego.com')) return 'lego';
    if (urlLower.includes('hermes.com')) return 'hermes';
    if (urlLower.includes('flipkart.com')) return 'flipkart';
    if (urlLower.includes('toysrus.com')) return 'toysrus';
    if (urlLower.includes('carters.com')) return 'carters';
    if (urlLower.includes('prada.com')) return 'prada';
    if (urlLower.includes('ysl.com')) return 'ysl';
    if (urlLower.includes('balenciaga.com')) return 'balenciaga';
    if (urlLower.includes('dior.com')) return 'dior';
    if (urlLower.includes('chanel.com')) return 'chanel';
    
    return null;
  }

  /**
   * Detect country from marketplace URL
   */
  private detectCountryFromUrl(url: string): string {
    const urlLower = url.toLowerCase();
    
    // Amazon country detection
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
      if (urlLower.includes('amazon.com.mx')) return 'MX';
      if (urlLower.includes('amazon.com.br')) return 'BR';
      if (urlLower.includes('amazon.nl')) return 'NL';
      if (urlLower.includes('amazon.se')) return 'SE';
      if (urlLower.includes('amazon.com')) return 'US';
    }
    
    // H&M country detection (pattern: en_{country_code})
    if (urlLower.includes('hm.com')) {
      // Fix: Remove trailing slash requirement to match real URLs like /en_in/productpage
      const hmCountryMatch = urlLower.match(/\/en_([a-z]{2})/);
      if (hmCountryMatch) {
        return hmCountryMatch[1].toUpperCase();
      }
      
      // Alternative pattern for non-English locales (e.g., de_de, fr_fr)
      const hmLocaleMatch = urlLower.match(/\/([a-z]{2})_([a-z]{2})/);
      if (hmLocaleMatch) {
        return hmLocaleMatch[2].toUpperCase(); // Return country code (second part)
      }
      // Fallback for H&M URLs without clear country pattern
      if (urlLower.includes('hm.com/en_us/')) return 'US';
      if (urlLower.includes('hm.com/en_gb/')) return 'GB';
      if (urlLower.includes('hm.com/en_in/')) return 'IN';
      if (urlLower.includes('hm.com/en_ca/')) return 'CA';
      if (urlLower.includes('hm.com/en_au/')) return 'AU';
      if (urlLower.includes('hm.com/de_de/')) return 'DE';
      if (urlLower.includes('hm.com/fr_fr/')) return 'FR';
      if (urlLower.includes('hm.com/es_es/')) return 'ES';
      if (urlLower.includes('hm.com/it_it/')) return 'IT';
      if (urlLower.includes('hm.com/nl_nl/')) return 'NL';
      if (urlLower.includes('hm.com/se_se/')) return 'SE';
      if (urlLower.includes('hm.com/dk_dk/')) return 'DK';
      if (urlLower.includes('hm.com/no_no/')) return 'NO';
      if (urlLower.includes('hm.com/fi_fi/')) return 'FI';
      return 'SE'; // H&M default (Swedish company)
    }
    
    // ASOS country detection (pattern: /country-code/)
    if (urlLower.includes('asos.com')) {
      // ASOS URLs like: https://www.asos.com/us/, https://www.asos.com/fr/, etc.
      const asosCountryMatch = urlLower.match(/asos\.com\/([a-z]{2})\//);
      if (asosCountryMatch) {
        return asosCountryMatch[1].toUpperCase();
      }
      
      // Fallback patterns for ASOS regional URLs
      if (urlLower.includes('/us/')) return 'US';
      if (urlLower.includes('/gb/')) return 'GB';
      if (urlLower.includes('/fr/')) return 'FR';
      if (urlLower.includes('/de/')) return 'DE';
      if (urlLower.includes('/es/')) return 'ES';
      if (urlLower.includes('/it/')) return 'IT';
      if (urlLower.includes('/au/')) return 'AU';
      if (urlLower.includes('/ca/')) return 'CA';
      if (urlLower.includes('/nl/')) return 'NL';
      if (urlLower.includes('/se/')) return 'SE';
      if (urlLower.includes('/dk/')) return 'DK';
      return 'GB'; // ASOS default (UK-based company)
    }
    
    
    // Myntra (India only)
    if (urlLower.includes('myntra.com')) return 'IN';
    
    // Flipkart (India only) 
    if (urlLower.includes('flipkart.com')) return 'IN';
    
    // Target (US only)
    if (urlLower.includes('target.com')) return 'US';
    
    // Best Buy (US/Canada)
    if (urlLower.includes('bestbuy.com')) return 'US';
    if (urlLower.includes('bestbuy.ca')) return 'CA';
    
    // American Eagle (primarily US, some international)
    if (urlLower.includes('ae.com')) {
      if (urlLower.includes('/ca/')) return 'CA';
      return 'US'; // Default to US for American Eagle
    }
    
    // Walmart
    if (urlLower.includes('walmart.com')) return 'US';
    if (urlLower.includes('walmart.ca')) return 'CA';
    
    // eBay country detection
    if (urlLower.includes('ebay.')) {
      if (urlLower.includes('ebay.co.uk')) return 'GB';
      if (urlLower.includes('ebay.de')) return 'DE';
      if (urlLower.includes('ebay.fr')) return 'FR';
      if (urlLower.includes('ebay.ca')) return 'CA';
      if (urlLower.includes('ebay.com.au')) return 'AU';
      if (urlLower.includes('ebay.in')) return 'IN';
      if (urlLower.includes('ebay.it')) return 'IT';
      if (urlLower.includes('ebay.es')) return 'ES';
      if (urlLower.includes('ebay.com')) return 'US';
    }
    
    return 'US'; // Default fallback
  }

  /**
   * Get default currency for a country
   */
  private getCountryCurrency(countryCode: string): string {
    const currencyMap: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD',
      'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
      'SE': 'SEK', 'DK': 'DKK', 'NO': 'NOK', 'FI': 'EUR',
      'IN': 'INR', 'JP': 'JPY', 'BR': 'BRL', 'MX': 'MXN',
      'CH': 'CHF', 'KR': 'KRW', 'SG': 'SGD', 'HK': 'HKD',
      'MY': 'MYR', 'TH': 'THB', 'PH': 'PHP', 'ID': 'IDR',
      'VN': 'VND', 'TW': 'TWD', 'TR': 'TRY', 'IL': 'ILS',
      'AE': 'AED', 'SA': 'SAR', 'EG': 'EGP', 'ZA': 'ZAR'
    };
    
    return currencyMap[countryCode] || 'USD';
  }

  /**
   * Detect if a marketplace is US/North American (uses Imperial system - lbs)
   * vs Rest of World (uses Metric system - kg)
   */
  private isUSMarketplace(url: string): boolean {
    const urlLower = url.toLowerCase();
    
    // US/North American marketplaces that use pounds (lbs)
    const usMarketplaces = [
      'amazon.com',     // Amazon US
      'amazon.ca',      // Amazon Canada
      'walmart.com',    // Walmart US
      'bestbuy.com',    // Best Buy US
      'target.com',     // Target US
      'ae.com',         // American Eagle US
      'ebay.com',       // eBay US (primary domain)
      'costco.com',     // Costco US
      'homedepot.com',  // Home Depot US
      'lowes.com'       // Lowe's US
    ];
    
    // International marketplaces that use metric system (kg)
    const internationalMarketplaces = [
      'hm.com',         // H&M (Swedish, uses metric)
      'myntra.com',     // Myntra (Indian, uses metric)
      'flipkart.com',   // Flipkart (Indian, uses metric)
      'amazon.co.uk',   // Amazon UK
      'amazon.de',      // Amazon Germany
      'amazon.fr',      // Amazon France
      'amazon.co.jp',   // Amazon Japan
      'amazon.com.au'   // Amazon Australia
    ];
    
    // Check if it's a US marketplace
    const isUS = usMarketplaces.some(domain => urlLower.includes(domain));
    
    // If it's explicitly international, return false (use metric)
    const isInternational = internationalMarketplaces.some(domain => urlLower.includes(domain));
    if (isInternational) return false;
    
    return isUS;
  }

  /**
   * Data normalization methods for real Bright Data responses
   */
  private normalizeAmazonData(rawData: any, url: string): ProductData {
    // Handle real Bright Data Amazon response format
    return {
      title: rawData.title || rawData.product_title,
      price: rawData.final_price || rawData.initial_price || this.parsePrice(rawData.price),
      currency: rawData.currency || 'USD',
      weight: this.extractWeightFromAmazon(rawData, url),
      weight_value: rawData.weight_value,
      weight_unit: rawData.weight_unit || 'lbs',
      weight_raw: rawData.weight_raw,
      images: rawData.images || [],
      brand: rawData.brand,
      category: rawData.category || this.inferCategory(rawData.title || ''),
      availability: rawData.is_available ? 'in-stock' : 
                   rawData.availability === 'In Stock' ? 'in-stock' : 
                   rawData.availability === 'Out of Stock' ? 'out-of-stock' : 'unknown',
      description: rawData.description,
      variants: rawData.variations?.map((v: any) => ({
        name: v.color ? 'Color' : 'Variant',
        options: v.color ? [v.color] : [v.name || 'Default']
      })) || []
    };
  }
  
  /**
   * Extract weight from Amazon data (shipping weight, dimensions, etc.)
   */
  private extractWeightFromAmazon(rawData: any, url: string): number | undefined {
    // Try multiple weight sources from Amazon
    if (rawData.shipping_weight) {
      return this.parseWeight(rawData.shipping_weight, url);
    }
    if (rawData.item_weight) {
      return this.parseWeight(rawData.item_weight, url);
    }
    if (rawData.package_weight) {
      return this.parseWeight(rawData.package_weight, url);
    }
    // Estimate based on category if no weight available
    return this.estimateWeight(rawData.title || '', this.inferCategory(rawData.title || ''));
  }

  private normalizeEbayData(rawData: any, url?: string): ProductData {
    try {
      // Detect country and currency from URL
      const detectedCountry = url ? this.detectCountryFromUrl(url) : 'US';
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Handle eBay's comprehensive response format
      const priceString = rawData.price || rawData.final_price;
      let finalPrice = 0;
      
      // Parse price from eBay format (e.g., "$19.98")
      if (priceString) {
        const priceMatch = priceString.match(/[\d,.]+/);
        if (priceMatch) {
          finalPrice = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }
      
      // Safely parse images and limit to first 8 to prevent memory issues
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.images)) {
          images = rawData.images.filter(Boolean).slice(0, 8);
        }
      } catch (imgError) {
        console.warn('Failed to parse eBay images:', imgError);
        images = [];
      }

      // Extract brand from product specifications
      let brand = 'Unknown Brand';
      try {
        if (Array.isArray(rawData.product_specifications)) {
          const brandSpec = rawData.product_specifications.find(
            (spec: any) => spec.specification_name?.toLowerCase() === 'brand'
          );
          if (brandSpec) {
            brand = brandSpec.specification_value;
          }
        }
      } catch (brandError) {
        console.warn('Failed to extract eBay brand:', brandError);
      }

      // Determine category from eBay's root category or breadcrumbs
      let category = 'general';
      try {
        if (rawData.root_category) {
          category = this.mapEbayCategory(rawData.root_category);
        } else if (Array.isArray(rawData.breadcrumbs) && rawData.breadcrumbs.length > 0) {
          // Use the most specific category from breadcrumbs
          const specificCategory = rawData.breadcrumbs[rawData.breadcrumbs.length - 1]?.name;
          if (specificCategory) {
            category = this.mapEbayCategory(specificCategory);
          }
        } else {
          category = this.inferCategory(rawData.title || '');
        }
      } catch (categoryError) {
        console.warn('Failed to map eBay category:', categoryError);
      }

      // Handle availability status based on condition and count
      let availability = 'unknown';
      try {
        if (rawData.condition) {
          if (rawData.condition === 'New' || rawData.available_count > 0) {
            availability = 'in-stock';
          } else if (rawData.available_count === 0) {
            availability = 'out-of-stock';
          }
        }
      } catch (availError) {
        console.warn('Failed to parse eBay availability:', availError);
      }

      // Build comprehensive description from seller description
      let description = '';
      try {
        description = rawData.description_from_the_seller || 
                     rawData.description_from_the_seller_parsed || 
                     `eBay ${rawData.condition || ''} condition item from ${rawData.seller_name || 'seller'}`;
      } catch (descError) {
        console.warn('Failed to build eBay description:', descError);
        description = rawData.title || 'eBay Product';
      }

      // Estimate weight for eBay items (they rarely provide weight)
      let weight: number | undefined;
      try {
        weight = this.estimateEbayWeight(category, rawData.title || '');
      } catch (weightError) {
        console.warn('Failed to estimate eBay weight:', weightError);
      }

      // Handle variants from tags
      let variants: any[] = [];
      try {
        if (Array.isArray(rawData.tags)) {
          variants = rawData.tags
            .filter(Boolean)
            .map((tag: string) => ({ type: 'feature', value: tag }));
        }
      } catch (variantError) {
        console.warn('Failed to parse eBay variants:', variantError);
      }

      // Return normalized data with safe fallbacks
      return {
        title: rawData.title || `eBay Product ${rawData.product_id || ''}`,
        price: finalPrice,
        currency: rawData.currency || detectedCurrency,
        weight: weight,
        images: images,
        brand: brand,
        category: category,
        availability: availability,
        description: description.substring(0, 1000), // Limit description length
        variants: variants,
        // eBay-specific fields
        condition: rawData.condition,
        seller_name: rawData.seller_name,
        seller_rating: rawData.seller_rating,
        seller_reviews: rawData.seller_reviews,
        item_location: rawData.item_location,
        ships_to: rawData.ships_to,
        shipping: rawData.shipping,
        return_policy: rawData.return_policy
      };

    } catch (error) {
      console.error('Error normalizing eBay data:', error);
      // Detect country and currency for fallback
      const detectedCountry = url ? this.detectCountryFromUrl(url) : 'US';
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Return minimal safe data structure
      return {
        title: rawData?.title || 'Unknown eBay Product',
        price: this.parsePrice(rawData?.price) || 0,
        currency: rawData?.currency || detectedCurrency,
        category: 'general',
        availability: 'unknown',
        images: [],
        variants: [],
        brand: 'Unknown Brand'
      };
    }
  }

  private normalizeWalmartData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || rawData.name,
      price: this.parsePrice(rawData.price),
      currency: 'USD',
      weight: this.parseWeight(rawData.shipping_weight, url),
      images: rawData.images || [],
      brand: rawData.brand,
      category: rawData.category || this.inferCategory(rawData.title),
      availability: rawData.available ? 'in-stock' : 'out-of-stock'
    };
  }

  private normalizeBestBuyData(rawData: any, url: string): ProductData {
    try {
      // Handle Best Buy's comprehensive response format
      const finalPrice = rawData.final_price || rawData.offer_price || rawData.price;
      const initialPrice = rawData.initial_price;
      
      // Safely parse images and limit to first 8 to prevent memory issues
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.images)) {
          // Filter out duplicate images and prefer high-quality ones
          const uniqueImages = new Set<string>();
          rawData.images.forEach((img: string) => {
            // Prefer higher quality images (500x500 over scaled versions)
            if (img && (img.includes('500/500') || !img.includes('prescaled'))) {
              uniqueImages.add(img);
            }
          });
          images = Array.from(uniqueImages).slice(0, 8);
          
          // If no high-quality images, fall back to any available images
          if (images.length === 0) {
            images = rawData.images.slice(0, 8);
          }
        }
      } catch (imgError) {
        console.warn('Failed to parse Best Buy images:', imgError);
        images = [];
      }

      // Extract weight from specifications (safely)
      let weight: number | undefined;
      try {
        weight = this.extractWeightFromBestBuySpecs(rawData.product_specifications, url);
      } catch (weightError) {
        console.warn('Failed to extract weight from Best Buy specifications:', weightError);
      }

      // Extract brand from specifications or fallback to manual extraction
      let brand: string | undefined;
      try {
        if (rawData.product_specifications && Array.isArray(rawData.product_specifications)) {
          const brandSpec = rawData.product_specifications.find((spec: any) => 
            spec?.specification_name === 'Brand'
          );
          brand = brandSpec?.specification_value;
        }
        // Fallback to model extraction or title parsing
        brand = brand || rawData.model || this.extractBrandFromTitle(rawData.title || '');
      } catch (brandError) {
        console.warn('Failed to extract brand from Best Buy data:', brandError);
      }

      // Determine category from breadcrumbs or root_category
      let category = 'electronics'; // Default for Best Buy
      try {
        if (rawData.breadcrumbs && Array.isArray(rawData.breadcrumbs)) {
          // Use the most specific breadcrumb (last in array)
          const specificCategory = rawData.breadcrumbs[rawData.breadcrumbs.length - 1]?.name;
          if (specificCategory) {
            category = this.mapBestBuyCategory(specificCategory);
          }
        } else if (rawData.root_category) {
          category = this.mapBestBuyCategory(rawData.root_category);
        }
      } catch (categoryError) {
        console.warn('Failed to extract category from Best Buy data:', categoryError);
      }

      // Parse availability from availability array
      let availability: 'in-stock' | 'out-of-stock' | 'unknown' = 'unknown';
      try {
        if (rawData.availability && Array.isArray(rawData.availability)) {
          // If any availability option exists (Pickup, Shipping), consider in-stock
          availability = rawData.availability.length > 0 ? 'in-stock' : 'out-of-stock';
        }
      } catch (availError) {
        console.warn('Failed to parse Best Buy availability:', availError);
      }

      // Extract product highlights for description
      let description = rawData.product_description || '';
      try {
        if (rawData.highlights && Array.isArray(rawData.highlights)) {
          const highlightTexts = rawData.highlights
            .map((highlight: any) => {
              if (highlight.description && Array.isArray(highlight.description)) {
                return highlight.description.join(' ');
              }
              return highlight.title || '';
            })
            .filter(Boolean)
            .slice(0, 3); // Limit to first 3 highlights
          
          if (highlightTexts.length > 0) {
            description = description ? `${description}\n\nKey Features:\n• ${highlightTexts.join('\n• ')}` : highlightTexts.join('\n• ');
          }
        }
      } catch (highlightError) {
        console.warn('Failed to extract highlights from Best Buy data:', highlightError);
      }

      // Build product variants from variations
      const variants = [];
      try {
        if (rawData.variations && Array.isArray(rawData.variations)) {
          const variantOptions = rawData.variations
            .map((variation: any) => variation?.variations_name || variation?.name)
            .filter(Boolean)
            .slice(0, 5); // Limit variants
          
          if (variantOptions.length > 0) {
            variants.push({
              name: 'Model',
              options: variantOptions
            });
          }
        }
      } catch (variantError) {
        console.warn('Failed to extract variants from Best Buy data:', variantError);
      }

      // Calculate discount percentage if both prices available
      let discountInfo: string | undefined;
      try {
        if (initialPrice && finalPrice) {
          const initial = this.parsePrice(initialPrice) || 0;
          const final = this.parsePrice(finalPrice) || 0;
          if (initial > final) {
            const discountPercent = Math.round(((initial - final) / initial) * 100);
            discountInfo = `Save ${discountPercent}% (was ${initialPrice})`;
          }
        }
      } catch (discountError) {
        console.warn('Failed to calculate Best Buy discount:', discountError);
      }

      // Return normalized data with safe fallbacks
      return {
        title: rawData.title || `Best Buy Product ${rawData.product_id || ''}`,
        price: this.parsePrice(finalPrice) || 0,
        currency: rawData.currency || 'USD',
        weight: weight,
        images: images,
        brand: brand,
        category: category,
        availability: availability,
        description: description.substring(0, 1000), // Limit description length
        variants: variants
      };

    } catch (error) {
      console.error('Error normalizing Best Buy data:', error);
      // Return minimal safe data structure
      return {
        title: rawData?.title || 'Unknown Best Buy Product',
        price: this.parsePrice(rawData?.final_price || rawData?.price) || 0,
        currency: 'USD',
        category: 'electronics',
        availability: 'unknown',
        images: [],
        variants: []
      };
    }
  }

  private normalizeEtsyData(rawData: any): ProductData {
    return {
      title: rawData.title,
      price: this.parsePrice(rawData.price),
      currency: rawData.currency || 'USD',
      images: rawData.images || [],
      brand: rawData.shop_name,
      category: rawData.category || 'handmade',
      availability: 'in-stock',
      variants: rawData.variations?.map((v: any) => ({
        name: v.name,
        options: v.options
      })) || []
    };
  }

  private normalizeZaraData(rawData: any): ProductData {
    return {
      title: rawData.title || rawData.name,
      price: this.parsePrice(rawData.price),
      currency: rawData.currency || 'USD',
      images: rawData.images || [],
      brand: 'Zara',
      category: 'fashion',
      availability: rawData.available ? 'in-stock' : 'out-of-stock',
      variants: [
        ...(rawData.sizes ? [{ name: 'Size', options: rawData.sizes }] : []),
        ...(rawData.colors ? [{ name: 'Color', options: rawData.colors }] : [])
      ]
    };
  }

  /**
   * Normalize American Eagle product data to our standard format
   */
  private normalizeAEData(rawData: any, url: string): ProductData {
    try {
      // Handle American Eagle's response format from the dataset
      const aeProduct = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price (final_price is the discounted price, initial_price is original)
      const price = aeProduct.final_price || aeProduct.initial_price;
      
      // Build product data
      return {
        title: aeProduct.product_name || aeProduct.title || '',
        price: price ? this.parsePrice(price.toString()) : 0,
        currency: aeProduct.currency || 'USD',
        images: this.extractAEImages(aeProduct),
        brand: aeProduct.brand || aeProduct.seller_name || 'American Eagle',
        category: this.normalizeAECategory(aeProduct.category || aeProduct.root_category),
        availability: aeProduct.in_stock ? 'in-stock' : 'out-of-stock',
        description: aeProduct.description || '',
        rating: aeProduct.rating || 0,
        reviews_count: aeProduct.reviews_count || 0,
        variants: this.extractAEVariants(aeProduct),
        weight: this.estimateWeight(aeProduct.product_name || '', this.normalizeAECategory(aeProduct.category)),
        url: aeProduct.url || url
      };
    } catch (error) {
      console.error('Error normalizing AE data:', error);
      // Return minimal data structure with what we can safely extract
      return {
        title: rawData?.product_name || 'Unknown Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'American Eagle',
        category: 'fashion',
        availability: 'unknown',
        variants: []
      };
    }
  }

  /**
   * Extract and clean AE images
   */
  private extractAEImages(aeProduct: any): string[] {
    const images: string[] = [];
    
    // Add main image
    if (aeProduct.main_image) {
      images.push(aeProduct.main_image);
    }
    
    // Add additional images from image_urls array
    if (Array.isArray(aeProduct.image_urls)) {
      aeProduct.image_urls.forEach((img: string) => {
        if (img && img !== 'undefined' && !images.includes(img)) {
          images.push(img);
        }
      });
    }
    
    return images.slice(0, 5); // Limit to 5 images
  }

  /**
   * Normalize AE category to our standard categories
   */
  private normalizeAECategory(category: string): string {
    if (!category) return 'fashion';
    
    const categoryLower = category.toLowerCase();
    
    // American Eagle is primarily a fashion retailer
    if (categoryLower.includes('clearance')) return 'fashion';
    if (categoryLower.includes('t-shirt') || categoryLower.includes('shirt')) return 'fashion';
    if (categoryLower.includes('jean') || categoryLower.includes('pant')) return 'fashion';
    if (categoryLower.includes('dress') || categoryLower.includes('top')) return 'fashion';
    if (categoryLower.includes('hoodie') || categoryLower.includes('sweatshirt')) return 'fashion';
    if (categoryLower.includes('sweater') || categoryLower.includes('cardigan')) return 'fashion';
    if (categoryLower.includes('jacket') || categoryLower.includes('coat')) return 'fashion';
    if (categoryLower.includes('underwear') || categoryLower.includes('bra')) return 'fashion';
    if (categoryLower.includes('swimwear') || categoryLower.includes('bikini')) return 'fashion';
    if (categoryLower.includes('shoe') || categoryLower.includes('boot')) return 'footwear';
    if (categoryLower.includes('accessory') || categoryLower.includes('bag')) return 'accessories';
    
    return 'fashion'; // Default for American Eagle
  }

  /**
   * Extract AE variants (color, size, etc.)
   */
  private extractAEVariants(aeProduct: any): Array<{name: string, options: string[]}> {
    const variants: Array<{name: string, options: string[]}> = [];
    
    // Add color variant if available
    if (aeProduct.color) {
      variants.push({
        name: 'Color',
        options: [aeProduct.color]
      });
    }
    
    // Add size variant if available
    if (aeProduct.size) {
      variants.push({
        name: 'Size',
        options: [aeProduct.size]
      });
    }
    
    // Add availability information as variant
    if (Array.isArray(aeProduct.availability)) {
      const availableSizes = aeProduct.availability.map((avail: string) => {
        const match = avail.match(/^(\w+)/);
        return match ? match[1] : avail;
      });
      
      if (availableSizes.length > 0) {
        variants.push({
          name: 'Available Sizes',
          options: availableSizes
        });
      }
    }
    
    return variants;
  }

  private normalizeMyntraData(rawData: any): ProductData {
    try {
      // Handle Myntra's specific response format
      const price = rawData.final_price || rawData.price;
      
      // Safely parse images and limit to first 5 to prevent memory issues
      let images: string[] = [];
      try {
        if (typeof rawData.images === 'string') {
          const parsedImages = JSON.parse(rawData.images);
          images = Array.isArray(parsedImages) ? parsedImages.slice(0, 5) : [];
        } else if (Array.isArray(rawData.images)) {
          images = rawData.images.slice(0, 5);
        }
      } catch (imgError) {
        console.warn('Failed to parse Myntra images:', imgError);
        images = [];
      }

      // Extract weight from specifications (safely)
      let weight: number | undefined;
      try {
        if (rawData.product_specifications && Array.isArray(rawData.product_specifications)) {
          const specs = rawData.product_specifications;
          const weightSpec = specs.find((spec: any) => 
            spec?.specification_name === 'Net Weight' || 
            spec?.specification_name === 'Weight' ||
            (spec?.specification_name && spec.specification_name.toLowerCase().includes('weight'))
          );
          if (weightSpec && weightSpec.specification_value) {
            const weightMatch = weightSpec.specification_value.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|oz|lb)/i);
            if (weightMatch) {
              let extractedWeight = parseFloat(weightMatch[1]);
              const unit = weightMatch[2].toLowerCase();
              // Convert to kg
              if (unit === 'g') extractedWeight = extractedWeight / 1000;
              else if (unit === 'ml') extractedWeight = extractedWeight / 1000; // Approximate for cosmetics
              else if (unit === 'oz') extractedWeight = extractedWeight * 0.0283495;
              else if (unit === 'lb') extractedWeight = extractedWeight * 0.453592;
              weight = Math.round(extractedWeight * 1000) / 1000; // Round to 3 decimals
            }
          }
        }
      } catch (weightError) {
        console.warn('Failed to extract weight from Myntra specifications:', weightError);
      }

      // Extract brand from title or seller (safely)
      const brand = rawData.brand || rawData.seller_name || (rawData.title ? rawData.title.split(' ')[0] : undefined);

      // Build variants from sizes (safely and limit to prevent memory issues)
      const variants = [];
      try {
        if (rawData.sizes && Array.isArray(rawData.sizes)) {
          const sizeOptions = rawData.sizes.slice(0, 10).map((size: any) => size?.size || size).filter(Boolean);
          if (sizeOptions.length > 0) {
            variants.push({
              name: 'Size',
              options: sizeOptions
            });
          }
        }
      } catch (variantError) {
        console.warn('Failed to extract variants from Myntra data:', variantError);
      }

      // Combine title and description for a complete product name (safely)
      const titlePart = rawData.title || rawData.product_name || '';
      const descriptionPart = rawData.product_description || rawData.description || '';
      
      let fullProductName = titlePart;
      if (descriptionPart && descriptionPart !== titlePart && descriptionPart.length < 200) {
        // Only add description if it's different from title and not too long
        fullProductName = titlePart ? `${titlePart} - ${descriptionPart}` : descriptionPart;
      }

      // Return normalized data with safe fallbacks
      return {
        title: fullProductName || 'Unknown Product',
        price: this.parsePrice(price) || 0,
        currency: rawData.currency || 'INR',
        weight: weight,
        images: images,
        brand: brand,
        category: 'fashion', // Myntra is primarily fashion
        availability: 'in-stock', // Assume available if listed
        description: (rawData.product_description || rawData.description || '').substring(0, 500), // Limit description length
        variants: variants
      };

    } catch (error) {
      console.error('Error normalizing Myntra data:', error);
      // Return minimal safe data structure
      return {
        title: rawData?.title || 'Unknown Product',
        price: 0,
        currency: 'INR',
        category: 'fashion',
        availability: 'unknown',
        images: [],
        variants: []
      };
    }
  }

  private normalizeTargetData(rawData: any, url: string): ProductData {
    try {
      // Handle Target's comprehensive response format
      const finalPrice = rawData.final_price || rawData.offer_price || rawData.price;
      const initialPrice = rawData.initial_price;
      
      // Safely parse images and limit to first 8 to prevent memory issues
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.images)) {
          // Filter out duplicate images and prefer high-quality ones
          const uniqueImages = new Set<string>();
          rawData.images.forEach((img: string) => {
            if (img && img.includes('http')) {
              uniqueImages.add(img);
            }
          });
          images = Array.from(uniqueImages).slice(0, 8);
        }
      } catch (imgError) {
        console.warn('Failed to parse Target images:', imgError);
        images = [];
      }

      // Extract weight from specifications (safely)
      let weight: number | undefined;
      try {
        weight = this.extractWeightFromTargetSpecs(rawData.specifications || rawData.product_specifications, url);
        
        // Fallback to weight field directly
        if (!weight && rawData.weight) {
          weight = this.parseWeight(rawData.weight, url);
        }
      } catch (weightError) {
        console.warn('Failed to extract weight from Target specifications:', weightError);
      }

      // Extract brand from specifications or fallback to manual extraction
      let brand: string | undefined;
      try {
        if (rawData.specifications && Array.isArray(rawData.specifications)) {
          const brandSpec = rawData.specifications.find((spec: any) => 
            spec?.specification_name === 'Brand' || 
            spec?.specification_name === 'Manufacturer'
          );
          brand = brandSpec?.specification_value;
        }
        // Fallback to brand field or title parsing
        brand = brand || rawData.brand || this.extractBrandFromTitle(rawData.title || '');
      } catch (brandError) {
        console.warn('Failed to extract brand from Target data:', brandError);
      }

      // Determine category from breadcrumbs or category field
      let category = 'general'; // Default for Target
      try {
        if (rawData.breadcrumbs && Array.isArray(rawData.breadcrumbs)) {
          // Use the most specific breadcrumb (last in array)
          const specificCategory = rawData.breadcrumbs[rawData.breadcrumbs.length - 1]?.name;
          if (specificCategory) {
            category = this.mapTargetCategory(specificCategory);
          }
        } else if (rawData.category) {
          category = this.mapTargetCategory(rawData.category);
        }
      } catch (categoryError) {
        console.warn('Failed to extract category from Target data:', categoryError);
      }

      // Parse availability 
      let availability: 'in-stock' | 'out-of-stock' | 'unknown' = 'unknown';
      try {
        if (rawData.availability) {
          const availStr = rawData.availability.toString().toLowerCase();
          availability = availStr.includes('in stock') || availStr.includes('available') ? 'in-stock' : 
                        availStr.includes('out of stock') ? 'out-of-stock' : 'unknown';
        }
      } catch (availError) {
        console.warn('Failed to parse Target availability:', availError);
      }

      // Extract product highlights for description
      let description = rawData.product_description || '';
      try {
        if (rawData.highlights && Array.isArray(rawData.highlights)) {
          const highlightTexts = rawData.highlights
            .filter(Boolean)
            .slice(0, 3); // Limit to first 3 highlights
          
          if (highlightTexts.length > 0) {
            description = description ? `${description}\n\nKey Features:\n• ${highlightTexts.join('\n• ')}` : highlightTexts.join('\n• ');
          }
        }
      } catch (highlightError) {
        console.warn('Failed to extract highlights from Target data:', highlightError);
      }

      // Build product variants from variations
      const variants = [];
      try {
        if (rawData.variations && Array.isArray(rawData.variations)) {
          const variantOptions = rawData.variations
            .map((variation: any) => variation?.name || variation?.value)
            .filter(Boolean)
            .slice(0, 5); // Limit variants
          
          if (variantOptions.length > 0) {
            variants.push({
              name: 'Options',
              options: variantOptions
            });
          }
        }
      } catch (variantError) {
        console.warn('Failed to extract variants from Target data:', variantError);
      }

      // Calculate discount percentage if both prices available
      let discountInfo: string | undefined;
      try {
        if (initialPrice && finalPrice) {
          const initial = this.parsePrice(initialPrice) || 0;
          const final = this.parsePrice(finalPrice) || 0;
          if (initial > final) {
            const discountPercent = Math.round(((initial - final) / initial) * 100);
            discountInfo = `Save ${discountPercent}% (was ${initialPrice})`;
          }
        }
      } catch (discountError) {
        console.warn('Failed to calculate Target discount:', discountError);
      }

      // Return normalized data with safe fallbacks
      return {
        title: rawData.title || `Target Product ${rawData.product_id || ''}`,
        price: this.parsePrice(finalPrice) || 0,
        currency: rawData.currency || 'USD',
        weight: weight,
        images: images,
        brand: brand,
        category: category,
        availability: availability,
        description: description.substring(0, 1000), // Limit description length
        variants: variants
      };

    } catch (error) {
      console.error('Error normalizing Target data:', error);
      // Return minimal safe data structure
      return {
        title: rawData?.title || 'Unknown Target Product',
        price: this.parsePrice(rawData?.final_price || rawData?.price) || 0,
        currency: 'USD',
        category: 'general',
        availability: 'unknown',
        images: [],
        variants: []
      };
    }
  }

  private normalizeHMData(rawData: any, url: string): ProductData {
    try {
      // Detect country and currency from URL
      const detectedCountry = this.detectCountryFromUrl(url);
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Handle H&M's comprehensive response format
      const finalPrice = rawData.final_price || rawData.price || rawData.current_price;
      const initialPrice = rawData.initial_price || rawData.original_price;
      
      // Safely parse images and limit to first 8 to prevent memory issues
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.image_urls)) {
          // H&M uses relative URLs, convert to full URLs
          images = rawData.image_urls
            .map((img: string) => {
              if (img && !img.startsWith('http')) {
                return `https://${img}`;
              }
              return img;
            })
            .filter(Boolean)
            .slice(0, 8);
        }
      } catch (imgError) {
        console.warn('Failed to parse H&M images:', imgError);
        images = [];
      }

      // H&M doesn't typically have weight in clothing, but estimate based on category
      let weight: number | undefined;
      try {
        // Estimate weight based on H&M product category and size
        weight = this.estimateHMWeight(rawData.category || '', rawData.size || '', rawData.product_name || '');
      } catch (weightError) {
        console.warn('Failed to estimate H&M weight:', weightError);
      }

      // Extract brand (always H&M for H&M products)
      const brand = rawData.brand || rawData.manufacturer || 'H&M';

      // Determine category from H&M's category tree
      let category = 'fashion'; // Default for H&M (primarily fashion)
      try {
        if (rawData.category_tree && Array.isArray(rawData.category_tree)) {
          // Use the most specific category from the tree
          const specificCategory = rawData.category_tree[rawData.category_tree.length - 1]?.name;
          if (specificCategory) {
            category = this.mapHMCategory(specificCategory);
          }
        } else if (rawData.category) {
          category = this.mapHMCategory(rawData.category);
        }
      } catch (categoryError) {
        console.warn('Failed to extract category from H&M data:', categoryError);
      }

      // Parse availability from in_stock boolean
      let availability: 'in-stock' | 'out-of-stock' | 'unknown' = 'unknown';
      try {
        if (typeof rawData.in_stock === 'boolean') {
          availability = rawData.in_stock ? 'in-stock' : 'out-of-stock';
        }
      } catch (availError) {
        console.warn('Failed to parse H&M availability:', availError);
      }

      // Build product description from H&M data
      let description = rawData.description || rawData.product_description || '';
      
      // Add H&M-specific details to description
      const hmDetails = [];
      if (rawData.color) hmDetails.push(`Color: ${rawData.color}`);
      if (rawData.size) hmDetails.push(`Size: ${rawData.size}`);
      if (rawData.county_of_origin) hmDetails.push(`Origin: ${rawData.county_of_origin}`);
      
      if (hmDetails.length > 0) {
        description = description ? `${description}\n\n${hmDetails.join(' • ')}` : hmDetails.join(' • ');
      }

      // Build product variants from H&M color and size data
      const variants = [];
      try {
        if (rawData.color) {
          variants.push({
            name: 'Color',
            options: [rawData.color]
          });
        }
        if (rawData.size) {
          variants.push({
            name: 'Size',
            options: [rawData.size]
          });
        }
      } catch (variantError) {
        console.warn('Failed to extract variants from H&M data:', variantError);
      }

      // Calculate discount percentage if both prices available
      let discountInfo: string | undefined;
      try {
        if (initialPrice && finalPrice) {
          const initial = this.parsePrice(initialPrice) || 0;
          const final = this.parsePrice(finalPrice) || 0;
          if (initial > final) {
            const discountPercent = Math.round(((initial - final) / initial) * 100);
            discountInfo = `Save ${discountPercent}% (was ${initialPrice})`;
          }
        }
      } catch (discountError) {
        console.warn('Failed to calculate H&M discount:', discountError);
      }

      // Return normalized data with safe fallbacks
      return {
        title: rawData.product_name || rawData.title || `H&M Product ${rawData.product_code || ''}`,
        price: this.parsePrice(finalPrice) || 0,
        currency: rawData.currency || detectedCurrency,
        weight: weight,
        images: images,
        brand: brand,
        category: category,
        availability: availability,
        description: description.substring(0, 1000), // Limit description length
        variants: variants
      };

    } catch (error) {
      console.error('Error normalizing H&M data:', error);
      // Detect country and currency for fallback
      const detectedCountry = this.detectCountryFromUrl(url);
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Return minimal safe data structure
      return {
        title: rawData?.product_name || rawData?.title || 'Unknown H&M Product',
        price: this.parsePrice(rawData?.final_price || rawData?.price) || 0,
        currency: rawData?.currency || detectedCurrency,
        category: 'fashion',
        availability: 'unknown',
        images: [],
        variants: [],
        brand: 'H&M'
      };
    }
  }

  /**
   * Normalize ASOS product data to our standard format
   */
  private normalizeASOSData(rawData: any, url: string): ProductData {
    try {
      // Detect country and currency from URL
      const detectedCountry = this.detectCountryFromUrl(url);
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Handle ASOS's comprehensive response format
      const finalPrice = rawData.price || rawData.final_price || rawData.current_price;
      const initialPrice = rawData.original_price || rawData.initial_price;
      
      // Safely parse images and limit to first 8 to prevent memory issues
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.image)) {
          images = rawData.image.filter(Boolean).slice(0, 8);
        } else if (Array.isArray(rawData.image_urls)) {
          images = rawData.image_urls.filter(Boolean).slice(0, 8);
        } else if (Array.isArray(rawData.images)) {
          images = rawData.images.filter(Boolean).slice(0, 8);
        }
      } catch (imgError) {
        console.warn('Failed to parse ASOS images:', imgError);
        images = [];
      }

      // ASOS doesn't typically have weight in clothing, but estimate based on category
      let weight: number | undefined;
      try {
        // Estimate weight based on ASOS product category and type
        weight = this.estimateASOSWeight(rawData.category || '', rawData.name || '');
      } catch (weightError) {
        console.warn('Failed to estimate ASOS weight:', weightError);
      }

      // Extract brand (typically ASOS or the specific brand)
      const brand = rawData.brand || 'ASOS';

      // Determine category from ASOS's category information
      let category = 'fashion'; // Default for ASOS (primarily fashion)
      try {
        if (rawData.breadcrumbs && Array.isArray(rawData.breadcrumbs)) {
          // Use the most specific category from the breadcrumbs
          const specificCategory = rawData.breadcrumbs[rawData.breadcrumbs.length - 1];
          if (specificCategory) {
            category = this.mapASOSCategory(specificCategory);
          }
        } else if (rawData.category) {
          category = this.mapASOSCategory(rawData.category);
        }
      } catch (categoryError) {
        console.warn('Failed to map ASOS category:', categoryError);
      }

      // Handle availability status
      let availability = 'unknown';
      try {
        if (rawData.availability) {
          if (rawData.availability === 'in stock' || rawData.availability === 'available' || rawData.availability === 'In Stock') {
            availability = 'in-stock';
          } else if (rawData.availability === 'out of stock' || rawData.availability === 'Out of Stock') {
            availability = 'out-of-stock';
          }
        }
      } catch (availError) {
        console.warn('Failed to parse ASOS availability:', availError);
      }

      // Build description from available data
      let description = '';
      try {
        const descriptionParts = [
          rawData.description,
          rawData.product_details,
          rawData.about_me,
          rawData.look_after_me && `Care: ${rawData.look_after_me}`,
          rawData.size_fit && `Size & Fit: ${rawData.size_fit}`
        ].filter(Boolean);
        
        description = descriptionParts.join('\n\n');
      } catch (descError) {
        console.warn('Failed to build ASOS description:', descError);
        description = rawData.description || rawData.product_details || rawData.about_me || '';
      }

      // Handle variants (sizes, colors)
      let variants: any[] = [];
      try {
        if (rawData.color && Array.isArray(rawData.color)) {
          variants.push(...rawData.color.map((color: string) => ({ type: 'color', value: color })));
        }
        if (rawData.possible_sizes) {
          // Handle both array and string formats for sizes
          let sizes: string[] = [];
          if (Array.isArray(rawData.possible_sizes)) {
            sizes = rawData.possible_sizes;
          } else if (typeof rawData.possible_sizes === 'string') {
            sizes = [rawData.possible_sizes];
          }
          variants.push(...sizes.map((size: string) => ({ type: 'size', value: size })));
        }
      } catch (variantError) {
        console.warn('Failed to parse ASOS variants:', variantError);
      }

      // Return normalized data with safe fallbacks
      return {
        title: rawData.name || rawData.product_name || rawData.title || `ASOS Product ${rawData.product_id || ''}`,
        price: this.parsePrice(finalPrice) || 0,
        currency: rawData.currency || detectedCurrency,
        weight: weight,
        images: images,
        brand: brand,
        category: category,
        availability: availability,
        description: description.substring(0, 1000), // Limit description length
        variants: variants
      };

    } catch (error) {
      console.error('Error normalizing ASOS data:', error);
      // Detect country and currency for fallback
      const detectedCountry = this.detectCountryFromUrl(url);
      const detectedCurrency = this.getCountryCurrency(detectedCountry);
      
      // Return minimal safe data structure
      return {
        title: rawData?.name || rawData?.product_name || rawData?.title || 'Unknown ASOS Product',
        price: this.parsePrice(rawData?.price || rawData?.final_price) || 0,
        currency: rawData?.currency || detectedCurrency,
        category: 'fashion',
        availability: 'unknown',
        images: [],
        variants: [],
        brand: rawData?.brand || 'ASOS'
      };
    }
  }

  private normalizeFlipkartData(rawData: any): ProductData {
    try {
      // Handle Flipkart's response format from our custom scraper
      const price = rawData.final_price || rawData.price;
      
      // Extract weight from specifications (safely)
      let weight: number | undefined;
      try {
        if (rawData.specifications && Array.isArray(rawData.specifications)) {
          const specs = rawData.specifications;
          const weightSpec = specs.find((spec: any) => 
            spec?.specification_name && 
            spec.specification_name.toLowerCase().includes('weight')
          );
          if (weightSpec && weightSpec.specification_value) {
            const weightMatch = weightSpec.specification_value.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|oz|lb)/i);
            if (weightMatch) {
              let extractedWeight = parseFloat(weightMatch[1]);
              const unit = weightMatch[2].toLowerCase();
              // Convert to kg
              if (unit === 'g') extractedWeight = extractedWeight / 1000;
              else if (unit === 'ml') extractedWeight = extractedWeight / 1000;
              else if (unit === 'oz') extractedWeight = extractedWeight * 0.0283495;
              else if (unit === 'lb') extractedWeight = extractedWeight * 0.453592;
              weight = Math.round(extractedWeight * 1000) / 1000;
            }
          }
        }
      } catch (weightError) {
        console.warn('Failed to extract weight from Flipkart specifications:', weightError);
      }

      // Extract category from URL or fallback to general
      let category = rawData.category || 'general';
      if (category === 'general') {
        // Try to infer from title or URL
        const title = rawData.title || '';
        if (title.toLowerCase().includes('phone') || title.toLowerCase().includes('mobile')) {
          category = 'electronics';
        } else if (title.toLowerCase().includes('shirt') || title.toLowerCase().includes('dress')) {
          category = 'fashion';
        }
      }

      // Return normalized data
      return {
        title: rawData.title || 'Unknown Product',
        price: this.parsePrice(price) || 0,
        currency: rawData.currency || 'INR',
        weight: weight,
        images: rawData.images || [],
        brand: rawData.brand,
        category: category,
        availability: rawData.availability || 'unknown',
        description: rawData.highlights ? rawData.highlights.join('. ') : '',
        variants: []
      };

    } catch (error) {
      console.error('Error normalizing Flipkart data:', error);
      return {
        title: rawData?.title || 'Unknown Product',
        price: 0,
        currency: 'INR',
        category: 'general',
        availability: 'unknown',
        images: [],
        variants: []
      };
    }
  }

  /**
   * Extract weight from Best Buy product specifications with intelligent parsing
   */
  private extractWeightFromBestBuySpecs(specifications: any[], url: string): number | undefined {
    if (!specifications || !Array.isArray(specifications)) return undefined;
    
    // Priority order for weight specifications
    const weightPriority = [
      'Product Weight',
      'Shipping Weight', 
      'Weight',
      'Item Weight',
      'Package Weight'
    ];
    
    // Try to find weight in priority order
    for (const priorityName of weightPriority) {
      const weightSpec = specifications.find((spec: any) => 
        spec?.specification_name === priorityName
      );
      
      if (weightSpec && weightSpec.specification_value) {
        const weight = this.parseWeight(weightSpec.specification_value, url);
        if (weight !== undefined) {
          const unit = this.isUSMarketplace(url) ? 'lbs' : 'kg';
          console.log(`🏋️ Found weight from ${priorityName}: ${weight} ${unit}`);
          return weight;
        }
      }
    }
    
    // Fallback: look for any specification with "weight" in the name
    const anyWeightSpec = specifications.find((spec: any) => 
      spec?.specification_name && 
      spec.specification_name.toLowerCase().includes('weight')
    );
    
    if (anyWeightSpec && anyWeightSpec.specification_value) {
      const weight = this.parseWeight(anyWeightSpec.specification_value, url);
      if (weight !== undefined) {
        const unit = this.isUSMarketplace(url) ? 'lbs' : 'kg';
        console.log(`🏋️ Found weight from ${anyWeightSpec.specification_name}: ${weight} ${unit}`);
        return weight;
      }
    }
    
    // If no weight found, try to estimate based on category and other specs
    return this.estimateWeightFromBestBuySpecs(specifications, url);
  }

  /**
   * Estimate weight based on Best Buy product specifications when actual weight not available
   */
  private estimateWeightFromBestBuySpecs(specifications: any[], url: string): number | undefined {
    if (!specifications || !Array.isArray(specifications)) return undefined;
    
    // Look for dimensions to estimate weight
    const heightSpec = specifications.find(s => s?.specification_name === 'Product Height');
    const widthSpec = specifications.find(s => s?.specification_name === 'Product Width');
    const depthSpec = specifications.find(s => s?.specification_name === 'Product Depth');
    
    if (heightSpec && widthSpec && depthSpec) {
      try {
        // Parse dimensions (assuming inches)
        const height = parseFloat(heightSpec.specification_value.replace(/[^\d.]/g, ''));
        const width = parseFloat(widthSpec.specification_value.replace(/[^\d.]/g, ''));
        const depth = parseFloat(depthSpec.specification_value.replace(/[^\d.]/g, ''));
        
        if (height > 0 && width > 0 && depth > 0) {
          // Rough volume-based estimation (very approximate)
          const volumeCubicInches = height * width * depth;
          
          // Different density estimates based on product type
          let densityFactor = 0.1; // Default: lightweight electronics
          
          // Check for category indicators in specifications
          const categoryIndicators = specifications.map(s => 
            (s.specification_name + ' ' + s.specification_value).toLowerCase()
          ).join(' ');
          
          if (categoryIndicators.includes('laptop') || categoryIndicators.includes('computer')) {
            densityFactor = 0.15; // Laptops are denser
          } else if (categoryIndicators.includes('tv') || categoryIndicators.includes('monitor')) {
            densityFactor = 0.08; // TVs are larger but lighter per volume
          } else if (categoryIndicators.includes('furniture') || categoryIndicators.includes('desk')) {
            densityFactor = 0.3; // Furniture is much heavier
          } else if (categoryIndicators.includes('phone') || categoryIndicators.includes('tablet')) {
            densityFactor = 0.2; // Small electronics are dense
          }
          
          // Convert to kg (rough estimation)
          const estimatedWeightKg = (volumeCubicInches * densityFactor) / 100;
          
          if (estimatedWeightKg > 0.01 && estimatedWeightKg < 100) { // Sanity check
            console.log(`📐 Estimated weight from dimensions: ${estimatedWeightKg.toFixed(2)} kg`);
            return Math.round(estimatedWeightKg * 100) / 100; // Round to 2 decimals
          }
        }
      } catch (error) {
        console.warn('Failed to estimate weight from dimensions:', error);
      }
    }
    
    return undefined;
  }

  /**
   * Extract brand from product title (fallback method)
   */
  private extractBrandFromTitle(title: string): string | undefined {
    if (!title) return undefined;
    
    // Common electronics brands that might appear in Best Buy titles
    const commonBrands = [
      'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer',
      'Microsoft', 'Google', 'Nintendo', 'Xbox', 'PlayStation', 'Canon', 'Nikon',
      'JBL', 'Bose', 'Beats', 'Logitech', 'Razer', 'Corsair', 'SteelSeries',
      'Roku', 'Amazon', 'Tesla', 'Fitbit', 'Garmin', 'GoPro', 'DJI', 'Costway'
    ];
    
    const titleWords = title.split(/[\s\-]+/);
    for (const brand of commonBrands) {
      if (titleWords.some(word => word.toLowerCase() === brand.toLowerCase())) {
        return brand;
      }
    }
    
    // Fallback: use first word if it looks like a brand (capitalized)
    const firstWord = titleWords[0];
    if (firstWord && /^[A-Z][a-z]+$/.test(firstWord) && firstWord.length > 2) {
      return firstWord;
    }
    
    return undefined;
  }

  /**
   * Extract weight from Target product specifications with intelligent parsing
   */
  private extractWeightFromTargetSpecs(specifications: any[], url: string): number | undefined {
    if (!specifications || !Array.isArray(specifications)) return undefined;
    
    // Priority order for weight specifications
    const weightPriority = [
      'Product Weight',
      'Shipping Weight', 
      'Weight',
      'Item Weight',
      'Package Weight'
    ];
    
    // Try to find weight in priority order
    for (const priorityName of weightPriority) {
      const weightSpec = specifications.find((spec: any) => 
        spec?.specification_name === priorityName
      );
      
      if (weightSpec && weightSpec.specification_value) {
        const weight = this.parseWeight(weightSpec.specification_value, url);
        if (weight !== undefined) {
          const unit = this.isUSMarketplace(url) ? 'lbs' : 'kg';
          console.log(`🏋️ Found Target weight from ${priorityName}: ${weight} ${unit}`);
          return weight;
        }
      }
    }
    
    // Fallback: look for any specification with "weight" in the name
    const anyWeightSpec = specifications.find((spec: any) => 
      spec?.specification_name && 
      spec.specification_name.toLowerCase().includes('weight')
    );
    
    if (anyWeightSpec && anyWeightSpec.specification_value) {
      const weight = this.parseWeight(anyWeightSpec.specification_value, url);
      if (weight !== undefined) {
        const unit = this.isUSMarketplace(url) ? 'lbs' : 'kg';
        console.log(`🏋️ Found Target weight from ${anyWeightSpec.specification_name}: ${unit}`);
        return weight;
      }
    }
    
    return undefined;
  }

  /**
   * Estimate weight for H&M products based on category, size, and product type
   */
  private estimateHMWeight(category: string, size: string, productName: string): number | undefined {
    const categoryLower = category.toLowerCase();
    const productLower = productName.toLowerCase();
    const sizeLower = size.toLowerCase();
    
    // Base weights for different H&M product categories (in kg for international market)
    let baseWeight = 0.2; // Default lightweight clothing
    
    // Category-based estimates
    if (categoryLower.includes('jacket') || categoryLower.includes('coat') || categoryLower.includes('blazer')) {
      baseWeight = 0.8;
    } else if (categoryLower.includes('sweater') || categoryLower.includes('hoodie') || categoryLower.includes('sweatshirt')) {
      baseWeight = 0.5;
    } else if (categoryLower.includes('jeans') || categoryLower.includes('pants') || categoryLower.includes('trousers')) {
      baseWeight = 0.4;
    } else if (categoryLower.includes('dress') || categoryLower.includes('skirt')) {
      baseWeight = 0.3;
    } else if (categoryLower.includes('shirt') || categoryLower.includes('blouse') || categoryLower.includes('top')) {
      baseWeight = 0.2;
    } else if (categoryLower.includes('underwear') || categoryLower.includes('socks') || categoryLower.includes('accessories')) {
      baseWeight = 0.1;
    } else if (categoryLower.includes('shoes') || categoryLower.includes('boots')) {
      baseWeight = 0.6;
    } else if (categoryLower.includes('bag') || categoryLower.includes('backpack')) {
      baseWeight = 0.3;
    } else if (categoryLower.includes('home') || categoryLower.includes('bedding')) {
      baseWeight = 0.7;
    }
    
    // Product name adjustments
    if (productLower.includes('pack') && productLower.match(/\d+-pack/)) {
      const packMatch = productLower.match(/(\d+)-pack/);
      if (packMatch) {
        const packCount = parseInt(packMatch[1]);
        baseWeight *= packCount;
      }
    }
    
    // Size adjustments
    if (sizeLower.includes('xs') || sizeLower.includes('2-4') || sizeLower.includes('baby')) {
      baseWeight *= 0.7;
    } else if (sizeLower.includes('xl') || sizeLower.includes('xxl') || sizeLower.includes('16+')) {
      baseWeight *= 1.3;
    } else if (sizeLower.includes('l') && !sizeLower.includes('xl')) {
      baseWeight *= 1.1;
    }
    
    return Math.round(baseWeight * 1000) / 1000; // Round to 3 decimals
  }

  /**
   * Map H&M category to our standard categories
   */
  private mapHMCategory(hmCategory: string): string {
    if (!hmCategory) return 'fashion';
    
    const category = hmCategory.toLowerCase();
    
    // H&M specific category mappings
    if (category.includes('women') || category.includes('men') || category.includes('kids') || 
        category.includes('baby') || category.includes('clothing') || category.includes('fashion')) {
      return 'fashion';
    }
    if (category.includes('shoes') || category.includes('footwear') || category.includes('boots') || 
        category.includes('sneakers') || category.includes('sandals')) {
      return 'footwear';
    }
    if (category.includes('home') || category.includes('bedding') || category.includes('decor') || 
        category.includes('kitchen') || category.includes('bath')) {
      return 'home';
    }
    if (category.includes('beauty') || category.includes('cosmetics') || category.includes('skincare')) {
      return 'beauty-health';
    }
    if (category.includes('sport') || category.includes('fitness') || category.includes('active') || 
        category.includes('gym') || category.includes('workout')) {
      return 'sports';
    }
    if (category.includes('accessory') || category.includes('bag') || category.includes('jewelry') || 
        category.includes('watch') || category.includes('belt')) {
      return 'fashion'; // Accessories are part of fashion
    }
    
    // Default to fashion for H&M (primarily a fashion retailer)
    return 'fashion';
  }

  /**
   * Estimate ASOS product weight based on category and product name
   */
  private estimateASOSWeight(category: string, productName: string): number | undefined {
    const categoryLower = category.toLowerCase();
    const nameLower = productName.toLowerCase();
    
    // ASOS weight estimates in kg (international market standard)
    
    // Clothing categories
    if (categoryLower.includes('dress') || nameLower.includes('dress')) {
      return 0.4; // Dresses
    }
    
    if (categoryLower.includes('shirt') || categoryLower.includes('top') || nameLower.includes('shirt') || nameLower.includes('top')) {
      return 0.2; // Light tops
    }
    
    if (categoryLower.includes('jean') || categoryLower.includes('pant') || categoryLower.includes('trouser') || 
        nameLower.includes('jean') || nameLower.includes('pant') || nameLower.includes('trouser')) {
      return 0.5; // Jeans/pants
    }
    
    if (categoryLower.includes('jacket') || categoryLower.includes('coat') || categoryLower.includes('blazer') ||
        nameLower.includes('jacket') || nameLower.includes('coat') || nameLower.includes('blazer')) {
      return 0.8; // Outerwear
    }
    
    if (categoryLower.includes('sweater') || categoryLower.includes('jumper') || categoryLower.includes('cardigan') ||
        nameLower.includes('sweater') || nameLower.includes('jumper') || nameLower.includes('cardigan')) {
      return 0.4; // Knitwear
    }
    
    if (categoryLower.includes('underwear') || categoryLower.includes('lingerie') || categoryLower.includes('brief') ||
        nameLower.includes('underwear') || nameLower.includes('lingerie') || nameLower.includes('brief')) {
      return 0.1; // Underwear
    }
    
    // Shoes and accessories
    if (categoryLower.includes('shoe') || categoryLower.includes('boot') || categoryLower.includes('sneaker') ||
        nameLower.includes('shoe') || nameLower.includes('boot') || nameLower.includes('sneaker')) {
      return 0.8; // Footwear
    }
    
    if (categoryLower.includes('bag') || categoryLower.includes('backpack') || categoryLower.includes('purse') ||
        nameLower.includes('bag') || nameLower.includes('backpack') || nameLower.includes('purse')) {
      return 0.3; // Bags
    }
    
    if (categoryLower.includes('jewelry') || categoryLower.includes('watch') || categoryLower.includes('accessory') ||
        nameLower.includes('jewelry') || nameLower.includes('watch') || nameLower.includes('necklace')) {
      return 0.05; // Light accessories
    }
    
    // Default for fashion items
    return 0.3;
  }

  /**
   * Map ASOS category to our standardized categories
   */
  private mapASOSCategory(asosCategory: string): string {
    const categoryLower = asosCategory.toLowerCase();
    
    // Fashion categories (ASOS is primarily fashion)
    if (categoryLower.includes('dress') || categoryLower.includes('top') || categoryLower.includes('shirt') ||
        categoryLower.includes('jean') || categoryLower.includes('pant') || categoryLower.includes('skirt') ||
        categoryLower.includes('jacket') || categoryLower.includes('coat') || categoryLower.includes('sweater') ||
        categoryLower.includes('blouse') || categoryLower.includes('clothing')) {
      return 'fashion';
    }
    
    // Footwear
    if (categoryLower.includes('shoe') || categoryLower.includes('boot') || categoryLower.includes('sneaker') ||
        categoryLower.includes('sandal') || categoryLower.includes('heel') || categoryLower.includes('footwear')) {
      return 'footwear';
    }
    
    // Beauty
    if (categoryLower.includes('beauty') || categoryLower.includes('makeup') || categoryLower.includes('skincare') ||
        categoryLower.includes('fragrance') || categoryLower.includes('perfume') || categoryLower.includes('cosmetic')) {
      return 'beauty';
    }
    
    // Accessories (jewelry, bags, watches, etc.)
    if (categoryLower.includes('bag') || categoryLower.includes('jewelry') || categoryLower.includes('watch') ||
        categoryLower.includes('belt') || categoryLower.includes('hat') || categoryLower.includes('scarf') ||
        categoryLower.includes('accessory') || categoryLower.includes('sunglasses')) {
      return 'fashion'; // Accessories are part of fashion
    }
    
    // Default to fashion for ASOS (primarily a fashion retailer)
    return 'fashion';
  }

  /**
   * Normalize Etsy product data to common format
   */
  private normalizeEtsyData(rawData: any, url: string): ProductData {
    try {
      // Extract basic product information
      const title = rawData.title || 'Etsy Product';
      const finalPrice = rawData.final_price || rawData.price || 0;
      const initialPrice = rawData.initial_price || finalPrice;
      const currency = rawData.currency || 'USD';
      
      // Safely parse images and limit to first 8
      let images: string[] = [];
      try {
        if (Array.isArray(rawData.images)) {
          images = rawData.images.filter(Boolean).slice(0, 8);
        }
      } catch (imgError) {
        console.warn('Failed to parse Etsy images:', imgError);
        images = [];
      }

      // Extract seller information
      const brand = rawData.seller_name || rawData.seller_shop_name || 'Etsy Seller';
      
      // Map Etsy category to our standard categories
      let category = 'handmade'; // Default for Etsy
      try {
        if (rawData.category_tree && Array.isArray(rawData.category_tree) && rawData.category_tree.length > 0) {
          category = this.mapEtsyCategory(rawData.category_tree[0]);
        } else if (rawData.root_category) {
          category = this.mapEtsyCategory(rawData.root_category);
        }
      } catch (categoryError) {
        console.warn('Failed to map Etsy category:', categoryError);
      }

      // Estimate weight based on category and product details
      let weight: number | undefined;
      try {
        weight = this.estimateEtsyWeight(category, title, rawData.specifications || []);
      } catch (weightError) {
        console.warn('Failed to estimate Etsy weight:', weightError);
      }

      // Handle availability (Etsy products are usually available unless explicitly stated)
      let availability = 'in-stock'; // Default for Etsy unless stated otherwise
      if (rawData.in_stock === false || rawData.availability === 'out of stock') {
        availability = 'out-of-stock';
      }

      // Build comprehensive description from Etsy's rich product details
      let description = '';
      try {
        const descriptionParts = [
          Array.isArray(rawData.item_details) 
            ? rawData.item_details.join(' ') 
            : rawData.item_details,
          rawData.shipping_return_policies && Array.isArray(rawData.shipping_return_policies)
            ? `Shipping & Returns: ${rawData.shipping_return_policies.join(', ')}`
            : undefined,
          rawData.highlights_lines && Array.isArray(rawData.highlights_lines)
            ? rawData.highlights_lines.map((h: any) => `${h.name}: ${h.value}`).join(', ')
            : undefined
        ].filter(Boolean);
        
        description = descriptionParts.join('\n\n');
      } catch (descError) {
        console.warn('Failed to build Etsy description:', descError);
        description = title;
      }

      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand,
        category,
        availability,
        rating: rawData.rating || 0,
        reviews_count: rawData.reviews_count_item || rawData.reviews_count_shop || 0,
        description,
        specifications: this.normalizeEtsySpecifications(rawData.product_specifications || []),
        seller_name: rawData.seller_name || rawData.seller_shop_name,
        url
      };

    } catch (error) {
      console.error('Error normalizing Etsy data:', error);
      // Return minimal safe data structure
      return {
        title: rawData.title || 'Etsy Product',
        price: rawData.final_price || rawData.price || 0,
        currency: rawData.currency || 'USD',
        images: [],
        brand: rawData.seller_name || 'Etsy Seller',
        category: 'handmade',
        availability: 'unknown',
        description: rawData.title || 'Etsy Product',
        url
      };
    }
  }

  /**
   * Map Etsy categories to our standard categories
   */
  private mapEtsyCategory(etsyCategory: string): string {
    const categoryLower = etsyCategory.toLowerCase();
    
    // Art & Collectibles
    if (categoryLower.includes('art') || categoryLower.includes('print') || categoryLower.includes('painting') ||
        categoryLower.includes('poster') || categoryLower.includes('collectible')) {
      return 'art';
    }
    
    // Jewelry
    if (categoryLower.includes('jewelry') || categoryLower.includes('necklace') || categoryLower.includes('earring') ||
        categoryLower.includes('bracelet') || categoryLower.includes('ring')) {
      return 'jewelry';
    }
    
    // Clothing & Fashion
    if (categoryLower.includes('clothing') || categoryLower.includes('dress') || categoryLower.includes('shirt') ||
        categoryLower.includes('skirt') || categoryLower.includes('pants') || categoryLower.includes('fashion') ||
        categoryLower.includes('accessories')) {
      return 'fashion';
    }
    
    // Home & Living
    if (categoryLower.includes('home') || categoryLower.includes('living') || categoryLower.includes('decor') ||
        categoryLower.includes('furniture') || categoryLower.includes('kitchen') || categoryLower.includes('bath')) {
      return 'home';
    }
    
    // Craft Supplies & Tools
    if (categoryLower.includes('craft') || categoryLower.includes('supplies') || categoryLower.includes('material') ||
        categoryLower.includes('tool') || categoryLower.includes('fabric')) {
      return 'crafts';
    }
    
    // Toys & Games
    if (categoryLower.includes('toy') || categoryLower.includes('game') || categoryLower.includes('puzzle') ||
        categoryLower.includes('doll') || categoryLower.includes('plush')) {
      return 'toys';
    }
    
    // Wedding & Party
    if (categoryLower.includes('wedding') || categoryLower.includes('party') || categoryLower.includes('celebration')) {
      return 'wedding';
    }
    
    // Vintage items
    if (categoryLower.includes('vintage') || categoryLower.includes('antique')) {
      return 'vintage';
    }
    
    // Default to handmade for Etsy
    return 'handmade';
  }

  /**
   * Estimate Etsy product weight based on category, title, and specifications
   */
  private estimateEtsyWeight(category: string, title: string, specifications: any[]): number | undefined {
    const categoryLower = category.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Check specifications for weight information first
    try {
      for (const spec of specifications) {
        if (spec.specification_name && spec.specification_value) {
          const specName = spec.specification_name.toLowerCase();
          const specValue = spec.specification_value.toLowerCase();
          
          if (specName.includes('weight') && specValue.match(/\d/)) {
            // Try to extract weight from specifications
            const weightMatch = specValue.match(/(\d+\.?\d*)\s*(lb|lbs|pound|kg|kilogram|oz|ounce)/i);
            if (weightMatch) {
              const value = parseFloat(weightMatch[1]);
              const unit = weightMatch[2].toLowerCase();
              
              // Convert to kg
              if (unit.startsWith('lb') || unit.startsWith('pound')) {
                return value * 0.453592; // lbs to kg
              } else if (unit.startsWith('oz') || unit.startsWith('ounce')) {
                return value * 0.0283495; // oz to kg
              } else {
                return value; // already in kg
              }
            }
          }
        }
      }
    } catch (specError) {
      console.warn('Failed to extract weight from Etsy specifications:', specError);
    }
    
    // Category-based estimates (in kg)
    if (categoryLower === 'jewelry') {
      return 0.05; // Very light jewelry
    }
    
    if (categoryLower === 'art' || titleLower.includes('print') || titleLower.includes('poster')) {
      return 0.1; // Art prints
    }
    
    if (categoryLower === 'fashion' || titleLower.includes('clothing')) {
      if (titleLower.includes('dress') || titleLower.includes('coat') || titleLower.includes('jacket')) {
        return 0.5; // Heavier clothing
      }
      return 0.3; // General clothing
    }
    
    if (categoryLower === 'home' || titleLower.includes('decor')) {
      if (titleLower.includes('furniture') || titleLower.includes('table') || titleLower.includes('chair')) {
        return 5.0; // Furniture
      } else if (titleLower.includes('pillow') || titleLower.includes('cushion')) {
        return 0.8; // Textiles
      }
      return 1.0; // General home items
    }
    
    if (categoryLower === 'crafts' || titleLower.includes('supplies')) {
      return 0.3; // Craft supplies
    }
    
    if (categoryLower === 'toys' || titleLower.includes('toy')) {
      return 0.5; // Toys
    }
    
    // Default handmade item weight
    return 0.4;
  }

  /**
   * Normalize Etsy specifications to our standard format
   */
  private normalizeEtsySpecifications(specs: any[]): Array<{name: string; value: string}> {
    if (!Array.isArray(specs)) return [];
    
    return specs.map(spec => ({
      name: spec.specification_name || 'Specification',
      value: spec.specification_values || spec.specification_value || spec.value || ''
    })).filter(spec => spec.name && spec.value);
  }

  /**
   * Normalize Zara product data to common format
   */
  private normalizeZaraData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.title || rawData.product_name || 'Zara Product';
      const price = rawData.final_price || rawData.price || 0;
      const currency = rawData.currency || 'USD';
      
      // Handle Zara images array
      let images: string[] = [];
      if (Array.isArray(rawData.images)) {
        images = rawData.images.filter(Boolean).slice(0, 8);
      } else if (rawData.image && Array.isArray(rawData.image)) {
        images = rawData.image.filter(Boolean).slice(0, 8);
      }

      // Map Zara category to our standard categories
      let category = 'fashion';
      if (rawData.section) {
        const section = rawData.section.toLowerCase();
        if (section.includes('woman') || section.includes('girl')) {
          category = 'fashion-women';
        } else if (section.includes('man') || section.includes('boy')) {
          category = 'fashion-men';
        } else if (section.includes('kid') || section.includes('baby')) {
          category = 'fashion-kids';
        }
      }
      
      // Further refine by product family
      if (rawData.product_family) {
        const family = rawData.product_family.toLowerCase();
        if (family.includes('shoes')) category = 'footwear';
        else if (family.includes('bag')) category = 'bags';
        else if (family.includes('accessory')) category = 'accessories';
      }

      // Estimate weight based on Zara product type
      let weight: number | undefined;
      if (rawData.product_family) {
        weight = this.estimateZaraWeight(rawData.product_family, title);
      }

      return {
        title,
        price,
        currency,
        images,
        weight,
        brand: 'Zara',
        category,
        availability: rawData.availability ? 'in-stock' : (rawData.low_on_stock ? 'low-stock' : 'out-of-stock'),
        description: rawData.description || '',
        specifications: this.normalizeZaraSpecifications(rawData),
        seller_name: 'Zara',
        url
      };

    } catch (error) {
      console.error('Error normalizing Zara data:', error);
      return {
        title: rawData.product_name || 'Zara Product',
        price: rawData.price || 0,
        currency: rawData.currency || 'USD',
        images: [],
        brand: 'Zara',
        category: 'fashion',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Estimate Zara product weight based on product family and title
   */
  private estimateZaraWeight(productFamily: string, title: string): number | undefined {
    const familyLower = productFamily.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Zara fashion weight estimates (in kg)
    if (familyLower.includes('dress')) return 0.5;
    if (familyLower.includes('shirt') || familyLower.includes('blouse')) return 0.3;
    if (familyLower.includes('jacket') || familyLower.includes('coat')) return 0.8;
    if (familyLower.includes('pants') || familyLower.includes('jeans')) return 0.6;
    if (familyLower.includes('skirt')) return 0.4;
    if (familyLower.includes('shoes')) return 0.8;
    if (familyLower.includes('bag')) return 0.7;
    if (familyLower.includes('accessory')) return 0.2;
    if (familyLower.includes('underwear')) return 0.1;
    
    // Default fashion item weight
    return 0.4;
  }

  /**
   * Normalize Zara specifications to our standard format
   */
  private normalizeZaraSpecifications(rawData: any): Array<{name: string; value: string}> {
    const specs: Array<{name: string; value: string}> = [];
    
    if (rawData.color || rawData.colour) {
      specs.push({ name: 'Color', value: rawData.color || rawData.colour });
    }
    if (rawData.size) {
      specs.push({ name: 'Size', value: rawData.size });
    }
    if (rawData.materials || rawData.materials_description) {
      specs.push({ name: 'Materials', value: rawData.materials || rawData.materials_description });
    }
    if (rawData.care?.instructions?.length) {
      specs.push({ name: 'Care Instructions', value: rawData.care.instructions.join(', ') });
    }
    if (rawData.dimension) {
      specs.push({ name: 'Dimensions', value: rawData.dimension });
    }
    
    return specs;
  }

  /**
   * Normalize LEGO product data to common format
   */
  private normalizeLegoData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.title || rawData.product_name || 'LEGO Set';
      const finalPrice = rawData.final_price || rawData.initial_price || 0;
      const initialPrice = rawData.initial_price || rawData.final_price || 0;
      const currency = rawData.currency || 'USD';
      
      // Handle LEGO images
      let images: string[] = [];
      if (Array.isArray(rawData.images)) {
        images = rawData.images.filter(Boolean).slice(0, 8);
      } else if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      } else if (rawData.main_image) {
        images = [rawData.main_image];
      }

      // Estimate weight based on piece count (average 0.8g per piece)
      let weight: number | undefined;
      if (rawData.piece_count) {
        weight = Math.round((rawData.piece_count * 0.0008) * 100) / 100; // Convert to kg, round to 2 decimals
        // Add packaging weight (typically 20% of brick weight)
        weight = Math.round(weight * 1.2 * 100) / 100;
      }

      // Map LEGO category
      let category = 'building-sets';
      if (rawData.category) {
        const categoryLower = rawData.category.toLowerCase();
        if (categoryLower.includes('duplo') || categoryLower.includes('junior')) {
          category = 'early-learning';
        } else if (categoryLower.includes('technic') || categoryLower.includes('mindstorms')) {
          category = 'advanced-building';
        }
      }

      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || rawData.manufacturer || 'LEGO',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        rating: rawData.rating || 0,
        reviews_count: rawData.reviews_count || 0,
        description: rawData.description || rawData.features_text || rawData.headline_text || '',
        specifications: this.normalizeLegoSpecifications(rawData),
        seller_name: 'LEGO',
        url
      };

    } catch (error) {
      console.error('Error normalizing LEGO data:', error);
      return {
        title: rawData.product_name || 'LEGO Set',
        price: rawData.final_price || rawData.initial_price || 0,
        currency: rawData.currency || 'USD',
        images: [],
        brand: 'LEGO',
        category: 'building-sets',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize LEGO specifications to our standard format
   */
  private normalizeLegoSpecifications(rawData: any): Array<{name: string; value: string}> {
    const specs: Array<{name: string; value: string}> = [];
    
    if (rawData.age_range) {
      specs.push({ name: 'Age Range', value: rawData.age_range });
    }
    if (rawData.piece_count) {
      specs.push({ name: 'Piece Count', value: rawData.piece_count.toString() });
    }
    if (rawData.product_code) {
      specs.push({ name: 'Product Code', value: rawData.product_code.toString() });
    }
    if (rawData.vip_points) {
      specs.push({ name: 'VIP Points', value: rawData.vip_points.toString() });
    }
    if (rawData.category) {
      specs.push({ name: 'Category', value: rawData.category });
    }
    
    return specs;
  }

  /**
   * Normalize Hermes product data to common format
   */
  private normalizeHermesData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.title || rawData.product_name || 'Hermès Product';
      
      // Parse Hermes prices (format like "$4,135.00")
      const parseHermesPrice = (priceStr: string | number): number => {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const finalPrice = parseHermesPrice(rawData.final_price);
      const initialPrice = parseHermesPrice(rawData.initial_price);
      const currency = rawData.currency || 'USD';
      
      // Handle Hermes images
      let images: string[] = [];
      if (Array.isArray(rawData.images)) {
        images = rawData.images.filter(Boolean).slice(0, 8);
      } else if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      } else if (rawData.main_image) {
        images = [rawData.main_image];
      }

      // Map Hermes luxury categories
      let category = 'luxury';
      if (rawData.category_name) {
        const categoryLower = rawData.category_name.toLowerCase();
        if (categoryLower.includes('bag')) category = 'luxury-bags';
        else if (categoryLower.includes('scarf') || categoryLower.includes('silk')) category = 'luxury-accessories';
        else if (categoryLower.includes('jewelry')) category = 'luxury-jewelry';
        else if (categoryLower.includes('watch')) category = 'luxury-watches';
        else if (categoryLower.includes('belt')) category = 'luxury-accessories';
        else if (categoryLower.includes('perfume') || categoryLower.includes('fragrance')) category = 'luxury-fragrance';
        else if (categoryLower.includes('shoe')) category = 'luxury-footwear';
        else if (categoryLower.includes('ready-to-wear') || categoryLower.includes('clothing')) category = 'luxury-fashion';
      }

      // Estimate weight for luxury goods
      let weight: number | undefined;
      if (rawData.category_name) {
        weight = this.estimateHermesWeight(rawData.category_name, title);
      }

      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || rawData.seller || 'Hermès',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        description: rawData.description || rawData.product_details || '',
        specifications: this.normalizeHermesSpecifications(rawData),
        seller_name: 'Hermès',
        url
      };

    } catch (error) {
      console.error('Error normalizing Hermes data:', error);
      return {
        title: rawData.product_name || 'Hermès Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'Hermès',
        category: 'luxury',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Estimate Hermes product weight based on category and title
   */
  private estimateHermesWeight(categoryName: string, title: string): number | undefined {
    const categoryLower = categoryName.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Hermes luxury goods weight estimates (in kg)
    if (categoryLower.includes('bag')) {
      if (titleLower.includes('birkin') || titleLower.includes('kelly')) return 1.2; // Iconic bags
      if (titleLower.includes('wallet') || titleLower.includes('cardholder')) return 0.3;
      return 0.8; // Default bag weight
    }
    if (categoryLower.includes('scarf') || categoryLower.includes('silk')) return 0.2;
    if (categoryLower.includes('belt')) return 0.4;
    if (categoryLower.includes('jewelry')) return 0.1;
    if (categoryLower.includes('watch')) return 0.3;
    if (categoryLower.includes('perfume') || categoryLower.includes('fragrance')) return 0.5;
    if (categoryLower.includes('shoe')) return 1.0;
    if (categoryLower.includes('ready-to-wear') || categoryLower.includes('clothing')) return 0.6;
    
    // Default luxury item weight
    return 0.5;
  }

  /**
   * Normalize Hermes specifications to our standard format
   */
  private normalizeHermesSpecifications(rawData: any): Array<{name: string; value: string}> {
    const specs: Array<{name: string; value: string}> = [];
    
    if (rawData.size) {
      specs.push({ name: 'Size', value: rawData.size });
    }
    if (rawData.color) {
      specs.push({ name: 'Color', value: rawData.color });
    }
    if (rawData.material) {
      specs.push({ name: 'Material', value: rawData.material });
    }
    if (rawData.dimensions) {
      specs.push({ name: 'Dimensions', value: rawData.dimensions });
    }
    if (rawData.sku) {
      specs.push({ name: 'SKU', value: rawData.sku });
    }
    if (rawData.country) {
      specs.push({ name: 'Made In', value: rawData.country });
    }
    if (rawData.product_story) {
      specs.push({ name: 'Product Story', value: rawData.product_story });
    }
    
    return specs;
  }

  /**
   * Estimate eBay product weight based on category and product title
   */
  private estimateEbayWeight(category: string, productTitle: string): number | undefined {
    const categoryLower = category.toLowerCase();
    const titleLower = productTitle.toLowerCase();
    
    // eBay weight estimates in kg (international market standard)
    
    // Electronics
    if (categoryLower.includes('electronics') || categoryLower.includes('computer') || categoryLower.includes('phone')) {
      if (titleLower.includes('laptop')) return 2.5;
      if (titleLower.includes('phone') || titleLower.includes('smartphone')) return 0.2;
      if (titleLower.includes('tablet') || titleLower.includes('ipad')) return 0.5;
      if (titleLower.includes('headphone') || titleLower.includes('earbuds')) return 0.3;
      if (titleLower.includes('charger') || titleLower.includes('cable')) return 0.1;
      return 0.5; // Default electronics weight
    }
    
    // Collectibles (common on eBay)
    if (categoryLower.includes('collectible') || categoryLower.includes('antique')) {
      if (titleLower.includes('coin') || titleLower.includes('stamp')) return 0.05;
      if (titleLower.includes('card') || titleLower.includes('trading')) return 0.02;
      if (titleLower.includes('figure') || titleLower.includes('toy')) return 0.3;
      if (titleLower.includes('knife') || titleLower.includes('blade')) return 0.2;
      return 0.2; // Default collectibles weight
    }
    
    // Fashion items
    if (categoryLower.includes('fashion') || categoryLower.includes('clothing') || categoryLower.includes('apparel')) {
      if (titleLower.includes('dress')) return 0.4;
      if (titleLower.includes('shirt') || titleLower.includes('top')) return 0.2;
      if (titleLower.includes('jean') || titleLower.includes('pant')) return 0.5;
      if (titleLower.includes('jacket') || titleLower.includes('coat')) return 0.8;
      return 0.3; // Default fashion weight
    }
    
    // Footwear
    if (categoryLower.includes('shoes') || categoryLower.includes('footwear')) {
      if (titleLower.includes('boot')) return 1.2;
      if (titleLower.includes('sneaker') || titleLower.includes('running')) return 0.8;
      if (titleLower.includes('sandal') || titleLower.includes('flip')) return 0.3;
      return 0.8; // Default shoe weight
    }
    
    // Books
    if (categoryLower.includes('book') || categoryLower.includes('media')) {
      if (titleLower.includes('textbook')) return 1.5;
      if (titleLower.includes('hardcover')) return 0.8;
      if (titleLower.includes('paperback')) return 0.3;
      return 0.5; // Default book weight
    }
    
    // Home & Garden
    if (categoryLower.includes('home') || categoryLower.includes('garden')) {
      if (titleLower.includes('tool')) return 1.0;
      if (titleLower.includes('decor') || titleLower.includes('decoration')) return 0.5;
      if (titleLower.includes('kitchen')) return 0.8;
      return 0.6; // Default home weight
    }
    
    // Automotive (common category on eBay)
    if (categoryLower.includes('automotive') || categoryLower.includes('motor') || categoryLower.includes('car')) {
      if (titleLower.includes('filter')) return 0.5;
      if (titleLower.includes('part') || titleLower.includes('component')) return 1.0;
      if (titleLower.includes('accessory')) return 0.3;
      return 0.8; // Default automotive weight
    }
    
    // Default weight for unrecognized categories
    return 0.5;
  }

  /**
   * Map eBay category to our standardized categories
   */
  private mapEbayCategory(ebayCategory: string): string {
    const categoryLower = ebayCategory.toLowerCase();
    
    // Electronics
    if (categoryLower.includes('electronics') || categoryLower.includes('computer') || 
        categoryLower.includes('phone') || categoryLower.includes('tablet') ||
        categoryLower.includes('audio') || categoryLower.includes('video')) {
      return 'electronics';
    }
    
    // Fashion & Clothing
    if (categoryLower.includes('clothing') || categoryLower.includes('fashion') || 
        categoryLower.includes('apparel') || categoryLower.includes('dress') ||
        categoryLower.includes('shirt') || categoryLower.includes('pant') ||
        categoryLower.includes('jacket') || categoryLower.includes('accessory')) {
      return 'fashion';
    }
    
    // Footwear
    if (categoryLower.includes('shoes') || categoryLower.includes('footwear') || 
        categoryLower.includes('boot') || categoryLower.includes('sneaker') ||
        categoryLower.includes('sandal')) {
      return 'footwear';
    }
    
    // Books & Media
    if (categoryLower.includes('book') || categoryLower.includes('media') || 
        categoryLower.includes('magazine') || categoryLower.includes('dvd') ||
        categoryLower.includes('cd') || categoryLower.includes('vinyl')) {
      return 'books';
    }
    
    // Home & Garden
    if (categoryLower.includes('home') || categoryLower.includes('garden') || 
        categoryLower.includes('kitchen') || categoryLower.includes('furniture') ||
        categoryLower.includes('decor') || categoryLower.includes('tool')) {
      return 'home';
    }
    
    // Beauty & Health
    if (categoryLower.includes('beauty') || categoryLower.includes('health') || 
        categoryLower.includes('cosmetic') || categoryLower.includes('skincare') ||
        categoryLower.includes('fragrance') || categoryLower.includes('makeup')) {
      return 'beauty';
    }
    
    // Sports & Recreation
    if (categoryLower.includes('sport') || categoryLower.includes('fitness') || 
        categoryLower.includes('outdoor') || categoryLower.includes('recreation') ||
        categoryLower.includes('exercise') || categoryLower.includes('gym')) {
      return 'sports';
    }
    
    // Collectibles (very common on eBay)
    if (categoryLower.includes('collectible') || categoryLower.includes('antique') || 
        categoryLower.includes('vintage') || categoryLower.includes('memorabilia') ||
        categoryLower.includes('coin') || categoryLower.includes('stamp') ||
        categoryLower.includes('card') || categoryLower.includes('figure')) {
      return 'general'; // We don't have a collectibles category, so use general
    }
    
    // Default to general for unrecognized categories
    return 'general';
  }

  /**
   * Generic weight estimation based on title and category
   */
  private estimateWeight(title: string, category: string): number | undefined {
    const titleLower = title.toLowerCase();
    const categoryLower = category.toLowerCase();
    
    // Base weights for different categories (in kg for international market)
    let baseWeight = 0.5; // Default
    
    // Category-based estimates
    if (categoryLower.includes('electronics')) {
      baseWeight = 0.8;
      if (titleLower.includes('laptop')) baseWeight = 2.0;
      if (titleLower.includes('phone') || titleLower.includes('smartphone')) baseWeight = 0.2;
      if (titleLower.includes('tablet')) baseWeight = 0.5;
      if (titleLower.includes('tv')) baseWeight = 8.0;
    } else if (categoryLower.includes('fashion') || categoryLower.includes('clothing')) {
      baseWeight = 0.3;
      if (titleLower.includes('jacket') || titleLower.includes('coat')) baseWeight = 0.8;
      if (titleLower.includes('jeans') || titleLower.includes('pants')) baseWeight = 0.4;
    } else if (categoryLower.includes('footwear') || categoryLower.includes('shoes')) {
      baseWeight = 0.6;
    } else if (categoryLower.includes('home') || categoryLower.includes('furniture')) {
      baseWeight = 2.0;
      if (titleLower.includes('furniture')) baseWeight = 15.0;
    } else if (categoryLower.includes('beauty') || categoryLower.includes('health')) {
      baseWeight = 0.2;
    } else if (categoryLower.includes('books')) {
      baseWeight = 0.4;
    } else if (categoryLower.includes('toys') || categoryLower.includes('games')) {
      baseWeight = 0.6;
    } else if (categoryLower.includes('sports') || categoryLower.includes('outdoors')) {
      baseWeight = 1.0;
    }
    
    // Size adjustments
    if (titleLower.includes('mini') || titleLower.includes('small')) {
      baseWeight *= 0.5;
    } else if (titleLower.includes('large') || titleLower.includes('big') || titleLower.includes('xl')) {
      baseWeight *= 1.5;
    }
    
    return Math.round(baseWeight * 1000) / 1000; // Round to 3 decimals
  }

  /**
   * Map Target category to our standard categories
   */
  private mapTargetCategory(targetCategory: string): string {
    if (!targetCategory) return 'general';
    
    const category = targetCategory.toLowerCase();
    
    // Target specific category mappings
    if (category.includes('electronic') || category.includes('computer') || category.includes('phone') || category.includes('tablet')) {
      return 'electronics';
    }
    if (category.includes('clothing') || category.includes('apparel') || category.includes('fashion') || category.includes('shirt') || category.includes('dress')) {
      return 'fashion';
    }
    if (category.includes('shoes') || category.includes('footwear') || category.includes('sneaker') || category.includes('boot')) {
      return 'footwear';
    }
    if (category.includes('home') || category.includes('furniture') || category.includes('kitchen') || category.includes('garden')) {
      return 'home';
    }
    if (category.includes('beauty') || category.includes('health') || category.includes('cosmetic') || category.includes('skincare')) {
      return 'beauty-health';
    }
    if (category.includes('sports') || category.includes('outdoor') || category.includes('fitness') || category.includes('exercise')) {
      return 'sports';
    }
    if (category.includes('toys') || category.includes('games') || category.includes('kids') || category.includes('children')) {
      return 'toys';
    }
    if (category.includes('books') || category.includes('media') || category.includes('magazine')) {
      return 'books';
    }
    
    // Default to general for Target
    return 'general';
  }

  /**
   * Map Best Buy category to our standard categories
   */
  private mapBestBuyCategory(bestBuyCategory: string): string {
    if (!bestBuyCategory) return 'electronics';
    
    const category = bestBuyCategory.toLowerCase();
    
    // Best Buy specific category mappings
    if (category.includes('computer') || category.includes('laptop') || category.includes('desktop')) {
      return 'electronics';
    }
    if (category.includes('phone') || category.includes('mobile') || category.includes('smartphone')) {
      return 'electronics';
    }
    if (category.includes('tv') || category.includes('television') || category.includes('monitor')) {
      return 'electronics';
    }
    if (category.includes('gaming') || category.includes('video game') || category.includes('console')) {
      return 'electronics';
    }
    if (category.includes('audio') || category.includes('headphone') || category.includes('speaker')) {
      return 'electronics';
    }
    if (category.includes('camera') || category.includes('photography')) {
      return 'electronics';
    }
    if (category.includes('furniture') || category.includes('desk') || category.includes('chair')) {
      return 'home';
    }
    if (category.includes('appliance') || category.includes('kitchen') || category.includes('home')) {
      return 'home';
    }
    if (category.includes('fitness') || category.includes('sports') || category.includes('outdoor')) {
      return 'sports';
    }
    if (category.includes('book') || category.includes('media')) {
      return 'books';
    }
    if (category.includes('toy') || category.includes('game')) {
      return 'toys';
    }
    
    // Default to electronics for Best Buy
    return 'electronics';
  }

  /**
   * Utility methods
   */
  private parsePrice(priceStr: any): number | undefined {
    if (typeof priceStr === 'number') return priceStr;
    if (typeof priceStr === 'string') {
      const match = priceStr.replace(/[^\d.,]/g, '').match(/[\d,]+\.?\d*/);
      if (match) {
        return parseFloat(match[0].replace(/,/g, ''));
      }
    }
    return undefined;
  }

  private parseWeight(weightStr: any, url?: string): number | undefined {
    if (typeof weightStr === 'number') return weightStr;
    if (typeof weightStr === 'string') {
      const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(g|grams?|kg|kilograms?|lb|lbs|pound|pounds|oz|ounce|ounces)/i);
      if (match) {
        let weight = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        // Determine target unit based on marketplace region
        const isUSMarket = url ? this.isUSMarketplace(url) : false;
        const targetUnit = isUSMarket ? 'lbs' : 'kg';
        
        console.log(`🏋️ Weight conversion: ${weight} ${unit} → ${targetUnit} (${isUSMarket ? 'US marketplace' : 'International marketplace'})`);
        
        if (targetUnit === 'lbs') {
          // Convert to pounds (US/North American markets)
          if (unit.includes('kg') || unit.includes('kilogram')) {
            weight *= 2.20462; // kg to lbs
          } else if (unit.includes('g') && !unit.includes('kg')) {
            weight *= 0.00220462; // grams to lbs
          } else if (unit.includes('oz') || unit.includes('ounce')) {
            weight *= 0.0625; // oz to lbs
          }
          // If already in lbs/pounds, no conversion needed
          
        } else {
          // Convert to kg (International markets)
          if (unit.includes('lb') || unit.includes('pound')) {
            weight *= 0.453592; // lbs to kg
          } else if (unit.includes('oz') || unit.includes('ounce')) {
            weight *= 0.0283495; // oz to kg
          } else if (unit.includes('g') && !unit.includes('kg')) {
            weight *= 0.001; // grams to kg
          }
          // If already in kg, no conversion needed
        }
        
        console.log(`🏋️ Final weight: ${weight.toFixed(3)} ${targetUnit}`);
        return Math.round(weight * 1000) / 1000; // Round to 3 decimal places
      }
    }
    return undefined;
  }

  private detectCurrencyFromPrice(priceStr: any): string | null {
    if (typeof priceStr !== 'string') return null;
    
    if (priceStr.includes('$')) return 'USD';
    if (priceStr.includes('£')) return 'GBP';
    if (priceStr.includes('€')) return 'EUR';
    if (priceStr.includes('¥')) return 'JPY';
    if (priceStr.includes('₹')) return 'INR';
    
    return null;
  }

  private inferCategory(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('phone') || titleLower.includes('iphone') || titleLower.includes('samsung')) return 'electronics';
    if (titleLower.includes('laptop') || titleLower.includes('computer')) return 'electronics';
    if (titleLower.includes('shirt') || titleLower.includes('dress') || titleLower.includes('jacket')) return 'fashion';
    if (titleLower.includes('shoes') || titleLower.includes('sneakers') || titleLower.includes('boots')) return 'footwear';
    if (titleLower.includes('book')) return 'books';
    if (titleLower.includes('toy') || titleLower.includes('game')) return 'toys';
    
    return 'general';
  }

  private normalizeAvailability(availability: any): 'in-stock' | 'out-of-stock' | 'unknown' {
    if (!availability) return 'unknown';
    
    const availStr = availability.toString().toLowerCase();
    if (availStr.includes('in stock') || availStr.includes('available')) return 'in-stock';
    if (availStr.includes('out of stock') || availStr.includes('unavailable')) return 'out-of-stock';
    
    return 'unknown';
  }

  /**
   * AI Enhancement using our AI enhancer
   */
  private async enhanceWithAI(productData: ProductData, url: string): Promise<ProductData> {
    try {
      const { AIProductEnhancer } = await import('./MCPBrightDataBridge');
      return await AIProductEnhancer.enhanceProductData(productData, url);
    } catch (error) {
      console.error('AI enhancement failed:', error);
      return productData;
    }
  }

  /**
   * Parse markdown content for product data using AI
   */
  private async parseMarkdownForProductData(markdown: string, url: string): Promise<ProductData> {
    // This would use AI to extract structured data from markdown
    // For now, return basic structure
    return {
      title: 'Unknown Product',
      category: 'general',
      availability: 'unknown'
    };
  }

  /**
   * Normalize Toys"R"Us data
   */
  private normalizeToysrusData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.product_name || 'Toys"R"Us Product';
      
      // Parse Toys"R"Us prices
      const parsePrice = (priceStr: any): number => {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const finalPrice = parsePrice(rawData.final_price || rawData.initial_price);
      const currency = 'USD'; // Toys"R"Us typically uses USD
      
      // Handle images
      let images: string[] = [];
      if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      } else if (rawData.main_image) {
        images = [rawData.main_image];
      }
      
      // Categorize toys
      let category = 'toys';
      if (rawData.category || rawData.breadcrumbs) {
        const categoryText = (rawData.category || '').toLowerCase();
        const breadcrumbText = Array.isArray(rawData.breadcrumbs) 
          ? rawData.breadcrumbs.map((b: any) => b.name || b).join(' ').toLowerCase()
          : '';
        const combined = `${categoryText} ${breadcrumbText}`;
        
        if (combined.includes('educational') || combined.includes('learning')) category = 'educational-toys';
        else if (combined.includes('electronic') || combined.includes('tech')) category = 'electronic-toys';
        else if (combined.includes('outdoor') || combined.includes('sport')) category = 'outdoor-toys';
        else if (combined.includes('craft') || combined.includes('art')) category = 'craft-toys';
        else if (combined.includes('baby') || combined.includes('infant')) category = 'baby-toys';
      }
      
      // Estimate weight based on toy type
      const weight = this.estimateToyWeight(title, category);
      
      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || 'Toys"R"Us',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        description: rawData.description || '',
        seller_name: 'Toys"R"Us',
        url
      };
    } catch (error) {
      console.error('Error normalizing Toys"R"Us data:', error);
      return {
        title: rawData.product_name || 'Toys"R"Us Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'Toys"R"Us',
        category: 'toys',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize Carter's data
   */
  private normalizeCartersData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.product_name || 'Carter\'s Product';
      
      // Parse Carter's prices
      const parsePrice = (priceStr: any): number => {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const finalPrice = parsePrice(rawData.final_price || rawData.initial_price);
      const currency = rawData.currency === '$' ? 'USD' : rawData.currency || 'USD';
      
      // Handle images
      let images: string[] = [];
      if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      }
      
      // Categorize baby clothing
      let category = 'baby-clothing';
      if (rawData.category) {
        const categoryLower = rawData.category.toLowerCase();
        if (categoryLower.includes('sock') || categoryLower.includes('tight')) category = 'baby-socks';
        else if (categoryLower.includes('pajama') || categoryLower.includes('sleepwear')) category = 'baby-sleepwear';
        else if (categoryLower.includes('onesie') || categoryLower.includes('bodysuit')) category = 'baby-onesies';
        else if (categoryLower.includes('pant') || categoryLower.includes('bottom')) category = 'baby-bottoms';
        else if (categoryLower.includes('dress') || categoryLower.includes('skirt')) category = 'baby-dresses';
        else if (categoryLower.includes('shoe') || categoryLower.includes('boot')) category = 'baby-shoes';
      }
      
      // Estimate weight for baby clothing
      const weight = this.estimateBabyClothingWeight(title, category, rawData.size);
      
      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || 'Carter\'s',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        description: rawData.description || '',
        specifications: rawData.features ? { features: rawData.features } : undefined,
        seller_name: 'Carter\'s',
        url
      };
    } catch (error) {
      console.error('Error normalizing Carter\'s data:', error);
      return {
        title: rawData.product_name || 'Carter\'s Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'Carter\'s',
        category: 'baby-clothing',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize Prada data
   */
  private normalizePradaData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.product_name || 'Prada Product';
      
      // Parse Prada prices (EUR format like "€1,100.00")
      const parsePrice = (priceStr: any): number => {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const finalPrice = parsePrice(rawData.final_price || rawData.initial_price);
      const currency = rawData.currency || 'EUR';
      
      // Handle images
      let images: string[] = [];
      if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      }
      
      // Categorize luxury fashion
      let category = 'luxury-fashion';
      if (rawData.category_name) {
        const categoryLower = rawData.category_name.toLowerCase();
        if (categoryLower.includes('bag') || categoryLower.includes('tote') || categoryLower.includes('handbag')) category = 'luxury-bags';
        else if (categoryLower.includes('shoe') || categoryLower.includes('sneaker') || categoryLower.includes('boot')) category = 'luxury-footwear';
        else if (categoryLower.includes('wallet') || categoryLower.includes('accessory')) category = 'luxury-accessories';
        else if (categoryLower.includes('sunglasses') || categoryLower.includes('eyewear')) category = 'luxury-eyewear';
        else if (categoryLower.includes('clothing') || categoryLower.includes('dress') || categoryLower.includes('shirt')) category = 'luxury-clothing';
      }
      
      // Estimate weight for luxury goods
      const weight = this.estimateLuxuryWeight(title, category);
      
      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || 'PRADA',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        description: rawData.description || rawData.product_details || '',
        specifications: rawData.material ? { material: rawData.material } : undefined,
        seller_name: 'Prada',
        url
      };
    } catch (error) {
      console.error('Error normalizing Prada data:', error);
      return {
        title: rawData.product_name || 'Prada Product',
        price: 0,
        currency: 'EUR',
        images: [],
        brand: 'PRADA',
        category: 'luxury-fashion',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize YSL data
   */
  private normalizeYSLData(rawData: any, url: string): ProductData {
    try {
      const title = rawData.product_name || 'YSL Product';
      
      // Parse YSL prices (multiple currencies: SAR, USD, EUR)
      const parsePrice = (priceStr: any): number => {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        // Handle formats like "SAR 1,400.00", "$1,400.00", "€1,400.00"
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const finalPrice = parsePrice(rawData.final_price || rawData.initial_price);
      let currency = rawData.currency || 'USD';
      
      // Detect currency from price string if not provided
      if (!rawData.currency && rawData.initial_price) {
        const priceStr = rawData.initial_price.toString();
        if (priceStr.includes('SAR')) currency = 'SAR';
        else if (priceStr.includes('€')) currency = 'EUR';
        else if (priceStr.includes('$')) currency = 'USD';
      }
      
      // Handle images
      let images: string[] = [];
      if (Array.isArray(rawData.image_urls)) {
        images = rawData.image_urls.filter(Boolean).slice(0, 8);
      }
      
      // Categorize luxury fashion
      let category = 'luxury-fashion';
      if (rawData.category_name) {
        const categoryLower = rawData.category_name.toLowerCase();
        if (categoryLower.includes('bag') || categoryLower.includes('handbag')) category = 'luxury-bags';
        else if (categoryLower.includes('card') || categoryLower.includes('wallet') || categoryLower.includes('leather-goods')) category = 'luxury-accessories';
        else if (categoryLower.includes('fragrance') || categoryLower.includes('perfume')) category = 'luxury-fragrance';
        else if (categoryLower.includes('shoe') || categoryLower.includes('boot')) category = 'luxury-footwear';
        else if (categoryLower.includes('jewelry')) category = 'luxury-jewelry';
        else if (categoryLower.includes('sunglasses') || categoryLower.includes('eyewear')) category = 'luxury-eyewear';
      }
      
      // Estimate weight for luxury goods
      const weight = this.estimateLuxuryWeight(title, category);
      
      return {
        title,
        price: finalPrice,
        currency,
        images,
        weight,
        brand: rawData.brand || 'Yves Saint Laurent',
        category,
        availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
        description: rawData.description || rawData.product_details || '',
        specifications: rawData.material ? { material: rawData.material } : undefined,
        seller_name: 'YSL',
        url
      };
    } catch (error) {
      console.error('Error normalizing YSL data:', error);
      return {
        title: rawData.product_name || 'YSL Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'Yves Saint Laurent',
        category: 'luxury-fashion',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize Balenciaga product data
   */
  private normalizeBalenciagaData(rawData: any, url: string): ProductData {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price information
      let price = 0;
      let currency = 'USD';
      
      if (data.final_price) {
        if (typeof data.final_price === 'string') {
          const priceMatch = data.final_price.match(/[\d,]+\.?\d*/);
          price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        } else {
          price = data.final_price;
        }
      } else if (data.initial_price) {
        if (typeof data.initial_price === 'string') {
          const priceMatch = data.initial_price.match(/[\d,]+\.?\d*/);
          price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        } else {
          price = data.initial_price;
        }
      }
      
      currency = data.currency || 'USD';
      
      // Handle images
      const images = [];
      if (data.image_urls && Array.isArray(data.image_urls)) {
        images.push(...data.image_urls.filter(Boolean));
      }
      if (data.main_image) {
        images.unshift(data.main_image);
      }
      
      // Map category
      const category = this.mapBalenciagaCategory(data.category_name, data.category_path);
      
      // Estimate weight for luxury goods
      const weight = this.estimateLuxuryWeight(data.product_name, category);
      
      return {
        title: data.product_name || 'Balenciaga Product',
        price,
        currency,
        images,
        weight,
        brand: data.brand || 'Balenciaga',
        category,
        availability: data.in_stock ? 'in-stock' : 'out-of-stock',
        description: data.description || data.product_details || data.product_story || '',
        specifications: data.material ? { material: data.material } : undefined,
        seller_name: 'Balenciaga',
        url
      };
    } catch (error) {
      console.error('Error normalizing Balenciaga data:', error);
      return {
        title: rawData.product_name || 'Balenciaga Product',
        price: 0,
        currency: 'USD',
        images: [],
        brand: 'Balenciaga',
        category: 'luxury-fashion',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize Dior product data
   */
  private normalizeDiorData(rawData: any, url: string): ProductData {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price information
      let price = 0;
      let currency = 'EUR';
      
      if (data.final_price) {
        price = typeof data.final_price === 'number' ? data.final_price : parseFloat(data.final_price) || 0;
      } else if (data.initial_price) {
        price = typeof data.initial_price === 'number' ? data.initial_price : parseFloat(data.initial_price) || 0;
      }
      
      currency = data.currency || 'EUR';
      
      // Handle images
      const images = [];
      if (data.image_urls && Array.isArray(data.image_urls)) {
        images.push(...data.image_urls.filter(Boolean));
      }
      if (data.main_image) {
        images.unshift(data.main_image);
      }
      
      // Map category
      const category = this.mapDiorCategory(data.category_name);
      
      // Estimate weight for luxury goods
      const weight = this.estimateLuxuryWeight(data.product_name, category);
      
      return {
        title: data.product_name || 'Dior Product',
        price,
        currency,
        images,
        weight,
        brand: data.brand || 'Dior',
        category,
        availability: data.in_stock !== false ? 'in-stock' : 'out-of-stock',
        description: data.description || data.product_details || '',
        specifications: data.material ? { material: data.material } : undefined,
        seller_name: 'Dior',
        url
      };
    } catch (error) {
      console.error('Error normalizing Dior data:', error);
      return {
        title: rawData.product_name || 'Dior Product',
        price: 0,
        currency: 'EUR',
        images: [],
        brand: 'Dior',
        category: 'luxury-fashion',
        availability: 'unknown',
        description: rawData.description || '',
        url
      };
    }
  }

  /**
   * Normalize Chanel product data
   */
  private normalizeChanelData(rawData: any, url: string): ProductData {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price information
      let price = 0;
      let currency = 'VND';
      
      if (data.regular_price) {
        price = typeof data.regular_price === 'number' ? data.regular_price : parseFloat(data.regular_price) || 0;
      }
      
      currency = data.currency || 'VND';
      
      // Handle images
      const images = [];
      if (data.image_slider && Array.isArray(data.image_slider)) {
        images.push(...data.image_slider.filter(Boolean));
      }
      if (data.image) {
        images.unshift(data.image);
      }
      
      // Map category
      const category = this.mapChanelCategory(data.product_category);
      
      // Estimate weight for luxury goods
      const weight = this.estimateLuxuryWeight(data.product_name, category);
      
      return {
        title: data.product_name || 'Chanel Product',
        price,
        currency,
        images,
        weight,
        brand: data.product_brand || 'Chanel',
        category,
        availability: data.stock !== false ? 'in-stock' : 'out-of-stock',
        description: data.product_description || '',
        specifications: data.material ? { material: data.material } : undefined,
        seller_name: 'Chanel',
        url
      };
    } catch (error) {
      console.error('Error normalizing Chanel data:', error);
      return {
        title: rawData.product_name || 'Chanel Product',
        price: 0,
        currency: 'VND',
        images: [],
        brand: 'Chanel',
        category: 'luxury-beauty',
        availability: 'unknown',
        description: rawData.product_description || '',
        url
      };
    }
  }

  /**
   * Map Balenciaga category to our standard categories
   */
  private mapBalenciagaCategory(categoryName?: string, categoryPath?: string): string {
    const category = (categoryName || categoryPath || '').toLowerCase();
    
    if (category.includes('sneaker')) return 'luxury-sneakers';
    if (category.includes('shoe')) return 'luxury-footwear';
    if (category.includes('bag') || category.includes('handbag')) return 'luxury-bags';
    if (category.includes('ready-to-wear')) return 'luxury-fashion';
    if (category.includes('accessorie')) return 'luxury-accessories';
    if (category.includes('jewelry')) return 'luxury-jewelry';
    if (category.includes('sunglass') || category.includes('eyewear')) return 'luxury-eyewear';
    
    return 'luxury-fashion';
  }

  /**
   * Map Dior category to our standard categories
   */
  private mapDiorCategory(categoryName?: string): string {
    const category = (categoryName || '').toLowerCase();
    
    if (category.includes('sakko') || category.includes('jacket') || category.includes('shirt') || category.includes('pant')) return 'luxury-fashion';
    if (category.includes('schuh') || category.includes('shoe')) return 'luxury-footwear';
    if (category.includes('tasche') || category.includes('bag')) return 'luxury-bags';
    if (category.includes('accessoire') || category.includes('accessory')) return 'luxury-accessories';
    if (category.includes('parfum') || category.includes('fragrance')) return 'luxury-fragrance';
    if (category.includes('make-up') || category.includes('beauty')) return 'luxury-beauty';
    if (category.includes('schmuck') || category.includes('jewelry')) return 'luxury-jewelry';
    
    return 'luxury-fashion';
  }

  /**
   * Map Chanel category to our standard categories
   */
  private mapChanelCategory(categoryName?: string): string {
    const category = (categoryName || '').toLowerCase();
    
    if (category.includes('kính') || category.includes('eyewear') || category.includes('sunglass')) return 'luxury-eyewear';
    if (category.includes('make-up') || category.includes('beauty')) return 'luxury-beauty';
    if (category.includes('parfum') || category.includes('fragrance')) return 'luxury-fragrance';
    if (category.includes('handbag') || category.includes('bag')) return 'luxury-bags';
    if (category.includes('ready-to-wear') || category.includes('fashion')) return 'luxury-fashion';
    if (category.includes('jewelry')) return 'luxury-jewelry';
    if (category.includes('watch')) return 'luxury-watches';
    
    return 'luxury-beauty';
  }

  /**
   * Estimate weight for luxury goods
   */
  private estimateLuxuryWeight(title: string, category: string): number {
    const titleLower = title.toLowerCase();
    
    // Luxury bags vary significantly
    if (category.includes('bags')) {
      if (titleLower.includes('tote') || titleLower.includes('large')) return 1.2;
      if (titleLower.includes('clutch') || titleLower.includes('small')) return 0.4;
      return 0.8;
    }
    
    // Footwear
    if (category.includes('footwear') || category.includes('sneakers')) {
      if (titleLower.includes('sneaker')) return 0.7;
      if (titleLower.includes('heel') || titleLower.includes('pump')) return 0.6;
      return 0.8;
    }
    
    // Fashion items
    if (category.includes('fashion')) {
      if (titleLower.includes('jacket') || titleLower.includes('coat')) return 1.0;
      if (titleLower.includes('shirt') || titleLower.includes('top')) return 0.3;
      if (titleLower.includes('pants') || titleLower.includes('trouser')) return 0.5;
      return 0.4;
    }
    
    // Beauty and cosmetics
    if (category.includes('beauty')) return 0.2;
    
    // Fragrance
    if (category.includes('fragrance')) return 0.3;
    
    // Eyewear
    if (category.includes('eyewear')) return 0.2;
    
    // Jewelry
    if (category.includes('jewelry')) return 0.1;
    
    // Watches
    if (category.includes('watches')) return 0.3;
    
    // Accessories
    if (category.includes('accessories')) return 0.3;
    
    return 0.5; // Default luxury item weight
  }

  /**
   * Estimate toy weight based on category and title
   */
  private estimateToyWeight(title: string, category: string): number {
    const titleLower = title.toLowerCase();
    
    // Electronic toys are typically heavier
    if (category === 'electronic-toys' || titleLower.includes('electronic')) return 0.8;
    
    // Outdoor toys vary widely
    if (category === 'outdoor-toys') {
      if (titleLower.includes('bike') || titleLower.includes('scooter')) return 3.0;
      if (titleLower.includes('ball')) return 0.3;
      return 1.2;
    }
    
    // Educational toys
    if (category === 'educational-toys') return 0.5;
    
    // Baby toys are typically lighter
    if (category === 'baby-toys') return 0.3;
    
    // Craft toys
    if (category === 'craft-toys') return 0.4;
    
    // General toy weight based on common keywords
    if (titleLower.includes('lego') || titleLower.includes('block')) return 0.6;
    if (titleLower.includes('doll') || titleLower.includes('figure')) return 0.4;
    if (titleLower.includes('car') || titleLower.includes('truck')) return 0.5;
    if (titleLower.includes('puzzle')) return 0.3;
    
    // Default toy weight
    return 0.4;
  }

  /**
   * Estimate baby clothing weight based on category and size
   */
  private estimateBabyClothingWeight(title: string, category: string, size?: string): number {
    // Base weights for different baby clothing categories (in kg)
    const baseWeights: Record<string, number> = {
      'baby-socks': 0.05,
      'baby-onesies': 0.1,
      'baby-sleepwear': 0.15,
      'baby-bottoms': 0.12,
      'baby-dresses': 0.15,
      'baby-shoes': 0.2,
      'baby-clothing': 0.12
    };
    
    let weight = baseWeights[category] || 0.12;
    
    // Adjust based on size
    if (size) {
      const sizeLower = size.toLowerCase();
      if (sizeLower.includes('newborn') || sizeLower.includes('0-3')) weight *= 0.8;
      else if (sizeLower.includes('6-9') || sizeLower.includes('12')) weight *= 1.1;
      else if (sizeLower.includes('18') || sizeLower.includes('24') || sizeLower.includes('2t')) weight *= 1.3;
      else if (sizeLower.includes('3t') || sizeLower.includes('4t')) weight *= 1.5;
    }
    
    // Multi-pack items
    const titleLower = title.toLowerCase();
    if (titleLower.includes('2-pack')) weight *= 2;
    else if (titleLower.includes('3-pack')) weight *= 3;
    else if (titleLower.includes('4-pack')) weight *= 4;
    else if (titleLower.includes('5-pack')) weight *= 5;
    else if (titleLower.includes('6-pack')) weight *= 6;
    
    return Math.round(weight * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Estimate luxury item weight based on category
   */
  private estimateLuxuryWeight(title: string, category: string): number {
    const titleLower = title.toLowerCase();
    
    // Category-based weights (in kg)
    switch (category) {
      case 'luxury-bags':
        if (titleLower.includes('tote') || titleLower.includes('large')) return 1.2;
        if (titleLower.includes('clutch') || titleLower.includes('small')) return 0.6;
        return 0.9; // Default bag weight
        
      case 'luxury-accessories':
        if (titleLower.includes('wallet') || titleLower.includes('card')) return 0.3;
        if (titleLower.includes('belt')) return 0.4;
        if (titleLower.includes('scarf')) return 0.2;
        return 0.3; // Default accessory weight
        
      case 'luxury-footwear':
        if (titleLower.includes('boot')) return 1.3;
        if (titleLower.includes('sneaker')) return 1.0;
        return 1.1; // Default shoe weight
        
      case 'luxury-eyewear':
        return 0.15;
        
      case 'luxury-fragrance':
        if (titleLower.includes('100ml') || titleLower.includes('large')) return 0.5;
        if (titleLower.includes('50ml') || titleLower.includes('small')) return 0.3;
        return 0.4; // Default fragrance weight
        
      case 'luxury-jewelry':
        return 0.1;
        
      case 'luxury-clothing':
        if (titleLower.includes('coat') || titleLower.includes('jacket')) return 1.5;
        if (titleLower.includes('dress')) return 0.8;
        if (titleLower.includes('shirt') || titleLower.includes('top')) return 0.4;
        return 0.6; // Default clothing weight
        
      default:
        return 0.5; // Default luxury item weight
    }
  }

  /**
   * Cache management
   */
  private getFromCache(url: string): FetchResult | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private saveToCache(url: string, result: FetchResult): void {
    this.cache.set(url, {
      data: result,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const brightDataProductService = new BrightDataProductService({
  apiToken: import.meta.env.VITE_BRIGHTDATA_API_TOKEN || '',
  cacheTimeout: 30 * 60 * 1000 // 30 minutes
});