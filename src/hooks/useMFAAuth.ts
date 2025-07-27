import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { mfaService } from '@/services/MFAService';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface MFAAuthState {
  step: 'login' | 'mfa' | 'setup';
  userEmail?: string;
  userId?: string;
  sessionToken?: string;
}

export const useMFAAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState<MFAAuthState>({ step: 'login' });
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Login failed');
      }

      // Check if user requires MFA
      const requiresMFA = await mfaService.requiresMFA(data.user.id);
      
      if (requiresMFA) {
        // Check if MFA is set up
        const mfaStatus = await mfaService.getMFAStatus();
        
        if (mfaStatus?.enabled) {
          // User has MFA enabled, require verification
          setAuthState({
            step: 'mfa',
            userEmail: email,
            userId: data.user.id,
          });
        } else {
          // User needs to set up MFA (admin/moderator without MFA)
          setAuthState({
            step: 'setup',
            userEmail: email,
            userId: data.user.id,
          });
        }
      } else {
        // Regular user, no MFA required
        navigate(from, { replace: true });
      }
    } catch (error) {
      logger.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [from, navigate]);

  const handleMFAVerification = useCallback(async (sessionToken: string) => {
    try {
      // Store MFA session token (could be in secure cookie or session storage)
      sessionStorage.setItem('mfa_session', sessionToken);
      
      // Check user role for proper redirect
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      // Redirect based on role
      if (roleData?.role === 'admin' || roleData?.role === 'moderator') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (error) {
      logger.error('MFA verification redirect error:', error);
      navigate(from, { replace: true });
    }
  }, [from, navigate]);

  const handleMFASetupComplete = useCallback(() => {
    // After setup, redirect to appropriate dashboard
    handleMFAVerification('setup-complete');
  }, [handleMFAVerification]);

  const handleMFACancel = useCallback(async () => {
    // Sign out the user if they cancel MFA
    await supabase.auth.signOut();
    setAuthState({ step: 'login' });
    toast({
      title: 'Authentication Cancelled',
      description: 'Please complete MFA setup to access admin features',
    });
  }, []);

  const resetAuth = useCallback(() => {
    setAuthState({ step: 'login' });
  }, []);

  return {
    authState,
    loading,
    handleLogin,
    handleMFAVerification,
    handleMFASetupComplete,
    handleMFACancel,
    resetAuth,
  };
};