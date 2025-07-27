/**
 * Product Data Fetch Service
 * Fetches product information from various e-commerce websites
 */

export interface ProductData {
  title?: string;
  price?: number;
  currency?: string;
  weight?: number;
  weight_value?: number;
  weight_unit?: string;
  weight_raw?: string;
  images?: string[];
  availability?: 'in-stock' | 'out-of-stock' | 'unknown';
  variants?: ProductVariant[];
  description?: string;
  brand?: string;
  category?: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface FetchResult {
  success: boolean;
  data?: ProductData;
  error?: string;
  source: 'api' | 'scraper' | 'mock';
}

// Mock data for common products (fallback when API fails)
const MOCK_PRODUCT_DATA: Record<string, ProductData> = {
  // Amazon products
  'B08N5WRWNW': {
    title: 'Echo Dot (4th Gen) Smart speaker with Alexa',
    price: 49.99,
    currency: 'USD',
    weight: 0.34,
    category: 'electronics',
    brand: 'Amazon',
    availability: 'in-stock'
  },
  'B09G9BL5CP': {
    title: 'Fire TV Stick 4K Max streaming device',
    price: 54.99,
    currency: 'USD',
    weight: 0.48,
    category: 'electronics',
    brand: 'Amazon',
    availability: 'in-stock'
  },
  // Common electronics
  'iphone': {
    title: 'Apple iPhone 15 Pro',
    price: 999.00,
    currency: 'USD',
    weight: 0.22,
    category: 'electronics',
    brand: 'Apple',
    availability: 'in-stock'
  },
  'laptop': {
    title: 'Dell XPS 13 Laptop',
    price: 1299.00,
    currency: 'USD',
    weight: 1.27,
    category: 'electronics',
    brand: 'Dell',
    availability: 'in-stock'
  },
  // Fashion items
  'nike-shoes': {
    title: 'Nike Air Max 270',
    price: 150.00,
    currency: 'USD',
    weight: 0.8,
    category: 'footwear',
    brand: 'Nike',
    availability: 'in-stock',
    variants: [
      { name: 'Size', options: ['US 8', 'US 9', 'US 10', 'US 11'] },
      { name: 'Color', options: ['Black', 'White', 'Blue'] }
    ]
  }
};

// Product patterns for different sites
const PRODUCT_PATTERNS = {
  amazon: {
    asinPattern: /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/,
    titleSelector: '#productTitle',
    priceSelector: '.a-price-whole',
    weightPattern: /(\d+(?:\.\d+)?)\s*(?:kg|pounds?|lbs?|ounces?|oz)/i
  },
  flipkart: {
    idPattern: /\/p\/([a-zA-Z0-9]+)/,
    titleSelector: '.B_NuCI',
    priceSelector: '._30jeq3',
  },
  ebay: {
    idPattern: /\/itm\/(\d+)/,
    titleSelector: '.it-ttl',
    priceSelector: '.prcIsum',
  }
};

class ProductDataFetchService {
  private apiKey?: string;
  private cache: Map<string, { data: FetchResult; timestamp: number }> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Main method to fetch product data from URL
   */
  async fetchProductData(url: string): Promise<FetchResult> {
    try {
      // Check cache first
      const cached = this.getFromCache(url);
      if (cached) return cached;

      // Extract product ID and determine site
      const siteInfo = this.detectSite(url);
      if (!siteInfo) {
        return {
          success: false,
          error: 'Unsupported website',
          source: 'api'
        };
      }

      // Try different methods in order
      let result: FetchResult;

      // 1. Try API method (if available)
      if (this.apiKey && siteInfo.site === 'amazon') {
        result = await this.fetchFromAPI(siteInfo.site, siteInfo.productId);
        if (result.success) {
          this.saveToCache(url, result);
          return result;
        }
      }

      // 2. Try web scraping via server/worker
      result = await this.fetchFromScraper(url, siteInfo);
      if (result.success) {
        this.saveToCache(url, result);
        return result;
      }

      // 3. Fall back to mock data
      result = this.fetchFromMockData(siteInfo.productId, url);
      this.saveToCache(url, result);
      return result;

    } catch (error) {
      console.error('Error fetching product data:', error);
      return {
        success: false,
        error: 'Failed to fetch product data',
        source: 'api'
      };
    }
  }

  /**
   * Detect which e-commerce site the URL is from
   */
  private detectSite(url: string): { site: string; productId: string } | null {
    const urlLower = url.toLowerCase();

    // Amazon
    if (urlLower.includes('amazon.')) {
      const match = url.match(PRODUCT_PATTERNS.amazon.asinPattern);
      if (match) {
        return { site: 'amazon', productId: match[1] };
      }
    }

    // Flipkart
    if (urlLower.includes('flipkart.com')) {
      const match = url.match(PRODUCT_PATTERNS.flipkart.idPattern);
      if (match) {
        return { site: 'flipkart', productId: match[1] };
      }
    }

    // eBay
    if (urlLower.includes('ebay.')) {
      const match = url.match(PRODUCT_PATTERNS.ebay.idPattern);
      if (match) {
        return { site: 'ebay', productId: match[1] };
      }
    }

    // Nike
    if (urlLower.includes('nike.com')) {
      return { site: 'nike', productId: 'nike-shoes' }; // Mock for now
    }

    return null;
  }

  /**
   * Fetch from API (Amazon Product API, etc.)
   */
  private async fetchFromAPI(site: string, productId: string): Promise<FetchResult> {
    // This would integrate with actual APIs
    // For now, return not implemented
    return {
      success: false,
      error: 'API not implemented',
      source: 'api'
    };
  }

