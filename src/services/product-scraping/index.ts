/**
 * Product Scraping Services Barrel Export
 * Consolidated exports for all product scraping services
 */

// Core product scraping services
export { default as ProductDataService } from './ProductDataService';
export { default as ProductSearchService } from './ProductSearchService';
export { default as ProductValidationService } from './ProductValidationService';
export { default as ProductCacheService } from './ProductCacheService';
export { default as ProductDataTransformationService } from './ProductDataTransformationService';
export { default as ScrapingConfigurationService } from './ScrapingConfigurationService';
export { default as ScrapingExecutionService } from './ScrapingExecutionService';
export { default as ScrapingErrorService } from './ScrapingErrorService';
export { default as PlatformDetectionService } from './PlatformDetectionService';

// Types and interfaces
export type {
  ProductScrapingResult,
  ScrapingConfiguration,
  ProductTransformation,
  ScrapingExecution
} from './types';