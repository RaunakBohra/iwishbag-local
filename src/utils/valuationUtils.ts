
export function getItemMinimumValuationCurrency(quote: UnifiedQuote | null, itemId: string): string {
  if (!quote) return 'USD';

  // 🔄 FALLBACK 1: Try calculation_data.item_breakdowns
  if (quote.calculation_data?.item_breakdowns) {
    const itemBreakdown = quote.calculation_data.item_breakdowns.find(
      (breakdown: any) => breakdown.item_id === itemId
    );

    if (itemBreakdown?.minimum_valuation_conversion?.originCurrency) {
      return itemBreakdown.minimum_valuation_conversion.originCurrency;
    }
  }

  // 🔄 FALLBACK 2: Try individual item.minimum_valuation_conversion
  const item = quote.items?.find(item => item.id === itemId);
  if (item?.minimum_valuation_conversion?.originCurrency) {
    return item.minimum_valuation_conversion.originCurrency;
  }

  // 🔄 FALLBACK 3: Default to USD
  return 'USD';
}

/**
 * Check if an item has minimum valuation data available (enhanced with fallback)
 */
export function hasMinimumValuation(quote: UnifiedQuote | null, itemId: string): boolean {
  if (!quote) return false;

  // 🔄 FALLBACK 1: Check calculation_data.item_breakdowns
  if (quote.calculation_data?.item_breakdowns) {
    const itemBreakdown = quote.calculation_data.item_breakdowns.find(
      (breakdown: any) => breakdown.item_id === itemId
    );

    if (itemBreakdown?.minimum_valuation_conversion?.convertedAmount) {
      return true;
    }
  }

  // 🔄 FALLBACK 2: Check individual item data
  const item = quote.items?.find(item => item.id === itemId);
  if (item?.minimum_valuation_conversion?.convertedAmount) {
    return true;
  }

  
  if (item?.hsn_code && item?.minimum_valuation_usd) {
    return true;
  }

  return false;
}

/**
 * Get valuation comparison data for display
 */
export function getValuationComparison(quote: UnifiedQuote | null, item: QuoteItem) {
  const minimumValuation = getItemMinimumValuation(quote, item.id);
  const actualPrice = item.price || item.price_origin_currency || 0;
  
  return {
    actualPrice,
    minimumValuation,
    higherAmount: Math.max(actualPrice, minimumValuation),
    isActualHigher: actualPrice >= minimumValuation,
    hasMinimumData: hasMinimumValuation(quote, item.id),
    currency: getItemMinimumValuationCurrency(quote, item.id)
  };
}

/**
 * Format currency amount for display with proper currency symbol
 */
export function formatValuationAmount(amount: number, currency: string = 'USD'): string {
  if (amount === 0) return '0';
  
  // Map common currencies to their symbols
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'NPR': 'Rs.',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
  };
  
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(0)}`;
}

/**
 * Real-time originCountry: string
): Promise<{ amount: number; currency: string; usdAmount: number } | null> {
  if (!item.hsn_code) {
    console.log(`[FETCH MIN VAL] No HSN code for item ${item.id}`);
    return null;
  }

  try {
    // Fetch error } = await supabase
      .from('hsn_master')
      .select('minimum_valuation_usd, hsn_code')
      .eq('hsn_code', item.hsn_code)
      .single();

    if (error) {
      console.error(`[FETCH MIN VAL] HSN lookup error for ${item.hsn_code}:`, error);
      return null;
    }

    if (!hsnData?.minimum_valuation_usd) {
      console.log(`[FETCH MIN VAL] No minimum valuation for HSN ${item.hsn_code}`);
      return null;
    }

    // Convert USD to origin currency using country_settings table
    console.log(`[FETCH MIN VAL] Getting country settings for: ${originCountry}`);
    const countrySettings = await getCountrySettings(originCountry);
    
    console.log(`[FETCH MIN VAL] Country settings result:`, countrySettings);
    
    if (!countrySettings) {
      console.error(`[FETCH MIN VAL] No country settings found for ${originCountry}`);
      return {
        amount: hsnData.minimum_valuation_usd,
        currency: 'USD',
        usdAmount: hsnData.minimum_valuation_usd
      };
    }

    // Check if exchange rate is valid
    const exchangeRate = countrySettings.rate_from_usd;
    console.log(`[FETCH MIN VAL] Exchange rate from country_settings:`, {
      rate_from_usd: countrySettings.rate_from_usd,
      currency: countrySettings.currency,
      country_name: countrySettings.name
    });

    if (!exchangeRate || exchangeRate <= 0) {
      console.error(`[FETCH MIN VAL] Invalid exchange rate for ${originCountry}:`, exchangeRate);
      console.error(`[FETCH MIN VAL] Full country settings:`, countrySettings);
      return {
        amount: hsnData.minimum_valuation_usd,
        currency: countrySettings.currency || 'USD',
        usdAmount: hsnData.minimum_valuation_usd
      };
    }

    const convertedAmount = hsnData.minimum_valuation_usd * exchangeRate;

    console.log(`[FETCH MIN VAL] ✅ HSN ${item.hsn_code}: $${hsnData.minimum_valuation_usd} USD → ${convertedAmount.toFixed(2)} ${countrySettings.currency} (rate: ${exchangeRate})`);

    return {
      amount: convertedAmount,
      currency: countrySettings.currency || 'USD',
      usdAmount: hsnData.minimum_valuation_usd
    };

  } catch (error) {
    console.error(`[FETCH MIN VAL] Error fetching minimum valuation for ${item.hsn_code}:`, error);
    return null;
  }
}