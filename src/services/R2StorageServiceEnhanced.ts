interface R2Config {
  accountId: string;
  bucketName: string;
  apiToken: string;
  customDomain?: string;
}

interface UploadOptions {
  folder?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
}

export class R2StorageServiceEnhanced {
  private static instance: R2StorageServiceEnhanced;
  private config: R2Config;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      bucketName: 'iwishbag-new',
      apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l',
      customDomain: 'https://cdn.iwishbag.com' // You can set up a custom domain
    };
  }

  static getInstance(): R2StorageServiceEnhanced {
    if (!R2StorageServiceEnhanced.instance) {
      R2StorageServiceEnhanced.instance = new R2StorageServiceEnhanced();
    }
    return R2StorageServiceEnhanced.instance;
  }

  /**
   * Generate a unique key for the file
   */
  private generateKey(file: File, folder?: string): string {
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return folder 
      ? `${folder}/${timestamp}-${uniqueId}-${sanitizedName}`
      : `uploads/${timestamp}-${uniqueId}-${sanitizedName}`;
  }

  /**
   * Create a presigned URL for uploading
   */
  async createPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/r2/buckets/${this.config.bucketName}/objects/${key}/sign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'PutObject',
            expires: Math.floor(Date.now() / 1000) + expiresIn,
            httpMethod: 'PUT',
            contentType
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create presigned URL: ${response.status}`);
      }

      const data = await response.json();
      return data.result.signedUrl;
    } catch (error) {
      console.error('Presigned URL creation error:', error);
      // Fallback to direct upload
      throw error;
    }
  }

  /**
   * Upload a file directly to R2
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<{ url: string; key: string }> {
    const { folder, contentType } = options;
    const key = this.generateKey(file, folder);
    const fileContentType = contentType || file.type || 'application/octet-stream';

    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Upload to R2 using REST API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/r2/buckets/${this.config.bucketName}/objects/${key}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': fileContentType,
          },
          body: arrayBuffer
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      
      return {
        url: this.getAccessUrl(key),
        key
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a signed URL for accessing a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/r2/buckets/${this.config.bucketName}/objects/${key}/sign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'GetObject',
            expires: Math.floor(Date.now() / 1000) + expiresIn,
            httpMethod: 'GET'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create signed URL: ${response.status}`);
      }

      const data = await response.json();
      return data.result.signedUrl;
    } catch (error) {
      console.error('Signed URL creation error:', error);
      // Return the key for now - in production you'd set up a Worker or custom domain
      return this.getAccessUrl(key);
    }
  }

  /**
   * Get access URL (custom domain or fallback to direct key)
   */
  private getAccessUrl(key: string): string {
    if (this.config.customDomain) {
      return `${this.config.customDomain}/${key}`;
    }
    // For development, return a URL that indicates R2 storage
    return `/api/r2/${key}`;
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/r2/buckets/${this.config.bucketName}/objects/${key}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorData}`);
      }
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in the bucket (or a specific folder)
   */
  async listFiles(prefix?: string): Promise<Array<{ name: string; size: number; lastModified: Date; key: string; url: string }>> {
    try {
      const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/r2/buckets/${this.config.bucketName}/objects`);
      if (prefix) {
        url.searchParams.set('prefix', prefix);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`List failed: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      return data.result.map((obj: R2Object) => ({
        name: obj.key.split('/').pop() || obj.key,
        size: obj.size,
        lastModified: new Date(obj.uploaded),
        key: obj.key,
        url: this.getAccessUrl(obj.key)
      }));
    } catch (error) {
      console.error('R2 list error:', error);
      throw new Error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: File[], options: UploadOptions = {}): Promise<Array<{ url: string; key: string }>> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
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

  /**
   * Check if R2 is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listFiles();
      return true;
    } catch {
      return false;
    }
  }
}