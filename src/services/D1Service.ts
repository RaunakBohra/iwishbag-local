/**
 * Cloudflare D1 Edge Database Service
 * 
 * Provides instant global access to frequently used data
 * Reduces Supabase calls and improves performance
 */

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

export interface CountrySettingsCached {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  exchange_rate: number;
  flag?: string;
  phone_prefix?: string;
  payment_gateways?: string[];
  shipping_zones?: string[];
  updated_at: number;
}

export interface PopularProductCached {
  id: string;
  name: string;
  category?: string;
  hsn_code?: string;
  avg_weight?: number;
  avg_price_usd?: number;
  popularity_score: number;
  search_count: number;
  purchase_count: number;
  last_accessed: number;
  metadata?: Record<string, any>;
}

export interface HSNTaxCached {
  hsn_code: string;
  origin_country: string;
  destination_country: string;
  customs_rate?: number;
  gst_rate?: number;
  vat_rate?: number;
  additional_taxes?: Record<string, number>;
  restrictions?: string[];
  updated_at: number;
}

export class CloudflareD1Service {
  private static instance: CloudflareD1Service;
  private db: D1Database | null = null;
  private cache = new Map<string, { data: any; expires: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CloudflareD1Service {
    if (!CloudflareD1Service.instance) {
      CloudflareD1Service.instance = new CloudflareD1Service();
    }
    return CloudflareD1Service.instance;
  }

  /**
   * Initialize D1 connection (called from Worker)
   */
  initialize(db: D1Database) {
    this.db = db;
  }

  /**
   * Get country settings from edge cache
   */
  async getCountrySettings(code: string): Promise<CountrySettingsCached | null> {
    const cacheKey = `country:${code}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.db) return null;

    try {
      const result = await this.db
        .prepare('SELECT * FROM country_settings_cache WHERE code = ?')
        .bind(code)
        .first<CountrySettingsCached>();

      if (result) {
        // Parse JSON fields
        if (result.payment_gateways) {
          result.payment_gateways = JSON.parse(result.payment_gateways as any);
        }
        if (result.shipping_zones) {
          result.shipping_zones = JSON.parse(result.shipping_zones as any);
        }
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('D1 getCountrySettings error:', error);
      return null;
    }
  }

  /**
   * Get all country settings
   */
  async getAllCountrySettings(): Promise<CountrySettingsCached[]> {
    const cacheKey = 'countries:all';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.db) return [];

    try {
      const result = await this.db
        .prepare('SELECT * FROM country_settings_cache ORDER BY name')
        .all<CountrySettingsCached>();

      const countries = result.results || [];
      
      // Parse JSON fields
      countries.forEach(country => {
        if (country.payment_gateways) {
          country.payment_gateways = JSON.parse(country.payment_gateways as any);
        }
        if (country.shipping_zones) {
          country.shipping_zones = JSON.parse(country.shipping_zones as any);
        }
      });

      this.setCache(cacheKey, countries);
      return countries;
    } catch (error) {
      console.error('D1 getAllCountrySettings error:', error);
      return [];
    }
  }

  /**
   * Get popular products
   */
  async getPopularProducts(limit = 10): Promise<PopularProductCached[]> {
    const cacheKey = `products:popular:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.db) return [];

    try {
      const result = await this.db
        .prepare('SELECT * FROM popular_products_cache ORDER BY popularity_score DESC LIMIT ?')
        .bind(limit)
        .all<PopularProductCached>();

      const products = result.results || [];
      
      // Parse metadata
      products.forEach(product => {
        if (product.metadata) {
          product.metadata = JSON.parse(product.metadata as any);
        }
      });

      this.setCache(cacheKey, products);
      return products;
    } catch (error) {
      console.error('D1 getPopularProducts error:', error);
      return [];
    }
  }

