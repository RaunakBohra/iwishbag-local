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
  // Amazon-specific fields
  platform?: string;
  averageRating?: number;
  totalReviews?: number;
  featureBullets?: string[];
  shippingPrice?: string;
  shippingTime?: string;
  // eBay-specific fields
  condition?: string;
  seller?: string;
  location?: string;
  shippingCost?: number;
  shippingCurrency?: string;
  availableQuantity?: string;
  soldItems?: string;
  estimatedDeliveryMin?: string;
  estimatedDeliveryMax?: string;
  returnPolicy?: string;
  sellerReviews?: number;
  sellerRating?: string;
  itemSpecifics?: Array<{label: string; value: string}>;
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
  'amazon.in': 'amazon',
  'amazon.co.jp': 'amazon',
  'amazon.com.br': 'amazon',
  'amazon.com.mx': 'amazon',
  'amazon.nl': 'amazon',
  'amazon.se': 'amazon',
  'amazon.pl': 'amazon',
  'amazon.sg': 'amazon',
  'amazon.ae': 'amazon',
  'amazon.sa': 'amazon',
  'amazon.eg': 'amazon',
  'amazon.com.tr': 'amazon',
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

  private constructor() {
    // No API keys needed in browser - handled by Edge Function
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
      scraperApi: true, // Handled by Edge Function
      proxyApi: false   // Not needed
    };
  }

  /**
   * Test API connectivity
   */
  public async testAPI(): Promise<{ success: boolean; message: string }> {
    try {
      // Test the Edge Function
      const response = await supabase.functions.invoke('product-analyzer', {
        body: { url: 'https://www.amazon.com/dp/B08N5WRWNW', productName: 'Test Product' }
      });

      if (response.error) {
        return { success: false, message: `Edge Function error: ${response.error.message}` };
      }

      return { 
        success: true, 
        message: 'Edge Function connected successfully. ScraperAPI integration working.' 
      };
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
        throw new Error('Invalid URL provided. Please enter a valid product URL.');
      }

      // Determine platform
      const platform = this.detectPlatform(validatedUrl);
      if (!platform) {
        const hostname = new URL(validatedUrl).hostname;
        throw new Error(`Unsupported e-commerce platform: ${hostname}. Currently supported: Amazon, eBay, Walmart, Target, Best Buy, Newegg, AliExpress, Taobao, Tmall, JD, Rakuten, Yahoo Japan, Mercari, Etsy, and Shopify stores.`);
      }

      // Use Edge Function for analysis
      const { data, error } = await supabase.functions.invoke('product-analyzer', {
        body: { url: validatedUrl, productName }
      });

      if (error) {
        throw new Error(`Analysis failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No analysis data returned');
      }

      return data as ProductAnalysis;

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
}

// Export singleton instance
export const productAnalyzer = ProductAnalyzer.getInstance(); 