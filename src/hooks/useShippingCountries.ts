
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useShippingCountries = () => {
  return useQuery({
    queryKey: ['countries', 'shipping-allowed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('code, name, currency')
        .eq('shipping_allowed', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });
};
