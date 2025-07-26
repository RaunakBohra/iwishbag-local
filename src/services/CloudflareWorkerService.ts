/**
 * Cloudflare Worker API Service
 * 
 * Handles communication with edge API endpoints
 * Provides type-safe interfaces for Worker APIs
 */

import { logger } from '@/lib/logger';

// Base Worker URL (can be customized per environment)
const WORKER_BASE_URL = import.meta.env.VITE_WORKER_API_URL || 
  'https://api.iwishbag.workers.dev';

interface CurrencyConversionRequest {
  amount: number;
  from: string;
  to: string;
}

interface CurrencyConversionResponse {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  timestamp: string;
  cached?: boolean;
}

interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
}

interface QuoteCalculationRequest {
  origin_country: string;
  destination_country: string;
  items: Array<{
    category: string;
    price_usd: number;
    weight_kg: number;
    quantity: number;
  }>;
  shipping_method?: string;
}

interface QuoteCalculationResponse {
  items_total: number;
  shipping: number;
  customs: number;
  gst: number;
  total: number;
  currency: string;
  calculated_at: string;
  cached?: boolean;
}

interface HSNLookupResponse {
  hsn_code: string;
  description: string;
  category: string;
  customs_rate: number;
  gst_rate: number;
}

interface ProductClassificationRequest {
  product: string;
  origin?: string;
  destination?: string;
}

interface ProductClassificationResponse {
  product: string;
  classification: {
    hsn_code: string | null;
    category: string | null;
    customs_rate: number | null;
    gst_rate: number | null;
  };
  ai_powered: boolean;
}

interface PopularProduct {
  id: string;
  name: string;
  category: string;
  popularity_score: number;
  search_count: number;
  purchase_count: number;
}

export class CloudflareWorkerService {
  private static instance: CloudflareWorkerService;
  
  private constructor() {}
  
  static getInstance(): CloudflareWorkerService {
    if (!CloudflareWorkerService.instance) {
      CloudflareWorkerService.instance = new CloudflareWorkerService();
    }
    return CloudflareWorkerService.instance;
  }
  
  /**
   * Make a request to the Worker API
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${WORKER_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Worker API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Worker API request failed', error, 'WorkerService');
      throw error;
    }
  }
  
  /**
   * Convert currency amounts
   */
  async convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Promise<CurrencyConversionResponse> {
    return this.request<CurrencyConversionResponse>('/api/currency/convert', {
      method: 'POST',
      body: JSON.stringify({ amount, from, to }),
    });
  }
  
  /**
   * Get exchange rates
   */
  async getExchangeRates(currency?: string): Promise<ExchangeRatesResponse> {
    const params = currency ? `?currency=${currency}` : '';
    return this.request<ExchangeRatesResponse>(`/api/currency/rates${params}`);
  }
  
  /**
   * Calculate quote with edge caching
   */
  async calculateQuote(
    quoteData: QuoteCalculationRequest
  ): Promise<QuoteCalculationResponse> {
    return this.request<QuoteCalculationResponse>('/api/quote/calculate', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });
  }
  
  /**
   * Lookup HSN code
   */
  async lookupHSN(code: string): Promise<HSNLookupResponse | null> {
    try {
      return await this.request<HSNLookupResponse>(
        `/api/hsn/lookup?code=${code}`
      );
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Search HSN codes
   */
  async searchHSN(query: string): Promise<{
    search: string;
    results: HSNLookupResponse[];
  }> {
    return this.request(`/api/hsn/lookup?search=${encodeURIComponent(query)}`);
  }
  
  /**
   * Classify product using AI
   */
  async classifyProduct(
    product: string,
    origin?: string,
    destination?: string
  ): Promise<ProductClassificationResponse> {
    return this.request<ProductClassificationResponse>('/api/product/classify', {
      method: 'POST',
      body: JSON.stringify({ product, origin, destination }),
    });
  }
  
  /**
   * Get popular products
   */
  async getPopularProducts(
    category?: string,
    limit: number = 10
  ): Promise<{ products: PopularProduct[]; category?: string; count: number }> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', String(limit));
    
    return this.request(`/api/products/popular?${params}`);
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    edge_location: string;
  }> {
    return this.request('/api/health');
  }
  
  /**
   * Batch convert currencies
   */
  async batchConvertCurrencies(
    conversions: CurrencyConversionRequest[]
  ): Promise<CurrencyConversionResponse[]> {
    // Use Promise.all for parallel processing
    return Promise.all(
      conversions.map(conv => 
        this.convertCurrency(conv.amount, conv.from, conv.to)
      )
    );
  }
  
  /**
   * Get edge location info
   */
  async getEdgeInfo(): Promise<{
    colo: string;
    country: string;
    city: string;
    continent: string;
    latitude: string;
    longitude: string;
    postalCode: string;
    region: string;
    timezone: string;
  } | null> {
    try {
      const health = await this.healthCheck();
      // In a real implementation, this would return CF headers
      return {
        colo: health.edge_location,
        country: 'US',
        city: 'San Francisco',
        continent: 'NA',
        latitude: '37.7749',
        longitude: '-122.4194',
        postalCode: '94102',
        region: 'California',
        timezone: 'America/Los_Angeles'
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Prefetch popular data for performance
   */
  async prefetchPopularData(): Promise<void> {
    try {
      // Prefetch popular products
      await this.getPopularProducts();
      
      // Prefetch common exchange rates
      await this.getExchangeRates();
      
      logger.info('Prefetched popular data from edge', null, 'WorkerService');
    } catch (error) {
      logger.warn('Failed to prefetch data', error, 'WorkerService');
    }
  }
}

// Export singleton instance
export const cloudflareWorkerService = CloudflareWorkerService.getInstance();

// Auto-prefetch on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cloudflareWorkerService.prefetchPopularData();
  }, 2000);
}