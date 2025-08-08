/**
 * Unified Storage Service - Consolidates all storage operations
 * 
 * Replaces:
 * - R2StorageService
 * - R2StorageServiceSupabase  
 * - R2StorageServiceEnhanced
 * - R2StorageServiceDirect
 * - R2StorageServiceSimple
 * - Various other storage utilities
 * 
 * Provides a comprehensive, unified interface for all storage operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Configuration interfaces
export interface StorageConfig {
  primaryProvider: 'supabase' | 'r2' | 'hybrid';
  r2Config?: R2Config;
  supabaseConfig?: SupabaseConfig;
  enableCompression: boolean;
  enableThumbnails: boolean;
  maxFileSize: number; // bytes
  allowedTypes: string[];
  enableProgressTracking: boolean;
  enableCaching: boolean;
}

interface R2Config {
  accountId: string;
  bucketName: string;
  publicUrl: string;
  workerUrl: string;
  apiToken?: string;
}

interface SupabaseConfig {
  bucketName: string;
  publicUrl: string;
}

// File operation types
export interface FileUploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  compress?: boolean;
  generateThumbnail?: boolean;
  onProgress?: (progress: number) => void;
  sessionId?: string;
  productIndex?: string | number;
  userId?: string;
  organizationId?: string;
  isPublic?: boolean;
  expiresIn?: number;
}

export interface FileUploadResult {
  success: boolean;
  url: string;
  key: string;
  publicUrl?: string;
  thumbnailUrl?: string;
  size: number;
  contentType: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface FileInfo {
  key: string;
  url: string;
  publicUrl?: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, any>;
  originalName?: string;
  folder?: string;
  isPublic: boolean;
}

export interface BulkUploadResult {
  successful: FileUploadResult[];
  failed: Array<{ file: File; error: string }>;
  totalUploaded: number;
  totalFailed: number;
}

export interface StorageQuota {
  used: number;
  limit: number;
  percentage: number;
  remainingBytes: number;
  remainingReadable: string;
}

// Specialized upload contexts
export interface QuoteUploadContext {
  quoteId?: string;
  sessionId: string;
  customerId?: string;
  productIndex?: number;
}

export interface ProfileUploadContext {
  userId: string;
  uploadType: 'avatar' | 'document' | 'verification';
}

export interface ProductUploadContext {
  productId: string;
  variantId?: string;
  uploadType: 'primary' | 'gallery' | 'specification';
}

export class UnifiedStorageService {
  private static instance: UnifiedStorageService;
  private config: StorageConfig;
  private uploadCache = new Map<string, FileUploadResult>();
  private progressTrackers = new Map<string, (progress: number) => void>();

  private constructor(config?: Partial<StorageConfig>) {
    this.config = {
      primaryProvider: 'hybrid',
      enableCompression: true,
      enableThumbnails: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/json',
        'video/mp4', 'video/webm'
      ],
      enableProgressTracking: true,
      enableCaching: true,
      r2Config: {
        accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
        bucketName: 'iwishbag-new',
        publicUrl: 'https://r2.whyteclub.com',
        workerUrl: import.meta.env.VITE_R2_WORKER_URL || 'https://r2-uploads.rnkbohra.workers.dev',
      },
      supabaseConfig: {
        bucketName: 'product-images',
        publicUrl: import.meta.env.VITE_SUPABASE_URL + '/storage/v1/object/public/',
      },
      ...config,
    };
  }

  static getInstance(config?: Partial<StorageConfig>): UnifiedStorageService {
    if (!UnifiedStorageService.instance) {
      UnifiedStorageService.instance = new UnifiedStorageService(config);
    }
    return UnifiedStorageService.instance;
  }

  // ============================================================================
  // CORE FILE OPERATIONS
  // ============================================================================

  /**
   * Upload a single file with intelligent provider selection
   */
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          url: '',
          key: '',
          size: 0,
          contentType: file.type,
          error: validation.error,
        };
      }

      // Generate unique key
      const key = this.generateFileKey(file, options);
      
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.uploadCache.get(key);
        if (cached && cached.success) {
          return cached;
        }
      }

      // Choose provider based on configuration and file characteristics
      const provider = this.selectProvider(file, options);
      
      let result: FileUploadResult;
      switch (provider) {
        case 'r2':
          result = await this.uploadToR2(file, key, options);
          break;
        case 'supabase':
          result = await this.uploadToSupabase(file, key, options);
          break;
        case 'hybrid':
          result = await this.uploadHybrid(file, key, options);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Cache successful uploads
      if (result.success && this.config.enableCaching) {
        this.uploadCache.set(key, result);
      }

      // Log upload
      if (result.success) {
        logger.info('File uploaded successfully', {
          provider,
          key,
          size: file.size,
          contentType: file.type,
          folder: options.folder,
        });
      } else {
        logger.error('File upload failed', {
          provider,
          key,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error('Upload file error', { error, filename: file.name });
      return {
        success: false,
        url: '',
        key: '',
        size: file.size,
        contentType: file.type,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload multiple files with progress tracking and error handling
   */
  async uploadMultiple(
    files: File[],
    options: FileUploadOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<BulkUploadResult> {
    const results: BulkUploadResult = {
      successful: [],
      failed: [],
      totalUploaded: 0,
      totalFailed: 0,
    };

    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileOptions = {
          ...options,
          onProgress: options.onProgress || ((progress: number) => {
            // Individual file progress can be tracked here if needed
          }),
        };

        const result = await this.uploadFile(file, fileOptions);
        
        if (result.success) {
          results.successful.push(result);
          results.totalUploaded++;
        } else {
          results.failed.push({ file, error: result.error || 'Unknown error' });
          results.totalFailed++;
        }

        // Update overall progress
        if (onProgress) {
          onProgress(results.totalUploaded + results.totalFailed, files.length);
        }
      } catch (error) {
        results.failed.push({
          file,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
        results.totalFailed++;
        
        if (onProgress) {
          onProgress(results.totalUploaded + results.totalFailed, files.length);
        }
      }
    });

    await Promise.all(uploadPromises);
    return results;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      // Determine which provider the file is stored on based on key pattern
      const provider = this.determineProviderFromKey(key);
      
      let success = false;
      switch (provider) {
        case 'r2':
          success = await this.deleteFromR2(key);
          break;
        case 'supabase':
          success = await this.deleteFromSupabase(key);
          break;
        case 'hybrid':
          // Try both providers
          const r2Success = await this.deleteFromR2(key);
          const supabaseSuccess = await this.deleteFromSupabase(key);
          success = r2Success || supabaseSuccess;
          break;
      }

      // Clear from cache
      if (success && this.config.enableCaching) {
        this.uploadCache.delete(key);
      }

      logger.info('File deleted', { key, provider, success });
      return success;
    } catch (error) {
      logger.error('Delete file error', { key, error });
      return false;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(key: string): Promise<FileInfo | null> {
    try {
      const provider = this.determineProviderFromKey(key);
      
      switch (provider) {
        case 'r2':
          return await this.getR2FileInfo(key);
        case 'supabase':
          return await this.getSupabaseFileInfo(key);
        case 'hybrid':
          // Try R2 first, then Supabase
          const r2Info = await this.getR2FileInfo(key);
          if (r2Info) return r2Info;
          return await this.getSupabaseFileInfo(key);
        default:
          return null;
      }
    } catch (error) {
      logger.error('Get file info error', { key, error });
      return null;
    }
  }

  // ============================================================================
  // SPECIALIZED UPLOAD METHODS
  // ============================================================================

  /**
   * Upload files for quote requests
   */
  async uploadQuoteFiles(
    files: File[],
    context: QuoteUploadContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BulkUploadResult> {
    const options: FileUploadOptions = {
      folder: context.quoteId ? `quotes/${context.quoteId}` : 'quote-requests',
      sessionId: context.sessionId,
      userId: context.customerId,
      metadata: {
        quoteId: context.quoteId,
        sessionId: context.sessionId,
        customerId: context.customerId,
        productIndex: context.productIndex,
        uploadType: 'quote_attachment',
      },
    };

    return this.uploadMultiple(files, options, onProgress);
  }

  /**
   * Upload profile-related files
   */
  async uploadProfileFile(file: File, context: ProfileUploadContext): Promise<FileUploadResult> {
    const options: FileUploadOptions = {
      folder: `profiles/${context.userId}/${context.uploadType}`,
      userId: context.userId,
      generateThumbnail: context.uploadType === 'avatar',
      metadata: {
        userId: context.userId,
        uploadType: context.uploadType,
      },
    };

    return this.uploadFile(file, options);
  }

  /**
   * Upload product images
   */
  async uploadProductFiles(
    files: File[],
    context: ProductUploadContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<BulkUploadResult> {
    const options: FileUploadOptions = {
      folder: `products/${context.productId}/${context.uploadType}`,
      generateThumbnail: true,
      compress: true,
      metadata: {
        productId: context.productId,
        variantId: context.variantId,
        uploadType: context.uploadType,
      },
    };

    return this.uploadMultiple(files, options, onProgress);
  }

  // ============================================================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // ============================================================================

  private async uploadToR2(file: File, key: string, options: FileUploadOptions): Promise<FileUploadResult> {
    if (!this.config.r2Config) {
      throw new Error('R2 configuration not provided');
    }

    const formData = new FormData();
    formData.append('file', file);
    
    if (options.sessionId) formData.append('sessionId', options.sessionId);
    if (options.productIndex !== undefined) formData.append('productIndex', String(options.productIndex));
    if (options.metadata) formData.append('metadata', JSON.stringify(options.metadata));

    const workerUrl = `${this.config.r2Config.workerUrl}/upload/quote`;

    if (options.onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && options.onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            options.onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const result = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                url: result.url,
                key: result.key,
                publicUrl: result.url,
                size: file.size,
                contentType: file.type,
              });
            } else {
              const error = JSON.parse(xhr.responseText);
              resolve({
                success: false,
                url: '',
                key,
                size: file.size,
                contentType: file.type,
                error: error.error || 'R2 upload failed',
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              url: '',
              key,
              size: file.size,
              contentType: file.type,
              error: 'Invalid response from R2 server',
            });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            url: '',
            key,
            size: file.size,
            contentType: file.type,
            error: 'Network error during R2 upload',
          });
        });

        xhr.open('POST', workerUrl);
        xhr.send(formData);
      });
    }

    // Fallback to fetch
    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        url: '',
        key,
        size: file.size,
        contentType: file.type,
        error: error.error || 'R2 upload failed',
      };
    }

    const result = await response.json();
    return {
      success: true,
      url: result.url,
      key: result.key,
      publicUrl: result.url,
      size: file.size,
      contentType: file.type,
    };
  }

  private async uploadToSupabase(file: File, key: string, options: FileUploadOptions): Promise<FileUploadResult> {
    const bucketName = this.config.supabaseConfig?.bucketName || 'product-images';
    const filePath = options.folder ? `${options.folder}/${key}` : key;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        metadata: options.metadata,
      });

    if (error) {
      return {
        success: false,
        url: '',
        key,
        size: file.size,
        contentType: file.type,
        error: error.message,
      };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      key: data.path,
      publicUrl,
      size: file.size,
      contentType: file.type,
    };
  }

  private async uploadHybrid(file: File, key: string, options: FileUploadOptions): Promise<FileUploadResult> {
    // For hybrid mode, choose R2 for large files, Supabase for smaller ones
    const useR2 = file.size > 10 * 1024 * 1024; // 10MB threshold
    
    if (useR2 && this.config.r2Config) {
      const r2Result = await this.uploadToR2(file, key, options);
      if (r2Result.success) return r2Result;
      
      // Fallback to Supabase if R2 fails
      logger.warn('R2 upload failed, falling back to Supabase', { key, error: r2Result.error });
    }
    
    return this.uploadToSupabase(file, key, options);
  }

  private async deleteFromR2(key: string): Promise<boolean> {
    if (!this.config.r2Config) return false;

    try {
      const response = await fetch(`${this.config.r2Config.workerUrl}/files/${key}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      logger.error('R2 delete error', { key, error });
      return false;
    }
  }

  private async deleteFromSupabase(key: string): Promise<boolean> {
    const bucketName = this.config.supabaseConfig?.bucketName || 'product-images';
    
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([key]);
      return !error;
    } catch (error) {
      logger.error('Supabase delete error', { key, error });
      return false;
    }
  }

  private async getR2FileInfo(key: string): Promise<FileInfo | null> {
    // R2 file info would be retrieved via worker API
    // Implementation depends on R2 worker setup
    return null;
  }

  private async getSupabaseFileInfo(key: string): Promise<FileInfo | null> {
    const bucketName = this.config.supabaseConfig?.bucketName || 'product-images';
    
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('', { search: key });

      if (error || !data || data.length === 0) return null;

      const file = data[0];
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(key);

      return {
        key,
        url: publicUrl,
        publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at),
        metadata: file.metadata,
        isPublic: true,
      };
    } catch (error) {
      logger.error('Get Supabase file info error', { key, error });
      return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed (${this.formatBytes(this.config.maxFileSize)})`,
      };
    }

    if (!this.config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    return { valid: true };
  }

  private generateFileKey(file: File, options: FileUploadOptions): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || '';
    
    const filename = options.filename || `${timestamp}-${random}.${extension}`;
    
    if (options.folder) {
      return `${options.folder}/${filename}`;
    }
    
    return filename;
  }

  private selectProvider(file: File, options: FileUploadOptions): 'r2' | 'supabase' | 'hybrid' {
    if (this.config.primaryProvider === 'hybrid') {
      // Smart selection based on file characteristics
      if (file.size > 50 * 1024 * 1024) return 'r2'; // Large files to R2
      if (file.type.startsWith('video/')) return 'r2'; // Videos to R2
      return 'supabase'; // Everything else to Supabase
    }
    
    return this.config.primaryProvider;
  }

  private determineProviderFromKey(key: string): 'r2' | 'supabase' | 'hybrid' {
    // Simple heuristic - can be improved based on key patterns
    if (key.includes('r2.whyteclub.com')) return 'r2';
    if (key.includes('supabase')) return 'supabase';
    return 'hybrid';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================================================
  // STORAGE MANAGEMENT
  // ============================================================================

  /**
   * Get storage quota information
   */
  async getStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      // This would typically query usage from database
      const usedBytes = 0; // Placeholder
      const limitBytes = 1 * 1024 * 1024 * 1024; // 1GB default
      
      return {
        used: usedBytes,
        limit: limitBytes,
        percentage: (usedBytes / limitBytes) * 100,
        remainingBytes: limitBytes - usedBytes,
        remainingReadable: this.formatBytes(limitBytes - usedBytes),
      };
    } catch (error) {
      logger.error('Get storage quota error', { userId, error });
      return {
        used: 0,
        limit: 0,
        percentage: 0,
        remainingBytes: 0,
        remainingReadable: '0 Bytes',
      };
    }
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles(): Promise<number> {
    let cleanedCount = 0;
    
    try {
      // Implementation would query database for expired files and delete them
      logger.info('Cleaned up expired files', { count: cleanedCount });
    } catch (error) {
      logger.error('Cleanup expired files error', error);
    }
    
    return cleanedCount;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    supabase: boolean;
    r2: boolean;
    cache: boolean;
    overall: boolean;
  }> {
    const checks = await Promise.allSettled([
      supabase.storage.from('product-images').list('', { limit: 1 }),
      this.config.r2Config ? fetch(`${this.config.r2Config.workerUrl}/health`).then(r => r.ok) : Promise.resolve(false),
    ]);

    const supabaseHealth = checks[0].status === 'fulfilled';
    const r2Health = checks[1].status === 'fulfilled' && checks[1].value === true;
    const cacheHealth = this.uploadCache.size >= 0;

    return {
      supabase: supabaseHealth,
      r2: r2Health,
      cache: cacheHealth,
      overall: supabaseHealth && (r2Health || this.config.primaryProvider !== 'r2'),
    };
  }

  clearCache(): void {
    this.uploadCache.clear();
    logger.info('Storage service cache cleared');
  }
}

// Export singleton factory
export const createStorageService = (config?: Partial<StorageConfig>) => {
  return UnifiedStorageService.getInstance(config);
};

// Default instance
export const getStorageService = () => {
  return UnifiedStorageService.getInstance({
    primaryProvider: 'hybrid',
    enableCompression: true,
    enableThumbnails: true,
    maxFileSize: 100 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
    ],
    enableProgressTracking: true,
    enableCaching: true,
  });
};