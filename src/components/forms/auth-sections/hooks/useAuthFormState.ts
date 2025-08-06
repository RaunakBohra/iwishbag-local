/**
 * useAuthFormState Hook
 * Manages authentication form state and session storage integration
 * Extracted from AuthForm for better reusability and testing
 */

import { useState, useEffect } from 'react';

type AuthMode = 'signin' | 'signup';

interface UseAuthFormStateReturn {
  // Mode management
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  toggleAuthMode: () => void;
  
  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Password reset modal
  showPasswordReset: boolean;
  setShowPasswordReset: (show: boolean) => void;
  
  // Password reset flow state
  inPasswordResetFlow: boolean;
  setInPasswordResetFlow: (inFlow: boolean) => void;
}

export const useAuthFormState = (): UseAuthFormStateReturn => {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [inPasswordResetFlow, setInPasswordResetFlow] = useState(false);

  // Check session storage for auto-open forgot password
  useEffect(() => {
    const shouldOpenForgotPassword = sessionStorage.getItem('openForgotPassword');
    if (shouldOpenForgotPassword === 'true') {
      setShowPasswordReset(true);
      sessionStorage.removeItem('openForgotPassword');
    }
  }, []);

  const toggleAuthMode = () => {
    setAuthMode(prevMode => prevMode === 'signin' ? 'signup' : 'signin');
  };

  return {
    // Mode management
    authMode,
    setAuthMode,
    toggleAuthMode,
    
    // Loading states
    loading,
    setLoading,
    
    // Password reset modal
    showPasswordReset,
    setShowPasswordReset,
    
    // Password reset flow state
    inPasswordResetFlow,
    setInPasswordResetFlow,
  };
};