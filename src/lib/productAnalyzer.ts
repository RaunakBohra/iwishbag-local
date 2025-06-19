import { supabase } from "@/integrations/supabase/client";

export interface ProductAnalysis {
  name: string;
  price: number;
  weight: number;
  imageUrl?: string;
  category: string;
  availability: boolean;
  currency: string;
  originalPrice?: number;
  description?: string;
  brand?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingWeight?: number;
  error?: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: ProductAnalysis;
  error?: string;
  source: 'scraping' | 'api' | 'manual';
}

// Supported e-commerce platforms
const SUPPORTED_PLATFORMS = {
  'amazon.com': 'amazon',
  'amazon.co.uk': 'amazon',
  'amazon.de': 'amazon',
  'amazon.fr': 'amazon',
  'amazon.it': 'amazon',
  'amazon.es': 'amazon',
  'amazon.ca': 'amazon',
  'amazon.com.au': 'amazon',
  'ebay.com': 'ebay',
  'ebay.co.uk': 'ebay',
  'ebay.de': 'ebay',
  'walmart.com': 'walmart',
  'target.com': 'target',
  'bestbuy.com': 'bestbuy',
  'newegg.com': 'newegg',
  'aliexpress.com': 'aliexpress',
  'taobao.com': 'taobao',
  'tmall.com': 'tmall',
  'jd.com': 'jd',
  'rakuten.co.jp': 'rakuten',
  'yahoo.co.jp': 'yahoo_japan',
  'mercari.com': 'mercari',
  'etsy.com': 'etsy',
  'shopify.com': 'shopify',
  'woocommerce': 'woocommerce'
};

export class ProductAnalyzer {
  private static instance: ProductAnalyzer;
  private apiKeys: Record<string, string> = {};

  private constructor() {
    // Initialize API keys from environment variables
    // Use import.meta.env for Vite, fallback to empty strings for browser
    this.apiKeys = {
      scraperApi: import.meta.env?.VITE_SCRAPER_API_KEY || '',
      proxyApi: import.meta.env?.VITE_PROXY_API_KEY || '',
      // Add other API keys as needed
    };
  }

  public static getInstance(): ProductAnalyzer {
    if (!ProductAnalyzer.instance) {
      ProductAnalyzer.instance = new ProductAnalyzer();
    }
    return ProductAnalyzer.instance;
  }

  /**
   * Debug method to check API key configuration
   */
  public debugConfig(): { scraperApi: boolean; proxyApi: boolean } {
    return {
      scraperApi: !!this.apiKeys.scraperApi,
      proxyApi: !!this.apiKeys.proxyApi
    };
  }

