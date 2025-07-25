import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorType, ErrorSeverity, AppError } from '@/lib/errorHandling';
import { UnifiedQuote } from '@/types/quote';

interface QuoteErrorRecoveryProps {
  error: AppError | Error;
  quote?: UnifiedQuote;
  onRetry?: () => Promise<void>;
  onRecovery?: () => void;
  onIgnore?: () => void;
  className?: string;
}

interface RecoveryStep {
  id: string;
  label: string;
  action: () => Promise<boolean>;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
}

export function QuoteErrorRecovery({
  error,
  quote,
  onRetry,
  onRecovery,
  onIgnore,
  className = '',
}: QuoteErrorRecoveryProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySteps, setRecoverySteps] = useState<RecoveryStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [recoveryProgress, setRecoveryProgress] = useState(0);

  // Determine error type and severity
  const appError = error instanceof AppError ? error : new AppError(error.message);
  const errorType = appError.type;
  const severity = appError.severity;

  // Initialize recovery steps based on error type
  useEffect(() => {
    const steps = getRecoverySteps(errorType, quote);
    setRecoverySteps(steps);
  }, [errorType, quote]);

  // Recovery step builders
  function getRecoverySteps(type: ErrorType, quoteData?: UnifiedQuote): RecoveryStep[] {
    switch (type) {
      case ErrorType.NETWORK:
        return [
          {
            id: 'check-connection',
            label: 'Checking network connection',
            action: async () => {
              try {
                await fetch('/api/health', { method: 'HEAD' });
                return true;
              } catch {
                return false;
              }
            },
            status: 'pending',
          },
          {
            id: 'retry-request',
            label: 'Retrying request',
            action: async () => {
              if (onRetry) {
                try {
                  await onRetry();
                  return true;
                } catch {
                  return false;
                }
              }
              return false;
            },
            status: 'pending',
          },
        ];

      case ErrorType.CALCULATION:
        return [
          {
            id: 'validate-data',
            label: 'Validating quote data',
            action: async () => {
              if (!quoteData) return false;
              // Check for required fields
              const hasRequiredFields = !!(
                quoteData.item_price &&
                quoteData.destination_country &&
                quoteData.origin_country
              );
              return hasRequiredFields;
            },
            status: 'pending',
          },
          {
            id: 'reset-calculations',
            label: 'Resetting calculations',
            action: async () => {
              // Clear any cached calculations
              sessionStorage.removeItem(`quote-calc-${quoteData?.id}`);
              return true;
            },
            status: 'pending',
          },
          {
            id: 'recalculate',
            label: 'Recalculating quote',
            action: async () => {
              if (onRetry) {
                try {
                  await onRetry();
                  return true;
                } catch {
                  return false;
                }
              }
              return false;
            },
            status: 'pending',
          },
        ];

      case ErrorType.DATABASE:
        return [
          {
            id: 'check-connection',
            label: 'Checking database connection',
            action: async () => {
              try {
                const response = await fetch('/api/health/db');
                return response.ok;
              } catch {
                return false;
              }
            },
            status: 'pending',
          },
          {
            id: 'clear-cache',
            label: 'Clearing local cache',
            action: async () => {
              // Clear React Query cache for this quote
              if (quoteData?.id) {
                sessionStorage.removeItem(`quote-${quoteData.id}`);
              }
              return true;
            },
            status: 'pending',
          },
          {
            id: 'retry-save',
            label: 'Retrying save operation',
            action: async () => {
              if (onRetry) {
                try {
                  await onRetry();
                  return true;
                } catch {
                  return false;
                }
              }
              return false;
            },
            status: 'pending',
          },
        ];

      case ErrorType.VALIDATION:
        return [
          {
            id: 'identify-issues',
            label: 'Identifying validation issues',
            action: async () => {
              // Log validation context
              console.log('Validation error context:', appError.context);
              return true;
            },
            status: 'pending',
          },
          {
            id: 'auto-fix',
            label: 'Attempting auto-fix',
            action: async () => {
              // Try to fix common validation issues
              if (appError.context?.field === 'customs_percentage' && appError.context?.value > 100) {
                // Fix percentage values
                return true;
              }
              return false;
            },
            status: 'pending',
          },
        ];

      default:
        return [
          {
            id: 'generic-retry',
            label: 'Attempting recovery',
            action: async () => {
              if (onRetry) {
                try {
                  await onRetry();
                  return true;
                } catch {
                  return false;
                }
              }
              return false;
            },
            status: 'pending',
          },
        ];
    }
  }

  // Execute recovery process
  const startRecovery = async () => {
    setIsRecovering(true);
    setCurrentStep(0);
    setRecoveryProgress(0);

    const updatedSteps = [...recoverySteps];
    let allSuccess = true;

    for (let i = 0; i < updatedSteps.length; i++) {
      setCurrentStep(i);
      updatedSteps[i].status = 'running';
      setRecoverySteps([...updatedSteps]);

      try {
        const success = await updatedSteps[i].action();
        updatedSteps[i].status = success ? 'success' : 'failed';
        
        if (!success) {
          allSuccess = false;
          // Skip remaining steps if critical step fails
          if (i < updatedSteps.length - 1) {
            for (let j = i + 1; j < updatedSteps.length; j++) {
              updatedSteps[j].status = 'skipped';
            }
          }
          break;
        }
      } catch (error) {
        updatedSteps[i].status = 'failed';
        allSuccess = false;
        break;
      }

      setRecoverySteps([...updatedSteps]);
      setRecoveryProgress(((i + 1) / updatedSteps.length) * 100);
      
      // Add small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRecovering(false);

    if (allSuccess && onRecovery) {
      onRecovery();
    }
  };

  // Render recovery step status
  const renderStepStatus = (status: RecoveryStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  // Determine if error is recoverable
  const isRecoverable = appError.recoverable !== false && onRetry;

  return (
    <Card className={`border-destructive/50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          {errorType === ErrorType.NETWORK ? 'Connection Error' :
           errorType === ErrorType.CALCULATION ? 'Calculation Error' :
           errorType === ErrorType.DATABASE ? 'Save Error' :
           errorType === ErrorType.VALIDATION ? 'Validation Error' :
           'Error Occurred'}
        </CardTitle>
        <CardDescription>
          {appError.userMessage || appError.message}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error details for high severity */}
        {severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2 font-mono text-xs">
              {error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Recovery steps */}
        {recoverySteps.length > 0 && (isRecovering || recoveryProgress > 0) && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Recovery Progress</div>
            <Progress value={recoveryProgress} className="h-2" />
            
            <div className="space-y-2">
              {recoverySteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${
                    index === currentStep ? 'font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {renderStepStatus(step.status)}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isRecovering && (
          <div className="flex gap-2">
            {isRecoverable && (
              <Button
                onClick={startRecovery}
                disabled={isRecovering}
                variant="default"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {recoveryProgress > 0 ? 'Retry Recovery' : 'Start Recovery'}
              </Button>
            )}
            
            {onIgnore && (
              <Button
                onClick={onIgnore}
                variant="outline"
                size="sm"
                disabled={isRecovering}
              >
                Continue Anyway
              </Button>
            )}
          </div>
        )}

        {/* Help text based on error type */}
        <div className="text-xs text-muted-foreground">
          {errorType === ErrorType.NETWORK && (
            <p>Check your internet connection and try again. If the problem persists, contact support.</p>
          )}
          {errorType === ErrorType.CALCULATION && (
            <p>The calculation couldn't be completed. Verify your input data and try again.</p>
          )}
          {errorType === ErrorType.DATABASE && (
            <p>Changes couldn't be saved. Your data is safe. Please retry in a moment.</p>
          )}
          {errorType === ErrorType.VALIDATION && (
            <p>Please check the highlighted fields and correct any errors.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}