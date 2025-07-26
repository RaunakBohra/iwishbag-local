/**
 * D1 Service for Cloudflare Worker
 * Handles all D1 database operations
 */

export class CloudflareD1Service {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get country settings from edge cache
   */
  async getCountrySettings(code) {
    try {
      const result = await this.db
        .prepare('SELECT * FROM country_settings_cache WHERE code = ?')
        .bind(code)
        .first();

      if (result) {
        // Parse JSON fields
        if (result.payment_gateways) {
          result.payment_gateways = JSON.parse(result.payment_gateways);
        }
        if (result.shipping_zones) {
          result.shipping_zones = JSON.parse(result.shipping_zones);
        }
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
  async getAllCountrySettings() {
    try {
      const result = await this.db
        .prepare('SELECT * FROM country_settings_cache ORDER BY name')
        .all();

      const countries = result.results || [];
      
      // Parse JSON fields
      countries.forEach(country => {
        if (country.payment_gateways) {
          country.payment_gateways = JSON.parse(country.payment_gateways);
        }
        if (country.shipping_zones) {
          country.shipping_zones = JSON.parse(country.shipping_zones);
        }
      });

      return countries;
    } catch (error) {
      console.error('D1 getAllCountrySettings error:', error);
      return [];
    }
  }

  /**
   * Get popular products
   */
  async getPopularProducts(limit = 10) {
    try {
      const result = await this.db
        .prepare('SELECT * FROM popular_products_cache ORDER BY popularity_score DESC LIMIT ?')
        .bind(limit)
        .all();

      const products = result.results || [];
      
      // Parse metadata
      products.forEach(product => {
        if (product.metadata) {
          product.metadata = JSON.parse(product.metadata);
        }
      });

      return products;
    } catch (error) {
      console.error('D1 getPopularProducts error:', error);
      return [];
    }
  }

  /**
   * Get HSN tax rates for a route
   */
  async getHSNTaxRates(hsn_code, origin, destination) {
    try {
      const result = await this.db
        .prepare(
          'SELECT * FROM hsn_tax_cache WHERE hsn_code = ? AND origin_country = ? AND destination_country = ?'
        )
        .bind(hsn_code, origin, destination)
        .first();

      if (result) {
        // Parse JSON fields
        if (result.additional_taxes) {
          result.additional_taxes = JSON.parse(result.additional_taxes);
        }
        if (result.restrictions) {
          result.restrictions = JSON.parse(result.restrictions);
        }
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
  async updateCountrySettings(country) {
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
      
      return true;
    } catch (error) {
      console.error('D1 updateCountrySettings error:', error);
      return false;
    }
  }

  /**
   * Track product popularity
   */
  async trackProductAccess(productId, increment = 'search') {
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
    } catch (error) {
      console.error('D1 trackProductAccess error:', error);
    }
  }

  /**
   * Get exchange rate from cache
   */
  async getExchangeRate(from, to) {
    try {
      const result = await this.db
        .prepare('SELECT rate FROM exchange_rates_cache WHERE currency_pair = ?')
        .bind(`${from}_${to}`)
        .first();

      return result ? result.rate : null;
    } catch (error) {
      console.error('D1 getExchangeRate error:', error);
      return null;
    }
  }

  /**
   * Batch update exchange rates
   */
  async updateExchangeRates(rates) {
    try {
      const statements = rates.map(({ pair, rate }) =>
        this.db.prepare(
          'INSERT OR REPLACE INTO exchange_rates_cache (currency_pair, rate, updated_at) VALUES (?, ?, ?)'
        ).bind(pair, rate, Math.floor(Date.now() / 1000))
      );

      await this.db.batch(statements);
      return true;
    } catch (error) {
      console.error('D1 updateExchangeRates error:', error);
      return false;
    }
  }
}