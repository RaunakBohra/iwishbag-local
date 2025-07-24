import React, { createContext, useContext, ReactNode } from 'react';
import { usePermissions, UsePermissionsReturn } from '@/hooks/usePermissions';

// Create the permissions context with default values
const PermissionsContext = createContext<UsePermissionsReturn | null>(null);

// Provider component props
interface PermissionsProviderProps {
  children: ReactNode;
}

/**
 * PermissionsProvider Component
 *
 * This provider makes permissions data available throughout the application
 * by calling the usePermissions hook once and sharing the results via React Context.
 *
 * Features:
 * - Single source of truth for permissions data
 * - Prevents multiple permission API calls
 * - Provides centralized error handling
 * - Easy access to permissions throughout component tree
 *
 * Usage:
 * Wrap your application or main layout with this provider:
 *
 * ```tsx
 * <PermissionsProvider>
 *   <YourApp />
 * </PermissionsProvider>
 * ```
 *
 * Then use the usePermissionsContext hook in any child component:
 *
 * ```tsx
 * const { can, is, isLoading } = usePermissionsContext();
 * ```
 */
export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
  const permissionsData = usePermissions();

  return (
    <PermissionsContext.Provider value={permissionsData}>{children}</PermissionsContext.Provider>
  );
};

/**
 * Hook to consume the permissions context
 *
 * This hook provides access to the permissions data from anywhere in the component tree
 * without needing to call the database functions directly.
 *
 * @returns The permissions data and helper functions
 * @throws Error if used outside of PermissionsProvider
 */
export const usePermissionsContext = (): UsePermissionsReturn => {
  const context = useContext(PermissionsContext);

  if (context === null) {
    throw new Error(
      'usePermissionsContext must be used within a PermissionsProvider. ' +
        'Make sure to wrap your component tree with <PermissionsProvider>.',
    );
  }

  return context;
};

/**
 * Higher-order component for permission-based rendering
 *
 * This HOC conditionally renders children based on permission checks.
 * Useful for protecting entire components or sections of the UI.
 *
 * @param permission - The permission name to check
 * @param children - The content to render if permission is granted
 * @param fallback - Optional content to render if permission is denied
 */
interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { can, isLoading } = usePermissionsContext();

  // Show nothing while loading to prevent flashing
  if (isLoading) {
    return null;
  }

  // Render children if user has permission, otherwise render fallback
  return can(permission) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Higher-order component for role-based rendering
 *
 * This HOC conditionally renders children based on role checks.
 * Useful for protecting entire components or sections of the UI.
 *
 * @param role - The role name to check
 * @param children - The content to render if role is granted
 * @param fallback - Optional content to render if role is denied
 */
interface RoleGateProps {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ role, children, fallback = null }) => {
  const { is, isLoading } = usePermissionsContext();

  // Show nothing while loading to prevent flashing
  if (isLoading) {
    return null;
  }

  // Render children if user has role, otherwise render fallback
  return is(role) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Utility component for displaying permission-specific content
 *
 * This component provides a declarative way to show/hide content based on permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionCheck permission="quote:edit">
 *   <EditButton />
 * </PermissionCheck>
 * ```
 */
interface PermissionCheckProps {
  permission: string;
  children: ReactNode;
  loading?: ReactNode;
  denied?: ReactNode;
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({
  permission,
  children,
  loading = null,
  denied = null,
}) => {
  const { can, isLoading } = usePermissionsContext();

  if (isLoading) {
    return <>{loading}</>;
  }

  return can(permission) ? <>{children}</> : <>{denied}</>;
};

/**
 * Utility component for displaying role-specific content
 *
 * This component provides a declarative way to show/hide content based on roles.
 *
 * Usage:
 * ```tsx
 * <RoleCheck role="Admin">
 *   <AdminPanel />
 * </RoleCheck>
 * ```
 */
interface RoleCheckProps {
  role: string;
  children: ReactNode;
  loading?: ReactNode;
  denied?: ReactNode;
}

export const RoleCheck: React.FC<RoleCheckProps> = ({
  role,
  children,
  loading = null,
  denied = null,
}) => {
  const { is, isLoading } = usePermissionsContext();

  if (isLoading) {
    return <>{loading}</>;
  }

  return is(role) ? <>{children}</> : <>{denied}</>;
};
