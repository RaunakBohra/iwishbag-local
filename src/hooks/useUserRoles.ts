import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user' | 'moderator';
  created_at: string;
  created_by: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user' | 'moderator' | null;
  role_id: string | null;
  created_at: string;
  created_by: string | null;
  last_sign_in?: string | null;
  email_confirmed?: boolean;
}

export const useUserRoles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch all users with their roles - Local Supabase compatible version
  const { data: users, isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      try {
        console.log('Fetching users with roles for local development...');
        
        // Get all user roles with profile information
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            *,
            profiles!inner (
              id,
              full_name,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          throw new Error('Failed to fetch user roles');
        }

        // Get all profiles to see all users
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw new Error('Failed to fetch user profiles');
        }

        // Create a map of user roles by user_id
        const rolesMap = new Map();
        userRoles?.forEach(role => {
          rolesMap.set(role.user_id, role);
        });

        // Combine profiles with their roles
        const usersWithRoles: UserWithRole[] = allProfiles?.map(profile => {
          const role = rolesMap.get(profile.id);
          
          return {
            id: profile.id,
            email: `user-${profile.id}@example.com`, // Mock email for local dev
            full_name: profile.full_name,
            role: role?.role || null,
            role_id: role?.id || null,
            created_at: profile.created_at,
            created_by: role?.created_by || null,
            last_sign_in: null,
            email_confirmed: true
          };
        }) || [];

        // Add current user if not in the list
        if (currentUser && !usersWithRoles.find(u => u.id === currentUser.id)) {
          usersWithRoles.unshift({
            id: currentUser.id,
            email: currentUser.email || 'current-user@example.com',
            full_name: currentUser.full_name || currentUser.email || null,
            role: null,
            role_id: null,
            created_at: currentUser.created_at,
            created_by: null,
            last_sign_in: currentUser.last_sign_in_at,
            email_confirmed: !!currentUser.email_confirmed_at
          });
        }

        console.log(`Users with roles fetched: ${usersWithRoles.length} users`);
        return usersWithRoles;
      } catch (error) {
        console.error('Error in useUserRoles query:', error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Assign role to user by email
  const assignRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'user' | 'moderator' }) => {
      try {
        // For local development, extract user ID from email or find by name
        let targetUserId: string;
        
        if (email.includes('user-') && email.includes('@example.com')) {
          // Extract user ID from mock email format
          targetUserId = email.replace('user-', '').replace('@example.com', '');
        } else {
          // Find user by email in the users list
          const targetUser = users?.find(user => user.email?.toLowerCase() === email.toLowerCase());
          
          if (!targetUser) {
            throw new Error(`User with email "${email}" not found`);
          }
          
          targetUserId = targetUser.id;
        }

        // Check if user already has a role
        const { data: existingRole, error: checkError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking existing role:', checkError);
          throw new Error('Failed to check existing user role');
        }

        if (existingRole) {
          // Update existing role
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ 
              role: role,
              created_by: currentUser?.id || null
            })
            .eq('user_id', targetUserId);

          if (updateError) {
            console.error('Error updating user role:', updateError);
            throw new Error('Failed to update user role');
          }
        } else {
          // Create new role
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: targetUserId,
              role: role,
              created_by: currentUser?.id || null
            });

          if (insertError) {
            console.error('Error creating user role:', insertError);
            throw new Error('Failed to create user role');
          }
        }

        console.log(`Role ${role} assigned to user ${email}`);
      } catch (error) {
        console.error('Assign role error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Assign role mutation error:', error);
      toast({
        title: "Error",
        description: errorMessage || "Failed to assign role. Please check the email and try again.",
        variant: "destructive",
      });
    },
  });

  // Remove role from user
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      try {
        // Get the role details first
        const { data: role, error: fetchError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('id', roleId)
          .single();

        if (fetchError) {
          console.error('Error fetching role for removal:', fetchError);
          throw new Error('Failed to fetch role details');
        }

        if (!role) {
          throw new Error('Role not found');
        }

        // Prevent removing your own admin role
        if (role.user_id === currentUser?.id && role.role === 'admin') {
          throw new Error('You cannot remove your own admin role');
        }

        // Delete the role
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('id', roleId);

        if (deleteError) {
          console.error('Error removing role:', deleteError);
          throw new Error('Failed to remove role');
        }

        console.log(`Role removed for user ${role.user_id}`);
      } catch (error) {
        console.error('Remove role error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({
        title: "Success",
        description: "Role removed successfully",
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Remove role mutation error:', error);
      toast({
        title: "Error",
        description: errorMessage || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  // Get users by role
  const getUsersByRole = (role: 'admin' | 'user' | 'moderator') => {
    return users?.filter(user => user.role === role) || [];
  };

  // Get users without roles
  const getUsersWithoutRole = () => {
    return users?.filter(user => !user.role) || [];
  };

  return {
    users,
    isLoading,
    assignRoleMutation,
    removeRoleMutation,
    getUsersByRole,
    getUsersWithoutRole,
    currentUser
  };
}; 