import { useAuth } from '@/contexts/AuthContext';

// Simplified user roles hook after role system removal
// All authenticated users are treated as admins for simplified access control
export const useUserRoles = () => {
  const { user } = useAuth();

  // Return empty array for users list since role system was removed
  return {
    users: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
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