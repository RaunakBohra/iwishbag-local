/**
 * Hook to ensure user has a role after signup
 * This handles cases where the trigger didn't create a role
 */

import { useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export const useEnsureUserRole = () => {
  const { user } = useAuth()

  // Check if user has a role
  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking user role:', error)
        return null
      }

      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Create role if missing
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'user',
          created_by: user.id,
          is_active: true,
          scope: 'global'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      console.log('✅ User role created successfully')
    },
    onError: (error) => {
      console.error('❌ Failed to create user role:', error)
    }
  })

  // Auto-create role if user exists but has no role
  useEffect(() => {
    if (user?.id && !isLoading && !userRole && !createRoleMutation.isPending) {
      console.log('Creating missing user role for:', user.id)
      createRoleMutation.mutate()
    }
  }, [user?.id, userRole, isLoading, createRoleMutation])

  return {
    userRole,
    isLoading,
    hasRole: !!userRole,
    createRole: createRoleMutation.mutate,
    isCreatingRole: createRoleMutation.isPending
  }
}