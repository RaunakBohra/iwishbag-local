import { supabase } from '../integrations/supabase/client';
import { logger } from './logger';
import { Quote, ShippingAddress } from '@/types/quote';
import { currencyService } from '@/services/CurrencyService';

export const formatAmountForDisplay = (
  amount: number | null | undefined,
  currency: string = 'USD',
  exchangeRate: number = 1,
  options?: Intl.NumberFormatOptions
): string => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  // Convert amount using exchange rate (amount is in USD, convert to target currency)
  const convertedAmount = amount * exchangeRate;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    ...options
  }).format(convertedAmount);
};

// Get currency symbol for a given currency code (async version with database lookup)
export const getCurrencySymbolAsync = async (currency: string): Promise<string> => {
  try {
    const currencyInfo = await currencyService.getCurrency(currency);
    if (currencyInfo?.symbol) {
      return currencyInfo.symbol;
    }
  } catch (error) {
    console.warn('Failed to get currency symbol from service, using fallback', error);
  }
  
  // Fallback to CurrencyService
  return currencyService.getCurrencySymbol(currency);
};

// Get currency symbol for a given currency code (synchronous version)
export const getCurrencySymbol = (currency: string): string => {
  return currencyService.getCurrencySymbol(currency);
};

// Get currency for a given country code (async version with database lookup)
export const getCountryCurrencyAsync = async (countryCode: string): Promise<string> => {
  try {
    return await currencyService.getCurrencyForCountry(countryCode);
  } catch (error) {
    console.warn('Failed to get country currency from service, using fallback', error);
    return 'USD';
  }
};

// Get currency for a given country code (synchronous version)
// Note: This is a temporary solution. In the future, we should use async version everywhere
export const getCountryCurrency = (countryCode: string): string => {
  // For now, we use a minimal fallback mapping for critical countries
  // The CurrencyService has the complete mapping from database
  const criticalMapping: { [key: string]: string } = {
    'US': 'USD',
    'IN': 'INR',
    'NP': 'NPR',
    'JP': 'JPY',
    'GB': 'GBP',
    'AU': 'AUD', // Australia should use AUD, not USD
    'CA': 'CAD',
    'EU': 'EUR',
    'DE': 'EUR',
    'FR': 'EUR',
    'CN': 'CNY',
    'SG': 'SGD',
  };
  return criticalMapping[countryCode] || 'USD';
};

// Get the currency map for reverse lookup (async version with database lookup)
export const getCountryCurrencyMapAsync = async (): Promise<{ [key: string]: string }> => {
  try {
    const map = await currencyService.getCountryCurrencyMap();
    const result: { [key: string]: string } = {};
    map.forEach((currency, country) => {
      result[country] = currency;
    });
    return result;
  } catch (error) {
    console.warn('Failed to get country currency map from service, using fallback', error);
    return { 'US': 'USD' }; // Minimal fallback
  }
};

// Get the currency map for reverse lookup (synchronous version)
// Note: This should be replaced with async version in the future
export const getCountryCurrencyMap = (): { [key: string]: string } => {
  // Return minimal mapping for backward compatibility
  // The CurrencyService has the complete mapping from database
  return {
    'US': 'USD',
    'IN': 'INR',
    'NP': 'NPR',
    'JP': 'JPY',
    'GB': 'GBP',
    'AU': 'AUD',
    'CA': 'CAD',
    'EU': 'EUR',
    'DE': 'EUR',
    'FR': 'EUR',
    'CN': 'CNY',
    'SG': 'SGD',
  };
};