  /**
   * Test API connectivity
   */
  public async testAPI(): Promise<{ success: boolean; message: string }> {
    if (!this.apiKeys.scraperApi) {
      return { success: false, message: 'No ScraperAPI key configured' };
    }

    try {
      // Test with a simple request
      const response = await fetch('https://api.scraperapi.com/api/v1/account', {
        headers: {
          'Authorization': `Bearer ${this.apiKeys.scraperApi}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          message: `API connected successfully. Credits remaining: ${data.credits || 'Unknown'}` 
        };
      } else {
        return { success: false, message: `API test failed: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `API test failed: ${error}` };
    }
  }

  /**
   * Main method to analyze a product URL
   */
  public async analyzeProduct(url: string, productName?: string): Promise<ProductAnalysis> {
    try {
      // Validate URL
      const validatedUrl = this.validateAndCleanUrl(url);
      if (!validatedUrl) {
        throw new Error('Invalid URL provided');
      }

      // Determine platform
      const platform = this.detectPlatform(validatedUrl);
      if (!platform) {
        throw new Error('Unsupported e-commerce platform');
      }

      // Try different analysis methods in order of preference
      let result: ScrapingResult;

      // 1. Try API-based analysis first (most reliable)
      result = await this.analyzeWithAPI(validatedUrl, platform);
      
      // 2. If API fails, try web scraping
      if (!result.success) {
        result = await this.scrapeProduct(validatedUrl, platform);
      }

      // 3. If scraping fails, try manual analysis
      if (!result.success) {
        result = await this.manualAnalysis(validatedUrl, productName);
      }

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to analyze product');
      }

      // Enhance the data with additional analysis
      const enhancedData = await this.enhanceProductData(result.data, validatedUrl);

      return enhancedData;

    } catch (error) {
      console.error('Product analysis failed:', error);
      throw error;
    }
  }

  /**
   * Validate and clean the URL
   */
  private validateAndCleanUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and clean URL
      const cleanUrl = new URL(urlObj.origin + urlObj.pathname + urlObj.search);
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source', 'affiliate'];
      trackingParams.forEach(param => cleanUrl.searchParams.delete(param));
      
      return cleanUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Detect the e-commerce platform from URL
   */
  private detectPlatform(url: string): string | null {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      for (const [domain, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
        if (hostname.includes(domain)) {
          return platform;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Analyze product using external APIs
   */
  private async analyzeWithAPI(url: string, platform: string): Promise<ScrapingResult> {
    try {
      // Use ScraperAPI or similar service
      if (this.apiKeys.scraperApi) {
        const response = await fetch('https://api.scraperapi.com/api/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.scraperApi}`
          },
          body: JSON.stringify({
            url: url,
            platform: platform,
            extract_rules: {
              name: { selector: 'h1, .product-title, .title' },
              price: { selector: '.price, .product-price, [data-price]' },
              image: { selector: '.product-image img, .main-image img' },
              description: { selector: '.product-description, .description' }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: this.parseAPIResponse(data, platform),
            source: 'api'
          };
        }
      }

      // If no API key, fall back to manual analysis
      return { success: false, error: 'No API key configured', source: 'api' };
    } catch (error) {
      return { success: false, error: 'API analysis failed', source: 'api' };
    }
  }

  /**
   * Scrape product information directly
   */
  private async scrapeProduct(url: string, platform: string): Promise<ScrapingResult> {
    try {
      // Use a headless browser service or proxy service
      if (this.apiKeys.proxyApi) {
        const response = await fetch('https://api.proxyapi.com/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKeys.proxyApi}`
          },
          body: JSON.stringify({
            url: url,
            render_js: true,
            wait_for: '.product-info, .product-details'
          })
        });

        if (response.ok) {
          const html = await response.text();
          const data = this.parseHTML(html, platform);
          
          if (data) {
            return {
              success: true,
              data,
              source: 'scraping'
            };
          }
        }
      }

      // If no API key, fall back to manual analysis
      return { success: false, error: 'No scraping API key configured', source: 'scraping' };
    } catch (error) {
      return { success: false, error: 'Scraping failed', source: 'scraping' };
    }
  }

  /**
   * Manual analysis when automated methods fail
   */
  private async manualAnalysis(url: string, productName?: string): Promise<ScrapingResult> {
    try {
      // Create a manual analysis task for admin review
      const { data, error } = await supabase
        .from('manual_analysis_tasks')
        .insert({
          url: url,
          product_name: productName,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Return a basic structure that needs manual review
      return {
        success: true,
        data: {
          name: productName || 'Product (Manual Review Required)',
          price: 0,
          weight: 0,
          category: 'unknown',
          availability: true,
          currency: 'USD',
          error: 'Requires manual analysis'
        },
        source: 'manual'
      };
    } catch (error) {
      return { success: false, error: 'Manual analysis failed', source: 'manual' };
    }
  }

  /**
   * Parse API response into standardized format
   */
  private parseAPIResponse(data: any, platform: string): ProductAnalysis {
    return {
      name: data.name || 'Unknown Product',
      price: this.extractPrice(data.price),
      weight: this.extractWeight(data.weight, data.dimensions),
      imageUrl: data.image,
      category: this.categorizeProduct(data.name, data.description),
      availability: data.availability !== false,
      currency: data.currency || 'USD',
      originalPrice: data.original_price ? this.extractPrice(data.original_price) : undefined,
      description: data.description,
      brand: data.brand,
      dimensions: data.dimensions,
      shippingWeight: data.shipping_weight
    };
  }

  /**
   * Parse HTML content for product information
   */
  private parseHTML(html: string, platform: string): ProductAnalysis | null {
    // This would use a library like cheerio or jsdom to parse HTML
    // For now, return null to indicate parsing failed
    return null;
  }

  /**
   * Extract and normalize price
   */
  private extractPrice(priceData: any): number {
    if (typeof priceData === 'number') return priceData;
    if (typeof priceData === 'string') {
      const match = priceData.match(/[\d,]+\.?\d*/);
      return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    }
    return 0;
  }

  /**
   * Extract weight from various sources
   */
  private extractWeight(weightData: any, dimensions?: any): number {
    if (typeof weightData === 'number') return weightData;
    if (typeof weightData === 'string') {
      // Parse weight strings like "2.5 lbs", "1.2 kg", etc.
      const match = weightData.match(/(\d+\.?\d*)\s*(lbs?|kg|g|oz)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        // Convert to kg
        switch (unit) {
          case 'lbs':
          case 'lb':
            return value * 0.453592;
          case 'kg':
            return value;
          case 'g':
            return value / 1000;
          case 'oz':
            return value * 0.0283495;
          default:
            return value;
        }
      }
    }
    return 0;
  }

  /**
   * Categorize product based on name and description
   */
  private categorizeProduct(name: string, description?: string): string {
    const text = `${name} ${description || ''}`.toLowerCase();
    
    const categories = {
      electronics: ['phone', 'laptop', 'computer', 'tablet', 'camera', 'tv', 'headphones', 'speaker', 'gaming'],
      clothing: ['shirt', 'dress', 'pants', 'jeans', 'jacket', 'shoes', 'sneakers', 'boots', 'hat', 'cap'],
      home: ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'kitchen', 'bathroom', 'decor'],
      beauty: ['makeup', 'skincare', 'perfume', 'cosmetics', 'beauty', 'hair', 'nail'],
      sports: ['fitness', 'gym', 'sports', 'exercise', 'workout', 'running', 'basketball', 'soccer'],
      toys: ['toy', 'game', 'puzzle', 'doll', 'action figure', 'lego', 'board game'],
      books: ['book', 'novel', 'textbook', 'magazine', 'comic', 'manga'],
      automotive: ['car', 'auto', 'vehicle', 'motorcycle', 'bike', 'tire', 'oil']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Enhance product data with additional analysis
   */
  private async enhanceProductData(data: ProductAnalysis, url: string): Promise<ProductAnalysis> {
    // Add estimated weight if not available
    if (!data.weight || data.weight === 0) {
      data.weight = this.estimateWeight(data.category, data.name);
    }

    // Add estimated dimensions if not available
    if (!data.dimensions) {
      data.dimensions = this.estimateDimensions(data.category, data.weight);
    }

    // Validate and correct data
    data.price = Math.max(0, data.price);
    data.weight = Math.max(0.1, data.weight); // Minimum 100g

    return data;
  }

  /**
   * Estimate weight based on category and product name
   */
  private estimateWeight(category: string, name: string): number {
    const text = name.toLowerCase();
    
    // Category-based estimates
    const categoryEstimates: Record<string, number> = {
      electronics: 0.5, // 500g average
      clothing: 0.3,    // 300g average
      home: 2.0,        // 2kg average
      beauty: 0.2,      // 200g average
      sports: 1.0,      // 1kg average
      toys: 0.4,        // 400g average
      books: 0.6,       // 600g average
      automotive: 5.0,  // 5kg average
      other: 0.5        // 500g default
    };

    let baseWeight = categoryEstimates[category] || 0.5;

    // Adjust based on product name keywords
    if (text.includes('mini') || text.includes('small')) baseWeight *= 0.5;
    if (text.includes('large') || text.includes('big')) baseWeight *= 2.0;
    if (text.includes('heavy') || text.includes('weight')) baseWeight *= 1.5;
    if (text.includes('light') || text.includes('portable')) baseWeight *= 0.7;

    return baseWeight;
  }

  /**
   * Estimate dimensions based on category and weight
   */
  private estimateDimensions(category: string, weight: number): { length: number; width: number; height: number } {
    // Base dimensions in cm
    const baseDimensions: Record<string, { length: number; width: number; height: number }> = {
      electronics: { length: 15, width: 10, height: 5 },
      clothing: { length: 30, width: 20, height: 2 },
      home: { length: 50, width: 40, height: 30 },
      beauty: { length: 10, width: 5, height: 3 },
      sports: { length: 40, width: 30, height: 15 },
      toys: { length: 20, width: 15, height: 10 },
      books: { length: 25, width: 18, height: 3 },
      automotive: { length: 100, width: 50, height: 30 },
      other: { length: 20, width: 15, height: 10 }
    };

    const base = baseDimensions[category] || baseDimensions.other;
    
    // Scale based on weight
    const scale = Math.sqrt(weight / 0.5); // Scale relative to 500g
    
    return {
      length: base.length * scale,
      width: base.width * scale,
      height: base.height * scale
    };
  }
}

// Export singleton instance
export const productAnalyzer = ProductAnalyzer.getInstance(); 