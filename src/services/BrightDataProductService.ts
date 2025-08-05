/**
 * Bright Data Product Service
 * Enhanced product scraping using Bright Data MCP tools
 * Supports Amazon, eBay, Walmart, Best Buy, Etsy, and more
 */

import { ProductData, FetchResult } from './ProductDataFetchService';

export interface BrightDataConfig {
  apiToken: string;
  cacheTimeout?: number;
}

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  enhanceWithAI?: boolean;
}

/**
 * Platform-specific scraping configurations
 */
const PLATFORM_CONFIGS = {
  amazon: {
    scraperType: 'amazon_product',
    fields: ['title', 'price', 'currency', 'images', 'weight', 'brand', 'availability', 'rating', 'reviews_count'],
    weightSelectors: ['shipping_weight', 'item_weight', 'package_weight'],
    currencyMap: { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY' }
  },
  ebay: {
    scraperType: 'ebay_product',
    fields: ['title', 'price', 'currency', 'images', 'condition', 'shipping'],
    currencyDetection: true
  },
  walmart: {
    scraperType: 'walmart_product',
    fields: ['title', 'price', 'images', 'brand', 'model', 'specifications'],
    defaultCurrency: 'USD'
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
    }
  },
  etsy: {
    scraperType: 'etsy_product',
    fields: ['title', 'price', 'currency', 'images', 'shop_name', 'variations'],
    customizations: true
  },
  zara: {
    scraperType: 'zara_product',
    fields: ['title', 'price', 'currency', 'images', 'sizes', 'colors'],
    fashionFocus: true
  },
  myntra: {
    scraperType: 'myntra_product',
    fields: ['title', 'final_price', 'currency', 'images', 'brand', 'specifications', 'offers'],
    fashionFocus: true,
    defaultCurrency: 'INR'
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
    }
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
    }
  },
  flipkart: {
    scraperType: 'flipkart_product',
    fields: ['title', 'final_price', 'currency', 'brand', 'specifications', 'highlights', 'rating'],
    defaultCurrency: 'INR',
    fallbackToMarkdown: true
  }
};

class BrightDataProductService {
  private cache: Map<string, { data: FetchResult; timestamp: number }> = new Map();
  private cacheTimeout: number;

  constructor(private config: BrightDataConfig) {
    this.cacheTimeout = config.cacheTimeout || 30 * 60 * 1000; // 30 minutes default
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
        case 'etsy':
          result = await this.scrapeEtsyProduct(url, options);
          break;
        case 'zara':
          result = await this.scrapeZaraProduct(url, options);
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
        case 'flipkart':
          result = await this.scrapeFlipkartProduct(url, options);
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
   * Scrape Etsy product using Bright Data MCP
   */
  private async scrapeEtsyProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('etsy_product', {
        url,
        include_variations: options.includeVariants !== false,
        include_shop_info: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Etsy scraping failed');
      }

      const productData = this.normalizeEtsyData(mcpResult.data);
      
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
      const mcpResult = await this.callBrightDataMCP('zara_product', {
        url,
        include_sizes: true,
        include_colors: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Zara scraping failed');
      }

      const productData = this.normalizeZaraData(mcpResult.data);
      
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
      case 'etsy_product':
        return await mcpBrightDataBridge.scrapeEtsyProduct(params.url, params);
      case 'zara_product':
        return await mcpBrightDataBridge.scrapeZaraProduct(params.url, params);
      case 'myntra_product':
        return await mcpBrightDataBridge.scrapeMyntraProduct(params.url, params);
      case 'target_product':
        return await mcpBrightDataBridge.scrapeTargetProduct(params.url, params);
      case 'hm_product':
        return await mcpBrightDataBridge.scrapeHMProduct(params.url, params);
      case 'asos_product':
        return await mcpBrightDataBridge.scrapeASOSProduct(params.url, params);
      case 'flipkart_product':
        return await mcpBrightDataBridge.scrapeFlipkartProduct(params.url, params);
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
    if (urlLower.includes('etsy.com')) return 'etsy';
    if (urlLower.includes('zara.com')) return 'zara';
    if (urlLower.includes('myntra.com')) return 'myntra';
    if (urlLower.includes('target.com')) return 'target';
    if (urlLower.includes('hm.com')) return 'hm';
    if (urlLower.includes('asos.com')) return 'asos';
    if (urlLower.includes('flipkart.com')) return 'flipkart';
    
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
    
    // Zara country detection
    if (urlLower.includes('zara.com')) {
      if (urlLower.includes('/us/')) return 'US';
      if (urlLower.includes('/gb/')) return 'GB';
      if (urlLower.includes('/in/')) return 'IN';
      if (urlLower.includes('/ca/')) return 'CA';
      if (urlLower.includes('/au/')) return 'AU';
      if (urlLower.includes('/de/')) return 'DE';
      if (urlLower.includes('/fr/')) return 'FR';
      if (urlLower.includes('/es/')) return 'ES';
      if (urlLower.includes('/it/')) return 'IT';
      return 'ES'; // Zara default (Spanish company)
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
      'ebay.com',       // eBay US (primary domain)
      'costco.com',     // Costco US
      'homedepot.com',  // Home Depot US
      'lowes.com'       // Lowe's US
    ];
    
    // International marketplaces that use metric system (kg)
    const internationalMarketplaces = [
      'hm.com',         // H&M (Swedish, uses metric)
      'zara.com',       // Zara (Spanish, uses metric)
      'myntra.com',     // Myntra (Indian, uses metric)
      'flipkart.com',   // Flipkart (Indian, uses metric)
      'amazon.co.uk',   // Amazon UK
      'amazon.de',      // Amazon Germany
      'amazon.fr',      // Amazon France
      'amazon.co.jp',   // Amazon Japan
      'amazon.com.au',  // Amazon Australia
      'etsy.com'        // Etsy (international, primarily metric)
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