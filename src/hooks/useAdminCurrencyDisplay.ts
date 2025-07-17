import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { useAllCountries } from './useAllCountries';
import { formatAmountForDisplay } from '@/lib/currencyUtils';

interface CurrencyDisplay {
  amount: string;
  currency: string;
  label: string;
  isPrimary?: boolean;
}

interface AdminCurrencyDisplayOptions {
  usdAmount: number;
  quoteCurrency?: string;
  customerPreferredCurrency?: string;
  showAllVariations?: boolean;
}

export const useAdminCurrencyDisplay = () => {
  const { data: adminProfile } = useUserProfile();
  const { data: allCountries } = useAllCountries();

  const getExchangeRate = useMemo(() => {
    return (currency: string) => {
      if (currency === 'USD') return 1;
      const country = allCountries?.find((c) => c.currency === currency);
      return country?.rate_from_usd || 1;
    };
  }, [allCountries]);

  const formatMultiCurrency = (options: AdminCurrencyDisplayOptions): CurrencyDisplay[] => {
    const {
      usdAmount,
      quoteCurrency,
      customerPreferredCurrency,
      showAllVariations = true,
    } = options;

    if (!usdAmount) return [];

    const displays: CurrencyDisplay[] = [];
    const addedCurrencies = new Set<string>();

    // Always show USD first (primary)
    displays.push({
      amount: formatAmountForDisplay(usdAmount, 'USD', 1),
      currency: 'USD',
      label: 'USD (Base)',
      isPrimary: true,
    });
    addedCurrencies.add('USD');

    if (!showAllVariations) {
      return displays;
    }

    // Add Quote Currency if different from USD
    if (quoteCurrency && quoteCurrency !== 'USD' && !addedCurrencies.has(quoteCurrency)) {
      const rate = getExchangeRate(quoteCurrency);
      displays.push({
        amount: formatAmountForDisplay(usdAmount, quoteCurrency, rate),
        currency: quoteCurrency,
        label: `${quoteCurrency} (Quote)`,
      });
      addedCurrencies.add(quoteCurrency);
    }

    // Add Admin's preferred currency if different
    const adminCurrency = adminProfile?.preferred_display_currency;
    if (adminCurrency && adminCurrency !== 'USD' && !addedCurrencies.has(adminCurrency)) {
      const rate = getExchangeRate(adminCurrency);
      displays.push({
        amount: formatAmountForDisplay(usdAmount, adminCurrency, rate),
        currency: adminCurrency,
        label: `${adminCurrency} (Admin)`,
      });
      addedCurrencies.add(adminCurrency);
    }

    // Add Customer's preferred currency if different
    if (
      customerPreferredCurrency &&
      customerPreferredCurrency !== 'USD' &&
      !addedCurrencies.has(customerPreferredCurrency)
    ) {
      const rate = getExchangeRate(customerPreferredCurrency);
      displays.push({
        amount: formatAmountForDisplay(usdAmount, customerPreferredCurrency, rate),
        currency: customerPreferredCurrency,
        label: `${customerPreferredCurrency} (Customer)`,
      });
      addedCurrencies.add(customerPreferredCurrency);
    }

    return displays;
  };

  return {
    formatMultiCurrency,
    getExchangeRate,
  };
};
