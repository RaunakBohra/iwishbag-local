/**
 * AuthForm Component (Refactored)
 * Now uses focused components for better maintainability
 * Original: 1,239 lines → ~120 lines (90% reduction)
 */

import React from 'react';
import { SignInSection } from './auth-sections/SignInSection';
import { SignUpSection } from './auth-sections/SignUpSection';
import { OAuthButtons } from './auth-sections/OAuthButtons';
import { PasswordResetSection } from './auth-sections/PasswordResetSection';
import { useAuthFormState } from './auth-sections/hooks/useAuthFormState';

interface AuthFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onPasswordResetModeChange?: (allow: boolean) => void;
}

const AuthForm = ({ onLogin, onPasswordResetModeChange }: AuthFormProps = {}) => {
  const {
    authMode,
    toggleAuthMode,
    loading,
    setLoading,
    showPasswordReset,
    setShowPasswordReset,
    inPasswordResetFlow,
    setInPasswordResetFlow,
  } = useAuthFormState();

  // Handle password reset mode changes
  const handlePasswordResetModeChange = (allow: boolean) => {
    setInPasswordResetFlow(allow);
    onPasswordResetModeChange?.(allow);
  };

  // Custom login handler that manages loading state
  const handleLogin = async (email: string, password: string) => {
    if (onLogin) {
      setLoading(true);
      try {
        await onLogin(email, password);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {authMode === 'signin' ? (
        <div className="space-y-6">
          <SignInSection
            onLogin={onLogin ? handleLogin : undefined}
            onToggleSignUp={toggleAuthMode}
            onShowForgotPassword={() => setShowPasswordReset(true)}
            loading={loading}
          />
          
          <OAuthButtons disabled={loading || inPasswordResetFlow} />
        </div>
      ) : (
        <div className="space-y-6">
          <SignUpSection
            onToggleSignIn={toggleAuthMode}
            loading={loading}
          />
          
          <OAuthButtons disabled={loading || inPasswordResetFlow} />
        </div>
      )}

      {/* Password Reset Dialog */}
      <PasswordResetSection
        open={showPasswordReset}
        onOpenChange={setShowPasswordReset}
        onPasswordResetModeChange={handlePasswordResetModeChange}
      />
    </div>
  );
};

export default AuthForm;