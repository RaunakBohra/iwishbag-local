import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminStatusDebug() {
  const { user } = useAuth();
  const [roleData, setRoleData] = useState<any>(null);
  const [isAdminRPC, setIsAdminRPC] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check user role from user_roles table
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        setError(`Role check error: ${roleError.message}`);
      } else {
        setRoleData(role);
      }

      // Check using RPC function
      const { data: adminCheck, error: rpcError } = await supabase
        .rpc('is_admin');

      if (rpcError) {
        console.error('RPC error:', rpcError);
      } else {
        setIsAdminRPC(adminCheck);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: user.id, 
          role: 'admin' 
        }, { 
          onConflict: 'user_id' 
        });

      if (error) {
        setError(`Failed to set admin role: ${error.message}`);
      } else {
        await checkAdminStatus();
        window.location.reload(); // Reload to update all components
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>Not logged in. Please login first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container py-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Status Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>User Email:</strong> {user.email}
          </div>
          <div>
            <strong>User ID:</strong> {user.id}
          </div>
          <div>
            <strong>Role from user_roles table:</strong> {roleData?.role || 'No role found'}
          </div>
          <div>
            <strong>is_admin() RPC result:</strong> {isAdminRPC?.toString() || 'null'}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {roleData?.role !== 'admin' && (
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                You are not an admin. Click below to make yourself admin:
              </p>
              <Button onClick={makeAdmin} variant="default">
                Make Me Admin
              </Button>
            </div>
          )}

          {roleData?.role === 'admin' && (
            <Alert>
              <AlertDescription>
                ✅ You are an admin! You should be able to access all admin routes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <a href="/admin" className="text-blue-500 hover:underline">
              /admin - Admin Dashboard
            </a>
          </div>
          <div>
            <a href="/admin/emails" className="text-blue-500 hover:underline">
              /admin/emails - Email Dashboard
            </a>
          </div>
          <div>
            <a href="/admin/quotes" className="text-blue-500 hover:underline">
              /admin/quotes - Quotes List
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}