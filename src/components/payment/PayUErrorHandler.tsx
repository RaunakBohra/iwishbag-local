import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayUErrorHandlerProps {
  error: string;
  retryAfter?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  transactionId?: string;
}

interface ErrorDetails {
  type: 'rate_limit' | 'configuration' | 'network' | 'payment' | 'unknown';
  message: string;
  solution: string;
  retryable: boolean;
  retryDelay?: number;
}

const ERROR_TYPES: Record<string, ErrorDetails> = {
  'Too many requests': {
    type: 'rate_limit',
    message: 'Too many payment requests',
    solution: 'Please wait before trying again. This prevents overwhelming the payment system.',
    retryable: true,
    retryDelay: 60,
  },
  'PayU configuration missing': {
    type: 'configuration',
    message: 'Payment gateway configuration error',
    solution: 'Please contact support. The payment system is not properly configured.',
    retryable: false,
  },
  'Failed to get exchange rate': {
    type: 'configuration',
    message: 'Currency conversion error',
    solution: 'Please contact support. Unable to convert currency for payment.',
    retryable: false,
  },
  'Network error': {
    type: 'network',
    message: 'Connection error',
    solution: 'Please check your internet connection and try again.',
    retryable: true,
    retryDelay: 30,
  },
  'Payment failed': {
    type: 'payment',
    message: 'Payment processing error',
    solution:
      'Your payment could not be processed. Please try again or use a different payment method.',
    retryable: true,
    retryDelay: 30,
  },
};

export const PayUErrorHandler: React.FC<PayUErrorHandlerProps> = ({
  error,
  retryAfter = 60,
  onRetry,
  onCancel,
  transactionId,
}) => {
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(retryAfter);
  const [canRetry, setCanRetry] = useState(false);

  // Determine error type
  const errorDetails = Object.entries(ERROR_TYPES).find(([key]) =>
    error.toLowerCase().includes(key.toLowerCase()),
  )?.[1] || {
    type: 'unknown',
    message: 'Payment error',
    solution: 'An unexpected error occurred. Please try again or contact support.',
    retryable: true,
    retryDelay: 30,
  };

  // Countdown timer for rate limiting
  useEffect(() => {
    if (errorDetails.type === 'rate_limit' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanRetry(true);
    }
  }, [countdown, errorDetails.type]);

  const handleRetry = () => {
    if (canRetry && onRetry) {
      toast({
        title: 'Retrying payment',
        description: 'Redirecting to PayU payment page...',
      });
      onRetry();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const getErrorIcon = () => {
    switch (errorDetails.type) {
      case 'rate_limit':
        return <Clock className="h-8 w-8 text-yellow-600" />;
      case 'configuration':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'network':
        return <RefreshCw className="h-8 w-8 text-blue-600" />;
      case 'payment':
        return <AlertTriangle className="h-8 w-8 text-orange-600" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-gray-600" />;
    }
  };

  const getProgressValue = () => {
    if (errorDetails.type === 'rate_limit') {
      return ((retryAfter - countdown) / retryAfter) * 100;
    }
    return 0;
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">{getErrorIcon()}</div>
        <CardTitle className="text-xl font-semibold text-gray-900">
          {errorDetails.message}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">{errorDetails.solution}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transaction ID */}
        {transactionId && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Transaction ID:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {transactionId.substring(0, 12)}...
            </Badge>
          </div>
        )}

        {/* Rate Limit Countdown */}
        {errorDetails.type === 'rate_limit' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Time remaining:</span>
              <span className="font-mono font-semibold text-gray-900">
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Please wait before trying again to avoid overwhelming the payment system
            </p>
          </div>
        )}

        {/* Error Details */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Error Details:</p>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {errorDetails.retryable && (
            <Button
              onClick={handleRetry}
              disabled={!canRetry}
              className="flex-1"
              variant={canRetry ? 'default' : 'outline'}
            >
              {canRetry ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Wait ({countdown}s)
                </>
              )}
            </Button>
          )}

          <Button onClick={handleCancel} variant="outline" className="flex-1">
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Support Information */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@iwishbag.com" className="text-blue-600 hover:underline">
              support@iwishbag.com
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
