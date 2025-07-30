
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