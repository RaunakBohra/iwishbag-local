import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * D1 Sync Service
 * Synchronizes data from Supabase to Cloudflare D1 Edge Database
 */
export class D1SyncService {
  private static instance: D1SyncService;
  private syncInterval: NodeJS.Timer | null = null;
  private isSyncing = false;
  
  // Get sync API key from environment
  private readonly SYNC_API_KEY = import.meta.env.VITE_D1_SYNC_API_KEY || 'default-sync-key';
  private readonly EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || 'https://iwishbag-edge-api.rnkbohra.workers.dev';

  private constructor() {}

  static getInstance(): D1SyncService {
    if (!D1SyncService.instance) {
      D1SyncService.instance = new D1SyncService();
    }
    return D1SyncService.instance;
  }

  /**
   * Start automatic sync with configurable interval
   */
  startAutoSync(intervalMinutes: number = 5) {
    if (this.syncInterval) {
      logger.info('Auto-sync already running', null, 'D1Sync');
      return;
    }

    // Run initial sync
    this.syncAll();

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMinutes * 60 * 1000);

    logger.info(`Auto-sync started with ${intervalMinutes} minute interval`, null, 'D1Sync');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Auto-sync stopped', null, 'D1Sync');
    }
  }

  /**
   * Sync all data types
   */
  async syncAll() {
    if (this.isSyncing) {
      logger.warn('Sync already in progress', null, 'D1Sync');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      logger.info('Starting full D1 sync', null, 'D1Sync');

      const results = await Promise.allSettled([
        this.syncCountrySettings(),
        this.syncExchangeRates(),
        this.syncPopularProducts(),
        this.syncHSNTaxRates()
      ]);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`D1 sync completed in ${Date.now() - startTime}ms`, {
        successful,
        failed,
        details: results
      }, 'D1Sync');

      return { successful, failed };
    } catch (error) {
      logger.error('D1 sync failed', error, 'D1Sync');
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync country settings
   */
  async syncCountrySettings() {
    try {
      const { data: countries, error } = await supabase
        .from('country_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!countries || countries.length === 0) return;

      // Transform data for D1
      const transformedCountries = countries.map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency,
        symbol: country.symbol,
        exchange_rate: country.exchange_rate,
        flag: country.flag,
        phone_prefix: country.phone_prefix,
        payment_gateways: country.payment_gateways || [],
        shipping_zones: country.shipping_zones || []
      }));

      // Send to D1 via edge API
      const response = await fetch(`${this.EDGE_API_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.SYNC_API_KEY
        },
        body: JSON.stringify({
          type: 'country',
          data: transformedCountries
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      logger.info(`Synced ${countries.length} countries to D1`, null, 'D1Sync');
    } catch (error) {
      logger.error('Failed to sync country settings', error, 'D1Sync');
      throw error;
    }
  }

  /**
   * Sync exchange rates
   */
  async syncExchangeRates() {
    try {
      const { data: countries, error } = await supabase
        .from('country_settings')
        .select('code, currency, exchange_rate')
        .eq('is_active', true);

      if (error) throw error;
      if (!countries || countries.length === 0) return;

      // Generate exchange rate pairs
      const rates = [];
      
      // USD to all currencies
      countries.forEach(country => {
        if (country.currency !== 'USD') {
          rates.push({
            pair: `USD_${country.currency}`,
            rate: country.exchange_rate
          });
          
          // Also add reverse rate
          rates.push({
            pair: `${country.currency}_USD`,
            rate: 1 / country.exchange_rate
          });
        }
      });

      // Add some cross rates (e.g., INR to NPR)
      const inr = countries.find(c => c.currency === 'INR');
      const npr = countries.find(c => c.currency === 'NPR');
      if (inr && npr) {
        rates.push({
          pair: 'INR_NPR',
          rate: npr.exchange_rate / inr.exchange_rate
        });
        rates.push({
          pair: 'NPR_INR',
          rate: inr.exchange_rate / npr.exchange_rate
        });
      }

      // Send to D1
      const response = await fetch(`${this.EDGE_API_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.SYNC_API_KEY
        },
        body: JSON.stringify({
          type: 'exchange_rates',
          rates
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      logger.info(`Synced ${rates.length} exchange rates to D1`, null, 'D1Sync');
    } catch (error) {
      logger.error('Failed to sync exchange rates', error, 'D1Sync');
      throw error;
    }
  }

  /**
   * Sync popular products (top 100)
   */
  async syncPopularProducts() {
    try {
      // Get products ordered by view count and purchase count
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!products || products.length === 0) return;

      // Transform for D1
      const transformedProducts = products.map((product, index) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        hsn_code: product.hsn_code,
        avg_weight: product.weight,
        avg_price_usd: product.price_usd,
        popularity_score: 100 - index, // Simple scoring based on rank
        search_count: product.view_count || 0,
        purchase_count: product.purchase_count || 0,
        metadata: {
          image_url: product.image_url,
          description: product.description
        }
      }));

      // Note: Since we don't have a products table in Supabase yet,
      // this is a placeholder. In production, you'd sync actual product data.
      logger.info('Product sync skipped - no products table', null, 'D1Sync');
    } catch (error) {
      logger.error('Failed to sync popular products', error, 'D1Sync');
      // Don't throw - this is expected until products table exists
    }
  }

  /**
   * Sync HSN tax rates
   */
  async syncHSNTaxRates() {
    try {
      const { data: hsnRates, error } = await supabase
        .from('hsn_master')
        .select('*');

      if (error) throw error;
      if (!hsnRates || hsnRates.length === 0) return;

      // Transform HSN data for different country routes
      const taxRates = [];
      const countries = ['US', 'IN', 'NP', 'GB', 'AU', 'CA'];
      
      hsnRates.forEach(hsn => {
        // Create tax rates for common routes
        countries.forEach(origin => {
          countries.forEach(destination => {
            if (origin !== destination) {
              taxRates.push({
                hsn_code: hsn.hsn_code,
                origin_country: origin,
                destination_country: destination,
                customs_rate: hsn.customs_duty_rate || 0,
                gst_rate: destination === 'IN' ? (hsn.india_gst_rate || 0) : 0,
                vat_rate: ['GB', 'EU'].includes(destination) ? 0.20 : 0,
                additional_taxes: {},
                restrictions: hsn.restricted ? ['Restricted item'] : []
              });
            }
          });
        });
      });

      // Note: This would need the actual D1 sync endpoint to handle HSN data
      logger.info(`Prepared ${taxRates.length} HSN tax rates for sync`, null, 'D1Sync');
    } catch (error) {
      logger.error('Failed to sync HSN tax rates', error, 'D1Sync');
      // Don't throw - HSN sync is not critical
    }
  }

  /**
   * Manual sync trigger for specific data type
   */
  async syncDataType(dataType: 'countries' | 'rates' | 'products' | 'hsn') {
    switch (dataType) {
      case 'countries':
        return this.syncCountrySettings();
      case 'rates':
        return this.syncExchangeRates();
      case 'products':
        return this.syncPopularProducts();
      case 'hsn':
        return this.syncHSNTaxRates();
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isRunning: this.syncInterval !== null,
      isSyncing: this.isSyncing,
      lastSync: localStorage.getItem('d1_last_sync') || null
    };
  }
}

// Export singleton instance
export const d1SyncService = D1SyncService.getInstance();