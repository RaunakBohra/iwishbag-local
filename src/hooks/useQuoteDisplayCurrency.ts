import { useMemo, useEffect, useState } from 'react';
import { formatCustomerCurrency, getCountryCurrency, getDestinationCountryFromQuote, getExchangeRate } from '@/lib/currencyUtils';
import { useUserProfile } from './useUserProfile';
import { Quote } from '@/types/quote';

interface UseQuoteDisplayCurrencyProps {
  quote: Quote | null; // Quote object with all necessary fields
  exchangeRate?: number; // Optional explicit exchange rate
}

/**
 * Hook for displaying quote amounts in customer's preferred currency
 * Handles direct conversion from quote's origin currency to customer preference
 * (Not via USD like useUserCurrency)
 */
export function useQuoteDisplayCurrency({ quote, exchangeRate }: UseQuoteDisplayCurrencyProps) {
  const { data: userProfile } = useUserProfile();
  const [customerExchangeRate, setCustomerExchangeRate] = useState<number>(1);
  
  const originCountry = quote?.destination_country || 'US';
  const destinationCountry = useMemo(() => {
    if (!quote) return 'US'; // Fallback when quote is not loaded yet
    return getDestinationCountryFromQuote(quote);
  }, [quote]);
  
  // Customer preferred currency (fallback to destination country currency)
  const customerPreferredCurrency = userProfile?.preferred_display_currency || getCountryCurrency(destinationCountry);
  
  // Use exchange rate from quote if available, or fallback to provided rate
  const effectiveExchangeRate = quote?.exchange_rate || exchangeRate;
  
  // Fetch the correct exchange rate for customer currency conversion
  useEffect(() => {
    const fetchCustomerExchangeRate = async () => {
      if (!quote || !customerPreferredCurrency) return;
      
      const originCurrency = getCountryCurrency(originCountry);
      
      // If customer prefers origin currency, no conversion needed
      if (customerPreferredCurrency === originCurrency) {
        setCustomerExchangeRate(1);
        return;
      }
      
      // Find the country code for customer's preferred currency
      const customerCountryCode = Object.entries({
        'US': 'USD', 'IN': 'INR', 'NP': 'NPR', 'CA': 'CAD', 
        'AU': 'AUD', 'GB': 'GBP', 'JP': 'JPY', 'CN': 'CNY'
      }).find(([_, curr]) => curr === customerPreferredCurrency)?.[0];
      
      if (customerCountryCode) {
        try {
          const rateResult = await getExchangeRate(originCountry, customerCountryCode);
          setCustomerExchangeRate(rateResult.rate);
          console.log(`[Customer Currency] ${originCountry} → ${customerCountryCode}: ${rateResult.rate} (${rateResult.source})`);
        } catch (error) {
          console.warn('[Customer Currency] Failed to fetch exchange rate:', error);
          setCustomerExchangeRate(1);
        }
      }
    };
    
    fetchCustomerExchangeRate();
  }, [quote, originCountry, customerPreferredCurrency]);
  
  const formatAmount = (amount: number | null | undefined): string => {
    if (!quote) {
      // Return a safe fallback when quote is not loaded
      return amount ? `$${amount.toLocaleString()}` : 'N/A';
    }
    
    // Use the customer-specific exchange rate instead of the quote's exchange rate
    return formatCustomerCurrency(
      amount,
      originCountry,
      customerPreferredCurrency,
      customerExchangeRate
    );
  };
  
  return {
    originCountry,
    destinationCountry,
    customerPreferredCurrency,
    exchangeRate: effectiveExchangeRate,
    formatAmount
  };
}