import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerCard } from "./CustomerCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, UserPlus, Shield, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type UserWithRole = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  role_id: string;
  full_name: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  user_addresses: any[];
};

export const CustomerManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [isRemoveAdminDialogOpen, setIsRemoveAdminDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isRemoveUserDialogOpen, setIsRemoveUserDialogOpen] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserWithRole | null>(null);
  const [selectedUserForRemoval, setSelectedUserForRemoval] = useState<UserWithRole | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('Fetching user data from edge function...');
      
      const { data: usersData, error } = await supabase.functions.invoke('get-users-with-roles');
      
      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
      }

      if (!Array.isArray(usersData) || usersData.length === 0) {
        console.log('No users found or invalid data structure');
        return [];
      }

      // Filter out admin users if desired, and transform data as needed for display
      // For now, let's keep all users but distinguish roles
      return usersData as UserWithRole[];
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string, role: 'admin' | 'user' }) => {
      const { error } = await supabase.functions.invoke('set-user-role', {
        body: { email, role },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewUserEmail("");
      setIsAddAdminDialogOpen(false);
      toast({ title: "Role assigned successfully" });
    },
    onError: (error) => {
      toast({ title: "Error assigning role", description: error.message, variant: "destructive" });
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const userRole = users?.find(ur => ur.role_id === roleId);
      if (!userRole) throw new Error("User role not found");

      // Remove admin role (by setting to 'user')
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('id', roleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsRemoveAdminDialogOpen(false);
      setSelectedUserForRoleChange(null);
      toast({ title: "Admin role removed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error removing role", description: error.message, variant: "destructive" });
    }
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({ userId, codEnabled }: { userId: string, codEnabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ cod_enabled: codEnabled })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "COD status updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating COD status", description: error.message, variant: "destructive" });
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string, notes: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ internal_notes: notes })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Notes updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating notes", description: error.message, variant: "destructive" });
    }
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, name }: { userId: string, name: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Name updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating name", description: error.message, variant: "destructive" });
    }
  });

  const addUserMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string, password: string }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password }
      });
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewUserEmail("");
      setNewUserPassword("");
      setIsAddUserDialogOpen(false);
      toast({ title: "User created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error. Please try signing in again.');
      }
      
      if (!session?.access_token) {
        console.error('No access token available');
        throw new Error('No access token available. Please try signing in again.');
      }

      console.log('Making delete request with token:', session.access_token.substring(0, 10) + '...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete user error:', errorData);
        throw new Error(errorData.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsRemoveUserDialogOpen(false);
      setSelectedUserForRemoval(null);
    },
    onError: (error: Error) => {
      console.error('Delete user mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddAdmin = () => {
    if (!newUserEmail) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" });
      return;
    }
    setIsAddAdminDialogOpen(true);
  };

  const handleRemoveAdmin = (user: UserWithRole) => {
    setSelectedUserForRoleChange(user);
    setIsRemoveAdminDialogOpen(true);
  };

  const handleAddUser = () => {
    if (!newUserEmail || !newUserPassword) {
      toast({ title: "Error", description: "Please enter both email and password", variant: "destructive" });
      return;
    }
    setIsAddUserDialogOpen(true);
  };

  const handleRemoveUser = (user: UserWithRole) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Error", description: "You cannot remove your own account", variant: "destructive" });
      return;
    }
    setSelectedUserForRemoval(user);
    setIsRemoveUserDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="Enter user email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                placeholder="Enter user password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading users...</p>
          </div>
        ) : error ? (
          <div className="col-span-full text-center text-red-500 py-10">
            <p>Error: {error.message}</p>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-10">No users found.</p>
        ) : (
          filteredUsers.map((user) => (
            <CustomerCard
              key={user.id}
              customer={user}
              onCodToggle={(userId, codEnabled) => updateCodMutation.mutate({ userId, codEnabled })}
              onNotesUpdate={(userId, notes) => updateNotesMutation.mutate({ userId, notes })}
              onNameUpdate={(userId, name) => updateNameMutation.mutate({ userId, name })}
              isCodUpdating={updateCodMutation.isPending}
              isNotesUpdating={updateNotesMutation.isPending}
              isNameUpdating={updateNameMutation.isPending}
              showRoleManagement={true}
              onRemoveAdmin={() => handleRemoveAdmin(user)}
              onRemoveUser={() => handleRemoveUser(user)}
              isAdmin={user.role === 'admin'}
              isCurrentUser={user.id === currentUser?.id}
              onAssignAdmin={(email) => assignRoleMutation.mutate({ email, role: 'admin' })}
            />
          ))
        )}
      </div>

      {/* Add User Confirmation Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Creation</DialogTitle>
            <DialogDescription>
              Are you sure you want to create a new user with email <strong>{newUserEmail}</strong>? This will create a new account with the specified password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addUserMutation.mutate({ email: newUserEmail, password: newUserPassword })}
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirmation Dialog */}
      <Dialog open={isRemoveUserDialogOpen} onOpenChange={setIsRemoveUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm User Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the user <strong>{selectedUserForRemoval?.email}</strong>? This action cannot be undone and will permanently delete their account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUserForRemoval && removeUserMutation.mutate(selectedUserForRemoval.id)}
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Confirmation Dialog */}
      <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admin Role Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to assign the admin role to <strong>{newUserEmail}</strong>? This will give them full administrative access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => assignRoleMutation.mutate({ email: newUserEmail, role: newUserRole })}
              disabled={assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation Dialog */}
      <Dialog open={isRemoveAdminDialogOpen} onOpenChange={setIsRemoveAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admin Role Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the admin role from <strong>{selectedUserForRoleChange?.email}</strong>? They will no longer have administrative access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveAdminDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUserForRoleChange?.role_id && removeRoleMutation.mutate(selectedUserForRoleChange.role_id)}
              disabled={removeRoleMutation.isPending}
            >
              {removeRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Admin Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
