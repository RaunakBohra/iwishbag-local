import { useState } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus, Shield, Users, UserCheck, AlertTriangle, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const UserRoles = () => {
  const { 
    users, 
    isLoading, 
    assignRoleMutation, 
    removeRoleMutation,
    getUsersByRole,
    getUsersWithoutRole,
    currentUser
  } = useUserRoles();
  
  const { toast } = useToast();
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user' | 'moderator'>('user');
  const [searchQuery, setSearchQuery] = useState("");

  const handleAssignRole = () => {
    if (!newUserEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    assignRoleMutation.mutate({ email: newUserEmail.trim(), role: newUserRole });
    setNewUserEmail(""); // Clear the input after submission
  };

  // Filter users based on search query
  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Get users by role
  const adminUsers = getUsersByRole('admin');
  const userUsers = getUsersByRole('user');
  const moderatorUsers = getUsersByRole('moderator');
  const usersWithoutRole = getUsersWithoutRole();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Role Management</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Users className="w-3 h-3 mr-1" />
            {users?.length || 0} Total Users
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{adminUsers.length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Moderators</p>
                <p className="text-2xl font-bold">{moderatorUsers.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{userUsers.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Role</p>
                <p className="text-2xl font-bold">{usersWithoutRole.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Role to User
          </CardTitle>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAssignRole();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'admin' | 'user' | 'moderator') => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAssignRole}
              disabled={assignRoleMutation.isPending || !newUserEmail.trim()}
              className="w-full"
            >
              {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="moderators">Moderators</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="no-role">No Role</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                currentUser={currentUser}
                onRemoveRole={removeRoleMutation.mutate}
                isRemoving={removeRoleMutation.isPending}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <div className="grid gap-4">
            {adminUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                currentUser={currentUser}
                onRemoveRole={removeRoleMutation.mutate}
                isRemoving={removeRoleMutation.isPending}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="moderators" className="space-y-4">
          <div className="grid gap-4">
            {moderatorUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                currentUser={currentUser}
                onRemoveRole={removeRoleMutation.mutate}
                isRemoving={removeRoleMutation.isPending}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4">
            {userUsers.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                currentUser={currentUser}
                onRemoveRole={removeRoleMutation.mutate}
                isRemoving={removeRoleMutation.isPending}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="no-role" className="space-y-4">
          <div className="grid gap-4">
            {usersWithoutRole.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                currentUser={currentUser}
                onRemoveRole={removeRoleMutation.mutate}
                isRemoving={removeRoleMutation.isPending}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredUsers.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

// User Card Component
interface UserCardProps {
  user: any;
  currentUser: any;
  onRemoveRole: (roleId: string) => void;
  isRemoving: boolean;
}

const UserCard = ({ user, currentUser, onRemoveRole, isRemoving }: UserCardProps) => {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'moderator': return <UserCheck className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      default: return <UserPlus className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium">{user.email}</p>
              {user.id === currentUser?.id && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
            {user.full_name && (
              <p className="text-sm text-muted-foreground">{user.full_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {user.role ? (
                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                  {getRoleIcon(user.role)}
                  <span className="ml-1 capitalize">{user.role}</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <UserPlus className="h-3 w-3 mr-1" />
                  No Role
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Joined: {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          {user.role && user.role !== 'user' && user.id !== currentUser?.id && user.role_id && (
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => onRemoveRole(user.role_id)}
              disabled={isRemoving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove {user.role}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
