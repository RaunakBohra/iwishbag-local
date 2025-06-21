import { useState } from "react";
import { useCustomerManagement } from "@/hooks/useCustomerManagement";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const UserRoles = () => {
  const { customers: userRoles, isLoading, assignRoleMutation, removeRoleMutation } = useCustomerManagement();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const handleAssignRole = () => {
    if (!newUserEmail) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    assignRoleMutation.mutate({ email: newUserEmail, role: newUserRole });
  };

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
              onClick={handleAssignRole}
              disabled={assignRoleMutation.isPending}
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
