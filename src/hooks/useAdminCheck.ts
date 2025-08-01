import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      try {
        // Use the is_admin() RPC function instead of querying user_roles directly
        // This avoids the infinite recursion issue
        const { data: adminStatus, error } = await supabase
          .rpc('is_admin');

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setUserRole('user');
        } else {
          setIsAdmin(adminStatus === true);
          setUserRole(adminStatus ? 'admin' : 'user');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setUserRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isLoading, userRole };
}