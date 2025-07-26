import { supabase } from '../integrations/supabase/client';

interface UploadOptions {
  folder?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface R2File {
  name: string;
  size: number;
  lastModified: Date;
  key: string;
  url: string;
}

export class R2StorageServiceSupabase {
  private static instance: R2StorageServiceSupabase;
  private baseUrl: string;

  private constructor() {
    // Use Supabase project URL for Edge Functions
    this.baseUrl = supabase.supabaseUrl;
  }

  static getInstance(): R2StorageServiceSupabase {
    if (!R2StorageServiceSupabase.instance) {
      R2StorageServiceSupabase.instance = new R2StorageServiceSupabase();
    }
    return R2StorageServiceSupabase.instance;
  }

  /**
   * Upload a file to R2 via Supabase Edge Function
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<{ url: string; key: string }> {
    const { folder = 'uploads' } = options;

    try {
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
        'apikey': supabase.supabaseKey,
      };

      // Upload via Edge Function
      const response = await fetch(`${this.baseUrl}/functions/v1/r2-upload/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        url: `${this.baseUrl}/functions/v1/r2-proxy/${result.key}`,
        key: result.key
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${this.baseUrl}/functions/v1/r2-upload/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(prefix?: string): Promise<R2File[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const url = new URL(`${this.baseUrl}/functions/v1/r2-upload/list`);
      if (prefix) {
        url.searchParams.set('prefix', prefix);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey,
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`List failed: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'List failed');
      }

      return result.files.map((file: any) => ({
        ...file,
        url: `${this.baseUrl}/functions/v1/r2-proxy/${file.key}`
      }));
    } catch (error) {
      console.error('R2 list error:', error);
      throw new Error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.baseUrl}/functions/v1/r2-proxy/${key}`;
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