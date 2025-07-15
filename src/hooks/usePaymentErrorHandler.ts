import { useState, useCallback } from 'react';
import { PaymentError, PaymentErrorContext, PaymentErrorHandler } from '@/utils/paymentErrorHandler';
import { PaymentGateway } from '@/types/payment';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface UsePaymentErrorHandlerProps {
  gateway: PaymentGateway;
  onErrorLogged?: (error: PaymentError) => void;
}

export const usePaymentErrorHandler = ({ gateway, onErrorLogged }: UsePaymentErrorHandlerProps) => {
  const [currentError, setCurrentError] = useState<PaymentError | null>(null);
  const [errorContext, setErrorContext] = useState<PaymentErrorContext | null>(null);
  const supabase = useSupabaseClient();

  const handleError = useCallback(async (
    error: unknown,
    context: Partial<PaymentErrorContext> = {}
  ) => {
    const fullContext: PaymentErrorContext = {
      gateway,
      timestamp: new Date().toISOString(),
      ...context
    };

    const parsedError = PaymentErrorHandler.parseError(error, fullContext);
    
    // Set current error for UI display
    setCurrentError(parsedError);
    setErrorContext(fullContext);

    // Log error to database
    try {
      await logErrorToDatabase(parsedError, fullContext);
    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }

    // Call callback if provided
    onErrorLogged?.(parsedError);

    // Log to console for debugging
    console.error('Payment Error:', PaymentErrorHandler.formatErrorForLogging(parsedError, fullContext));

    return parsedError;
  }, [gateway, onErrorLogged, supabase]);

  const logErrorToDatabase = async (error: PaymentError, context: PaymentErrorContext) => {
    try {
      const { error: insertError } = await supabase
        .from('payment_error_logs')
        .insert({
          error_code: error.code,
          error_message: error.message,
          user_message: error.userMessage,
          severity: error.severity,
          gateway: context.gateway,
          transaction_id: context.transactionId,
          amount: context.amount,
          currency: context.currency,
          user_action: context.userAction,
          should_retry: error.shouldRetry,
          retry_delay: error.retryDelay,
          recovery_options: error.recoveryOptions,
          context: context,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error logging to database:', insertError);
      }
    } catch (err) {
      console.error('Database logging error:', err);
    }
  };

  const clearError = useCallback(() => {
    setCurrentError(null);
    setErrorContext(null);
  }, []);

  const retryLastAction = useCallback(() => {
    if (currentError && currentError.shouldRetry) {
      clearError();
      return true;
    }
    return false;
  }, [currentError, clearError]);

  const getRetryDelay = useCallback(() => {
    return currentError ? PaymentErrorHandler.getRetryDelay(currentError) : 0;
  }, [currentError]);

  const shouldShowRetryButton = useCallback(() => {
    return currentError ? PaymentErrorHandler.shouldShowRetryButton(currentError) : false;
  }, [currentError]);

  const getRecoveryActions = useCallback(() => {
    if (!currentError || !errorContext) return [];
    return PaymentErrorHandler.getRecoveryActions(currentError, errorContext);
  }, [currentError, errorContext]);

  return {
    currentError,
    errorContext,
    handleError,
    clearError,
    retryLastAction,
    getRetryDelay,
    shouldShowRetryButton,
    getRecoveryActions
  };
};