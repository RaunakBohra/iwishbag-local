/**
 * Bright Data Services Barrel Export
 * Consolidated exports for all bright data product scraping services
 */

// Core bright data services
export { default as BrightDataProductService } from './BrightDataProductService';
export { default as PlatformDetectionService } from './PlatformDetectionService';
export { default as RegionalProcessingService } from './RegionalProcessingService';
export { default as CacheService } from './CacheService';
export { default as ScrapingCacheService } from './ScrapingCacheService';
export { default as ScrapingErrorService } from './ScrapingErrorService';
export { default as MCPIntegrationService } from './MCPIntegrationService';
export { default as DataNormalizationService } from './DataNormalizationService';
export { default as WeightEstimationService } from './WeightEstimationService';
export { default as DataValidationService } from './DataValidationService';
export { default as ProductValidationService } from './ProductValidationService';

// Types and interfaces
export type {
  ScrapingResult,
  ProductData,
  PlatformConfig,
  ScrapingError
} from './types';