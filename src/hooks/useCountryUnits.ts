import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CountryUnits {
  code: string;
  name: string;
  currency: string;
  weight_unit: string | null;
}

export const useCountryUnits = () => {
  return useQuery({
    queryKey: ['country_settings_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('code, name, currency, weight_unit')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw new Error(error.message);
      return data as CountryUnits[] || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCountryUnit = (countryCode: string | undefined) => {
  const { data: countries } = useCountryUnits();
  
  if (!countryCode || !countries) {
    return {
      currency: 'USD',
      weightUnit: 'kg'
    };
  }
  
  const country = countries.find(c => c.code === countryCode);
  return {
    currency: country?.currency || 'USD',
    weightUnit: country?.weight_unit || 'kg'
  };
};