import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CachedProduct {
  url: string;
  data: any;
  source: string;
  cached_at: string;
  expires_at: string;
}

export class ScrapingCache {
  private supabase: any;
  private cacheTable = 'scraped_products_cache';
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get cached product data if available and not expired
   */
  async get(url: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.cacheTable)
        .select('*')
        .eq('url', url)
        .gt('expires_at', new Date().toISOString())
        .order('cached_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      console.log(`📦 Cache hit for URL: ${url}`);
      return data.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store scraped product data in cache
   */
  async set(url: string, productData: any, source: string): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.cacheDuration);

      const cacheEntry: CachedProduct = {
        url,
        data: productData,
        source,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { error } = await this.supabase
        .from(this.cacheTable)
        .upsert(cacheEntry, { onConflict: 'url' });

      if (error) {
        console.error('Cache set error:', error);
      } else {
        console.log(`💾 Cached product data for URL: ${url}`);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Check if we have valid cached data for a URL
   */
  async has(url: string): Promise<boolean> {
    const cached = await this.get(url);
    return cached !== null;
  }

  /**
   * Clear expired cache entries
   */
  async cleanup(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.cacheTable)
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (!error) {
        console.log('🧹 Cleaned up expired cache entries');
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ total: number; expired: number; hit_rate?: number }> {
    try {
      const now = new Date().toISOString();
      
      const { count: total } = await this.supabase
        .from(this.cacheTable)
        .select('*', { count: 'exact', head: true });

      const { count: expired } = await this.supabase
        .from(this.cacheTable)
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', now);

      return {
        total: total || 0,
        expired: expired || 0,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { total: 0, expired: 0 };
    }
  }
}