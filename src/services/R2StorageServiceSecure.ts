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

export class R2StorageServiceSecure {
  private static instance: R2StorageServiceSecure;
  private baseUrl: string;
  private apiKey: string;

  private constructor() {
    // Use environment variables for Supabase configuration
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!this.baseUrl || !this.apiKey) {
      console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
  }

  static getInstance(): R2StorageServiceSecure {
    if (!R2StorageServiceSecure.instance) {
      R2StorageServiceSecure.instance = new R2StorageServiceSecure();
    }
    return R2StorageServiceSecure.instance;
  }

  async upload(file: File, options: UploadOptions = {}): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const formData = new FormData();
      
      // Generate file key with optional folder
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const key = options.folder ? `${options.folder}/${fileName}` : fileName;
      
      formData.append('file', file);
      formData.append('key', key);
      formData.append('bucketName', 'iwishbag-uploads');
      
      // Add metadata if provided
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      const response = await fetch(`${this.baseUrl}/storage/v1/object/iwishbag-uploads/${key}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        url: `${this.baseUrl}/storage/v1/object/public/iwishbag-uploads/${key}`,
      };
    } catch (error) {
      console.error('R2 Upload Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  async delete(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/storage/v1/object/iwishbag-uploads/${key}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorData}`);
      }

      return { success: true };
    } catch (error) {
      console.error('R2 Delete Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error',
      };
    }
  }

  async list(folder?: string): Promise<{ success: boolean; files?: R2File[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (folder) {
        params.append('prefix', folder);
      }
      params.append('limit', '100');

      const response = await fetch(`${this.baseUrl}/storage/v1/object/list/iwishbag-uploads?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`List failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      const files: R2File[] = result.map((item: any) => ({
        name: item.name,
        size: item.metadata?.size || 0,
        lastModified: new Date(item.updated_at),
        key: item.name,
        url: `${this.baseUrl}/storage/v1/object/public/iwishbag-uploads/${item.name}`,
      }));

      return {
        success: true,
        files,
      };
    } catch (error) {
      console.error('R2 List Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown list error',
      };
    }
  }
}