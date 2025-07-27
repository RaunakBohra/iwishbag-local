import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { withRateLimitRetry, isRateLimitError } from '@/utils/rateLimitHandler';

// Types for permissions and roles
export interface Permission {
  permission_name: string;
  permission_description: string;
}

export interface Role {
  role_name: string;
  role_description: string;
}

export interface UsePermissionsReturn {
  permissions: Permission[];
  roles: Role[];
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  is: (roleName: string) => boolean;
  can: (permissionName: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

/**
 * Central permissions hook that provides access control functionality
 *
 * This hook integrates with the new database permissions system to provide
 * a simple, cached way to check user roles and permissions throughout the UI.
 *
 * Features:
 * - React Query caching to avoid redundant database calls
 * - Helper functions for easy permission/role checking
 * - Graceful loading and error state handling
 * - Integration with existing authentication system
 *
 * @returns Object containing permissions data and helper functions
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user, session } = useAuth();
  const isAuthenticated = !!(user && session);

  // Fetch user permissions using React Query
  const {
    data: permissions = [],
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async (): Promise<Permission[]> => {
      if (!user?.id) {
        return [];
      }

      try {
        const { data, error } = await withRateLimitRetry(
          () => supabase.rpc('get_user_permissions_new', { user_uuid: user.id }),
          { maxRetries: 2, initialDelay: 1000 },
          'get_user_permissions'
        );

        if (error) {
          // Don't log rate limit errors (they're handled by the handler)
          if (!isRateLimitError(error)) {
            logger.error('Error fetching user permissions:', error);
          }
          
          // Fallback: Check user_roles table directly
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const userRole = roles?.[0]?.role || 'user';
          return [
            {
              permission_name: userRole,
              permission_description: `${userRole} permissions`,
            },
          ];
        }

        return data || [];
      } catch (err) {
        if (!isRateLimitError(err)) {
          logger.warn('Falling back to basic permissions check', err);
        }
        return [
          {
            permission_name: 'user',
            permission_description: 'Basic user permissions',
          },
        ];
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3, // Retry failed requests up to 3 times
  });

  // Fetch user roles using React Query
  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async (): Promise<Role[]> => {
      if (!user?.id) {
        return [];
      }

      try {
        const { data, error } = await withRateLimitRetry(
          () => supabase.rpc('get_user_roles_new', { user_uuid: user.id }),
          { maxRetries: 2, initialDelay: 1000 },
          'get_user_roles'
        );

        if (error) {
          if (!isRateLimitError(error)) {
            logger.error('Error fetching user roles:', error);
          }
          // Fallback: Check user_roles table directly
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role, created_at')
            .eq('user_id', user.id)
            .eq('is_active', true);

          return (
            roles?.map((r) => ({
              role_name: r.role,
              role_description: `${r.role} role`,
            })) || []
          );
        }

        return data || [];
      } catch (err) {
        if (!isRateLimitError(err)) {
          logger.warn('Falling back to empty roles', err);
        }
        return [];
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3, // Retry failed requests up to 3 times
  });

  // Helper function to check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    if (!isAuthenticated || rolesLoading) {
      return false;
    }

    return roles.some((role) => role.role_name.toLowerCase() === roleName.toLowerCase());
  };

  // Helper function to check if user has a specific permission
  const hasPermission = (permissionName: string): boolean => {
    if (!isAuthenticated || permissionsLoading) {
      return false;
    }

    return permissions.some((permission) => permission.permission_name === permissionName);
  };

  // Alias for hasRole - more semantic for role checks
  const is = (roleName: string): boolean => hasRole(roleName);

  // Alias for hasPermission - more semantic for permission checks
  const can = (permissionName: string): boolean => hasPermission(permissionName);

  // Combined loading state
  const isLoading = permissionsLoading || rolesLoading;

  // Combined error state
  const error = permissionsError || rolesError || null;

  return {
    permissions,
    roles,
    hasRole,
    hasPermission,
    is,
    can,
    isLoading,
    error,
    isAuthenticated,
  };
};

/**
 * Utility hook for quick permission checks without full permissions data
 * Useful for components that only need to check a single permission
 */
export const usePermissionCheck = (permissionName: string) => {
  const { can, isLoading, isAuthenticated } = usePermissions();

  return {
    hasPermission: can(permissionName),
    isLoading,
    isAuthenticated,
  };
};

/**
 * Utility hook for quick role checks without full roles data
 * Useful for components that only need to check a single role
 */
export const useRoleCheck = (roleName: string) => {
  const { is, isLoading, isAuthenticated } = usePermissions();

  return {
    hasRole: is(roleName),
    isLoading,
    isAuthenticated,
  };
};

export default usePermissions;