// Format amount in dual currencies (purchase and delivery)
export const formatDualCurrency = (
  amount: number | null | undefined,
  purchaseCountry: string,
  deliveryCountry: string,
  exchangeRate?: number
): { purchase: string; delivery: string } => {
  if (amount === null || amount === undefined) {
    return { purchase: 'N/A', delivery: 'N/A' };
  }

  const purchaseCurrency = getCountryCurrency(purchaseCountry);
  const deliveryCurrency = getCountryCurrency(deliveryCountry);
  
  // Format in purchase currency (amount is already in purchase currency)
  const purchaseDisplay = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: purchaseCurrency,
  }).format(amount);

  // Format in delivery currency using exchange rate
  const deliveryAmount = exchangeRate ? amount * exchangeRate : amount;
  const deliveryDisplay = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: deliveryCurrency,
  }).format(deliveryAmount);

  return { purchase: purchaseDisplay, delivery: deliveryDisplay };
};

// Exchange rate interface
export interface ExchangeRateResult {
  rate: number;
  source: 'shipping_route' | 'country_settings' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}

// Get exchange rate with fallback chain
export async function getExchangeRate(
  fromCountry: string,
  toCountry: string,
  fromCurrency?: string,
  toCurrency?: string
): Promise<ExchangeRateResult> {
  const fromCurr = fromCurrency || getCountryCurrency(fromCountry);
  const toCurr = toCurrency || getCountryCurrency(toCountry);
  
  // Same currency, no conversion needed
  if (fromCurr === toCurr) {
    return {
      rate: 1,
      source: 'shipping_route',
      confidence: 'high'
    };
  }

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
      return {
        rate: route.exchange_rate,
        source: 'shipping_route',
        confidence: 'high'
      };
    }

    // 2. Try country settings via USD
    const [fromSettings, toSettings] = await Promise.all([
      supabase.from('country_settings').select('rate_from_usd').eq('code', fromCountry).maybeSingle(),
      supabase.from('country_settings').select('rate_from_usd').eq('code', toCountry).maybeSingle()
    ]);

    const fromRate = fromSettings.data?.rate_from_usd;
    const toRate = toSettings.data?.rate_from_usd;

    if (fromRate && toRate && fromRate > 0 && toRate > 0) {
      // Convert via USD: fromCurrency -> USD -> toCurrency
      const rate = toRate / fromRate;
      logger.currency(`USD-based conversion: ${fromCurr} (${fromRate}) → USD → ${toCurr} (${toRate}) = ${rate}`);
      return {
        rate,
        source: 'country_settings',
        confidence: 'medium',
        warning: `Using USD-based conversion: ${fromCurr} → USD → ${toCurr} (rate: ${rate.toFixed(4)})`
      };
    }

    // Debug missing rates
    logger.warn(`Missing exchange rates for ${fromCountry}→${toCountry}`, {
      fromCountry,
      toCountry,
      fromRate,
      toRate,
      fromSettings: fromSettings.data,
      toSettings: toSettings.data
    }, 'Currency');

    // 3. Final fallback - warn admin about missing rates
    const missingCountries = [];
    if (!fromRate || fromRate <= 0) missingCountries.push(`${fromCountry} (${fromCurr})`);
    if (!toRate || toRate <= 0) missingCountries.push(`${toCountry} (${toCurr})`);
    
    return {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `⚠️ No exchange rate configured for ${fromCurr} → ${toCurr}. Missing rates for: ${missingCountries.join(', ')}. Please ask admin to configure exchange rates. Using 1:1 ratio.`
    };

  } catch (error) {
    logger.error('Error getting exchange rate', error, 'Currency');
    return {
      rate: 1,
      source: 'fallback',
      confidence: 'low',
      warning: `❌ Database error fetching exchange rate for ${fromCurr} → ${toCurr}. Using 1:1 ratio. Please try again.`
    };
  }
}

