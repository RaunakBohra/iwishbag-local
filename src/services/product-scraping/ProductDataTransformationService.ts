/**
 * Product Data Transformation Service
 * Handles data normalization, parsing, and transformation from raw scraping results
 * Decomposed from BrightDataProductService for focused data processing
 * 
 * RESPONSIBILITIES:
 * - Raw data normalization to standard ProductData format
 * - Price parsing and currency detection
 * - Weight extraction and unit conversion
 * - Category mapping and classification
 * - Image processing and validation
 * - Brand extraction and normalization
 * - Variant processing and standardization
 * - Data quality validation and scoring
 */

import { logger } from '@/utils/logger';
import { ProductData } from '../ProductDataFetchService';

export interface TransformationResult {
  success: boolean;
  data?: ProductData;
  warnings: string[];
  errors: string[];
  qualityScore: number;
  transformedFields: string[];
}

export interface TransformationOptions {
  validateImages?: boolean;
  maxImageCount?: number;
  estimateWeight?: boolean;
  enhanceCategory?: boolean;
  strictValidation?: boolean;
}

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  overall: number;
}

export class ProductDataTransformationService {
  private static instance: ProductDataTransformationService;
  private transformationCache = new Map<string, TransformationResult>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes cache for transformations

  constructor() {
    logger.info('ProductDataTransformationService initialized');
  }

  static getInstance(): ProductDataTransformationService {
    if (!ProductDataTransformationService.instance) {
      ProductDataTransformationService.instance = new ProductDataTransformationService();
    }
    return ProductDataTransformationService.instance;
  }

