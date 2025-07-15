import { useState, useEffect, useCallback } from 'react';
import { getExchangeRate, formatDualCurrencyNew, formatCustomerCurrency, getCountryCurrency, ExchangeRateResult } from '../lib/currencyUtils';

interface CurrencyConversionState {
  exchangeRate: number;
  exchangeRateSource: ExchangeRateResult['source'];
  confidence: ExchangeRateResult['confidence'];
  warning?: string;
  loading: boolean;
  error?: string;
}

export function useCurrencyConversion(originCountry: string, destinationCountry: string) {
  const [state, setState] = useState<CurrencyConversionState>({
    exchangeRate: 1,
    exchangeRateSource: 'fallback',
    confidence: 'low',
    loading: true
  });

  const fetchExchangeRate = useCallback(async () => {
    if (!originCountry || !destinationCountry) {
      setState({
        exchangeRate: 1,
        exchangeRateSource: 'fallback',
        confidence: 'low',
        loading: false,
        warning: 'Missing origin or destination country'
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const result = await getExchangeRate(originCountry, destinationCountry);
      setState({
        exchangeRate: result.rate,
        exchangeRateSource: result.source,
        confidence: result.confidence,
        warning: result.warning,
        loading: false
      });
    } catch (error) {
      setState({
        exchangeRate: 1,
        exchangeRateSource: 'fallback',
        confidence: 'low',
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rate'
      });
    }
  }, [originCountry, destinationCountry]);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  const formatForAdmin = useCallback((amount: number | null | undefined) => {
    return formatDualCurrencyNew(amount, originCountry, destinationCountry, state.exchangeRate);
  }, [originCountry, destinationCountry, state.exchangeRate]);

  const formatForCustomer = useCallback((
    amount: number | null | undefined,
    customerPreferredCurrency: string
  ) => {
    return formatCustomerCurrency(amount, originCountry, customerPreferredCurrency, state.exchangeRate);
  }, [originCountry, state.exchangeRate]);

  const convertAmount = useCallback((amount: number) => {
    return Math.round(amount * state.exchangeRate);
  }, [state.exchangeRate]);

  return {
    ...state,
    formatForAdmin,
    formatForCustomer,
    convertAmount,
    refetch: fetchExchangeRate
  };
}

interface QuoteCurrencyDisplayProps {
  originCountry: string;
  destinationCountry: string;
  customerPreferredCurrency?: string;
  isAdminView?: boolean;
}

export function useQuoteCurrencyDisplay({
  originCountry,
  destinationCountry,
  customerPreferredCurrency,
  isAdminView = false
}: QuoteCurrencyDisplayProps) {
  const currencyConversion = useCurrencyConversion(originCountry, destinationCountry);

  const formatAmount = useCallback((amount: number | null | undefined) => {
    if (isAdminView) {
      // Admin sees dual currency - return the short format (₹500/NPR 800)
      const adminFormat = currencyConversion.formatForAdmin(amount);
      return adminFormat.short;
    }

    if (customerPreferredCurrency) {
      // Customer sees single currency - return string
      return currencyConversion.formatForCustomer(amount, customerPreferredCurrency);
    }

    // Default to destination currency for customers (Nepal customer should see NPR)
    const destinationCurrency = getCountryCurrency(destinationCountry);
    return currencyConversion.formatForCustomer(amount, destinationCurrency);
  }, [isAdminView, customerPreferredCurrency, currencyConversion, destinationCountry]);

  const formatBreakdown = useCallback((breakdown: Record<string, unknown>) => {
    const formatLineItem = (amount: number | null | undefined) => formatAmount(amount);

    if (isAdminView) {
      // Admin sees dual currency breakdown
      return {
        itemPrice: formatLineItem(breakdown.itemPrice),
        salesTax: formatLineItem(breakdown.salesTax),
        merchantShipping: formatLineItem(breakdown.merchantShipping),
        domesticShipping: formatLineItem(breakdown.domesticShipping),
        internationalShipping: formatLineItem(breakdown.internationalShipping),
        handlingCharge: formatLineItem(breakdown.handlingCharge),
        insuranceAmount: formatLineItem(breakdown.insuranceAmount),
        customsDuty: formatLineItem(breakdown.customsDuty),
        vat: formatLineItem(breakdown.vat),
        discount: formatLineItem(breakdown.discount)
      };
    }

    // Customer sees single currency
    return {
      itemPrice: formatLineItem(breakdown.itemPrice),
      salesTax: formatLineItem(breakdown.salesTax),
      merchantShipping: formatLineItem(breakdown.merchantShipping),
      domesticShipping: formatLineItem(breakdown.domesticShipping),
      internationalShipping: formatLineItem(breakdown.internationalShipping),
      handlingCharge: formatLineItem(breakdown.handlingCharge),
      insuranceAmount: formatLineItem(breakdown.insuranceAmount),
      customsDuty: formatLineItem(breakdown.customsDuty),
      vat: formatLineItem(breakdown.vat),
      discount: formatLineItem(breakdown.discount)
    };
  }, [formatAmount, isAdminView]);

  return {
    ...currencyConversion,
    formatAmount,
    formatBreakdown
  };
}