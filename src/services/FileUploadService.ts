// ============================================================================
// FILE UPLOAD SERVICE - Consolidated file handling for messaging system
// Handles image compression, file validation, and Supabase storage uploads
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
  size?: number;
}

export interface FileValidationConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  maxImageDimensions?: {
    width: number;
    height: number;
  };
}

export class FileUploadService {
  private static instance: FileUploadService;

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  // Default configurations for different use cases
  private readonly configs = {
    message_attachment: {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxImageDimensions: { width: 2048, height: 2048 },
    },
    payment_proof: {
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxImageDimensions: { width: 1920, height: 1920 },
    },
    profile_avatar: {
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxImageDimensions: { width: 512, height: 512 },
    },
  };

  /**
   * Validates a file against specified criteria
   */
  validateFile(
    file: File,
    configType: keyof typeof this.configs,
  ): { valid: boolean; error?: string } {
    const config = this.configs[configType];

    // Check file size
    if (file.size > config.maxSizeBytes) {
      const maxMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size must be less than ${maxMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      };
    }

    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      const allowedExtensions = config.allowedTypes.map((type) => type.split('/')[1]).join(', ');
      return {
        valid: false,
        error: `File type not allowed. Supported formats: ${allowedExtensions}`,
      };
    }

    return { valid: true };
  }

  /**
   * Compresses an image file to reduce size while maintaining quality
   */
  async compressImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1920,
    quality: number = 0.8,
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      // Skip compression for non-image files
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight,
          );

          canvas.width = width;
          canvas.height = height;

          // Draw and compress the image
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Create new file with compressed blob
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              console.log(
                `📸 Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`,
              );
              resolve(compressedFile);
            },
            file.type,
            quality,
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Uploads a file to Supabase storage
   */
  async uploadToSupabase(
    file: File,
    bucket: string,
    folder: string = '',
    configType: keyof typeof this.configs = 'message_attachment',
  ): Promise<UploadResult> {
    try {
      // Validate file first
      const validation = this.validateFile(file, configType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Compress image if applicable
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        const config = this.configs[configType];
        if (config.maxImageDimensions) {
          processedFile = await this.compressImage(
            file,
            config.maxImageDimensions.width,
            config.maxImageDimensions.height,
          );
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log('✅ File uploaded successfully:', {
        fileName,
        size: `${(processedFile.size / 1024).toFixed(1)}KB`,
        url: urlData.publicUrl,
      });

      return {
        success: true,
        url: urlData.publicUrl,
        fileName: file.name,
        size: processedFile.size,
      };
    } catch (error) {
      console.error('❌ Upload service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Uploads multiple files concurrently
   */
  async uploadMultipleFiles(
    files: File[],
    bucket: string,
    folder: string = '',
    configType: keyof typeof this.configs = 'message_attachment',
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadToSupabase(file, bucket, folder, configType),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Deletes a file from Supabase storage
   */
  async deleteFile(
    bucket: string,
    filePath: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Gets file info without downloading
   */
  async getFileInfo(bucket: string, filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: filePath.split('/').pop(),
        });

      if (error || !data?.length) {
        return null;
      }

      return data[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // If image is larger than max dimensions, scale down
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  }

  /**
   * Converts file to base64 for preview
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Gets human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance();
