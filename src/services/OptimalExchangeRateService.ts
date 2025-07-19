/**
 * OptimalExchangeRateService - Intelligent Exchange Rate Management
 * 
 * This service implements a 4-tier fallback system for exchange rates:
 * 1. Direct shipping routes (most accurate for specific routes)
 * 2. Currency-matched routes (same currency pairs)
 * 3. USD intermediary conversion (via API or country defaults)
 * 4. Hardcoded fallbacks (last resort)
 * 
 * All rates are cached for 15 minutes to reduce database calls and API usage.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ExchangeRateResult {
  rate: number;
  source: 'route_direct' | 'route_currency' | 'api' | 'country_default' | 'fallback';
  method: 'direct' | 'intermediary_usd' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
  fromCurrency: string;
  toCurrency: string;
}

interface CachedRate extends ExchangeRateResult {
  expiresAt: Date;
}

class OptimalExchangeRateService {
  private cache = new Map<string, CachedRate>();
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  
  // Hardcoded fallback rates (last resort)
  private readonly FALLBACK_RATES: Record<string, Record<string, number>> = {
    USD: {
      INR: 83.0,
      NPR: 132.8,
      EUR: 0.92,
      GBP: 0.79,
      SGD: 1.35,
      CNY: 7.25,
      JPY: 150.0,
      CAD: 1.36,
      AUD: 1.50,
    },
    INR: {
      USD: 1 / 83.0,
      NPR: 1.6,
      EUR: 0.92 / 83.0,
      GBP: 0.79 / 83.0,
    },
    NPR: {
      USD: 1 / 132.8,
      INR: 1 / 1.6,
      EUR: 0.92 / 132.8,
      GBP: 0.79 / 132.8,
    },
  };

  /**
   * Get optimal exchange rate with comprehensive fallback system
   */
  async getOptimalExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    fromCountry?: string,
    toCountry?: string
  ): Promise<ExchangeRateResult> {
    // Same currency = 1.0
    if (fromCurrency === toCurrency) {
      return {
        rate: 1.0,
        source: 'fallback',
        method: 'direct',
        confidence: 'high',
        timestamp: new Date(),
        fromCurrency,
        toCurrency,
      };
    }

    const cacheKey = `${fromCurrency}-${toCurrency}-${fromCountry || ''}-${toCountry || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return {
        rate: cached.rate,
        source: cached.source,
        method: cached.method,
        confidence: cached.confidence,
        timestamp: cached.timestamp,
        fromCurrency: cached.fromCurrency,
        toCurrency: cached.toCurrency,
      };
    }

    try {
      // Tier 1: Direct shipping route (highest confidence)
      if (fromCountry && toCountry) {
        const directRoute = await this.getDirectRouteRate(fromCountry, toCountry, fromCurrency, toCurrency);
        if (directRoute) {
          this.cacheResult(cacheKey, directRoute);
          return directRoute;
        }
      }

      // Tier 2: Currency-matched routes (high confidence)
      const currencyRoute = await this.getCurrencyMatchedRoute(fromCurrency, toCurrency);
      if (currencyRoute) {
        this.cacheResult(cacheKey, currencyRoute);
        return currencyRoute;
      }

      // Tier 3: USD intermediary via API (medium confidence)
      const apiRate = await this.getAPIRate(fromCurrency, toCurrency);
      if (apiRate) {
        this.cacheResult(cacheKey, apiRate);
        return apiRate;
      }

      // Tier 4: Country defaults via USD (medium confidence)
      const countryRate = await this.getCountryDefaultRate(fromCurrency, toCurrency);
      if (countryRate) {
        this.cacheResult(cacheKey, countryRate);
        return countryRate;
      }

      // Tier 5: Hardcoded fallback (low confidence)
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      this.cacheResult(cacheKey, fallbackRate);
      return fallbackRate;

    } catch (error) {
      console.error('Error getting optimal exchange rate:', error);
      const fallbackRate = this.getFallbackRate(fromCurrency, toCurrency);
      this.cacheResult(cacheKey, fallbackRate);
      return fallbackRate;
    }
  }

  /**
   * Tier 1: Get rate from direct shipping route
   */
  private async getDirectRouteRate(
    fromCountry: string,
    toCountry: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResult | null> {
    try {
      const { data: route } = await supabase
        .from('shipping_routes')
        .select('exchange_rate, exchange_rate_last_updated')
        .eq('origin_country', fromCountry)
        .eq('destination_country', toCountry)
        .not('exchange_rate', 'is', null)
        .order('exchange_rate_last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (route?.exchange_rate && route.exchange_rate > 0) {
        return {
          rate: route.exchange_rate,
          source: 'route_direct',
          method: 'direct',
          confidence: 'high',
          timestamp: new Date(),
          fromCurrency,
          toCurrency,
        };
      }
    } catch (error) {
      console.warn('Failed to get direct route rate:', error);
    }
    return null;
  }

  /**
   * Tier 2: Get rate from routes with matching currencies
   */
  private async getCurrencyMatchedRoute(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResult | null> {
    try {
      const { data: routes } = await supabase
        .from('shipping_routes')
        .select(`
          exchange_rate,
          exchange_rate_last_updated,
          origin_country,
          destination_country,
          country_settings!shipping_routes_origin_country_fkey(currency),
          country_settings!shipping_routes_destination_country_fkey(currency)
        `)
        .not('exchange_rate', 'is', null)
        .order('exchange_rate_last_updated', { ascending: false })
        .limit(10);

      if (routes && routes.length > 0) {
        for (const route of routes) {
          // Type assertion to handle the joined data structure
          const originCountry = route.country_settings as any;
          const destCountry = route.country_settings as any;
          
          // Check if this route matches our currency pair
          if (
            originCountry?.currency === fromCurrency &&
            destCountry?.currency === toCurrency &&
            route.exchange_rate &&
            route.exchange_rate > 0
          ) {
            return {
              rate: route.exchange_rate,
              source: 'route_currency',
              method: 'direct',
              confidence: 'high',
              timestamp: new Date(),
              fromCurrency,
              toCurrency,
            };
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get currency-matched route rate:', error);
    }
    return null;
  }

  /**
   * Tier 3: Get rate from external API via USD intermediary
   */
  private async getAPIRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResult | null> {
    try {
      // Check database cache first
      const { data: cachedRate } = await supabase
        .from('exchange_rate_cache')
        .select('rate, created_at, expires_at')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('source', 'api')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedRate?.rate) {
        return {
          rate: cachedRate.rate,
          source: 'api',
          method: fromCurrency === 'USD' || toCurrency === 'USD' ? 'direct' : 'intermediary_usd',
          confidence: 'medium',
          timestamp: new Date(cachedRate.created_at),
          fromCurrency,
          toCurrency,
        };
      }

      // For now, we'll rely on country defaults and fallbacks
      // In production, you would implement actual API calls here
      // Example: ExchangeRate-API, Fixer.io, etc.
      
    } catch (error) {
      console.warn('Failed to get API rate:', error);
    }
    return null;
  }

  /**
   * Tier 4: Get rate from country settings via USD
   */
  private async getCountryDefaultRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResult | null> {
    try {
      const { data: countries } = await supabase
        .from('country_settings')
        .select('currency, rate_from_usd')
        .in('currency', [fromCurrency, toCurrency])
        .not('rate_from_usd', 'is', null);

      if (countries && countries.length >= 2) {
        const fromCountry = countries.find(c => c.currency === fromCurrency);
        const toCountry = countries.find(c => c.currency === toCurrency);

        if (fromCountry?.rate_from_usd && toCountry?.rate_from_usd) {
          // Convert via USD: (toCurrency/USD) / (fromCurrency/USD)
          const rate = toCountry.rate_from_usd / fromCountry.rate_from_usd;
          
          return {
            rate,
            source: 'country_default',
            method: fromCurrency === 'USD' || toCurrency === 'USD' ? 'direct' : 'intermediary_usd',
            confidence: 'medium',
            timestamp: new Date(),
            fromCurrency,
            toCurrency,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get country default rate:', error);
    }
    return null;
  }

  /**
   * Tier 5: Hardcoded fallback rates
   */
  private getFallbackRate(fromCurrency: string, toCurrency: string): ExchangeRateResult {
    let rate = 1.0;

    // Direct lookup
    if (this.FALLBACK_RATES[fromCurrency]?.[toCurrency]) {
      rate = this.FALLBACK_RATES[fromCurrency][toCurrency];
    }
    // Reverse lookup
    else if (this.FALLBACK_RATES[toCurrency]?.[fromCurrency]) {
      rate = 1 / this.FALLBACK_RATES[toCurrency][fromCurrency];
    }
    // USD intermediary
    else if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUSD = this.FALLBACK_RATES[fromCurrency]?.['USD'] || 
                       (this.FALLBACK_RATES['USD']?.[fromCurrency] ? 1 / this.FALLBACK_RATES['USD'][fromCurrency] : 1);
      const toToUSD = this.FALLBACK_RATES[toCurrency]?.['USD'] || 
                     (this.FALLBACK_RATES['USD']?.[toCurrency] ? 1 / this.FALLBACK_RATES['USD'][toCurrency] : 1);
      
      if (fromToUSD !== 1 && toToUSD !== 1) {
        rate = (1 / fromToUSD) * (this.FALLBACK_RATES['USD']?.[toCurrency] || toToUSD);
      }
    }

    return {
      rate,
      source: 'fallback',
      method: 'fallback',
      confidence: 'low',
      timestamp: new Date(),
      fromCurrency,
      toCurrency,
    };
  }

  /**
   * Cache the result for future use
   */
  private cacheResult(key: string, result: ExchangeRateResult): void {
    const cached: CachedRate = {
      ...result,
      expiresAt: new Date(Date.now() + this.CACHE_DURATION_MS),
    };
    this.cache.set(key, cached);

    // Also cache in database for persistence
    this.cacheInDatabase(result);
  }

  /**
   * Cache result in database for persistence across sessions
   */
  private async cacheInDatabase(result: ExchangeRateResult): Promise<void> {
    try {
      await supabase
        .from('exchange_rate_cache')
        .upsert({
          from_currency: result.fromCurrency,
          to_currency: result.toCurrency,
          rate: result.rate,
          source: result.source,
          method: result.method,
          expires_at: new Date(Date.now() + this.CACHE_DURATION_MS).toISOString(),
        });
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to cache rate in database:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; expiredCount: number } {
    const now = new Date();
    let expiredCount = 0;
    
    for (const cached of this.cache.values()) {
      if (cached.expiresAt <= now) {
        expiredCount++;
      }
    }
    
    return {
      size: this.cache.size,
      expiredCount,
    };
  }
}

// Export singleton instance
export const optimalExchangeRateService = new OptimalExchangeRateService();

// Auto-cleanup every 30 minutes
setInterval(() => {
  optimalExchangeRateService.clearExpiredCache();
}, 30 * 60 * 1000);