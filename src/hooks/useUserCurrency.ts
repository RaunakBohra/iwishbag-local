import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { useAllCountries } from './useAllCountries';
import { formatAmountForDisplay } from '@/lib/currencyUtils';

export const useUserCurrency = () => {
  const { data: userProfile } = useUserProfile();
  const { data: allCountries } = useAllCountries();

  const userCurrency = userProfile?.preferred_display_currency || 'USD';

  const exchangeRate = useMemo(() => {
    if (userCurrency === 'USD') return 1;

    const country = allCountries?.find((c) => c.currency === userCurrency);
    return country?.rate_from_usd || 1;
  }, [allCountries, userCurrency]);

  const formatAmount = (amount: number | null | undefined, options?: Intl.NumberFormatOptions) => {
    return formatAmountForDisplay(amount, userCurrency, exchangeRate, options);
  };

  return {
    userCurrency,
    exchangeRate,
    formatAmount,
  };
};
