/**
 * Product Data Service  
 * Handles platform-specific scraping and data processing
 * Extracted from BrightDataProductService for better maintainability
 */

import { FetchResult, ProductData } from '../ProductDataFetchService';
import { ScrapeOptions } from './types';
import { ProductSearchService } from './ProductSearchService';
import { ProductValidationService } from './ProductValidationService';

export interface MCPResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ProductDataService {
  private static instance: ProductDataService;
  private searchService: ProductSearchService;
  private validationService: ProductValidationService;

  private constructor() {
    this.searchService = ProductSearchService.getInstance();
    this.validationService = ProductValidationService.getInstance();
  }

  static getInstance(): ProductDataService {
    if (!ProductDataService.instance) {
      ProductDataService.instance = new ProductDataService();
    }
    return ProductDataService.instance;
  }

  /**
   * Scrape product data based on detected platform
   */
  async scrapeProductData(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    const platform = this.searchService.detectPlatform(url);
    
    if (!platform) {
      return {
        success: false,
        error: 'Unsupported platform or invalid URL',
        source: 'scraper'
      };
    }

    try {
      switch (platform) {
        case 'amazon':
          return await this.scrapeAmazonProduct(url, options);
        case 'ebay':
          return await this.scrapeEbayProduct(url, options);
        case 'walmart':
          return await this.scrapeWalmartProduct(url, options);
        case 'bestbuy':
          return await this.scrapeBestBuyProduct(url, options);
        case 'ae':
          return await this.scrapeAEProduct(url, options);
        case 'myntra':
          return await this.scrapeMyntraProduct(url, options);
        case 'target':
          return await this.scrapeTargetProduct(url, options);
        case 'hm':
          return await this.scrapeHMProduct(url, options);
        case 'asos':
          return await this.scrapeASOSProduct(url, options);
        case 'etsy':
          return await this.scrapeEtsyProduct(url, options);
        case 'zara':
          return await this.scrapeZaraProduct(url, options);
        case 'lego':
          return await this.scrapeLegoProduct(url, options);
        case 'hermes':
          return await this.scrapeHermesProduct(url, options);
        case 'flipkart':
          return await this.scrapeFlipkartProduct(url, options);
        case 'toysrus':
          return await this.scrapeToysrusProduct(url, options);
        case 'carters':
          return await this.scrapeCartersProduct(url, options);
        case 'prada':
          return await this.scrapePradaProduct(url, options);
        case 'ysl':
          return await this.scrapeYSLProduct(url, options);
        case 'balenciaga':
          return await this.scrapeBalenciagaProduct(url, options);
        case 'dior':
          return await this.scrapeDiorProduct(url, options);
        case 'chanel':
          return await this.scrapeChanelProduct(url, options);
        default:
          return {
            success: false,
            error: `Platform ${platform} not yet implemented`,
            source: 'scraper'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Scrape Amazon product using Bright Data MCP
   */
  private async scrapeAmazonProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('amazon_product', {
        url,
        include_reviews: options.includeReviews || false,
        include_images: options.includeImages !== false,
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
      const mcpResult = await this.callBrightDataMCP('bestbuy_products', {
        url,
        include_specifications: true,
        include_reviews: options.includeReviews || false
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
        include_variants: options.includeVariants || false
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

  // Additional scraper methods follow the same pattern...

  /**
   * Scrape Myntra product using Bright Data MCP
   */
  private async scrapeMyntraProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('myntra_product', {
        url,
        include_offers: true,
        include_specifications: true
      });

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
  private async scrapeTargetProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('target_product', {
        url,
        include_specifications: true,
        include_reviews: options.includeReviews || false
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
        include_variants: options.includeVariants || false
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
        include_variants: options.includeVariants || false
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
        include_reviews: options.includeReviews || false,
        include_variations: options.includeVariants || false
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
      const mcpResult = await this.callBrightDataMCP('zara_product', {
        url,
        include_variants: options.includeVariants || false
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

  // Additional platform scrapers would continue with the same pattern...

  /**
   * Scrape LEGO product using Bright Data MCP
   */
  private async scrapeLegoProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('lego_product', {
        url,
        include_building_instructions: true
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
   * Scrape Hermès product using Bright Data MCP
   */
  private async scrapeHermesProduct(url: string, options: ScrapeOptions): Promise<FetchResult> {
    try {
      const mcpResult = await this.callBrightDataMCP('hermes_product', {
        url,
        include_materials: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Hermès scraping failed');
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
        error: error instanceof Error ? error.message : 'Hermès scraping failed',
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
        include_offers: true,
        include_specifications: true
      });

      if (!mcpResult.success) {
        throw new Error(mcpResult.error || 'Flipkart scraping failed');
      }

      const productData = this.normalizeFlipkartData(mcpResult.data, url);
      
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
        include_age_recommendations: true
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
        include_size_chart: true
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
        include_materials: true
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
        include_shades: true
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
        include_materials: true
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
        include_fragrance_notes: true
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
        include_variations: options.includeVariants || false
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
   * Call Bright Data MCP with error handling
   */
  private async callBrightDataMCP(scraperType: string, params: any): Promise<MCPResult> {
    try {
      // This would be the actual MCP call
      // For now, returning a mock structure
      console.log(`Mock MCP call: ${scraperType}`, params);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: {
          // Mock data structure
          title: 'Mock Product Title',
          price: 99.99,
          currency: 'USD',
          images: ['https://example.com/image1.jpg'],
          availability: 'In Stock'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP call failed'
      };
    }
  }

  /**
   * Detect country from URL for region-specific scraping
   */
  private detectCountryFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      const countryMappings: Record<string, string> = {
        '.co.uk': 'GB',
        '.de': 'DE',
        '.fr': 'FR',
        '.it': 'IT',
        '.es': 'ES',
        '.ca': 'CA',
        '.com.au': 'AU',
        '.in': 'IN',
        '.co.jp': 'JP',
        '.com.br': 'BR',
        '.com.mx': 'MX'
      };
      
      for (const [domain, country] of Object.entries(countryMappings)) {
        if (hostname.includes(domain)) {
          return country;
        }
      }
      
      return 'US'; // Default
    } catch (error) {
      return 'US';
    }
  }

  // Data normalization methods
  private normalizeAmazonData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      weight: this.parseWeight(rawData.weight || rawData.shipping_weight),
      availability: rawData.availability || 'Unknown',
      rating: rawData.rating ? parseFloat(rawData.rating) : undefined,
      reviewCount: rawData.reviews_count ? parseInt(rawData.reviews_count) : undefined
    };
  }

  private normalizeEbayData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      condition: rawData.condition || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeWalmartData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      model: rawData.model || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeBestBuyData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      originalPrice: rawData.initial_price ? parseFloat(rawData.initial_price) : undefined,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.product_description || rawData.description || '',
      brand: rawData.brand || '',
      model: rawData.model || '',
      sku: rawData.sku || '',
      availability: rawData.availability || 'Unknown',
      rating: rawData.rating ? parseFloat(rawData.rating) : undefined,
      reviewCount: rawData.reviews_count ? parseInt(rawData.reviews_count) : undefined
    };
  }

  // Additional normalization methods for other platforms...
  private normalizeAEData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.product_name || rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      currency: 'USD',
      images: rawData.main_image ? [rawData.main_image] : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      color: rawData.color || '',
      size: rawData.size || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeMyntraData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      currency: 'INR',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeTargetData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      originalPrice: rawData.initial_price ? parseFloat(rawData.initial_price) : undefined,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.product_description || rawData.description || '',
      brand: rawData.brand || '',
      weight: this.parseWeight(rawData.weight),
      availability: rawData.availability || 'Unknown',
      rating: rawData.rating ? parseFloat(rawData.rating) : undefined,
      reviewCount: rawData.reviews_count ? parseInt(rawData.reviews_count) : undefined
    };
  }

  private normalizeHMData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.product_name || rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      originalPrice: rawData.initial_price ? parseFloat(rawData.initial_price) : undefined,
      currency: 'USD',
      images: Array.isArray(rawData.image_urls) ? rawData.image_urls : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      color: rawData.color || '',
      size: rawData.size || '',
      availability: rawData.in_stock ? 'In Stock' : 'Out of Stock'
    };
  }

  private normalizeASOSData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.name || rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: rawData.image ? [rawData.image] : [],
      brand: rawData.brand || '',
      color: rawData.color || '',
      size: rawData.size || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeEtsyData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      originalPrice: rawData.initial_price ? parseFloat(rawData.initial_price) : undefined,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      seller: rawData.seller_name || rawData.seller_shop_name || '',
      rating: rawData.rating ? parseFloat(rawData.rating) : undefined,
      reviewCount: rawData.reviews_count_item ? parseInt(rawData.reviews_count_item) : undefined
    };
  }

  private normalizeZaraData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.product_name || rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData['image[]']) ? rawData['image[]'] : [],
      description: rawData.description || '',
      color: rawData.colour || rawData.color || '',
      size: rawData.size || '',
      sku: rawData.sku || rawData.product_id || '',
      availability: rawData.availability === false ? 'Out of Stock' : 'In Stock'
    };
  }

  private normalizeLegoData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.product_name || rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      sku: rawData.product_code || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeHermesData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      materials: rawData.materials || '',
      color: rawData.color || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeFlipkartData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.final_price || rawData.price) || 0,
      originalPrice: rawData.initial_price ? parseFloat(rawData.initial_price) : undefined,
      currency: 'INR',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      availability: rawData.availability || 'Unknown',
      rating: rawData.rating ? parseFloat(rawData.rating) : undefined,
      reviewCount: rawData.reviews_count ? parseInt(rawData.reviews_count) : undefined
    };
  }

  private normalizeToysrusData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      brand: rawData.brand || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeCartersData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      color: rawData.color || '',
      size: rawData.size || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizePradaData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      materials: rawData.materials || '',
      color: rawData.color || '',
      size: rawData.size || '',
      sku: rawData.product_code || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeYSLData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      shade: rawData.shade || '',
      size: rawData.size || '',
      sku: rawData.product_code || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeBalenciagaData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      materials: rawData.materials || '',
      color: rawData.color || '',
      size: rawData.size || '',
      sku: rawData.product_code || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeDiorData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.title || '',
      price: parseFloat(rawData.price) || 0,
      currency: 'USD',
      images: Array.isArray(rawData.images) ? rawData.images : [],
      description: rawData.description || '',
      shade: rawData.shade || '',
      size: rawData.size || '',
      sku: rawData.product_code || '',
      availability: rawData.availability || 'Unknown'
    };
  }

  private normalizeChanelData(rawData: any, url: string): ProductData {
    return {
      url,
      title: rawData.product_name || rawData.title || '',
      price: parseFloat(rawData.regular_price || rawData.price) || 0,
      currency: rawData.currency || 'USD',
      images: Array.isArray(rawData['image_slider[]']) ? rawData['image_slider[]'] : [rawData.image].filter(Boolean),
      description: rawData.product_description || rawData.description || '',
      brand: rawData.product_brand || '',
      color: rawData.color || '',
      shade: rawData.shade || '',
      sku: rawData.sku || '',
      availability: rawData.stock_availability || 'Unknown'
    };
  }

  /**
   * Parse weight from various string formats
   */
  private parseWeight(weightStr: any): number | undefined {
    if (!weightStr) return undefined;
    
    if (typeof weightStr === 'number') return weightStr;
    
    const str = weightStr.toString().toLowerCase();
    const match = str.match(/(\d+\.?\d*)\s*(kg|g|lb|oz|pound|gram)/);
    
    if (!match) return undefined;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert to kg
    switch (unit) {
      case 'g':
      case 'gram':
        return value * 0.001;
      case 'lb':
      case 'pound':
        return value * 0.453592;
      case 'oz':
        return value * 0.0283495;
      default:
        return value; // Already in kg
    }
  }
}