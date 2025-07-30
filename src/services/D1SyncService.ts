import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

class D1SyncService {
  private static instance: D1SyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private readonly EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || '';
  private readonly SYNC_API_KEY = import.meta.env.VITE_SYNC_API_KEY || '';

  static getInstance(): D1SyncService {
    if (!D1SyncService.instance) {
      D1SyncService.instance = new D1SyncService();
    }
    return D1SyncService.instance;
  }

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