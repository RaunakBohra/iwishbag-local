
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type UserWithRole = {
  id: string;
  email: string | undefined;
  role: 'admin' | 'user';
  role_id: string;
};

export const UserRoles = () => {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();


  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      const { data, error } = await supabase.functions.invoke('get-users-with-roles');
      if (error) throw new Error(error.message);
      return data;
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
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setNewUserEmail("");
      toast({ title: "Role assigned successfully" });
    },
    onError: (error) => {
      toast({ title: "Error assigning role", description: error.message, variant: "destructive" });
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      // This is safe because we are just setting role to 'user', not deleting the role entry.
      // A full deletion could be implemented if needed. For now, this revokes admin.
      const userRole = userRoles?.find(ur => ur.role_id === roleId);
      if (!userRole) throw new Error("User role not found");

      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('id', roleId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({ title: "Admin role removed successfully (user set to 'user' role)" });
    },
    onError: (error) => {
      toast({ title: "Error removing role", description: error.message, variant: "destructive" });
    }
  });

  if (isLoading) return <div>Loading users and roles...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Role Management</h2>

      <Card>
        <CardHeader>
          <CardTitle>Assign Role to User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">User Email</Label>
              <Input 
                id="email" 
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'admin' | 'user') => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => assignRoleMutation.mutate({ email: newUserEmail, role: newUserRole })}
              disabled={!newUserEmail || assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current User Roles</h3>
        {userRoles?.map((userRole) => (
          <Card key={userRole.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{userRole.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">Role: {userRole.role}</p>
                </div>
                {userRole.role === 'admin' && userRole.id !== currentUser?.id && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => removeRoleMutation.mutate(userRole.role_id)}
                    disabled={removeRoleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Admin
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
