
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Users, AlertTriangle } from "lucide-react";

export const AdminRoleRecovery = () => {
  const [emailToPromote, setEmailToPromote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if there are any admin users currently
  const { data: hasAdmins, isLoading: checkingAdmins } = useQuery({
    queryKey: ['has-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0;
    }
  });

  // Get backup data to show who was previously admin
  const { data: backupAdmins } = useQuery({
    queryKey: ['admin-backup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_role_backup')
        .select('*')
        .order('backup_created_at', { ascending: false });
      
      if (error) {
        console.log('No backup table found or error:', error);
        return [];
      }
      return data || [];
    }
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.functions.invoke('set-user-role', {
        body: { email, role: 'admin' },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['has-admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setEmailToPromote("");
      toast({ 
        title: "Admin role assigned successfully",
        description: "The user now has admin privileges."
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error assigning admin role", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  if (checkingAdmins) {
    return <div>Checking admin status...</div>;
  }

  return (
    <div className="space-y-6">
      {!hasAdmins && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>No admin users found.</strong> All admin roles were reset for security. 
            Use the form below to restore admin access to legitimate administrators.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Role Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="admin-email">Promote User to Admin</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="admin-email"
                type="email"
                value={emailToPromote}
                onChange={(e) => setEmailToPromote(e.target.value)}
                placeholder="Enter user email to promote to admin"
                className="flex-1"
              />
              <Button 
                onClick={() => promoteToAdminMutation.mutate(emailToPromote)}
                disabled={!emailToPromote || promoteToAdminMutation.isPending}
              >
                {promoteToAdminMutation.isPending ? 'Promoting...' : 'Make Admin'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {backupAdmins && backupAdmins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Previously Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                These users had admin access before the security reset:
              </p>
              {backupAdmins.map((admin, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    {admin.full_name && (
                      <p className="text-sm text-muted-foreground">{admin.full_name}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmailToPromote(admin.email);
                    }}
                  >
                    Restore Admin
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
