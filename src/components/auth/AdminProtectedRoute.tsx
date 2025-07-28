import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Navigate, Outlet } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { mfaService } from '@/services/MFAService';
import { MFASetup } from './MFASetup';
import { MFAVerification } from './MFAVerification';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const AdminProtectedRoute = () => {
  const { user, session } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  
  const [mfaState, setMfaState] = useState<{
    loading: boolean;
    requiresMFA: boolean;
    hasValidSession: boolean;
    mfaEnabled: boolean;
  }>({
    loading: true,
    requiresMFA: false,
    hasValidSession: false,
    mfaEnabled: false,
  });

  useEffect(() => {
    if (!user || !session || isAdminLoading) {
      return;
    }
    
    if (!isAdmin) {
      setMfaState({
        loading: false,
        requiresMFA: false,
        hasValidSession: true, // Regular users don't need MFA
        mfaEnabled: false,
      });
      return;
    }
    
    checkMFARequirements();
  }, [user, session, isAdmin, isAdminLoading]);

  const checkMFARequirements = async () => {
    if (!user?.id) return;

    try {
      logger.info('AdminProtectedRoute: MFA DISABLED - bypassing all MFA checks');
      
      // TEMPORARY: Disable MFA requirements completely
      setMfaState({
        loading: false,
        requiresMFA: false,
        hasValidSession: true,
        mfaEnabled: false,
      });
      return;

      // Original MFA code commented out for now
      /*
      logger.info('AdminProtectedRoute: Checking MFA for admin user:', user.email);
      
      // Development bypass - check sessionStorage for MFA bypass
      const mfaBypass = sessionStorage.getItem('mfa_dev_bypass');
      if (mfaBypass === 'true') {
        logger.info('AdminProtectedRoute: MFA development bypass active');
        setMfaState({
          loading: false,
          requiresMFA: true,
          hasValidSession: true,
          mfaEnabled: true,
        });
        return;
      }
      
      // Admin users always require MFA
      const requiresMFA = await mfaService.requiresMFA(user.id);
      logger.info('AdminProtectedRoute: Requires MFA:', requiresMFA);
      
      if (!requiresMFA) {
        // This shouldn't happen for admin users, but handle gracefully
        setMfaState({
          loading: false,
          requiresMFA: false,
          hasValidSession: true,
          mfaEnabled: false,
        });
        return;
      }

      // Check MFA status
      const mfaStatus = await mfaService.getMFAStatus();
      logger.info('AdminProtectedRoute: MFA Status:', mfaStatus);
      
      // Check if user has MFA in database (direct query)
      const { data: mfaConfig } = await supabase
        .from('mfa_configurations')
        .select('totp_enabled, totp_verified')
        .eq('user_id', user.id)
        .single();
      
      logger.info('AdminProtectedRoute: MFA Config from DB:', mfaConfig);
      
      const isMFAConfigured = mfaConfig?.totp_enabled && mfaConfig?.totp_verified;
      
      if (!isMFAConfigured) {
        // Admin user without MFA set up
        setMfaState({
          loading: false,
          requiresMFA: true,
          hasValidSession: false,
          mfaEnabled: false,
        });
        return;
      }

      // Check if user has valid MFA session
      const mfaSessionToken = sessionStorage.getItem('mfa_session');
      logger.info('AdminProtectedRoute: Has MFA session token:', !!mfaSessionToken);
      
      // In development, if MFA is configured and we have any session token, consider it valid
      const hasValidSession = !!mfaSessionToken;

      setMfaState({
        loading: false,
        requiresMFA: true,
        hasValidSession: hasValidSession,
        mfaEnabled: true,
      });
      */

    } catch (error) {
      logger.error('AdminProtectedRoute: MFA check failed:', error);
      setMfaState({
        loading: false,
        requiresMFA: false,
        hasValidSession: false,
        mfaEnabled: false,
      });
    }
  };

  const handleMFASetupComplete = async () => {
    logger.info('AdminProtectedRoute: MFA setup completed');
    
    // Generate a temporary session token for development
    const tempToken = `mfa_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('mfa_session', tempToken);
    
    // Set development bypass
    sessionStorage.setItem('mfa_dev_bypass', 'true');
    
    // Update state to reflect MFA is now set up and session is valid
    setMfaState({
      loading: false,
      requiresMFA: true,
      hasValidSession: true,
      mfaEnabled: true,
    });
    
    // Optionally reload to ensure clean state
    window.location.reload();
  };

  const handleMFAVerificationSuccess = (token: string) => {
    logger.info('AdminProtectedRoute: MFA verification successful');
    sessionStorage.setItem('mfa_session', token);
    setMfaState(prev => ({ ...prev, hasValidSession: true }));
  };

  const handleMFACancel = async () => {
    logger.info('AdminProtectedRoute: MFA cancelled, signing out');
    sessionStorage.removeItem('mfa_session');
    await supabase.auth.signOut();
  };

  // Show loading while checking admin role
  if (isAdminLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading admin permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!user || !session || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show loading while checking MFA
  if (mfaState.loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Checking security requirements...</p>
        </div>
      </div>
    );
  }

  // If user requires MFA but doesn't have it enabled, show setup
  if (mfaState.requiresMFA && !mfaState.mfaEnabled) {
    return (
      <div className="h-screen flex items-center justify-center">
        <MFASetup 
          onComplete={handleMFASetupComplete}
          onSkip={() => {
            alert('MFA is required for admin accounts. You cannot skip this step.');
          }}
        />
      </div>
    );
  }

  // If user requires MFA and has it enabled but no valid session, show verification
  if (mfaState.requiresMFA && mfaState.mfaEnabled && !mfaState.hasValidSession) {
    return (
      <div className="h-screen flex items-center justify-center">
        <MFAVerification
          onSuccess={handleMFAVerificationSuccess}
          onCancel={handleMFACancel}
          userEmail={user?.email}
        />
      </div>
    );
  }

  // If all checks pass, render the admin content
  return <Outlet />;
};

export default AdminProtectedRoute;
