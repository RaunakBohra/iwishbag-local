/**
 * Component that ensures user has a role after authentication
 * This handles cases where the database trigger didn't create a role
 */

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEnsureUserRole } from '@/hooks/useEnsureUserRole'
import { logger } from '@/lib/logger'

export const UserRoleEnsurer = () => {
  const { user } = useAuth()
  const { userRole, hasRole, isLoading, isCreatingRole } = useEnsureUserRole()

  useEffect(() => {
    if (user && !isLoading) {
      if (hasRole) {
        logger.info(`User ${user.id} has role: ${userRole?.role}`, {}, 'UserRoleEnsurer')
      } else if (!isCreatingRole) {
        logger.info(`Creating missing role for user ${user.id}`, {}, 'UserRoleEnsurer')
      }
    }
  }, [user, hasRole, userRole, isLoading, isCreatingRole])

  // This component doesn't render anything, it just ensures roles exist
  return null
}

export default UserRoleEnsurer