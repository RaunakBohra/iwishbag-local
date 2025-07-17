import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePurchaseCountries = () => {
  return useQuery({
    queryKey: ['countries', 'purchase-allowed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('code, name, currency')
        .eq('purchase_allowed', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};
