/**
 * AliExpress Product Scraping Service
 * Integrates with BrightData API to scrape AliExpress product data
 */

export interface AliExpressProductData {
  url: URL;
  product_id: string;
  title: string;
  current_price?: {
    amount: number;
    currency: string;
  };
  original_price?: {
    amount: number;
    currency: string;
  };
  discount_percentage?: string;
  currency: string;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  stock_available?: number;
  main_image?: URL;
  images: URL[];
  store_name?: string;
  store_url?: URL;
  specifications: Array<{
    name: string;
    value: string;
  }>;
  breadcrumb?: string;
  description?: string;
  shipping_info?: string;
  variants?: Array<{
    name: string;
    options: Array<{
      text: string;
      value: string;
      available: boolean;
    }>;
  }>;
  scraped_at: string;
  source: string;
}

export interface AliExpressScrapingResult {
  success: boolean;
  data?: AliExpressProductData;
  error?: string;
  response_time_ms?: number;
}

import { brightDataConfig, isConfigured } from '@/config/brightdata';

class AliExpressScrapingService {
  private cache: Map<string, { data: AliExpressScrapingResult; timestamp: number }> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    if (!isConfigured()) {
      console.warn('AliExpressScrapingService: No BrightData API token found');
    }
  }

  /**
   * Scrape AliExpress product data
   */
  async scrapeProduct(url: string): Promise<AliExpressScrapingResult> {
    if (!isConfigured()) {
      return {
        success: false,
        error: 'BrightData API token not configured'
      };
    }

    // Check cache first
    const cached = this.getFromCache(url);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Validate AliExpress URL
      if (!this.isValidAliExpressUrl(url)) {
        return {
          success: false,
          error: 'Invalid AliExpress URL'
        };
      }

      const payload = [{
        url: url
      }];

      const response = await fetch(`${brightDataConfig.baseUrl}?queue_next=1&collector=${brightDataConfig.collectors.aliexpress}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${brightDataConfig.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      const responseTime = Date.now() - startTime;

      // Process the response
      const result = this.processScrapingResult(rawData, responseTime);
      
      // Cache the result if successful
      if (result.success) {
        this.saveToCache(url, result);
      }

      return result;

    } catch (error) {
      console.error('AliExpress scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Validate if URL is from AliExpress
   */
  private isValidAliExpressUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validDomains = [
        'aliexpress.com',
        'aliexpress.us',
        'es.aliexpress.com',
        'fr.aliexpress.com',
        'de.aliexpress.com',
        'pt.aliexpress.com',
        'it.aliexpress.com',
        'nl.aliexpress.com',
        'ja.aliexpress.com',
        'ko.aliexpress.com',
        'tr.aliexpress.com',
        'ru.aliexpress.com'
      ];
      
      return validDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Process raw scraping result into structured data
   */
  private processScrapingResult(rawData: any, responseTimeMs: number): AliExpressScrapingResult {
    try {
      // Handle different response formats
      let productData: any;
      
      if (Array.isArray(rawData)) {
        productData = rawData[0];
      } else if (rawData.data && Array.isArray(rawData.data)) {
        productData = rawData.data[0];
      } else if (rawData.result) {
        productData = rawData.result;
      } else {
        productData = rawData;
      }

      if (!productData || !productData.title) {
        return {
          success: false,
          error: 'No product data found in response',
          response_time_ms: responseTimeMs
        };
      }

      // Convert URLs from strings to URL objects safely
      const safeUrlConvert = (urlStr: string | undefined): URL | undefined => {
        if (!urlStr) return undefined;
        try {
          return new URL(urlStr);
        } catch {
          return undefined;
        }
      };

      const normalizedData: AliExpressProductData = {
        url: new URL(productData.url || ''),
        product_id: productData.product_id || '',
        title: productData.title || '',
        current_price: productData.current_price ? {
          amount: productData.current_price.amount || 0,
          currency: productData.current_price.currency || productData.currency || 'USD'
        } : undefined,
        original_price: productData.original_price ? {
          amount: productData.original_price.amount || 0,
          currency: productData.original_price.currency || productData.currency || 'USD'
        } : undefined,
        discount_percentage: productData.discount_percentage || '',
        currency: productData.currency || 'USD',
        rating: productData.rating || null,
        review_count: productData.review_count || null,
        sold_count: productData.sold_count || null,
        stock_available: productData.stock_available || null,
        main_image: safeUrlConvert(productData.main_image?.href || productData.main_image),
        images: (productData.images || []).map((img: any) => {
          const imgUrl = img?.href || img;
          return safeUrlConvert(imgUrl);
        }).filter(Boolean),
        store_name: productData.store_name || '',
        store_url: safeUrlConvert(productData.store_url?.href || productData.store_url),
        specifications: productData.specifications || [],
        breadcrumb: productData.breadcrumb || '',
        description: productData.description || '',
        shipping_info: productData.shipping_info || '',
        variants: productData.variants || [],
        scraped_at: productData.scraped_at || new Date().toISOString(),
        source: 'aliexpress'
      };

      return {
        success: true,
        data: normalizedData,
        response_time_ms: responseTimeMs
      };

    } catch (error) {
      console.error('Error processing scraping result:', error);
      return {
        success: false,
        error: 'Failed to process scraping result',
        response_time_ms: responseTimeMs
      };
    }
  }

  /**
   * Convert AliExpress data to ProductData format for compatibility
   */
  convertToProductData(aliexpressData: AliExpressProductData): {
    title?: string;
    price?: number;
    currency?: string;
    weight?: number;
    images?: string[];
    availability?: 'in-stock' | 'out-of-stock' | 'unknown';
    variants?: Array<{
      name: string;
      options: string[];
    }>;
    description?: string;
    brand?: string;
    category?: string;
  } {
    return {
      title: aliexpressData.title,
      price: aliexpressData.current_price?.amount || 0,
      currency: aliexpressData.currency,
      weight: this.estimateWeightFromSpecs(aliexpressData.specifications),
      images: aliexpressData.images.map(img => img.href),
      availability: aliexpressData.stock_available && aliexpressData.stock_available > 0 ? 'in-stock' : 'unknown',
      variants: aliexpressData.variants?.map(v => ({
        name: v.name,
        options: v.options.filter(opt => opt.available).map(opt => opt.text)
      })) || [],
      description: aliexpressData.description,
      brand: this.extractBrandFromTitle(aliexpressData.title),
      category: this.inferCategoryFromBreadcrumb(aliexpressData.breadcrumb)
    };
  }

  /**
   * Estimate weight from product specifications
   */
  private estimateWeightFromSpecs(specs: Array<{name: string; value: string}>): number | undefined {
    for (const spec of specs) {
      if (spec.name.toLowerCase().includes('weight') && spec.value) {
        const weightMatch = spec.value.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|oz|pounds?|grams?)/i);
        if (weightMatch) {
          let weight = parseFloat(weightMatch[1]);
          const unit = weightMatch[2].toLowerCase();
          
          // Convert to kg
          if (unit.startsWith('g')) weight = weight / 1000;
          else if (unit.startsWith('lb') || unit.startsWith('pound')) weight = weight * 0.453592;
          else if (unit.startsWith('oz')) weight = weight * 0.0283495;
          
          return Math.round(weight * 1000) / 1000; // Round to 3 decimals
        }
      }
    }
    return undefined;
  }

  /**
   * Extract brand from product title
   */
  private extractBrandFromTitle(title: string): string | undefined {
    // Common patterns for brand extraction
    const brandPatterns = [
      /^([A-Z][a-zA-Z\s&]+?)\s+[-\s]/,  // Brand at start followed by dash
      /^([A-Z][a-zA-Z]{2,})\s+/,        // Capitalized word at start
    ];

    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Infer category from breadcrumb
   */
  private inferCategoryFromBreadcrumb(breadcrumb?: string): string | undefined {
    if (!breadcrumb) return undefined;

    const categoryMappings: Record<string, string> = {
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
    };

    const lowerBreadcrumb = breadcrumb.toLowerCase();
    for (const [key, category] of Object.entries(categoryMappings)) {
      if (lowerBreadcrumb.includes(key)) {
        return category;
      }
    }

    return undefined;
  }

  /**
   * Cache management
   */
  private getFromCache(url: string): AliExpressScrapingResult | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private saveToCache(url: string, result: AliExpressScrapingResult): void {
    this.cache.set(url, {
      data: result,
      timestamp: Date.now()
    });
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      configured: isConfigured(),
      collectorId: brightDataConfig.collectors.aliexpress
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const aliExpressScrapingService = new AliExpressScrapingService();