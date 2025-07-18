import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getExchangeRate } from '@/lib/currencyUtils';
import { PaymentGateway } from '@/types/payment';

export interface PaymentCurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  source: 'shipping_route' | 'country_settings' | 'fallback' | 'no_conversion';
  confidence: 'high' | 'medium' | 'low';
  needsConversion: boolean;
  warning?: string;
}

interface UsePaymentCurrencyConversionProps {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  originCountry?: string;
  enabled?: boolean;
}

/**
 * Hook to get currency conversion information for payment gateways
 * Shows the amount that will be charged in the gateway's native currency
 */
export function usePaymentCurrencyConversion({
  gateway,
  amount,
  currency,
  originCountry = 'US',
  enabled = true,
}: UsePaymentCurrencyConversionProps) {
  const [conversion, setConversion] = useState<PaymentCurrencyConversion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get gateway configuration and supported currencies
  const { data: gatewayConfig } = useQuery({
    queryKey: ['payment-gateway-config', gateway],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('code, supported_currencies, is_active')
        .eq('code', gateway)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!gateway,
  });

  // Gateway currency mapping (what currency each gateway actually processes in)
  const GATEWAY_CURRENCY_MAP: Record<PaymentGateway, string> = {
    payu: 'INR',
    khalti: 'NPR',
    esewa: 'NPR',
    fonepay: 'NPR',
    paypal: 'USD', // PayPal supports multiple currencies but processes in USD primarily
    stripe: 'USD', // Stripe supports multiple currencies
    airwallex: 'USD', // Airwallex supports multiple currencies
    razorpay: 'INR',
    bank_transfer: currency, // Bank transfer uses display currency
    cod: currency, // COD uses display currency
  };

  // Get destination country based on gateway
  const getDestinationCountry = (gateway: PaymentGateway): string => {
    const GATEWAY_COUNTRY_MAP: Record<PaymentGateway, string> = {
      payu: 'IN',
      khalti: 'NP',
      esewa: 'NP',
      fonepay: 'NP',
      paypal: 'US',
      stripe: 'US',
      airwallex: 'US',
      razorpay: 'IN',
      bank_transfer: 'US', // Default to US
      cod: 'US', // Default to US
    };
    return GATEWAY_COUNTRY_MAP[gateway] || 'US';
  };

  useEffect(() => {
    if (!enabled || !gatewayConfig || !gateway || !amount || !currency) {
      console.log('🔍 [usePaymentCurrencyConversion] Skipping conversion:', {
        enabled,
        hasGatewayConfig: !!gatewayConfig,
        gateway,
        amount,
        currency,
      });
      setConversion(null);
      return;
    }

    const calculateConversion = async () => {
      setLoading(true);
      setError(null);

      try {
        const targetCurrency = GATEWAY_CURRENCY_MAP[gateway];
        const destinationCountry = getDestinationCountry(gateway);

        console.log('🔍 [usePaymentCurrencyConversion] Starting conversion calculation:', {
          gateway,
          originCountry,
          destinationCountry,
          fromCurrency: currency,
          toCurrency: targetCurrency,
          amount,
        });

        // If the display currency matches the gateway's native currency, no conversion needed
        if (currency === targetCurrency) {
          console.log('🔍 [usePaymentCurrencyConversion] No conversion needed - same currency:', {
            currency,
            targetCurrency,
          });
          setConversion({
            originalAmount: amount,
            originalCurrency: currency,
            convertedAmount: amount,
            convertedCurrency: targetCurrency,
            exchangeRate: 1,
            source: 'no_conversion',
            confidence: 'high',
            needsConversion: false,
          });
          return;
        }

        // Get exchange rate using the same logic as payment processing
        console.log('🔍 [usePaymentCurrencyConversion] Calling getExchangeRate with:', {
          originCountry,
          destinationCountry,
          currency,
          targetCurrency,
        });

        const exchangeRateResult = await getExchangeRate(
          originCountry,
          destinationCountry,
          currency,
          targetCurrency
        );

        console.log('🔍 [usePaymentCurrencyConversion] Exchange rate result:', {
          rate: exchangeRateResult.rate,
          source: exchangeRateResult.source,
          confidence: exchangeRateResult.confidence,
          warning: exchangeRateResult.warning,
        });

        const convertedAmount = amount * exchangeRateResult.rate;

        console.log('🔍 [usePaymentCurrencyConversion] Final conversion:', {
          originalAmount: amount,
          originalCurrency: currency,
          convertedAmount,
          convertedCurrency: targetCurrency,
          exchangeRate: exchangeRateResult.rate,
        });

        setConversion({
          originalAmount: amount,
          originalCurrency: currency,
          convertedAmount: convertedAmount,
          convertedCurrency: targetCurrency,
          exchangeRate: exchangeRateResult.rate,
          source: exchangeRateResult.source,
          confidence: exchangeRateResult.confidence,
          needsConversion: true,
          warning: exchangeRateResult.warning,
        });
      } catch (err) {
        console.error('🔍 [usePaymentCurrencyConversion] Error calculating conversion:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate conversion');
        setConversion(null);
      } finally {
        setLoading(false);
      }
    };

    calculateConversion();
  }, [enabled, gatewayConfig, gateway, amount, currency, originCountry]);

  return {
    conversion,
    loading,
    error,
    isSupported: !!gatewayConfig,
  };
}