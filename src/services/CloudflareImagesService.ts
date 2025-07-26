/**
 * Cloudflare Images Service
 * 
 * Handles image uploads, transformations, and delivery
 * Automatically optimizes images for web performance
 */

interface ImageUploadResponse {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

interface ImageVariant {
  name: string;
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
}

export class CloudflareImagesService {
  private static instance: CloudflareImagesService;
  private accountId: string;
  private apiToken: string;
  private baseUrl: string;
  private imageDeliveryUrl: string;

  private readonly defaultVariants: Record<string, ImageVariant> = {
    thumbnail: {
      name: 'thumbnail',
      width: 150,
      height: 150,
      fit: 'cover',
      quality: 85,
      format: 'auto'
    },
    small: {
      name: 'small',
      width: 400,
      height: 400,
      fit: 'contain',
      quality: 85,
      format: 'auto'
    },
    medium: {
      name: 'medium',
      width: 800,
      height: 800,
      fit: 'contain',
      quality: 85,
      format: 'auto'
    },
    large: {
      name: 'large',
      width: 1200,
      height: 1200,
      fit: 'contain',
      quality: 90,
      format: 'auto'
    },
    public: {
      name: 'public',
      width: 1600,
      fit: 'scale-down',
      quality: 90,
      format: 'auto'
    }
  };

  private constructor() {
    this.accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`;
    this.imageDeliveryUrl = import.meta.env.VITE_CLOUDFLARE_IMAGES_DELIVERY_URL || 
      `https://imagedelivery.net/${this.accountId}`;
  }

  static getInstance(): CloudflareImagesService {
    if (!CloudflareImagesService.instance) {
      CloudflareImagesService.instance = new CloudflareImagesService();
    }
    return CloudflareImagesService.instance;
  }

  /**
   * Upload image to Cloudflare Images
   */
  async uploadImage(
    file: File | Blob | string, // File, Blob, or URL
    metadata?: Record<string, string>
  ): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();

      // Handle different input types
      if (file instanceof File || file instanceof Blob) {
        formData.append('file', file);
      } else if (typeof file === 'string') {
        // URL upload
        formData.append('url', file);
      }

      // Add metadata if provided
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          formData.append(`metadata.${key}`, value);
        });
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.message || 'Upload failed');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images in batch
   */
  async uploadBatch(
    files: Array<File | { file: File; metadata?: Record<string, string> }>
  ): Promise<ImageUploadResponse[]> {
    const uploadPromises = files.map(fileItem => {
      if (fileItem instanceof File) {
        return this.uploadImage(fileItem);
      }
      return this.uploadImage(fileItem.file, fileItem.metadata);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Get image URL with variant
   */
  getImageUrl(imageId: string, variant: string = 'public'): string {
    return `${this.imageDeliveryUrl}/${imageId}/${variant}`;
  }

  /**
   * Get all variant URLs for an image
   */
  getImageVariants(imageId: string): Record<string, string> {
    const variants: Record<string, string> = {};
    
    Object.keys(this.defaultVariants).forEach(variantName => {
      variants[variantName] = this.getImageUrl(imageId, variantName);
    });

    return variants;
  }

  /**
   * Get responsive image srcset
   */
  getResponsiveSrcSet(imageId: string): string {
    return [
      `${this.getImageUrl(imageId, 'small')} 400w`,
      `${this.getImageUrl(imageId, 'medium')} 800w`,
      `${this.getImageUrl(imageId, 'large')} 1200w`,
      `${this.getImageUrl(imageId, 'public')} 1600w`,
    ].join(', ');
  }

  /**
   * Delete image from Cloudflare
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Image deletion error:', error);
      return false;
    }
  }

  /**
   * Get image details
   */
  async getImageDetails(imageId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get image details');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Get image details error:', error);
      throw error;
    }
  }

  /**
   * List all images with pagination
   */
  async listImages(page = 1, perPage = 100): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}?page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to list images');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('List images error:', error);
      throw error;
    }
  }

  /**
   * Update image metadata
   */
  async updateMetadata(
    imageId: string,
    metadata: Record<string, string>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata }),
      });

      return response.ok;
    } catch (error) {
      console.error('Update metadata error:', error);
      return false;
    }
  }

  /**
   * Generate signed URL for private images
   */
  async generateSignedUrl(
    imageId: string,
    variant: string = 'public',
    expiresIn: number = 3600 // seconds
  ): Promise<string> {
    // Implementation depends on your Cloudflare Images settings
    // This is a placeholder for signed URL generation
    const expiry = Date.now() + (expiresIn * 1000);
    return `${this.getImageUrl(imageId, variant)}?exp=${expiry}`;
  }

  /**
   * Optimize image on upload with custom settings
   */
  async uploadWithOptimization(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif';
      metadata?: Record<string, string>;
    } = {}
  ): Promise<ImageUploadResponse> {
    // Pre-process image if needed
    let processedFile = file;
    
    if (options.maxWidth || options.maxHeight) {
      processedFile = await this.resizeImageClient(
        file,
        options.maxWidth,
        options.maxHeight
      );
    }

    return this.uploadImage(processedFile, options.metadata);
  }

  /**
   * Client-side image resize before upload
   */
  private async resizeImageClient(
    file: File,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (maxWidth && width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (maxHeight && height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            resolve(file);
          }
        }, file.type);
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export const cloudflareImagesService = CloudflareImagesService.getInstance();