import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAllCountries = () => {
  return useQuery({
    queryKey: ['countries', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('country_settings').select('*').order('name');
      if (error) throw new Error(error.message);
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    // Set initial data to empty array to prevent undefined issues
    initialData: [],
  });
};
