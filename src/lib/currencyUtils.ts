import { supabase } from '../integrations/supabase/client';
import { logger } from './logger';
import { Quote, ShippingAddress } from '@/types/quote';
import { currencyService } from '@/services/CurrencyService';

// SIMPLIFIED: Remove all wrapper functions around CurrencyService
// All currency operations should go through hooks or CurrencyService directly


// Exchange rate interface
export interface ExchangeRateResult {
  rate: number;
  source: 'shipping_route' | 'country_settings' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}

// Get exchange rate with fallback chain
// Simple cache to prevent excessive API calls
const exchangeRateCache = new Map<string, { result: ExchangeRateResult; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getExchangeRate(
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

  const fromCurr = fromCurrency || currencyService.getCurrencyForCountrySync(fromCountry);
  const toCurr = toCurrency || currencyService.getCurrencyForCountrySync(toCountry);

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
    // 1. Try shipping route exchange rate (direct)
    const { data: route } = await supabase
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
      // Cache and return
      exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // 2. Try country settings via USD
    const [fromSettings, toSettings] = await Promise.all([
      supabase
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', fromCountry)
        .maybeSingle(),
      supabase.from('country_settings').select('rate_from_usd').eq('code', toCountry).maybeSingle(),
    ]);

    const fromRate = fromSettings.data?.rate_from_usd;
    const toRate = toSettings.data?.rate_from_usd;

    if (fromRate && toRate && fromRate > 0 && toRate > 0) {
      // Convert via USD: fromCurrency -> USD -> toCurrency
      const rate = toRate / fromRate;
      logger.currency(
        `USD-based conversion: ${fromCurr} (${fromRate}) → USD → ${toCurr} (${toRate}) = ${rate}`,
      );
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

    // Debug missing rates
    logger.warn(
      `Missing exchange rates for ${fromCountry}→${toCountry}`,
      {
        fromCountry,
        toCountry,
        fromRate,
        toRate,
        fromSettings: fromSettings.data,
        toSettings: toSettings.data,
      },
      'Currency',
    );

    // 3. Final fallback - warn admin about missing rates
    const missingCountries = [];
    if (!fromRate || fromRate <= 0) missingCountries.push(`${fromCountry} (${fromCurr})`);
    if (!toRate || toRate <= 0) missingCountries.push(`${toCountry} (${toCurr})`);

    result = {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `⚠️ No exchange rate configured for ${fromCurr} → ${toCurr}. Missing rates for: ${missingCountries.join(', ')}. Please ask admin to configure exchange rates. Using 1:1 ratio.`,
    };
    // Cache and return
    exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error('Error getting exchange rate', error, 'Currency');
    result = {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `❌ Database error fetching exchange rate for ${fromCurr} → ${toCurr}. Using 1:1 ratio. Please try again.`,
    };
    // Cache and return
    exchangeRateCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
}

// Convert amount with proper rounding
export function convertCurrency(
  amount: number,
  exchangeRate: number,
  targetCurrency: string,
): number {
  const converted = amount * exchangeRate;

  // Round to whole numbers for most Asian currencies
  const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
  if (noDecimalCurrencies.includes(targetCurrency)) {
    return Math.round(converted);
  }

  // Round to 2 decimal places for others
  return Math.round(converted * 100) / 100;
}

// REMOVED: formatDualCurrencyNew, formatCustomerCurrency, getCurrencySymbolFromCountry
// USE: useQuoteCurrency() hook or useAdminQuoteCurrency() hook for all formatting

// SIMPLIFIED: Basic country code normalization only
export const normalizeCountryForCurrency = (country: string): string => {
  if (!country) return 'US';
  
  // If it's already a 2-character code, return uppercase
  if (country.length === 2) {
    return country.toUpperCase();
  }
  
  // For longer strings, use database-driven country lookup instead of hardcoded mapping
  console.warn(`Long country name in currency operation: ${country}, defaulting to US. Use country code instead.`);
  return 'US';
};

// Validate exchange rate for quote creation
export interface ExchangeRateValidation {
  isValid: boolean;
  rate: number;
  warning?: string;
  shouldBlock?: boolean;
}

export async function validateExchangeRate(
  fromCountry: string,
  toCountry: string,
): Promise<ExchangeRateValidation> {
  const result = await getExchangeRate(fromCountry, toCountry);

  return {
    isValid: result.confidence !== 'low',
    rate: result.rate,
    warning: result.warning,
    shouldBlock: result.confidence === 'low' && result.rate === 1,
  };
}

// Extract destination country from quote object
export function getDestinationCountryFromQuote(quote: Quote | null): string {
  // Return fallback if quote is null/undefined
  if (!quote) {
    return 'US';
  }

  // Try to get destination country from multiple sources
  if (quote.destination_country) {
    return normalizeCountryForCurrency(quote.destination_country);
  }

  if (quote.shipping_address) {
    try {
      const shippingAddress: ShippingAddress =
        typeof quote.shipping_address === 'string'
          ? JSON.parse(quote.shipping_address)
          : quote.shipping_address;

      // Get country from shipping address
      const country = shippingAddress?.destination_country || shippingAddress?.country || 'US';

      // Use the comprehensive normalization function
      return normalizeCountryForCurrency(country);
    } catch (e) {
      logger.warn('Could not parse shipping address', e, 'Currency');
    }
  }

  return 'US'; // Default fallback
}
