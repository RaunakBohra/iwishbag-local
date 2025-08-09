import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Fixed user roles hook to fetch actual admin/moderator users for assignments
export const useUserRoles = () => {
  const { user } = useAuth();

  const {
    data: users = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-roles', 'admin-moderators'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching admin/moderator users for assignment dropdown...');
        
        // Use the SECURITY DEFINER function to bypass RLS restrictions
        const { data, error } = await supabase.rpc('get_admin_users_for_assignment');

        if (error) {
          console.error('❌ Error calling get_admin_users_for_assignment:', error);
          return [];
        }

        if (!data || data.length === 0) {
          console.log('⚠️ No admin/moderator users found');
          return [];
        }

        console.log('👤 Admin users found:', data);

        // Transform the data to the expected format
        const adminUsers = data.map(user => ({
          id: user.user_id,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
        }));

        console.log(`✅ Found ${adminUsers.length} admin/moderator users for assignment:`, adminUsers);
        return adminUsers;
      } catch (error) {
        console.error('❌ Exception in useUserRoles:', error);
        return [];
      }
    },
    enabled: !!user, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    users,
    isLoading,
    error,
    refetch
  };
};

// Legacy compatibility - simplified role checking
export const useHasRole = (role: string) => {
  const { user } = useAuth();
  
  // All authenticated users have all roles in simplified system
  return {
    hasRole: !!user,
    isLoading: false
  };
};

export default useUserRoles;