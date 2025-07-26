interface R2Config {
  accountId: string;
  bucketName: string;
  publicUrl: string;
  workerUrl: string;
}

interface UploadOptions {
  folder?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  sessionId?: string;
  productIndex?: string | number;
}

export class R2StorageService {
  private static instance: R2StorageService;
  private config: R2Config;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      bucketName: 'iwishbag-new',
      publicUrl: 'https://r2.whyteclub.com',
      workerUrl: import.meta.env.VITE_R2_WORKER_URL || 'https://r2-uploads.iwishbag.workers.dev'
    };
  }

  static getInstance(): R2StorageService {
    if (!R2StorageService.instance) {
      R2StorageService.instance = new R2StorageService();
    }
    return R2StorageService.instance;
  }

  /**
   * Upload a file directly to R2 using a Worker endpoint
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata
    if (options.sessionId) {
      formData.append('sessionId', options.sessionId);
    }
    if (options.productIndex !== undefined) {
      formData.append('productIndex', String(options.productIndex));
    }

    try {
      const response = await fetch(`${this.config.workerUrl}/upload/quote`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      return {
        url: result.url,
        key: result.key
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.workerUrl}/files/${key}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('R2 delete error:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(folder);

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return data.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      lastModified: new Date(file.updated_at)
    }));
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('product-images')
      .createSignedUrl(key, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: File[], options: UploadOptions = {}): Promise<Array<{ url: string; key: string }>> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    // This would return the R2 public URL in production
    // For now, return Supabase public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(key);
    
    return publicUrl;
  }

  /**
   * Upload quote attachments
   */
  async uploadQuoteAttachment(quoteId: string, file: File): Promise<{ url: string; key: string }> {
    return this.uploadFile(file, {
      folder: `quotes/${quoteId}`,
      metadata: { quoteId }
    });
  }

  /**
   * Upload product images
   */
  async uploadProductImage(productId: string, file: File): Promise<{ url: string; key: string }> {
    return this.uploadFile(file, {
      folder: `products/${productId}`,
      metadata: { productId }
    });
  }

  /**
   * Upload user profile picture
   */
  async uploadProfilePicture(userId: string, file: File): Promise<{ url: string; key: string }> {
    return this.uploadFile(file, {
      folder: `profiles/${userId}`,
      metadata: { userId }
    });
  }
}