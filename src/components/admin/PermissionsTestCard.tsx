import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, User, Shield, Key, Loader2 } from 'lucide-react';

/**
 * PermissionsTestCard Component
 *
 * This is a temporary test component to verify the new permissions system is working correctly.
 * It displays current user's roles, permissions, and tests the helper functions.
 *
 * This component should be removed after successful verification.
 */
export const PermissionsTestCard: React.FC = () => {
  const { user } = useAuth();
  const { permissions, roles, hasRole, hasPermission, is, can, isLoading, error, isAuthenticated } =
    usePermissionsContext();

  // Test permissions to check
  const testPermissions = [
    'admin:dashboard',
    'quote:view',
    'quote:edit',
    'quote:approve',
    'user:assign_role',
    'payment:process',
    'system:maintenance',
    'nonexistent:permission',
  ];

  // Test roles to check
  const testRoles = [
    'Admin',
    'Quote Manager',
    'Finance Manager',
    'Customer Support',
    'User',
    'Nonexistent Role',
  ];

  if (!isAuthenticated) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Permissions Test - Not Authenticated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            User is not authenticated. Please log in to test permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            Permissions Test - Loading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">Loading user permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Permissions Test - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">Error loading permissions: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>User ID:</strong> {user?.id}
            </p>
            <p className="text-sm">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-sm">
              <strong>Authenticated:</strong>{' '}
              <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Roles ({roles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length > 0 ? (
            <div className="space-y-3">
              {roles.map((role, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{role.role_name}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{role.role_description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No roles assigned</p>
          )}
        </CardContent>
      </Card>

      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            User Permissions ({permissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {permissions.map((permission, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-mono">{permission.permission_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No permissions assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Role Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Role Check Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">hasRole() Function</h4>
              <div className="space-y-1">
                {testRoles.map((role) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span>{role}</span>
                    <Badge variant={hasRole(role) ? 'default' : 'secondary'}>
                      {hasRole(role) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">is() Function (Alias)</h4>
              <div className="space-y-1">
                {testRoles.map((role) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span>{role}</span>
                    <Badge variant={is(role) ? 'default' : 'secondary'}>
                      {is(role) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Check Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">hasPermission() Function</h4>
              <div className="space-y-1">
                {testPermissions.map((permission) => (
                  <div key={permission} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{permission}</span>
                    <Badge variant={hasPermission(permission) ? 'default' : 'secondary'}>
                      {hasPermission(permission) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">can() Function (Alias)</h4>
              <div className="space-y-1">
                {testPermissions.map((permission) => (
                  <div key={permission} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{permission}</span>
                    <Badge variant={can(permission) ? 'default' : 'secondary'}>
                      {can(permission) ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Function Consistency Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Function Consistency Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              These should all be identical (testing that aliases work correctly):
            </p>
            <div className="space-y-1">
              {testRoles.slice(0, 3).map((role) => (
                <div key={role} className="text-sm">
                  <span className="font-mono">
                    hasRole("{role}") === is("{role}"):{' '}
                  </span>
                  <Badge variant={hasRole(role) === is(role) ? 'default' : 'destructive'}>
                    {hasRole(role) === is(role) ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="space-y-1 mt-4">
              {testPermissions.slice(0, 3).map((permission) => (
                <div key={permission} className="text-sm">
                  <span className="font-mono">
                    hasPermission("{permission}") === can("{permission}"):{' '}
                  </span>
                  <Badge
                    variant={
                      hasPermission(permission) === can(permission) ? 'default' : 'destructive'
                    }
                  >
                    {hasPermission(permission) === can(permission) ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log('Permissions Data:', { permissions, roles });
                console.log('Helper Functions Test:', {
                  'hasRole("Admin")': hasRole('Admin'),
                  'is("Admin")': is('Admin'),
                  'hasPermission("admin:dashboard")': hasPermission('admin:dashboard'),
                  'can("admin:dashboard")': can('admin:dashboard'),
                });
              }}
            >
              Log Data to Console
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                alert(
                  `Current user ${can('admin:dashboard') ? 'CAN' : 'CANNOT'} access admin dashboard`,
                );
              }}
            >
              Test Admin Access
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                alert(`Current user ${is('Admin') ? 'IS' : 'IS NOT'} an Admin`);
              }}
            >
              Test Admin Role
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
