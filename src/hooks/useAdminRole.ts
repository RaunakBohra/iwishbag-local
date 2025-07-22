import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async () => {
      console.log('🔍 [useAdminRole] Checking admin role for user:', {
        user: user ? { id: user.id, email: user.email, isAnonymous: user.is_anonymous } : null
      });
      
      if (!user) {
        console.log('🔍 [useAdminRole] No user found, returning false');
        return false;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      
      console.log('🔍 [useAdminRole] RPC call results:', {
        hasError: !!error,
        errorMessage: error?.message,
        data,
        isAdmin: !!data
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 3, // Retry failed requests
  });
};
