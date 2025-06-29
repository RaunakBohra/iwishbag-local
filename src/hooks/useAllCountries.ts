
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAllCountries = () => {
  return useQuery({
    queryKey: ['countries', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });
};
