/**
 * Product Scraping Engine
 * Handles core scraping logic for different e-commerce platforms
 */

import { logger } from '@/utils/logger';
import { platformConfigManager, PlatformConfig } from './PlatformConfigManager';

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  enhanceWithAI?: boolean;
  timeout?: number;
}

export interface ProductData {
  title: string;
  price: number;
  currency: string;
  weight?: number;
  weight_value?: number;
  weight_unit?: string;
  weight_raw?: string;
  images: string[];
  brand?: string;
  category: string;
  availability: 'in-stock' | 'out-of-stock' | 'unknown';
  description?: string;
  variants?: Array<{
    name: string;
    options: string[];
  }>;
  reviews?: {
    rating: number;
    count: number;
  };
  specifications?: Record<string, any>;
}

export interface FetchResult {
  success: boolean;
  data?: ProductData;
  error?: string;
  source: 'scraper' | 'api' | 'cache';
}

export interface MCPResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ProductScrapingEngine {
  private readonly maxRetries = 3;
  private readonly defaultTimeout = 60000; // 60 seconds

  /**
   * Main method to scrape product data from any supported platform
   */
  async scrapeProduct(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    try {
      // Detect platform
      const platform = platformConfigManager.detectPlatform(url);
      if (!platform) {
        return {
          success: false,
          error: 'Unsupported platform',
          source: 'api'
        };
      }

      // Get platform configuration
      const config = platformConfigManager.getPlatformConfig(platform);
      if (!config) {
        return {
          success: false,
          error: 'Platform configuration not found',
          source: 'api'
        };
      }

      // Route to appropriate scraper
      let result: FetchResult;
      
      switch (platform) {
        case 'amazon':
          result = await this.scrapeAmazonProduct(url, config, options);
          break;
        case 'ebay':
          result = await this.scrapeEbayProduct(url, config, options);
          break;
        case 'walmart':
          result = await this.scrapeWalmartProduct(url, config, options);
          break;
        case 'bestbuy':
          result = await this.scrapeBestBuyProduct(url, config, options);
          break;
        case 'ae':
          result = await this.scrapeAEProduct(url, config, options);
          break;
        case 'myntra':
          result = await this.scrapeMyntraProduct(url, config, options);
          break;
        case 'target':
          result = await this.scrapeTargetProduct(url, config, options);
          break;
        case 'hm':
          result = await this.scrapeHMProduct(url, config, options);
          break;
        case 'asos':
          result = await this.scrapeASOSProduct(url, config, options);
          break;
        case 'etsy':
          result = await this.scrapeEtsyProduct(url, config, options);
          break;
        case 'zara':
          result = await this.scrapeZaraProduct(url, config, options);
          break;
        default:
          result = await this.scrapeGenericProduct(url, config, options);
      }

      return result;

    } catch (error) {
      logger.error('Product scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        source: 'api'
      };
    }
  }

