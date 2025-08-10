/**
 * Enhanced AliExpress Integration
 * Leverages existing BrightData infrastructure for AliExpress scraping
 */

import { MCPIntegrationService } from './bright-data/MCPIntegrationService';
import { productDataFetchService, ProductData } from './ProductDataFetchService';

export interface AliExpressIntegrationResult {
  success: boolean;
  data?: ProductData & {
    aliexpress_specific?: {
      store_name: string;
      sold_count: number;
      review_count: number;
      discount_percentage: string;
      shipping_info: string;
      specifications: Array<{ name: string; value: string }>;
      variants: Array<{
        name: string;
        options: Array<{ text: string; value: string; available: boolean }>;
      }>;
    };
  };
  error?: string;
  source: 'mcp' | 'existing_service' | 'fallback';
  processing_time?: number;
}

class EnhancedAliExpressIntegration {
  private mcpService: MCPIntegrationService;
  
  constructor() {
    this.mcpService = new MCPIntegrationService({
      maxRetries: 3,
      defaultTimeout: 45000,
      rateLimitDelay: 1000
    });
  }

  /**
   * Main method to fetch AliExpress product data using existing infrastructure
   */
  async fetchProductData(url: string): Promise<AliExpressIntegrationResult> {
    const startTime = Date.now();

    try {
      // Validate AliExpress URL
      if (!this.isAliExpressUrl(url)) {
        return {
          success: false,
          error: 'Invalid AliExpress URL',
          source: 'fallback'
        };
      }

      // Try Method 1: Use MCP Bright Data Bridge directly
      try {
        console.log('🔄 Attempting MCP Bridge for AliExpress...');
        const { mcpBrightDataBridge } = await import('./MCPBrightDataBridge');
        const mcpResult = await mcpBrightDataBridge.scrapeAliExpressProduct(url);

        if (mcpResult.success && mcpResult.data) {
          const processedData = this.processAliExpressData(mcpResult.data);
          return {
            success: true,
            data: processedData,
            source: 'mcp',
            processing_time: Date.now() - startTime
          };
        }
      } catch (mcpError) {
        console.warn('MCP Bridge failed, trying existing service:', mcpError);
      }

      // Method 2: Use existing ProductDataFetchService
      console.log('🔄 Trying existing ProductDataFetchService...');
      const existingResult = await productDataFetchService.fetchProductData(url);
      
      if (existingResult.success && existingResult.data) {
        return {
          success: true,
          data: existingResult.data,
          source: 'existing_service',
          processing_time: Date.now() - startTime
        };
      }

      // Method 3: Direct BrightData call as fallback
      console.log('🔄 Making direct BrightData API call...');
      const directResult = await this.makeDirectBrightDataCall(url);
      
      return {
        ...directResult,
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      console.error('AliExpress integration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'fallback',
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Direct BrightData API call for AliExpress
   */
  private async makeDirectBrightDataCall(url: string): Promise<Omit<AliExpressIntegrationResult, 'processing_time'>> {
    const API_TOKEN = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
    const COLLECTOR_ID = 'c_me4lfvsp1m11p0io1a';

    try {
      const response = await fetch(`https://api.brightdata.com/dca/trigger?queue_next=1&collector=${COLLECTOR_ID}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ url }])
      });

      if (!response.ok) {
        throw new Error(`BrightData API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      
      if (Array.isArray(rawData) && rawData.length > 0) {
        const productData = this.processAliExpressData(rawData[0]);
        return {
          success: true,
          data: productData,
          source: 'fallback'
        };
      }

      return {
        success: false,
        error: 'No data returned from BrightData API',
        source: 'fallback'
      };

    } catch (error) {
      return {
        success: false,
        error: `BrightData API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'fallback'
      };
    }
  }

  /**
   * Process raw AliExpress data into standardized format
   */
  private processAliExpressData(rawData: any): ProductData & { aliexpress_specific?: any } {
    const processedData: ProductData = {
      title: rawData.title || '',
      price: rawData.current_price?.amount || rawData.price || 0,
      currency: rawData.currency || rawData.current_price?.currency || 'USD',
      weight: this.extractWeight(rawData),
      images: this.extractImages(rawData),
      availability: this.determineAvailability(rawData),
      variants: this.extractVariants(rawData),
      description: rawData.description || '',
      brand: this.extractBrand(rawData),
      category: this.extractCategory(rawData)
    };

    // Add AliExpress-specific data
    const aliexpressSpecific = {
      store_name: rawData.store_name || '',
      sold_count: rawData.sold_count || 0,
      review_count: rawData.review_count || 0,
      discount_percentage: rawData.discount_percentage || '',
      shipping_info: rawData.shipping_info || '',
      specifications: rawData.specifications || [],
      variants: rawData.variants || []
    };

    return {
      ...processedData,
      aliexpress_specific: aliexpressSpecific
    };
  }

  /**
   * Extract weight from product data
   */
  private extractWeight(data: any): number | undefined {
    // Try direct weight field
    if (data.weight) return parseFloat(data.weight);
    
    // Try specifications
    if (data.specifications) {
      for (const spec of data.specifications) {
        if (spec.name.toLowerCase().includes('weight')) {
          const weight = spec.value.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|oz)/i);
          if (weight) {
            let value = parseFloat(weight[1]);
            const unit = weight[2].toLowerCase();
            
            // Convert to kg
            if (unit === 'g') value = value / 1000;
            else if (unit === 'lb') value = value * 0.453592;
            else if (unit === 'oz') value = value * 0.0283495;
            
            return Math.round(value * 1000) / 1000;
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract and normalize images
   */
  private extractImages(data: any): string[] {
    const images: string[] = [];
    
    // Main image
    if (data.main_image) {
      images.push(typeof data.main_image === 'string' ? data.main_image : data.main_image.href);
    }
    
    // Gallery images
    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images) {
        const imgUrl = typeof img === 'string' ? img : img.href;
        if (imgUrl && !images.includes(imgUrl)) {
          images.push(imgUrl);
        }
      }
    }
    
    return images;
  }

  /**
   * Determine product availability
   */
  private determineAvailability(data: any): 'in-stock' | 'out-of-stock' | 'unknown' {
    if (data.stock_available) {
      return data.stock_available > 0 ? 'in-stock' : 'out-of-stock';
    }
    return 'unknown';
  }

  /**
   * Extract product variants
   */
  private extractVariants(data: any): Array<{ name: string; options: string[] }> {
    if (!data.variants || !Array.isArray(data.variants)) return [];
    
    return data.variants.map((variant: any) => ({
      name: variant.name || 'Variant',
      options: variant.options?.filter((opt: any) => opt.available).map((opt: any) => opt.text || opt) || []
    }));
  }

  /**
   * Extract brand from title or store name
   */
  private extractBrand(data: any): string | undefined {
    // Try store name first
    if (data.store_name) return data.store_name;
    
    // Try extracting from title
    if (data.title) {
      const brandMatch = data.title.match(/^([A-Z][a-zA-Z\s&]+?)\s+[-\s]/);
      if (brandMatch) return brandMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Extract category from breadcrumb
   */
  private extractCategory(data: any): string | undefined {
    if (!data.breadcrumb) return undefined;
    
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

    const lowerBreadcrumb = data.breadcrumb.toLowerCase();
    for (const [key, category] of Object.entries(categoryMappings)) {
      if (lowerBreadcrumb.includes(key)) {
        return category;
      }
    }
    
    return undefined;
  }

  /**
   * Validate AliExpress URL
   */
  private isAliExpressUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase().includes('aliexpress.');
    } catch {
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      mcpServiceStats: this.mcpService ? 'Available' : 'Not initialized',
      supportedPlatforms: ['aliexpress.com', 'aliexpress.us'],
      integrationMethods: ['MCP', 'Existing Service', 'Direct API']
    };
  }
}

export const enhancedAliExpressIntegration = new EnhancedAliExpressIntegration();