  /**
   * Transform raw platform data to standardized ProductData format
   */
  async transformProductData(
    rawData: any, 
    platform: string, 
    url: string, 
    options: TransformationOptions = {}
  ): Promise<TransformationResult> {
    try {
      const cacheKey = this.createCacheKey('transform', { platform, url, rawData: JSON.stringify(rawData).slice(0, 100) });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached transformation result');
        return cached;
      }

      const result = await this.performTransformation(rawData, platform, url, options);
      
      if (result.success && result.data) {
        this.setCache(cacheKey, result);
        logger.info(`Transformed ${platform} data with quality score: ${result.qualityScore}`);
      }

      return result;

    } catch (error) {
      logger.error('Data transformation failed:', error);
      return {
        success: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown transformation error'],
        qualityScore: 0,
        transformedFields: []
      };
    }
  }

  /**
   * Perform the actual data transformation
   */
  private async performTransformation(
    rawData: any, 
    platform: string, 
    url: string, 
    options: TransformationOptions
  ): Promise<TransformationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const transformedFields: string[] = [];

    try {
      let productData: ProductData;

      // Platform-specific transformation
      switch (platform) {
        case 'amazon':
          productData = await this.transformAmazonData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'ebay':
          productData = await this.transformEbayData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'walmart':
          productData = await this.transformWalmartData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'bestbuy':
          productData = await this.transformBestBuyData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'ae':
          productData = await this.transformAEData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'myntra':
          productData = await this.transformMyntraData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'flipkart':
          productData = await this.transformFlipkartData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'hermes':
          productData = await this.transformHermesData(rawData, url, warnings, errors, transformedFields);
          break;
        case 'lego':
          productData = await this.transformLegoData(rawData, url, warnings, errors, transformedFields);
          break;
        default:
          productData = await this.transformGenericData(rawData, url, warnings, errors, transformedFields);
      }

      // Apply post-processing enhancements
      if (options.validateImages) {
        productData = await this.validateAndProcessImages(productData, options.maxImageCount || 8, warnings);
      }

      if (options.estimateWeight && !productData.weight) {
        productData.weight = this.estimateWeight(productData.title, productData.category || 'general');
        if (productData.weight) {
          transformedFields.push('weight');
          warnings.push('Weight estimated from product title and category');
        }
      }

      if (options.enhanceCategory) {
        const enhancedCategory = this.enhanceCategory(productData.title, productData.category || 'general');
        if (enhancedCategory !== productData.category) {
          productData.category = enhancedCategory;
          transformedFields.push('category');
          warnings.push(`Category enhanced from title analysis`);
        }
      }

      // Calculate quality score
      const qualityMetrics = this.calculateQualityScore(productData, transformedFields, warnings, errors);

      // Validate data quality
      if (options.strictValidation && qualityMetrics.overall < 0.6) {
        errors.push(`Data quality score (${qualityMetrics.overall}) below acceptable threshold (0.6)`);
        return {
          success: false,
          warnings,
          errors,
          qualityScore: qualityMetrics.overall,
          transformedFields
        };
      }

      return {
        success: true,
        data: productData,
        warnings,
        errors,
        qualityScore: qualityMetrics.overall,
        transformedFields
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Transformation processing failed');
      return {
        success: false,
        warnings,
        errors,
        qualityScore: 0,
        transformedFields
      };
    }
  }

  /**
   * Transform Amazon product data
   */
  private async transformAmazonData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price
      let price = 0;
      let currency = 'USD';
      
      if (data.price) {
        const priceResult = this.parsePrice(data.price);
        price = priceResult.amount;
        currency = priceResult.currency || this.detectCurrencyFromUrl(url) || 'USD';
        transformedFields.push('price');
      }

      // Extract weight
      let weight: number | undefined;
      if (data.weight) {
        weight = this.parseWeight(data.weight, url);
        if (weight) transformedFields.push('weight');
      }

      // Process images
      const images = this.processImages(data.images || [], 8, warnings);
      if (images.length > 0) transformedFields.push('images');

      // Extract and enhance brand
      const brand = data.brand || this.extractBrandFromTitle(data.title || '');
      if (brand) transformedFields.push('brand');

      // Determine category
      const category = this.mapAmazonCategory(data.category) || this.inferCategory(data.title || '');
      transformedFields.push('category');

      // Parse availability
      const availability = this.normalizeAvailability(data.availability);
      transformedFields.push('availability');

      return {
        title: data.title || 'Amazon Product',
        price,
        currency,
        weight,
        images,
        brand,
        category,
        availability,
        description: data.description || '',
        rating: data.rating ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
        seller_name: 'Amazon',
        url
      };

    } catch (error) {
      errors.push(`Amazon transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Transform eBay product data
   */
  private async transformEbayData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price and currency
      let price = 0;
      let currency = 'USD';
      
      if (data.price) {
        const priceResult = this.parsePrice(data.price);
        price = priceResult.amount;
        currency = priceResult.currency || this.detectCurrencyFromUrl(url) || 'USD';
        transformedFields.push('price');
      }

      // Process images
      const images = this.processImages(data.images || [], 6, warnings);
      if (images.length > 0) transformedFields.push('images');

      // Extract seller and brand info
      const sellerName = data.seller_name || data.seller || 'eBay Seller';
      const brand = data.brand || this.extractBrandFromTitle(data.title || '');
      if (brand) transformedFields.push('brand');

      // Category mapping
      const category = this.mapEbayCategory(data.category) || this.inferCategory(data.title || '');
      transformedFields.push('category');

      // Parse condition
      const condition = data.condition || 'unknown';

      return {
        title: data.title || 'eBay Item',
        price,
        currency,
        images,
        brand,
        category,
        availability: 'in-stock', // eBay items are typically available
        description: data.description || '',
        condition,
        seller_name: sellerName,
        url
      };

    } catch (error) {
      errors.push(`eBay transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Transform Best Buy product data
   */
  private async transformBestBuyData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Extract price information
      const finalPrice = data.final_price || data.offer_price || data.price;
      const initialPrice = data.initial_price;
      
      let price = 0;
      if (finalPrice) {
        price = this.parsePrice(finalPrice).amount;
        transformedFields.push('price');
      }

      // Process images with Best Buy specific filtering
      let images: string[] = [];
      if (Array.isArray(data.images)) {
        // Filter high-quality Best Buy images
        const uniqueImages = new Set<string>();
        data.images.forEach((img: string) => {
          if (img && (img.includes('500/500') || !img.includes('prescaled'))) {
            uniqueImages.add(img);
          }
        });
        images = Array.from(uniqueImages).slice(0, 8);
        
        if (images.length === 0) {
          images = data.images.slice(0, 8);
        }
        transformedFields.push('images');
      }

      // Extract weight from specifications
      let weight: number | undefined;
      if (data.product_specifications) {
        weight = this.extractWeightFromBestBuySpecs(data.product_specifications, url);
        if (weight) transformedFields.push('weight');
      }

      // Extract brand
      let brand: string | undefined;
      if (data.product_specifications && Array.isArray(data.product_specifications)) {
        const brandSpec = data.product_specifications.find((spec: any) => 
          spec?.specification_name === 'Brand'
        );
        brand = brandSpec?.specification_value || data.model || this.extractBrandFromTitle(data.title || '');
      }
      if (brand) transformedFields.push('brand');

      // Category mapping
      let category = 'electronics';
      if (data.breadcrumbs && Array.isArray(data.breadcrumbs)) {
        const specificCategory = data.breadcrumbs[data.breadcrumbs.length - 1]?.name;
        if (specificCategory) {
          category = this.mapBestBuyCategory(specificCategory);
        }
      }
      transformedFields.push('category');

      // Availability parsing
      let availability: 'in-stock' | 'out-of-stock' | 'unknown' = 'unknown';
      if (data.availability && Array.isArray(data.availability)) {
        availability = data.availability.length > 0 ? 'in-stock' : 'out-of-stock';
      }
      transformedFields.push('availability');

      // Build description from highlights
      let description = data.product_description || '';
      if (data.highlights && Array.isArray(data.highlights)) {
        const highlightTexts = data.highlights
          .map((highlight: any) => {
            if (highlight.description && Array.isArray(highlight.description)) {
              return highlight.description.join(' ');
            }
            return highlight.title || '';
          })
          .filter(Boolean)
          .slice(0, 3);
        
        if (highlightTexts.length > 0) {
          description = description ? 
            `${description}\n\nKey Features:\n• ${highlightTexts.join('\n• ')}` : 
            highlightTexts.join('\n• ');
        }
      }

      return {
        title: data.title || `Best Buy Product ${data.product_id || ''}`,
        price,
        currency: 'USD',
        weight,
        images,
        brand,
        category,
        availability,
        description: description.substring(0, 1000),
        rating: data.rating ? parseFloat(data.rating) : undefined,
        reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
        sku: data.sku,
        seller_name: 'Best Buy',
        url
      };

    } catch (error) {
      errors.push(`Best Buy transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return minimal safe data structure
      return {
        title: rawData?.title || 'Unknown Best Buy Product',
        price: this.parsePrice(rawData?.final_price || rawData?.price).amount || 0,
        currency: 'USD',
        category: 'electronics',
        availability: 'unknown',
        images: [],
        seller_name: 'Best Buy',
        url
      };
    }
  }

  /**
   * Transform fashion platform data (AE, Myntra, etc.)
   */
  private async transformAEData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      const price = this.parsePrice(data.final_price || data.price).amount;
      const currency = data.currency || 'USD';
      
      if (price > 0) transformedFields.push('price');
      
      // Fashion-specific image processing
      const images = this.processImages(data.image_urls || [data.main_image].filter(Boolean), 6, warnings);
      if (images.length > 0) transformedFields.push('images');
      
      // Build variants for fashion items
      const variants = [];
      if (data.color) {
        variants.push({ name: 'Color', options: [data.color] });
        transformedFields.push('variants');
      }
      if (data.size) {
        variants.push({ name: 'Size', options: [data.size] });
        transformedFields.push('variants');
      }

      return {
        title: data.product_name || 'American Eagle Item',
        price,
        currency,
        images,
        brand: data.brand || 'American Eagle',
        category: this.mapAECategory(data.category_name) || 'fashion',
        availability: data.in_stock ? 'in-stock' : 'out-of-stock',
        description: data.description || '',
        variants,
        seller_name: 'American Eagle',
        url
      };

    } catch (error) {
      errors.push(`AE transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Transform luxury brand data (Hermes, Prada, etc.)
   */
  private async transformHermesData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      // Luxury items often have complex pricing
      let price = 0;
      let currency = 'USD';
      
      if (data.final_price) {
        const priceResult = this.parsePrice(data.final_price);
        price = priceResult.amount;
        currency = priceResult.currency || 'USD';
      } else if (data.initial_price) {
        const priceResult = this.parsePrice(data.initial_price);
        price = priceResult.amount;
        currency = priceResult.currency || 'USD';
      }
      
      if (price > 0) transformedFields.push('price');
      
      // Luxury image processing
      const images = [];
      if (data.image_urls && Array.isArray(data.image_urls)) {
        images.push(...data.image_urls.filter(Boolean));
      }
      if (data.main_image) {
        images.unshift(data.main_image);
      }
      transformedFields.push('images');
      
      // Luxury weight estimation
      const category = this.mapHermesCategory(data.category_name);
      const weight = this.estimateLuxuryWeight(data.product_name, category);
      if (weight) transformedFields.push('weight');

      return {
        title: data.product_name || 'Hermès Product',
        price,
        currency,
        images,
        weight,
        brand: data.brand || 'Hermès',
        category,
        availability: data.in_stock ? 'in-stock' : 'out-of-stock',
        description: data.description || data.product_details || '',
        specifications: data.material ? { material: data.material } : undefined,
        seller_name: 'Hermès',
        url
      };

    } catch (error) {
      errors.push(`Hermès transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Generic data transformation for unsupported platforms
   */
  private async transformGenericData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    warnings.push('Using generic transformation - platform-specific optimizations not available');
    
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    
    const price = this.parsePrice(data.price || data.final_price || data.cost).amount;
    const title = data.title || data.name || data.product_name || 'Product';
    const images = this.processImages(data.images || data.image_urls || [], 5, warnings);
    
    if (price > 0) transformedFields.push('price');
    if (images.length > 0) transformedFields.push('images');
    
    return {
      title,
      price,
      currency: 'USD',
      images,
      brand: data.brand || this.extractBrandFromTitle(title),
      category: this.inferCategory(title),
      availability: 'unknown',
      description: data.description || '',
      url
    };
  }

  // Utility methods for data processing
  
  private parsePrice(priceStr: any): { amount: number; currency?: string } {
    if (typeof priceStr === 'number') {
      return { amount: priceStr };
    }
    
    if (typeof priceStr === 'string') {
      // Extract currency symbol
      let currency: string | undefined;
      if (priceStr.includes('$')) currency = 'USD';
      else if (priceStr.includes('£')) currency = 'GBP';
      else if (priceStr.includes('€')) currency = 'EUR';
      else if (priceStr.includes('¥')) currency = 'JPY';
      else if (priceStr.includes('₹')) currency = 'INR';
      
      // Extract numeric value
      const match = priceStr.replace(/[^\d.,]/g, '').match(/[\d,]+\.?\d*/);
      const amount = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
      
      return { amount, currency };
    }
    
    return { amount: 0 };
  }

  private parseWeight(weightStr: any, url?: string): number | undefined {
    if (typeof weightStr === 'number') return weightStr;
    
    if (typeof weightStr === 'string') {
      const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(g|grams?|kg|kilograms?|lb|lbs|pound|pounds|oz|ounce|ounces)/i);
      if (match) {
        let weight = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        const isUSMarket = url ? this.isUSMarketplace(url) : false;
        const targetUnit = isUSMarket ? 'lbs' : 'kg';
        
        if (targetUnit === 'lbs') {
          if (unit.includes('kg')) weight *= 2.20462;
          else if (unit.includes('g') && !unit.includes('kg')) weight *= 0.00220462;
          else if (unit.includes('oz')) weight *= 0.0625;
        } else {
          if (unit.includes('lb') || unit.includes('pound')) weight *= 0.453592;
          else if (unit.includes('oz')) weight *= 0.0283495;
          else if (unit.includes('g') && !unit.includes('kg')) weight *= 0.001;
        }
        
        return Math.round(weight * 1000) / 1000;
      }
    }
    
    return undefined;
  }

  private processImages(imageArray: any[], maxCount: number, warnings: string[]): string[] {
    if (!Array.isArray(imageArray)) return [];
    
    const processedImages = imageArray
      .filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      .map((img: string) => img.trim())
      .filter((img: string) => {
        // Basic URL validation
        try {
          new URL(img);
          return true;
        } catch {
          warnings.push(`Invalid image URL filtered: ${img.substring(0, 50)}...`);
          return false;
        }
      })
      .slice(0, maxCount);
      
    if (imageArray.length > maxCount) {
      warnings.push(`Image count limited to ${maxCount} (had ${imageArray.length})`);
    }
    
    return processedImages;
  }

  private extractBrandFromTitle(title: string): string | undefined {
    const titleLower = title.toLowerCase();
    const commonBrands = [
      'apple', 'samsung', 'nike', 'adidas', 'sony', 'microsoft', 'google',
      'amazon', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'lg', 'canon',
      'nikon', 'xbox', 'playstation', 'nintendo'
    ];
    
    for (const brand of commonBrands) {
      if (titleLower.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    
    return undefined;
  }

  private normalizeAvailability(availability: any): 'in-stock' | 'out-of-stock' | 'unknown' {
    if (!availability) return 'unknown';
    
    const availStr = availability.toString().toLowerCase();
    if (availStr.includes('in stock') || availStr.includes('available')) return 'in-stock';
    if (availStr.includes('out of stock') || availStr.includes('unavailable')) return 'out-of-stock';
    
    return 'unknown';
  }

  private calculateQualityScore(
    productData: ProductData, 
    transformedFields: string[], 
    warnings: string[], 
    errors: string[]
  ): QualityMetrics {
    // Completeness score (0-1)
    const requiredFields = ['title', 'price', 'currency'];
    const optionalFields = ['images', 'brand', 'category', 'description', 'weight'];
    const allFields = [...requiredFields, ...optionalFields];
    
    const completedRequired = requiredFields.filter(field => 
      productData[field as keyof ProductData] !== undefined && 
      productData[field as keyof ProductData] !== ''
    ).length;
    
    const completedOptional = optionalFields.filter(field =>
      productData[field as keyof ProductData] !== undefined &&
      productData[field as keyof ProductData] !== ''
    ).length;
    
    const completeness = (completedRequired + (completedOptional * 0.5)) / (requiredFields.length + (optionalFields.length * 0.5));
    
    // Accuracy score based on successful transformations
    const accuracy = transformedFields.length / allFields.length;
    
    // Consistency score (fewer warnings = more consistent)
    const consistency = Math.max(0, 1 - (warnings.length * 0.1));
    
    // Validity score (no errors = valid)
    const validity = errors.length === 0 ? 1 : Math.max(0, 1 - (errors.length * 0.2));
    
    // Overall weighted score
    const overall = (completeness * 0.3) + (accuracy * 0.3) + (consistency * 0.2) + (validity * 0.2);
    
    return {
      completeness: Math.round(completeness * 1000) / 1000,
      accuracy: Math.round(accuracy * 1000) / 1000,
      consistency: Math.round(consistency * 1000) / 1000,
      validity: Math.round(validity * 1000) / 1000,
      overall: Math.round(overall * 1000) / 1000
    };
  }

  // Platform-specific helper methods (simplified versions)
  private mapAmazonCategory(category: string): string {
    if (!category) return 'general';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('electronics')) return 'electronics';
    if (categoryLower.includes('clothing')) return 'fashion';
    if (categoryLower.includes('books')) return 'books';
    return 'general';
  }

  private mapEbayCategory(category: string): string {
    if (!category) return 'general';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('electronics')) return 'electronics';
    if (categoryLower.includes('fashion')) return 'fashion';
    if (categoryLower.includes('collectibles')) return 'general';
    return 'general';
  }

  private mapBestBuyCategory(category: string): string {
    if (!category) return 'electronics';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('computer')) return 'electronics';
    if (categoryLower.includes('phone')) return 'electronics';
    if (categoryLower.includes('tv')) return 'electronics';
    return 'electronics';
  }

  private mapAECategory(category: string): string {
    return 'fashion'; // AE is primarily fashion
  }

  private mapHermesCategory(category: string): string {
    if (!category) return 'luxury-accessories';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('bags')) return 'luxury-bags';
    if (categoryLower.includes('jewelry')) return 'luxury-jewelry';
    if (categoryLower.includes('fragrance')) return 'luxury-fragrance';
    return 'luxury-accessories';
  }

  private inferCategory(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('phone') || titleLower.includes('laptop')) return 'electronics';
    if (titleLower.includes('shirt') || titleLower.includes('dress')) return 'fashion';
    if (titleLower.includes('book')) return 'books';
    if (titleLower.includes('toy')) return 'toys';
    return 'general';
  }

  private estimateWeight(title: string, category: string): number | undefined {
    const titleLower = title.toLowerCase();
    
    if (category === 'electronics') {
      if (titleLower.includes('phone')) return 0.2;
      if (titleLower.includes('laptop')) return 2.0;
      if (titleLower.includes('tablet')) return 0.5;
      return 0.8;
    } else if (category === 'fashion') {
      if (titleLower.includes('jacket')) return 0.8;
      return 0.3;
    } else if (category === 'books') {
      return 0.4;
    }
    
    return undefined;
  }

  private estimateLuxuryWeight(title: string, category: string): number | undefined {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('bag') || titleLower.includes('handbag')) {
      if (titleLower.includes('mini')) return 0.3;
      if (titleLower.includes('large')) return 1.2;
      return 0.8;
    }
    
    if (titleLower.includes('scarf')) return 0.1;
    if (titleLower.includes('belt')) return 0.3;
    
    return 0.5; // Default luxury item weight
  }

  private enhanceCategory(title: string, currentCategory: string): string {
    // More sophisticated category detection based on title
    const titleLower = title.toLowerCase();
    
    const categoryKeywords = {
      'electronics': ['smartphone', 'iphone', 'android', 'laptop', 'computer', 'tablet', 'headphones', 'camera'],
      'fashion': ['shirt', 'dress', 'pants', 'jacket', 'sweater', 'hoodie', 'blouse', 'skirt'],
      'footwear': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats', 'loafers'],
      'beauty': ['lipstick', 'foundation', 'mascara', 'skincare', 'perfume', 'cologne'],
      'home': ['furniture', 'lamp', 'chair', 'table', 'bed', 'sofa', 'kitchen'],
      'sports': ['fitness', 'workout', 'exercise', 'sports', 'athletic', 'gym'],
      'toys': ['toy', 'game', 'puzzle', 'doll', 'action figure', 'lego', 'playset']
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return category;
      }
    }
    
    return currentCategory;
  }

  private detectCurrencyFromUrl(url: string): string | null {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.co.uk') || urlLower.includes('/en_gb/')) return 'GBP';
    if (urlLower.includes('.de') || urlLower.includes('.fr') || urlLower.includes('.it')) return 'EUR';
    if (urlLower.includes('.in') || urlLower.includes('myntra') || urlLower.includes('flipkart')) return 'INR';
    if (urlLower.includes('.co.jp')) return 'JPY';
    
    return 'USD'; // Default
  }

  private isUSMarketplace(url: string): boolean {
    const urlLower = url.toLowerCase();
    const usMarketplaces = ['walmart.com', 'bestbuy.com', 'target.com', 'ae.com'];
    
    return usMarketplaces.some(marketplace => urlLower.includes(marketplace)) ||
           (urlLower.includes('amazon.com') && !urlLower.includes('amazon.com.'));
  }

  private extractWeightFromBestBuySpecs(specs: any[], url: string): number | undefined {
    if (!Array.isArray(specs)) return undefined;
    
    const weightFields = ['Product Weight', 'Shipping Weight', 'Weight'];
    
    for (const spec of specs) {
      if (spec?.specification_name && weightFields.includes(spec.specification_name)) {
        const weight = this.parseWeight(spec.specification_value, url);
        if (weight) return weight;
      }
    }
    
    return undefined;
  }

  private async validateAndProcessImages(productData: ProductData, maxCount: number, warnings: string[]): Promise<ProductData> {
    if (!productData.images || productData.images.length === 0) {
      return productData;
    }

    // Basic image validation (could be enhanced with actual HTTP checks)
    const validImages = productData.images
      .filter(img => {
        try {
          new URL(img);
          return true;
        } catch {
          warnings.push(`Invalid image URL removed: ${img.substring(0, 50)}...`);
          return false;
        }
      })
      .slice(0, maxCount);

    return {
      ...productData,
      images: validImages
    };
  }

  // Helper methods for other platforms
  private async transformWalmartData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const price = this.parsePrice(data.price).amount;
    if (price > 0) transformedFields.push('price');
    
    return {
      title: data.title || 'Walmart Product',
      price,
      currency: 'USD',
      images: this.processImages(data.images || [], 6, warnings),
      brand: data.brand,
      category: 'general',
      availability: 'in-stock',
      description: data.description || '',
      seller_name: 'Walmart',
      url
    };
  }

  private async transformMyntraData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const price = this.parsePrice(data.final_price).amount;
    if (price > 0) transformedFields.push('price');
    
    return {
      title: data.title || 'Myntra Fashion',
      price,
      currency: 'INR',
      images: this.processImages(data.images || [], 6, warnings),
      brand: data.brand,
      category: 'fashion',
      availability: 'in-stock',
      description: data.description || '',
      seller_name: 'Myntra',
      url
    };
  }

  private async transformFlipkartData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const price = this.parsePrice(data.final_price).amount;
    if (price > 0) transformedFields.push('price');
    
    return {
      title: data.title || 'Flipkart Product',
      price,
      currency: 'INR',
      images: [],
      brand: data.brand,
      category: 'general',
      availability: 'in-stock',
      description: data.description || '',
      rating: data.rating ? parseFloat(data.rating) : undefined,
      seller_name: 'Flipkart',
      url
    };
  }

  private async transformLegoData(rawData: any, url: string, warnings: string[], errors: string[], transformedFields: string[]): Promise<ProductData> {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const price = this.parsePrice(data.final_price || data.initial_price).amount;
    if (price > 0) transformedFields.push('price');
    
    return {
      title: data.product_name || 'LEGO Set',
      price,
      currency: 'USD',
      images: this.processImages(data.image_urls || [], 6, warnings),
      brand: 'LEGO',
      category: 'toys',
      availability: data.in_stock ? 'in-stock' : 'out-of-stock',
      description: data.description || '',
      rating: data.rating ? parseFloat(data.rating) : undefined,
      reviews_count: data.reviews_count ? parseInt(data.reviews_count) : undefined,
      seller_name: 'LEGO',
      url
    };
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        const value = params[key];
        if (typeof value === 'string' && value.length > 100) {
          keyParts.push(`${key}:${value.slice(0, 100)}...`);
        } else {
          keyParts.push(`${key}:${value}`);
        }
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): TransformationResult | null {
    const cached = this.transformationCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.transformationCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: TransformationResult): void {
    this.transformationCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear transformation cache
   */
  clearCache(): void {
    this.transformationCache.clear();
    logger.info('Product transformation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.transformationCache.size,
      entries: Array.from(this.transformationCache.keys())
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('ProductDataTransformationService disposed');
  }
}

export default ProductDataTransformationService;