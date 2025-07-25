import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Users, Shield, Settings, UserCog, Plus, Trash2, Save, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: Array<{
    role_id: number;
    role_name: string;
    role_description: string;
    is_active: boolean;
    assigned_at: string;
  }>;
}

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface RoleWithPermissions {
  role: Role;
  permissions: Array<{
    permission_id: number;
    permission_name: string;
    permission_description: string;
  }>;
}

// Main component
const UserManagementPage: React.FC = () => {
  const { can, isLoading: permissionsLoading } = usePermissionsContext();
  const queryClient = useQueryClient();

  // State for modals and selection
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userRolesDialogOpen, setUserRolesDialogOpen] = useState(false);
  const [rolePermissionsDialogOpen, setRolePermissionsDialogOpen] = useState(false);

  // Check if user has required permissions
  const canAssignRoles = can('user:assign_role');
  const canManageRoles = can('admin:settings');
  const canViewUsers = can('user:view');

  // Fetch all users with their roles
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['all-users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const { data, error } = await supabase.rpc('get_all_users_with_roles');
      if (error) throw error;
      return data || [];
    },
    enabled: canViewUsers,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Fetch all available roles
  const { data: allRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['all-roles'],
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase.from('roles').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch all available permissions
  const { data: allPermissions = [], isLoading: permissionsQueryLoading } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase.from('permissions').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch role with permissions (when editing a role)
  const { data: selectedRoleWithPermissions, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['role-with-permissions', selectedRole?.id],
    queryFn: async (): Promise<RoleWithPermissions> => {
      if (!selectedRole?.id) throw new Error('No role selected');
      const { data, error } = await supabase.rpc('get_role_with_permissions', {
        target_role_id: selectedRole.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRole?.id && canManageRoles,
  });

  // Mutation to update user roles
  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: number[] }) => {
      const { data, error } = await supabase.rpc('update_user_roles', {
        target_user_id: userId,
        role_ids: roleIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
        setUserRolesDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update role permissions
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      const { data, error } = await supabase.rpc('update_role_permissions', {
        target_role_id: roleId,
        permission_ids: permissionIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['role-with-permissions'] });
        queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
        setRolePermissionsDialogOpen(false);
        setSelectedRole(null);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Loading states
  const isLoading = permissionsLoading || usersLoading || rolesLoading || permissionsQueryLoading;

  // Permission check
  if (!permissionsLoading && !canViewUsers) {
    return (
      <div className="container py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              You don't have permission to view user management. Required permission: user:view
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User & Role Management
          </h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions in the iwishBag system
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2" disabled={!canManageRoles}>
            <Shield className="h-4 w-4" />
            Role Management
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users ({users.length})
                </span>
                {!canAssignRoles && <Badge variant="secondary">View Only</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : usersError ? (
                <div className="text-red-600">Error loading users: {usersError.message}</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <UserCard
                      key={user.user_id}
                      user={user}
                      canAssignRoles={canAssignRoles}
                      onManageRoles={() => {
                        setSelectedUser(user);
                        setUserRolesDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Management ({allRoles.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      onEditPermissions={() => {
                        setSelectedRole(role);
                        setRolePermissionsDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Roles Management Dialog */}
      <UserRolesDialog
        user={selectedUser}
        allRoles={allRoles}
        open={userRolesDialogOpen}
        onOpenChange={setUserRolesDialogOpen}
        onSave={(roleIds) => {
          if (selectedUser) {
            updateUserRolesMutation.mutate({
              userId: selectedUser.user_id,
              roleIds,
            });
          }
        }}
        isLoading={updateUserRolesMutation.isPending}
      />

      {/* Role Permissions Management Dialog */}
      <RolePermissionsDialog
        role={selectedRole}
        roleWithPermissions={selectedRoleWithPermissions}
        allPermissions={allPermissions}
        open={rolePermissionsDialogOpen}
        onOpenChange={setRolePermissionsDialogOpen}
        onSave={(permissionIds) => {
          if (selectedRole) {
            updateRolePermissionsMutation.mutate({
              roleId: selectedRole.id,
              permissionIds,
            });
          }
        }}
        isLoading={updateRolePermissionsMutation.isPending || rolePermissionsLoading}
      />
    </div>
  );
};

// User Card Component
interface UserCardProps {
  user: UserWithRoles;
  canAssignRoles: boolean;
  onManageRoles: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, canAssignRoles, onManageRoles }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">{user.full_name || 'Unknown User'}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <Badge key={role.role_id} variant="outline" className="text-xs">
                {role.role_name}
              </Badge>
            ))
          ) : (
            <Badge variant="secondary" className="text-xs">
              No roles assigned
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canAssignRoles && (
          <Button variant="outline" size="sm" onClick={onManageRoles}>
            <Settings className="h-4 w-4 mr-1" />
            Manage Roles
          </Button>
        )}
      </div>
    </div>
  );
};

// Role Card Component
interface RoleCardProps {
  role: Role;
  onEditPermissions: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, onEditPermissions }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {role.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
        <Button variant="outline" size="sm" onClick={onEditPermissions} className="w-full">
          <Settings className="h-4 w-4 mr-1" />
          Edit Permissions
        </Button>
      </CardContent>
    </Card>
  );
};

// User Roles Dialog Component
interface UserRolesDialogProps {
  user: UserWithRoles | null;
  allRoles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (roleIds: number[]) => void;
  isLoading: boolean;
}

const UserRolesDialog: React.FC<UserRolesDialogProps> = ({
  user,
  allRoles,
  open,
  onOpenChange,
  onSave,
  isLoading,
}) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  React.useEffect(() => {
    if (user) {
      setSelectedRoleIds(user.roles.map((role) => role.role_id));
    }
  }, [user]);

  const handleRoleToggle = (roleId: number, checked: boolean) => {
    if (checked) {
      setSelectedRoleIds((prev) => [...prev, roleId]);
    } else {
      setSelectedRoleIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Manage Roles for {user?.full_name || user?.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the roles you want to assign to this user:
          </p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {allRoles.map((role) => (
              <div key={role.id} className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {role.name}
                  </label>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={() => onSave(selectedRoleIds)} disabled={isLoading}>
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Roles
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Role Permissions Dialog Component
interface RolePermissionsDialogProps {
  role: Role | null;
  roleWithPermissions: RoleWithPermissions | undefined;
  allPermissions: Permission[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (permissionIds: number[]) => void;
  isLoading: boolean;
}

const RolePermissionsDialog: React.FC<RolePermissionsDialogProps> = ({
  role,
  roleWithPermissions,
  allPermissions,
  open,
  onOpenChange,
  onSave,
  isLoading,
}) => {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  React.useEffect(() => {
    if (roleWithPermissions) {
      setSelectedPermissionIds(
        roleWithPermissions.permissions.map((permission) => permission.permission_id),
      );
    }
  }, [roleWithPermissions]);

  const handlePermissionToggle = (permissionId: number, checked: boolean) => {
    if (checked) {
      setSelectedPermissionIds((prev) => [...prev, permissionId]);
    } else {
      setSelectedPermissionIds((prev) => prev.filter((id) => id !== permissionId));
    }
  };

  // Group permissions by category
  const groupedPermissions = allPermissions.reduce(
    (groups, permission) => {
      const category = permission.name.split(':')[0] || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
      return groups;
    },
    {} as Record<string, Permission[]>,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions for {role?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the permissions you want to assign to this role:
          </p>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(groupedPermissions).map(([category, permissions]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-semibold text-sm capitalize">{category} Permissions</h4>
                <div className="space-y-2 ml-4">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={selectedPermissionIds.includes(permission.id)}
                        onCheckedChange={(checked) =>
                          handlePermissionToggle(permission.id, checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`permission-${permission.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.name}
                        </label>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={() => onSave(selectedPermissionIds)} disabled={isLoading}>
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Permissions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManagementPage;
