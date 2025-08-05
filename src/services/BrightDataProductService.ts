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
        include_availability: true,
        include_reviews: options.includeReviews !== false,
        include_images: options.includeImages !== false,
        include_highlights: true,
        include_variations: options.includeVariants !== false
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

      const productData = this.normalizeTargetData(mcpResult.data);
      
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
    if (urlLower.includes('flipkart.com')) return 'flipkart';
    
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
        weight = this.extractWeightFromBestBuySpecs(rawData.product_specifications);
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
        variants: variants,
        rating: typeof rawData.rating === 'number' ? rawData.rating : undefined,
        reviewsCount: typeof rawData.reviews_count === 'number' ? rawData.reviews_count : undefined,
        // Add Best Buy specific fields
        originalPrice: this.parsePrice(initialPrice),
        discount: discountInfo,
        sku: rawData.sku,
        model: rawData.model,
        upc: rawData.upc
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

  private normalizeTargetData(rawData: any): ProductData {
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
        weight = this.extractWeightFromTargetSpecs(rawData.specifications || rawData.product_specifications);
        
        // Fallback to weight field directly
        if (!weight && rawData.weight) {
          weight = this.parseWeight(rawData.weight);
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
        variants: variants,
        rating: typeof rawData.rating === 'number' ? rawData.rating : undefined,
        reviewsCount: typeof rawData.reviews_count === 'number' ? rawData.reviews_count : undefined,
        // Add Target specific fields
        originalPrice: this.parsePrice(initialPrice),
        discount: discountInfo,
        sku: rawData.sku,
        model: rawData.model
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
  private extractWeightFromBestBuySpecs(specifications: any[]): number | undefined {
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
        const weight = this.parseWeight(weightSpec.specification_value);
        if (weight !== undefined) {
          console.log(`🏋️ Found weight from ${priorityName}: ${weight} kg`);
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
      const weight = this.parseWeight(anyWeightSpec.specification_value);
      if (weight !== undefined) {
        console.log(`🏋️ Found weight from ${anyWeightSpec.specification_name}: ${weight} kg`);
        return weight;
      }
    }
    
    // If no weight found, try to estimate based on category and other specs
    return this.estimateWeightFromBestBuySpecs(specifications);
  }

  /**
   * Estimate weight based on Best Buy product specifications when actual weight not available
   */
  private estimateWeightFromBestBuySpecs(specifications: any[]): number | undefined {
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
  private extractWeightFromTargetSpecs(specifications: any[]): number | undefined {
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
        const weight = this.parseWeight(weightSpec.specification_value);
        if (weight !== undefined) {
          console.log(`🏋️ Found Target weight from ${priorityName}: ${weight} kg`);
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
      const weight = this.parseWeight(anyWeightSpec.specification_value);
      if (weight !== undefined) {
        console.log(`🏋️ Found Target weight from ${anyWeightSpec.specification_name}: ${weight} kg`);
        return weight;
      }
    }
    
    return undefined;
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