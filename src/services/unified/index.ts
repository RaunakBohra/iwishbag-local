/**
 * Unified Services Index - Export hub for all consolidated services
 * 
 * Migration Guide:
 * 
 * OLD IMPORTS:
 * import { DiscountService } from '@/services/DiscountService';
 * import { R2StorageService } from '@/services/R2StorageService';
 * import { CloudflareD1Service } from '@/services/CloudflareD1Service';
 * 
 * NEW IMPORTS:
 * import { getDiscountService, getStorageService, getCloudflareService } from '@/services/unified';
 * // OR
 * import { UnifiedDiscountService } from '@/services/unified/DiscountService';
 */

// Export unified services
export { 
  UnifiedDiscountService, 
  createDiscountService, 
  getDiscountService 
} from './DiscountService';

export { 
  UnifiedStorageService, 
  createStorageService, 
  getStorageService 
} from './StorageService';

export { 
  CloudflareService, 
  createCloudflareService, 
  getCloudflareService 
} from './CloudflareService';

// Export all types for TypeScript support
export type {
  DiscountConfig,
  DiscountType,
  DiscountConditions,
  ApplicableDiscount,
  DiscountValidationResult,
  DiscountCalculation,
  ComponentDiscount,
  DiscountCampaign,
  DiscountCode,
} from './DiscountService';

export type {
  StorageConfig,
  FileUploadOptions,
  FileUploadResult,
  FileInfo,
  BulkUploadResult,
  StorageQuota,
  QuoteUploadContext,
  ProfileUploadContext,
  ProductUploadContext,
} from './StorageService';

export type {
  CloudflareConfig,
  CloudflareResponse,
  D1QueryResult,
  KVListOptions,
  KVMetadata,
  ImageUploadOptions,
  ImageVariant,
  QueueMessage,
  RateLimitRule,
  WAFRule,
} from './CloudflareService';

// Backward compatibility exports (can be removed after migration)
export { getDiscountService as DiscountService } from './DiscountService';
export { getStorageService as StorageService } from './StorageService';
export { getCloudflareService as CloudflareService } from './CloudflareService';

// Service health check utility
export async function checkServicesHealth(): Promise<{
  discount: any;
  storage: any;
  cloudflare: any;
  overall: boolean;
}> {
  const [discountHealth, storageHealth, cloudflareHealth] = await Promise.allSettled([
    getDiscountService().getHealthStatus(),
    getStorageService().getHealthStatus(),
    getCloudflareService().getHealthStatus(),
  ]);

  const discount = discountHealth.status === 'fulfilled' ? discountHealth.value : { overall: false };
  const storage = storageHealth.status === 'fulfilled' ? storageHealth.value : { overall: false };
  const cloudflare = cloudflareHealth.status === 'fulfilled' ? cloudflareHealth.value : { overall: false };

  return {
    discount,
    storage,
    cloudflare,
    overall: discount.overall && storage.overall && cloudflare.overall,
  };
}