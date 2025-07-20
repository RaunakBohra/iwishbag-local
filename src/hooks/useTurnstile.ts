import { useState, useCallback } from 'react';

interface UseTurnstileOptions {
  siteKey: string;
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
}

interface UseTurnstileReturn {
  token: string | null;
  isVerified: boolean;
  error: string | null;
  isLoading: boolean;
  handleSuccess: (token: string) => void;
  handleError: (error: string) => void;
  handleExpired: () => void;
  reset: () => void;
  clearError: () => void;
}

export const useTurnstile = (options: UseTurnstileOptions): UseTurnstileReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSuccess = useCallback((newToken: string) => {
    setToken(newToken);
    setError(null);
    setIsLoading(false);
    options.onSuccess?.(newToken);
  }, [options.onSuccess]);

  const handleError = useCallback((errorMessage: string) => {
    setToken(null);
    setError(errorMessage);
    setIsLoading(false);
    options.onError?.(errorMessage);
  }, [options.onError]);

  const handleExpired = useCallback(() => {
    setToken(null);
    setError('Verification expired. Please try again.');
    setIsLoading(false);
    options.onExpired?.();
  }, [options.onExpired]);

  const reset = useCallback(() => {
    setToken(null);
    setError(null);
    setIsLoading(true);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    token,
    isVerified: !!token && !error,
    error,
    isLoading,
    handleSuccess,
    handleError,
    handleExpired,
    reset,
    clearError,
  };
};

export default useTurnstile;