// Convert amount with proper rounding
export function convertCurrency(
  amount: number,
  exchangeRate: number,
  targetCurrency: string
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

// Format amount in dual currencies (origin and destination) - NEW VERSION
export const formatDualCurrencyNew = (
  amount: number | null | undefined,
  originCountry: string,
  destinationCountry: string,
  exchangeRate?: number
): { origin: string; destination: string; short: string } => {
  if (amount === null || amount === undefined) {
    return { origin: 'N/A', destination: 'N/A', short: 'N/A' };
  }

  const originCurrency = getCountryCurrency(originCountry);
  const destinationCurrency = getCountryCurrency(destinationCountry);
  
  // Format in origin currency (amount is already in origin currency)
  const originSymbol = getCurrencySymbol(originCurrency);
  const originFormatted = `${originSymbol}${amount.toLocaleString()}`;
  
  // Format in destination currency using exchange rate
  if (exchangeRate && exchangeRate !== 1) {
    const convertedAmount = convertCurrency(amount, exchangeRate, destinationCurrency);
    const destinationSymbol = getCurrencySymbol(destinationCurrency);
    const destinationFormatted = `${destinationSymbol}${convertedAmount.toLocaleString()}`;
    
    return {
      origin: originFormatted,
      destination: destinationFormatted,
      short: `${originFormatted}/${destinationFormatted}`
    };
  }

  // Same currency or no exchange rate
  return {
    origin: originFormatted,
    destination: originFormatted,
    short: originFormatted
  };
};

// Format amount for customer display (single currency)
export const formatCustomerCurrency = (
  amount: number | null | undefined,
  originCountry: string,
  customerPreferredCurrency: string,
  exchangeRate?: number
): string => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  const originCurrency = getCountryCurrency(originCountry);
  
  // If customer prefers origin currency, no conversion needed
  if (customerPreferredCurrency === originCurrency) {
    const symbol = getCurrencySymbol(originCurrency);
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  // Convert to customer's preferred currency using the provided exchange rate
  if (exchangeRate && exchangeRate !== 1) {
    const convertedAmount = convertCurrency(amount, exchangeRate, customerPreferredCurrency);
    const symbol = getCurrencySymbol(customerPreferredCurrency);
    return `${symbol}${convertedAmount.toLocaleString()}`;
  }
  
  // Fallback to origin currency
  const symbol = getCurrencySymbol(originCurrency);
  return `${symbol}${amount.toLocaleString()}`;
};

// Get currency symbol from country code (for shipping route forms)
export const getCurrencySymbolFromCountry = (countryCode: string): string => {
  const currency = getCountryCurrency(countryCode);
  return getCurrencySymbol(currency);
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
  toCountry: string
): Promise<ExchangeRateValidation> {
  const result = await getExchangeRate(fromCountry, toCountry);
  
  return {
    isValid: result.confidence !== 'low',
    rate: result.rate,
    warning: result.warning,
    shouldBlock: result.confidence === 'low' && result.rate === 1
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
    return quote.destination_country;
  }
  
  if (quote.shipping_address) {
    try {
      const shippingAddress: ShippingAddress = typeof quote.shipping_address === 'string' 
        ? JSON.parse(quote.shipping_address) 
        : quote.shipping_address;
      
      // Get country from shipping address
      let country = shippingAddress?.destination_country || shippingAddress?.country || 'US';
      
      // Convert country names to country codes
      const countryNameToCode: { [key: string]: string } = {
        'Nepal': 'NP',
        'India': 'IN', 
        'United States': 'US',
        'USA': 'US',
        'China': 'CN',
        'Australia': 'AU',
        'United Kingdom': 'GB',
        'Canada': 'CA',
        'Germany': 'DE',
        'France': 'FR',
        'Japan': 'JP',
        'South Korea': 'KR',
        'Thailand': 'TH',
        'Malaysia': 'MY',
        'Singapore': 'SG'
      };
      
      // If it's a country name, convert to code
      if (countryNameToCode[country]) {
        return countryNameToCode[country];
      } else if (country && country.length === 2) {
        // Already a country code
        return country.toUpperCase();
      }
      
      logger.warn('Unknown country format in shipping address', { country }, 'Currency');
    } catch (e) {
      logger.warn('Could not parse shipping address', e, 'Currency');
    }
  }
  
  return 'US'; // Default fallback
}