  /**
   * Scrape Amazon product using Bright Data MCP
   */
  private async scrapeAmazonProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_reviews: options.includeReviews || false,
        include_images: options.includeImages !== false, // Default true
        country: this.detectCountryFromUrl(url)
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeEbayProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_seller_info: true,
        include_shipping: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeWalmartProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_specifications: true,
        include_availability: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeBestBuyProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_specifications: true,
        include_reviews: options.includeReviews || false
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeAEProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_colors: true,
        include_sizes: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeMyntraProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_specifications: true,
        include_offers: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Myntra scraping failed');
      }

      const productData = this.normalizeMyntraData(mcpResult.data, url);
      
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
  private async scrapeTargetProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_specifications: true,
        include_availability: true,
        include_reviews: options.includeReviews || false
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeHMProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_colors: true,
        include_sizes: true,
        include_specifications: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeASOSProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_colors: true,
        include_sizes: true,
        include_availability: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeEtsyProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_shop_info: true,
        include_reviews: options.includeReviews || false,
        include_specifications: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
  private async scrapeZaraProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpParams = {
        url,
        include_colors: true,
        include_sizes: true,
        include_materials: true
      };

      const mcpResult = await this.callBrightDataMCP(config.scraperType, mcpParams, options.timeout);

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
   * Generic scraper for unsupported platforms (fallback)
   */
  private async scrapeGenericProduct(url: string, config: PlatformConfig, options: ScrapeOptions): Promise<FetchResult> {
    try {
      // Use generic web scraping approach for unsupported platforms
      const mcpParams = {
        url,
        extract_product_info: true,
        include_images: options.includeImages !== false
      };

      const mcpResult = await this.callBrightDataMCP('generic_product', mcpParams, options.timeout);

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Generic scraping failed');
      }

      const productData = this.normalizeGenericData(mcpResult.data, url);
      
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
   * Call Bright Data MCP with retry logic
   */
  private async callBrightDataMCP(scraperType: string, params: any, timeout?: number): Promise<MCPResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Bright Data MCP call attempt ${attempt}/${this.maxRetries}`, {
          scraperType,
          url: params.url,
          timeout: timeout || this.defaultTimeout
        });

        // TODO: Replace with actual MCP call when available
        // For now, simulate the call structure
        const result = await this.simulateBrightDataCall(scraperType, params, timeout);
        
        if (result.success) {
          logger.info('Bright Data MCP call successful', { scraperType, attempt });
          return result;
        }

        throw new Error(result.error || 'MCP call failed');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Bright Data MCP call attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: `All ${this.maxRetries} attempts failed. Last error: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Simulate Bright Data call (placeholder until actual MCP integration)
   */
  private async simulateBrightDataCall(scraperType: string, params: any, timeout?: number): Promise<MCPResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock data structure
    return {
      success: true,
      data: {
        title: `Mock Product from ${scraperType}`,
        price: '$29.99',
        currency: 'USD',
        images: ['https://example.com/image1.jpg'],
        brand: 'MockBrand',
        availability: 'in-stock',
        description: 'This is a mock product description',
        specifications: []
      }
    };
  }

  /**
   * Detect country from URL for localized scraping
   */
  private detectCountryFromUrl(url: string): string {
    const urlLower = url.toLowerCase();

    // Amazon country detection
    if (urlLower.includes('amazon.')) {
      if (urlLower.includes('amazon.co.uk')) return 'GB';
      if (urlLower.includes('amazon.de')) return 'DE';
      if (urlLower.includes('amazon.fr')) return 'FR';
      if (urlLower.includes('amazon.co.jp')) return 'JP';
      if (urlLower.includes('amazon.ca')) return 'CA';
      if (urlLower.includes('amazon.com.au')) return 'AU';
      if (urlLower.includes('amazon.in')) return 'IN';
      return 'US'; // Default for amazon.com
    }

    // eBay country detection
    if (urlLower.includes('ebay.')) {
      if (urlLower.includes('ebay.co.uk')) return 'GB';
      if (urlLower.includes('ebay.de')) return 'DE';
      if (urlLower.includes('ebay.fr')) return 'FR';
      if (urlLower.includes('ebay.ca')) return 'CA';
      if (urlLower.includes('ebay.com.au')) return 'AU';
      return 'US';
    }

    // Other platform-specific country detection
    if (urlLower.includes('myntra.com') || urlLower.includes('flipkart.com')) return 'IN';
    if (urlLower.includes('target.com') || urlLower.includes('walmart.com') || urlLower.includes('bestbuy.com')) return 'US';
    
    return 'US'; // Default fallback
  }

  /**
   * Data normalization methods for different platforms
   */
  private normalizeAmazonData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || rawData.product_title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || rawData.price || '0'),
      currency: rawData.currency || 'USD',
      weight: this.parseWeight(rawData.shipping_weight || rawData.item_weight),
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || '', rawData.category),
      availability: this.normalizeAvailability(rawData.is_available || rawData.availability),
      description: rawData.description || undefined,
      variants: this.normalizeVariants(rawData.variations),
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.specifications || undefined
    };
  }

  private normalizeEbayData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || '', rawData.category),
      availability: this.normalizeAvailability(rawData.condition || rawData.availability),
      description: rawData.description || undefined,
      specifications: rawData.shipping_info || undefined
    };
  }

  private normalizeWalmartData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || '', rawData.category),
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.description || undefined,
      specifications: rawData.specifications || undefined
    };
  }

  private normalizeBestBuyData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || '0'),
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || '', rawData.root_category),
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.product_description || undefined,
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.product_specifications || undefined
    };
  }

  private normalizeAEData(rawData: any, url: string): ProductData {
    return {
      title: rawData.product_name || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.price || '0'),
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [rawData.main_image].filter(Boolean),
      brand: rawData.brand || undefined,
      category: 'fashion',
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.description || undefined,
      variants: this.normalizeColorSizeVariants(rawData.color, rawData.size)
    };
  }

  private normalizeMyntraData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || '0'),
      currency: 'INR',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: 'fashion',
      availability: 'in-stock',
      description: rawData.description || undefined,
      specifications: rawData.specifications || undefined
    };
  }

  private normalizeTargetData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || '0'),
      currency: 'USD',
      weight: this.parseWeight(rawData.weight),
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || '', rawData.category),
      availability: this.normalizeAvailability(rawData.availability),
      description: rawData.product_description || undefined,
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.specifications || undefined
    };
  }

  private normalizeHMData(rawData: any, url: string): ProductData {
    return {
      title: rawData.product_name || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.image_urls) ? rawData.image_urls : [],
      brand: rawData.brand || 'H&M',
      category: 'fashion',
      availability: this.normalizeAvailability(rawData.in_stock),
      description: rawData.description || undefined,
      variants: this.normalizeColorSizeVariants(rawData.color, rawData.size),
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count),
      specifications: rawData.specifications || undefined
    };
  }

  private normalizeASOSData(rawData: any, url: string): ProductData {
    return {
      title: rawData.name || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [rawData.image].filter(Boolean),
      brand: rawData.brand || undefined,
      category: 'fashion',
      availability: this.normalizeAvailability(rawData.availability),
      variants: this.normalizeColorSizeVariants(rawData.color, rawData.size)
    };
  }

  private normalizeEtsyData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || 'Unknown Product',
      price: this.parsePrice(rawData.final_price || rawData.initial_price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.seller_shop_name || rawData.seller_name || undefined,
      category: this.inferCategory(rawData.title || '', rawData.category_tree),
      availability: 'in-stock',
      description: rawData.description || undefined,
      reviews: this.normalizeReviews(rawData.rating, rawData.reviews_count_item),
      specifications: rawData.item_details || undefined
    };
  }

  private normalizeZaraData(rawData: any, url: string): ProductData {
    return {
      title: rawData.product_name || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData['image[]']) ? rawData['image[]'] : [],
      brand: 'Zara',
      category: 'fashion',
      availability: this.normalizeAvailability(!rawData.low_on_stock),
      description: rawData.description || undefined,
      variants: this.normalizeColorSizeVariants(rawData.colour || rawData.color, rawData.size)
    };
  }

  private normalizeGenericData(rawData: any, url: string): ProductData {
    return {
      title: rawData.title || rawData.name || 'Unknown Product',
      price: this.parsePrice(rawData.price || '0'),
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      brand: rawData.brand || undefined,
      category: this.inferCategory(rawData.title || rawData.name || ''),
      availability: 'unknown',
      description: rawData.description || undefined
    };
  }

  /**
   * Helper methods for data normalization
   */
  private parsePrice(priceStr: string | number): number {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    
    const cleanPrice = String(priceStr).replace(/[^\d.,]/g, '');
    return parseFloat(cleanPrice) || 0;
  }

  private parseWeight(weightStr?: string): number | undefined {
    if (!weightStr) return undefined;
    
    const weightMatch = String(weightStr).match(/([\d.]+)\s*(kg|lbs|g|oz)?/i);
    if (!weightMatch) return undefined;
    
    const value = parseFloat(weightMatch[1]);
    const unit = weightMatch[2]?.toLowerCase();
    
    // Convert to kg if needed
    switch (unit) {
      case 'lbs': return value * 0.453592;
      case 'g': return value / 1000;
      case 'oz': return value * 0.0283495;
      default: return value; // Assume kg
    }
  }

  private normalizeAvailability(availability: any): 'in-stock' | 'out-of-stock' | 'unknown' {
    if (availability === true || availability === 'true') return 'in-stock';
    if (availability === false || availability === 'false') return 'out-of-stock';
    if (typeof availability === 'string') {
      const avail = availability.toLowerCase();
      if (avail.includes('in stock') || avail.includes('available')) return 'in-stock';
      if (avail.includes('out of stock') || avail.includes('unavailable')) return 'out-of-stock';
    }
    return 'unknown';
  }

  private normalizeVariants(variations?: any[]): Array<{ name: string; options: string[] }> | undefined {
    if (!Array.isArray(variations) || variations.length === 0) return undefined;
    
    return variations.map(v => ({
      name: v.name || 'Variant',
      options: Array.isArray(v.options) ? v.options : [v.color || v.size || 'Default'].filter(Boolean)
    }));
  }

  private normalizeColorSizeVariants(color?: string, size?: string): Array<{ name: string; options: string[] }> | undefined {
    const variants = [];
    
    if (color) {
      variants.push({
        name: 'Color',
        options: Array.isArray(color) ? color : [color]
      });
    }
    
    if (size) {
      variants.push({
        name: 'Size',
        options: Array.isArray(size) ? size : [size]
      });
    }
    
    return variants.length > 0 ? variants : undefined;
  }

  private normalizeReviews(rating?: number | string, count?: number | string): { rating: number; count: number } | undefined {
    const ratingNum = typeof rating === 'string' ? parseFloat(rating) : rating;
    const countNum = typeof count === 'string' ? parseInt(count) : count;
    
    if (ratingNum && countNum) {
      return { rating: ratingNum, count: countNum };
    }
    
    return undefined;
  }

  private inferCategory(title: string, category?: string): string {
    if (category) return category;
    
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('laptop') || titleLower.includes('computer')) return 'electronics';
    if (titleLower.includes('phone') || titleLower.includes('tablet')) return 'electronics';
    if (titleLower.includes('shirt') || titleLower.includes('dress') || titleLower.includes('jeans')) return 'fashion';
    if (titleLower.includes('book')) return 'books';
    if (titleLower.includes('toy') || titleLower.includes('game')) return 'toys';
    if (titleLower.includes('home') || titleLower.includes('furniture')) return 'home';
    
    return 'general';
  }
}

// Export singleton instance
export const productScrapingEngine = new ProductScrapingEngine();