  /**
   * Fetch via web scraping (through a server/worker)
   */
  private async fetchFromScraper(url: string, siteInfo: { site: string; productId: string }): Promise<FetchResult> {
    try {
      // Get the Supabase URL from environment or use default
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      // Call Supabase Edge Function (MCP-powered for better results)
      const response = await fetch(`${supabaseUrl}/functions/v1/scrape-product`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          url, 
          website_domain: siteInfo.site,
          test: false,
          demo_mode: true // Enable demo mode for unauthenticated access
        })
      });

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          success: true,
          data: this.normalizeProductData(result.data),
          source: 'scraper'
        };
      } else {
        throw new Error(result.error || 'Failed to scrape product');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      return {
        success: false,
        error: 'Scraping failed',
        source: 'scraper'
      };
    }
  }

  /**
   * Fetch from mock data (fallback)
   */
  private fetchFromMockData(productId: string, url: string): FetchResult {
    // Check if we have mock data for this product ID
    let mockData = MOCK_PRODUCT_DATA[productId];

    // If not, check URL patterns
    if (!mockData) {
      const urlLower = url.toLowerCase();
      if (urlLower.includes('iphone')) {
        mockData = MOCK_PRODUCT_DATA['iphone'];
      } else if (urlLower.includes('laptop') || urlLower.includes('dell')) {
        mockData = MOCK_PRODUCT_DATA['laptop'];
      } else if (urlLower.includes('nike') || urlLower.includes('shoes')) {
        mockData = MOCK_PRODUCT_DATA['nike-shoes'];
      }
    }

    if (mockData) {
      return {
        success: true,
        data: mockData,
        source: 'mock'
      };
    }

    return {
      success: false,
      error: 'No data available',
      source: 'mock'
    };
  }

  /**
   * Normalize product data from different sources
   */
  private normalizeProductData(rawData: any): ProductData {
    const normalized: ProductData = {};

    // Title
    normalized.title = rawData.title || rawData.name || rawData.productTitle;

    // Price
    if (rawData.price) {
      if (typeof rawData.price === 'string') {
        // Extract number from string like "$49.99" or "₹1,299"
        const priceMatch = rawData.price.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          normalized.price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      } else {
        normalized.price = rawData.price;
      }
    }

    // Currency - prefer rawData.currency if available
    if (rawData.currency) {
      normalized.currency = rawData.currency;
    } else if (rawData.price) {
      normalized.currency = this.detectCurrency(rawData.price);
    } else {
      normalized.currency = 'USD';
    }

    // Weight - handle both old and new formats
    if (rawData.weight_value !== undefined && rawData.weight_unit) {
      // New format with separate value and unit
      normalized.weight = rawData.weight; // Already in kg for backward compatibility
      normalized.weight_value = rawData.weight_value;
      normalized.weight_unit = rawData.weight_unit;
      normalized.weight_raw = rawData.weight_raw;
    } else if (rawData.weight) {
      // Old format - single weight field
      if (typeof rawData.weight === 'string') {
        const weightMatch = rawData.weight.match(/(\d+(?:\.\d+)?)/);
        if (weightMatch) {
          normalized.weight = parseFloat(weightMatch[1]);
          // Convert to kg if needed
          if (rawData.weight.toLowerCase().includes('lb') || rawData.weight.toLowerCase().includes('pound')) {
            normalized.weight = normalized.weight * 0.453592; // lbs to kg
          } else if (rawData.weight.toLowerCase().includes('oz') || rawData.weight.toLowerCase().includes('ounce')) {
            normalized.weight = normalized.weight * 0.0283495; // oz to kg
          }
        }
      } else {
        normalized.weight = rawData.weight;
      }
    }

    // Other fields
    normalized.brand = rawData.brand || rawData.manufacturer;
    normalized.category = rawData.category;
    normalized.availability = rawData.availability || 'unknown';
    normalized.images = rawData.images || [];
    normalized.variants = rawData.variants || [];

    return normalized;
  }

  /**
   * Detect currency from price string or number
   */
  private detectCurrency(priceStr: string | number): string {
    if (!priceStr) return 'USD';
    
    // Convert number to string if needed
    const priceString = typeof priceStr === 'number' ? priceStr.toString() : priceStr;
    
    if (priceString.includes('$')) return 'USD';
    if (priceString.includes('₹')) return 'INR';
    if (priceString.includes('£')) return 'GBP';
    if (priceString.includes('€')) return 'EUR';
    if (priceString.includes('¥')) return 'JPY';
    
    return 'USD';
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

  /**
   * Extract ASIN from Amazon URL
   */
  extractAmazonASIN(url: string): string | null {
    const match = url.match(PRODUCT_PATTERNS.amazon.asinPattern);
    return match ? match[1] : null;
  }

  /**
   * Get weight estimation based on category
   */
  estimateWeight(category: string): number {
    const estimates: Record<string, number> = {
      'electronics-phone': 0.2,
      'electronics-laptop': 1.5,
      'electronics-tablet': 0.5,
      'fashion-shirt': 0.3,
      'fashion-jeans': 0.6,
      'footwear': 0.8,
      'books': 0.5,
      'toys': 0.4,
      'home-decor': 1.0
    };

    return estimates[category] || 0.5;
  }
}

// Export singleton instance
export const productDataFetchService = new ProductDataFetchService();