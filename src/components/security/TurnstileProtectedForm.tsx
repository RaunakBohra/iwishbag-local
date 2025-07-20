import React, { useState, useCallback } from 'react';
import { TurnstileWidget } from './TurnstileWidget';
import { useTurnstile } from '@/hooks/useTurnstile';
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/turnstileVerification';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, CheckCircle } from 'lucide-react';

interface TurnstileProtectedFormProps {
  children: React.ReactNode;
  onSubmit: (turnstileToken?: string) => Promise<void> | void;
  action?: string;
  submitButtonText?: string;
  submitButtonClassName?: string;
  isSubmitting?: boolean;
  disabled?: boolean; // Disables form submission, not Turnstile widget
  disableTurnstile?: boolean; // Specifically disable Turnstile widget
  showTurnstile?: boolean;
  className?: string;
  errorMessage?: string;
  id?: string; // Add unique ID to prevent duplicates
}

export const TurnstileProtectedForm: React.FC<TurnstileProtectedFormProps> = ({
  children,
  onSubmit,
  action = 'form_submit',
  submitButtonText = 'Submit',
  submitButtonClassName = '',
  isSubmitting = false,
  disabled = false,
  disableTurnstile = false,
  showTurnstile = isTurnstileEnabled(),
  className = '',
  errorMessage,
  id = 'default-form',
}) => {
  const siteKey = getTurnstileSiteKey();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    token,
    isVerified,
    error: turnstileError,
    handleSuccess,
    handleError,
    handleExpired,
    reset: resetTurnstile,
    clearError,
  } = useTurnstile({
    siteKey,
    onError: (error) => {
      console.error('Turnstile error:', error);
    },
    onExpired: () => {
      console.warn('Turnstile token expired');
    },
  });

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    try {
      // If Turnstile is enabled but not verified, show error
      if (showTurnstile && !isVerified) {
        setFormError('Please complete the security verification');
        return;
      }

      // Submit form with Turnstile token (if enabled)
      await onSubmit(showTurnstile ? token || undefined : undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setFormError(errorMessage);
    }
  }, [onSubmit, showTurnstile, isVerified, token, clearError]);

  const canSubmit = !isSubmitting && !disabled && (!showTurnstile || isVerified);
  const displayError = formError || turnstileError || errorMessage;

  return (
    <form onSubmit={handleFormSubmit} className={`turnstile-protected-form ${className}`} id={`turnstile-form-${id}`}>
      {children}

      {/* Turnstile Widget */}
      {showTurnstile && siteKey && (
        <div className="turnstile-section mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-gray-700">Security Verification</span>
            {isVerified && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Verified</span>
              </div>
            )}
          </div>
          
          <TurnstileWidget
            siteKey={siteKey}
            onSuccess={handleSuccess}
            onError={handleError}
            onExpired={handleExpired}
            action={action}
            theme="auto"
            size="normal"
            className="mb-3"
            disabled={disableTurnstile}
          />
          
          {turnstileError && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              {turnstileError}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {displayError && (
        <div className="error-section mb-4 p-3 border border-red-300 rounded bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{displayError}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className={`w-full ${submitButtonClassName}`}
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Submitting...
          </>
        ) : (
          <>
            {showTurnstile && isVerified && (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {submitButtonText}
          </>
        )}
      </Button>

      {/* Verification Status */}
      {showTurnstile && !isVerified && (
        <div className="verification-status mt-2 text-xs text-gray-500 text-center">
          <span>Complete security verification to continue</span>
        </div>
      )}
    </form>
  );
};

export default TurnstileProtectedForm;