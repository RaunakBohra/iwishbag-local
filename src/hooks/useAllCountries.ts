import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAllCountries = () => {
  const result = useQuery({
    queryKey: ['country_settings_table', 'all_countries_array'],
    staleTime: 0, // Always refetch in development
    cacheTime: 0, // Don't cache in development
    queryFn: async () => {
      console.log('[useAllCountries] Fetching countries from database...');
      const { data, error } = await supabase.from('country_settings').select('*').order('name');
      console.log('[useAllCountries] Database response:', { data: data?.length, error });
      console.log('[useAllCountries] First 5 countries:', data?.slice(0, 5));
      
      if (error) {
        console.error('[useAllCountries] Database error:', error);
        throw new Error(error.message);
      }
      
      // Ensure we always return an array
      const result = Array.isArray(data) ? data : [];
      console.log('[useAllCountries] Returning countries count:', result.length);
      return result;
    },
  });
  
  
  return result;
};
