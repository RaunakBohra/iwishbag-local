import { useState, useEffect, useCallback } from 'react';
import { brightDataProductService, ScrapeOptions } from '@/services/BrightDataProductService';
import { ProductData, FetchResult } from '@/services/ProductDataFetchService';
import { useUrlAutoDetection } from './useUrlAnalysis';

export interface UseProductScrapingResult {
  // Scraping state
  isLoading: boolean;
  isScraped: boolean;
  error: string | null;
  
  // Scraped data
  productData: ProductData | null;
  source: 'api' | 'scraper' | 'mock' | null;
  
  // URL analysis
  urlAnalysis: ReturnType<typeof useUrlAutoDetection>;
  
  // Actions
  scrapeProduct: (url: string, options?: ScrapeOptions) => Promise<void>;
  clearData: () => void;
  
  // Auto-fill helpers
  shouldAutoFill: boolean;
  autoFillData: {
    productName?: string;
    price?: number;
    weight?: number;
    currency?: string;
    category?: string;
    brand?: string;
    hsn?: string;
  };
}

export const useProductScraping = (initialUrl?: string): UseProductScrapingResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScraped, setIsScraped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [source, setSource] = useState<'api' | 'scraper' | 'mock' | null>(null);
  
  const urlAnalysis = useUrlAutoDetection(initialUrl);

  /**
   * Main scraping function
   */
  const scrapeProduct = useCallback(async (url: string, options: ScrapeOptions = {}) => {
    if (!url || url.trim() === '') {
      setError('URL is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsScraped(false);

    try {
      // Default options with AI enhancement enabled
      const scrapeOptions: ScrapeOptions = {
        includeImages: true,
        includeVariants: true,
        enhanceWithAI: true,
        ...options
      };

      const result: FetchResult = await brightDataProductService.fetchProductData(url, scrapeOptions);

      if (result.success && result.data) {
        setProductData(result.data);
        setSource(result.source);
        setIsScraped(true);
        setError(null);
      } else {
        setError(result.error || 'Failed to scrape product data');
        setProductData(null);
        setSource(null);
        setIsScraped(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProductData(null);
      setSource(null);
      setIsScraped(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setProductData(null);
    setSource(null);
    setIsScraped(false);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Auto-scrape when URL changes (if it's a supported platform)
   */
  useEffect(() => {
    if (initialUrl && urlAnalysis.isValid && urlAnalysis.suggestedCountry) {
      // Only auto-scrape for major e-commerce platforms
      const domain = urlAnalysis.domain.toLowerCase();
      const supportedDomains = ['amazon', 'ebay', 'walmart', 'bestbuy', 'etsy', 'zara'];
      
      if (supportedDomains.some(d => domain.includes(d))) {
        scrapeProduct(initialUrl, { enhanceWithAI: true });
      }
    }
  }, [initialUrl, urlAnalysis.isValid, urlAnalysis.domain, scrapeProduct]);

  /**
   * Auto-fill data preparation
   */
  const shouldAutoFill = isScraped && productData !== null && !error;
  
  const autoFillData = {
    productName: productData?.title,
    price: productData?.price,
    weight: productData?.weight || productData?.weight_value,
    currency: productData?.currency,
    category: productData?.category,
    brand: productData?.brand,
    hsn: (productData as any)?.suggested_hsn
  };

  return {
    // State
    isLoading,
    isScraped,
    error,
    productData,
    source,
    
    // URL analysis
    urlAnalysis,
    
    // Actions
    scrapeProduct,
    clearData,
    
    // Auto-fill
    shouldAutoFill,
    autoFillData
  };
};

/**
 * Hook for manual product scraping (without auto-scraping)
 */
export const useManualProductScraping = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrapeProductManual = useCallback(async (url: string, options: ScrapeOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await brightDataProductService.fetchProductData(url, {
        enhanceWithAI: true,
        ...options
      });

      setIsLoading(false);

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          source: result.source
        };
      } else {
        setError(result.error || 'Scraping failed');
        return {
          success: false,
          error: result.error || 'Scraping failed'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  return {
    isLoading,
    error,
    scrapeProduct: scrapeProductManual,
    clearError: () => setError(null)
  };
};

/**
 * Hook for product search across platforms
 */
export const useProductSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchProducts = useCallback(async (query: string, platform?: string) => {
    if (!query.trim()) {
      setSearchError('Search query is required');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // This would use the MCP bridge for product search
      const { mcpBrightDataBridge } = await import('@/services/MCPBrightDataBridge');
      const result = await mcpBrightDataBridge.searchProducts(query, platform);

      if (result.success && result.data) {
        setSearchResults(result.data.results || []);
      } else {
        setSearchError(result.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setSearchError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);
  }, []);

  return {
    isSearching,
    searchResults,
    searchError,
    searchProducts,
    clearSearch
  };
};