  /**
   * Get HSN tax rates for a route
   */
  async getHSNTaxRates(
    hsn_code: string,
    origin: string,
    destination: string
  ): Promise<HSNTaxCached | null> {
    const cacheKey = `hsn:${hsn_code}:${origin}:${destination}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.db) return null;

    try {
      const result = await this.db
        .prepare(
          'SELECT * FROM hsn_tax_cache WHERE hsn_code = ? AND origin_country = ? AND destination_country = ?'
        )
        .bind(hsn_code, origin, destination)
        .first<HSNTaxCached>();

      if (result) {
        // Parse JSON fields
        if (result.additional_taxes) {
          result.additional_taxes = JSON.parse(result.additional_taxes as any);
        }
        if (result.restrictions) {
          result.restrictions = JSON.parse(result.restrictions as any);
        }
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('D1 getHSNTaxRates error:', error);
      return null;
    }
  }

  /**
   * Update country settings cache
   */
  async updateCountrySettings(country: CountrySettingsCached): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db
        .prepare(`
          INSERT OR REPLACE INTO country_settings_cache 
          (code, name, currency, symbol, exchange_rate, flag, phone_prefix, payment_gateways, shipping_zones, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          country.code,
          country.name,
          country.currency,
          country.symbol,
          country.exchange_rate,
          country.flag || null,
          country.phone_prefix || null,
          JSON.stringify(country.payment_gateways || []),
          JSON.stringify(country.shipping_zones || []),
          Math.floor(Date.now() / 1000)
        )
        .run();

      // Clear cache
      this.clearCache(`country:${country.code}`);
      this.clearCache('countries:all');
      
      return true;
    } catch (error) {
      console.error('D1 updateCountrySettings error:', error);
      return false;
    }
  }

  /**
   * Track product popularity
   */
  async trackProductAccess(productId: string, increment: 'search' | 'purchase' = 'search'): Promise<void> {
    if (!this.db) return;

    try {
      const column = increment === 'search' ? 'search_count' : 'purchase_count';
      
      await this.db
        .prepare(`
          UPDATE popular_products_cache 
          SET ${column} = ${column} + 1,
              popularity_score = search_count + (purchase_count * 10),
              last_accessed = ?
          WHERE id = ?
        `)
        .bind(Math.floor(Date.now() / 1000), productId)
        .run();

      // Clear cache
      this.clearCache('products:popular:10');
      this.clearCache('products:popular:100');
    } catch (error) {
      console.error('D1 trackProductAccess error:', error);
    }
  }

  /**
   * Get exchange rate from cache
   */
  async getExchangeRate(from: string, to: string): Promise<number | null> {
    const cacheKey = `rate:${from}_${to}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (!this.db) return null;

    try {
      const result = await this.db
        .prepare('SELECT rate FROM exchange_rates_cache WHERE currency_pair = ?')
        .bind(`${from}_${to}`)
        .first<{ rate: number }>();

      if (result) {
        this.setCache(cacheKey, result.rate, 60000); // 1 minute cache
        return result.rate;
      }

      return null;
    } catch (error) {
      console.error('D1 getExchangeRate error:', error);
      return null;
    }
  }

  /**
   * Batch update exchange rates
   */
  async updateExchangeRates(rates: Array<{ pair: string; rate: number }>): Promise<boolean> {
    if (!this.db) return false;

    try {
      const statements = rates.map(({ pair, rate }) =>
        this.db!.prepare(
          'INSERT OR REPLACE INTO exchange_rates_cache (currency_pair, rate, updated_at) VALUES (?, ?, ?)'
        ).bind(pair, rate, Math.floor(Date.now() / 1000))
      );

      await this.db.batch(statements);

      // Clear rate caches
      rates.forEach(({ pair }) => this.clearCache(`rate:${pair}`));
      
      return true;
    } catch (error) {
      console.error('D1 updateExchangeRates error:', error);
      return false;
    }
  }

  /**
   * Local cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.cacheTTL)
    });
  }

  private clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const d1Service = CloudflareD1Service.getInstance();