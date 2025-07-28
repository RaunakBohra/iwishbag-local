import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type PhotoType = 
  | 'package_front' 
  | 'package_back' 
  | 'package_label' 
  | 'contents' 
  | 'consolidation_before' 
  | 'consolidation_after';

export interface PackagePhoto {
  id: string;
  package_id?: string;
  consolidation_group_id?: string;
  photo_url: string;
  photo_type: PhotoType;
  caption?: string;
  file_size_bytes?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  created_at: string;
}

export interface PhotoUploadOptions {
  packageId?: string;
  consolidationGroupId?: string;
  photoType: PhotoType;
  caption?: string;
}

class PackagePhotoService {
  private static instance: PackagePhotoService;
  private readonly STORAGE_BUCKET = 'package-photos';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  private constructor() {}

  static getInstance(): PackagePhotoService {
    if (!this.instance) {
      this.instance = new PackagePhotoService();
    }
    return this.instance;
  }

  /**
   * Upload a photo for a package or consolidation group
   */
  async uploadPhoto(
    file: File,
    options: PhotoUploadOptions
  ): Promise<PackagePhoto> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      
      // Determine folder structure
      const folder = options.packageId 
        ? `packages/${options.packageId}`
        : `consolidations/${options.consolidationGroupId}`;
      
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);

      // Save photo record to database
      const { data: photo, error: dbError } = await supabase
        .from('package_photos')
        .insert({
          package_id: options.packageId,
          consolidation_group_id: options.consolidationGroupId,
          photo_url: urlData.publicUrl,
          photo_type: options.photoType,
          caption: options.caption,
          file_size_bytes: file.size,
          dimensions,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup uploaded file on database error
        await this.deleteStorageFile(filePath);
        throw new Error(`Failed to save photo record: ${dbError.message}`);
      }

      logger.info('Photo uploaded successfully', {
        photoId: photo.id,
        packageId: options.packageId,
        photoType: options.photoType,
      });

      return photo;
    } catch (error) {
      logger.error('Photo upload failed', error);
      throw error;
    }
  }

  /**
   * Get all photos for a package
   */
  async getPackagePhotos(packageId: string): Promise<PackagePhoto[]> {
    try {
      const { data, error } = await supabase
        .from('package_photos')
        .select('*')
        .eq('package_id', packageId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch package photos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get package photos', error);
      throw error;
    }
  }

  /**
   * Get all photos for a consolidation group
   */
  async getConsolidationPhotos(consolidationGroupId: string): Promise<PackagePhoto[]> {
    try {
      const { data, error } = await supabase
        .from('package_photos')
        .select('*')
        .eq('consolidation_group_id', consolidationGroupId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch consolidation photos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get consolidation photos', error);
      throw error;
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    try {
      // Get photo record
      const { data: photo, error: fetchError } = await supabase
        .from('package_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        throw new Error(`Photo not found: ${fetchError.message}`);
      }

      // Extract file path from URL
      const url = new URL(photo.photo_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf(this.STORAGE_BUCKET);
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Delete from storage
      await this.deleteStorageFile(filePath);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('package_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) {
        throw new Error(`Failed to delete photo record: ${deleteError.message}`);
      }

      logger.info('Photo deleted successfully', { photoId });
    } catch (error) {
      logger.error('Failed to delete photo', error);
      throw error;
    }
  }

  /**
   * Update photo caption
   */
  async updatePhotoCaption(photoId: string, caption: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('package_photos')
        .update({ caption })
        .eq('id', photoId);

      if (error) {
        throw new Error(`Failed to update photo caption: ${error.message}`);
      }

      logger.info('Photo caption updated', { photoId });
    } catch (error) {
      logger.error('Failed to update photo caption', error);
      throw error;
    }
  }

  /**
   * Bulk upload photos
   */
  async bulkUploadPhotos(
    files: FileList,
    options: Omit<PhotoUploadOptions, 'photoType'>
  ): Promise<PackagePhoto[]> {
    const uploadedPhotos: PackagePhoto[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Determine photo type based on index or let admin select
        const photoType = this.determinePhotoType(i, files.length);
        
        const photo = await this.uploadPhoto(file, {
          ...options,
          photoType,
        });
        
        uploadedPhotos.push(photo);
      } catch (error) {
        errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Some photos failed to upload', { errors });
    }

    return uploadedPhotos;
  }

  // Private helper methods

  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: JPEG, PNG, WebP`);
    }
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private async deleteStorageFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.warn('Failed to delete storage file', { filePath, error });
    }
  }

  private determinePhotoType(index: number, total: number): PhotoType {
    // Simple logic to assign photo types based on order
    if (index === 0) return 'package_front';
    if (index === 1) return 'package_label';
    if (index === 2) return 'package_back';
    return 'contents';
  }
}

export const packagePhotoService = PackagePhotoService.getInstance();