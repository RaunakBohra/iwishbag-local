import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mfaService } from '@/services/MFAService';
import { logger } from '@/utils/logger';

interface MFAGuardState {
  loading: boolean;
  requiresMFA: boolean;
  hasValidMFASession: boolean;
  mfaEnabled: boolean;
}

/**
 * Hook to check if the current authenticated user needs MFA verification
 * Returns loading state and MFA requirements
 */
export const useMFAGuard = () => {
  const { session, user } = useAuth();
  const [state, setState] = useState<MFAGuardState>({
    loading: true,
    requiresMFA: false,
    hasValidMFASession: false,
    mfaEnabled: false,
  });

  useEffect(() => {
    if (!session || !user) {
      setState({
        loading: false,
        requiresMFA: false,
        hasValidMFASession: false,
        mfaEnabled: false,
      });
      return;
    }

    checkMFARequirements();
  }, [session, user]);

  const checkMFARequirements = async () => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Check if user requires MFA
      const requiresMFA = await mfaService.requiresMFA(user.id);
      
      if (!requiresMFA) {
        // User doesn't need MFA (regular user)
        setState({
          loading: false,
          requiresMFA: false,
          hasValidMFASession: true,
          mfaEnabled: false,
        });
        return;
      }

      // Check MFA status
      const mfaStatus = await mfaService.getMFAStatus();
      
      if (!mfaStatus?.enabled) {
        // Admin user without MFA set up - needs to set up MFA
        setState({
          loading: false,
          requiresMFA: true,
          hasValidMFASession: false,
          mfaEnabled: false,
        });
        return;
      }

      // Check if user has valid MFA session
      const mfaSessionToken = sessionStorage.getItem('mfa_session');
      const hasValidSession = mfaSessionToken ? 
        await mfaService.isSessionValid(mfaSessionToken) : false;

      setState({
        loading: false,
        requiresMFA: true,
        hasValidMFASession: hasValidSession,
        mfaEnabled: true,
      });

    } catch (error) {
      logger.error('MFA guard check failed:', error);
      setState({
        loading: false,
        requiresMFA: false,
        hasValidMFASession: false,
        mfaEnabled: false,
      });
    }
  };

  const clearMFASession = () => {
    sessionStorage.removeItem('mfa_session');
    setState(prev => ({ ...prev, hasValidMFASession: false }));
  };

  const setMFASession = (token: string) => {
    sessionStorage.setItem('mfa_session', token);
    setState(prev => ({ ...prev, hasValidMFASession: true }));
  };

  return {
    ...state,
    clearMFASession,
    setMFASession,
    recheckMFA: checkMFARequirements,
  };
};