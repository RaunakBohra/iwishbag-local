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
    scraperType: 'bestbuy_product',
    fields: ['title', 'price', 'images', 'brand', 'model', 'specifications', 'availability'],
    defaultCurrency: 'USD'
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

      const productData = this.normalizeAmazonData(mcpResult.data);
      
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

      const productData = this.normalizeEbayData(mcpResult.data);
      
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

      const productData = this.normalizeWalmartData(mcpResult.data);
      
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
        include_availability: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Best Buy scraping failed');
      }

      const productData = this.normalizeBestBuyData(mcpResult.data);
      
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
    
    return null;
  }

  /**
   * Detect country from Amazon URL
   */
  private detectCountryFromUrl(url: string): string {
    if (url.includes('amazon.co.uk')) return 'GB';
    if (url.includes('amazon.de')) return 'DE';
    if (url.includes('amazon.fr')) return 'FR';
    if (url.includes('amazon.ca')) return 'CA';
    if (url.includes('amazon.com.au')) return 'AU';
    if (url.includes('amazon.co.jp')) return 'JP';
    return 'US'; // Default
  }

  /**
   * Data normalization methods for real Bright Data responses
   */
  private normalizeAmazonData(rawData: any): ProductData {
    // Handle real Bright Data Amazon response format
    return {
      title: rawData.title || rawData.product_title,
      price: rawData.final_price || rawData.initial_price || this.parsePrice(rawData.price),
      currency: rawData.currency || 'USD',
      weight: this.extractWeightFromAmazon(rawData),
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
  private extractWeightFromAmazon(rawData: any): number | undefined {
    // Try multiple weight sources from Amazon
    if (rawData.shipping_weight) {
      return this.parseWeight(rawData.shipping_weight);
    }
    if (rawData.item_weight) {
      return this.parseWeight(rawData.item_weight);
    }
    if (rawData.package_weight) {
      return this.parseWeight(rawData.package_weight);
    }
    // Estimate based on category if no weight available
    return this.estimateWeight(rawData.title || '', this.inferCategory(rawData.title || ''));
  }

  private normalizeEbayData(rawData: any): ProductData {
    return {
      title: rawData.title,
      price: this.parsePrice(rawData.price),
      currency: rawData.currency || 'USD',
      images: rawData.images || [],
      brand: rawData.brand,
      category: this.inferCategory(rawData.title),
      availability: rawData.quantity > 0 ? 'in-stock' : 'out-of-stock'
    };
  }

  private normalizeWalmartData(rawData: any): ProductData {
    return {
      title: rawData.title || rawData.name,
      price: this.parsePrice(rawData.price),
      currency: 'USD',
      weight: this.parseWeight(rawData.shipping_weight),
      images: rawData.images || [],
      brand: rawData.brand,
      category: rawData.category || this.inferCategory(rawData.title),
      availability: rawData.available ? 'in-stock' : 'out-of-stock'
    };
  }

  private normalizeBestBuyData(rawData: any): ProductData {
    return {
      title: rawData.title || rawData.name,
      price: this.parsePrice(rawData.price),
      currency: 'USD',
      weight: this.parseWeight(rawData.weight),
      images: rawData.images || [],
      brand: rawData.brand || rawData.manufacturer,
      category: rawData.category || 'electronics',
      availability: rawData.availability === 'Available' ? 'in-stock' : 'out-of-stock'
    };
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

  private parseWeight(weightStr: any): number | undefined {
    if (typeof weightStr === 'number') return weightStr;
    if (typeof weightStr === 'string') {
      const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(kg|lb|lbs|pound|pounds|oz|ounce|ounces)/i);
      if (match) {
        let weight = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        // Convert to kg
        if (unit.includes('lb') || unit.includes('pound')) {
          weight *= 0.453592;
        } else if (unit.includes('oz') || unit.includes('ounce')) {
          weight *= 0.0283495;
        }
        
        return weight;
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