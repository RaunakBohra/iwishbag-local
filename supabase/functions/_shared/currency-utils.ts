import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
export interface ExchangeRateResult {
  rate: number;
  source: 'shipping_route' | 'country_settings' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}

// Simple cache to prevent excessive API calls
const exchangeRateCache = new Map<string, { result: ExchangeRateResult; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Country to currency mapping (fallback)
const COUNTRY_CURRENCY_MAP: { [key: string]: string } = {
  US: 'USD',
  IN: 'INR',
  NP: 'NPR',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  EU: 'EUR',
  JP: 'JPY',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  PH: 'PHP',
  VN: 'VND',
  ID: 'IDR',
  KR: 'KRW',
  BD: 'BDT',
  LK: 'LKR',
  PK: 'PKR',
};

/**
 * Get currency for a country code
 */
export function getCountryCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
}

/**
 * Get exchange rate between two countries using shipping routes or country settings
 * Same logic as src/lib/currencyUtils.ts but adapted for edge functions
 */
export async function getExchangeRate(
  supabaseAdmin: ReturnType<typeof createClient>,
  fromCountry: string,
  toCountry: string,
  fromCurrency?: string,
  toCurrency?: string,
): Promise<ExchangeRateResult> {
  // Check cache first
  const cacheKey = `${fromCountry}-${toCountry}-${fromCurrency}-${toCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  const fromCurr = fromCurrency || getCountryCurrency(fromCountry);
  const toCurr = toCurrency || getCountryCurrency(toCountry);

  // Same currency, no conversion needed
  if (fromCurr === toCurr) {
    return {
      rate: 1,
      source: 'shipping_route',
      confidence: 'high',
    };
  }

  let result: ExchangeRateResult;

  try {
    // 1. Try shipping route exchange rate (direct) - HIGH PRIORITY
    const { data: route } = await supabaseAdmin
      .from('shipping_routes')
      .select('exchange_rate')
      .eq('origin_country', fromCountry)
      .eq('destination_country', toCountry)
      .eq('is_active', true)
      .maybeSingle();

    if (route?.exchange_rate && route.exchange_rate > 0) {
      result = {
        rate: route.exchange_rate,
        source: 'shipping_route',
        confidence: 'high',
      };
      console.log(`🎯 Using direct shipping route rate ${fromCountry}→${toCountry}: ${route.exchange_rate}`);
      // Cache and return
      exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // 2. Try country settings via USD - MEDIUM PRIORITY
    const [fromSettings, toSettings] = await Promise.all([
      supabaseAdmin
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', fromCountry)
        .maybeSingle(),
      supabaseAdmin
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', toCountry)
        .maybeSingle(),
    ]);

    const fromRate = fromSettings.data?.rate_from_usd;
    const toRate = toSettings.data?.rate_from_usd;

    if (fromRate && toRate && fromRate > 0 && toRate > 0) {
      // Convert via USD: fromCurrency -> USD -> toCurrency
      const rate = toRate / fromRate;
      console.log(`💱 Using USD-based conversion: ${fromCurr} (${fromRate}) → USD → ${toCurr} (${toRate}) = ${rate}`);
      
      result = {
        rate,
        source: 'country_settings',
        confidence: 'medium',
        warning: `Using USD-based conversion: ${fromCurr} → USD → ${toCurr} (rate: ${rate.toFixed(4)})`,
      };
      // Cache and return
      exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // 3. Final fallback - warn about missing rates
    const missingCountries = [];
    if (!fromRate || fromRate <= 0) missingCountries.push(`${fromCountry} (${fromCurr})`);
    if (!toRate || toRate <= 0) missingCountries.push(`${toCountry} (${toCurr})`);

    console.warn(`⚠️ Missing exchange rates for ${missingCountries.join(', ')}`);

    result = {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `Missing exchange rates for ${missingCountries.join(', ')}. Using fallback rate of 1.`,
    };

    // Cache and return
    exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Error getting exchange rate:', error);

    result = {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `Error fetching exchange rate: ${error}. Using fallback rate of 1.`,
    };

    // Cache and return
    exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

/**
 * Helper function to get exchange rate for payment processing
 * Returns just the rate number for compatibility with existing code
 */
export async function getPaymentExchangeRate(
  supabaseAdmin: ReturnType<typeof createClient>,
  fromCountry: string,
  toCountry: string,
  totalCurrency: string,
  targetCurrency: string,
): Promise<{ rate: number; source: string; confidence: string }> {
  const result = await getExchangeRate(supabaseAdmin, fromCountry, toCountry, totalCurrency, targetCurrency);
  return {
    rate: result.rate,
    source: result.source,
    confidence: result.confidence,
  };
}