import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mfaService } from '@/services/MFAService';
import { MFASetup } from './MFASetup';
import { MFAVerification } from './MFAVerification';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MFAProtectedRouteProps {
  children: React.ReactNode;
}

export const MFAProtectedRoute: React.FC<MFAProtectedRouteProps> = ({ children }) => {
  const { session, user } = useAuth();
  const [mfaState, setMfaState] = useState<{
    loading: boolean;
    requiresMFA: boolean;
    hasValidSession: boolean;
    mfaEnabled: boolean;
    error?: string;
  }>({
    loading: true,
    requiresMFA: false,
    hasValidSession: false,
    mfaEnabled: false,
  });

  useEffect(() => {
    if (!session || !user) {
      setMfaState({
        loading: false,
        requiresMFA: false,
        hasValidSession: true, // Allow non-authenticated users to pass through
        mfaEnabled: false,
      });
      return;
    }

    checkMFARequirements();
  }, [session, user]);

  const checkMFARequirements = async () => {
    if (!user?.id) return;

    try {
      logger.info('Checking MFA requirements for user:', user.email);
      
      // Check if user requires MFA
      const requiresMFA = await mfaService.requiresMFA(user.id);
      logger.info('User requires MFA:', requiresMFA);
      
      if (!requiresMFA) {
        // User doesn't need MFA (regular user)
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
      logger.info('MFA status:', mfaStatus);
      
      if (!mfaStatus?.enabled) {
        // Admin user without MFA set up - needs to set up MFA
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
      logger.info('MFA session token exists:', !!mfaSessionToken);
      
      const hasValidSession = mfaSessionToken ? 
        await mfaService.isSessionValid(mfaSessionToken) : false;
      logger.info('MFA session valid:', hasValidSession);

      setMfaState({
        loading: false,
        requiresMFA: true,
        hasValidSession: hasValidSession,
        mfaEnabled: true,
      });

    } catch (error) {
      logger.error('MFA guard check failed:', error);
      setMfaState({
        loading: false,
        requiresMFA: false,
        hasValidSession: false,
        mfaEnabled: false,
        error: 'Failed to check MFA requirements',
      });
    }
  };

  const handleMFASetupComplete = () => {
    logger.info('MFA setup completed');
    checkMFARequirements(); // Recheck after setup
  };

  const handleMFAVerificationSuccess = (token: string) => {
    logger.info('MFA verification successful');
    sessionStorage.setItem('mfa_session', token);
    setMfaState(prev => ({ ...prev, hasValidSession: true }));
  };

  const handleMFACancel = async () => {
    logger.info('MFA cancelled, signing out user');
    sessionStorage.removeItem('mfa_session');
    await supabase.auth.signOut();
  };

  // Show loading state
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

  // Show error state
  if (mfaState.error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{mfaState.error}</p>
          <button 
            onClick={checkMFARequirements}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If user doesn't require MFA or has valid MFA session, show children
  if (!mfaState.requiresMFA || mfaState.hasValidSession) {
    return <>{children}</>;
  }

  // If user requires MFA but doesn't have it enabled, show setup
  if (mfaState.requiresMFA && !mfaState.mfaEnabled) {
    return (
      <div className="h-screen flex items-center justify-center">
        <MFASetup 
          onComplete={handleMFASetupComplete}
          onSkip={() => {
            alert('MFA is required for admin accounts');
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

  // Fallback: should not reach here
  return <>{children}</>;
};