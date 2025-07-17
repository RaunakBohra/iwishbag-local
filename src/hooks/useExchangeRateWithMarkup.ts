import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from './useSystemSettings';

export const useExchangeRateWithMarkup = () => {
  const { getNumericSetting } = useSystemSettings();

  const { data: countries, isLoading } = useQuery({
    queryKey: ['countries-with-markup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('country_settings').select('*').order('name');

      if (error) throw new Error(error.message);
      return data;
    },
  });

  const getExchangeRateWithMarkup = (countryCode: string): number => {
    const country = countries?.find((c) => c.code === countryCode);
    if (!country) return 1;

    const baseRate = Number(country.rate_from_usd) || 1;
    const markupPercentage = getNumericSetting('exchange_rate_markup_percentage');

    // Apply markup: rate + (rate * markup/100)
    const markup = baseRate * (markupPercentage / 100);
    return baseRate + markup;
  };

  const convertUsdWithMarkup = (usdAmount: number, countryCode: string): number => {
    const rateWithMarkup = getExchangeRateWithMarkup(countryCode);
    return usdAmount * rateWithMarkup;
  };

  return {
    countries,
    isLoading,
    getExchangeRateWithMarkup,
    convertUsdWithMarkup,
  };
};
