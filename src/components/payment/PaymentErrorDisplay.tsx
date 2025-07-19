import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import {
  PaymentError,
  PaymentErrorContext,
  PaymentErrorHandler,
} from '@/utils/paymentErrorHandler';
import { PaymentGateway } from '@/types/payment';

interface PaymentErrorDisplayProps {
  error: PaymentError;
  context: PaymentErrorContext;
  onRetry?: () => void;
  onContactSupport?: () => void;
  onChangePaymentMethod?: () => void;
  className?: string;
}

export const PaymentErrorDisplay: React.FC<PaymentErrorDisplayProps> = ({
  error,
  context,
  onRetry,
  onContactSupport,
  onChangePaymentMethod,
  className = '',
}) => {
  const [parsedError, setParsedError] = useState<PaymentError | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const parsed = PaymentErrorHandler.parseError(error, context);
    setParsedError(parsed);

    if (parsed.shouldRetry && parsed.retryDelay) {
      setRetryCountdown(Math.ceil(parsed.retryDelay / 1000));
      setCanRetry(false);
    } else {
      setCanRetry(parsed.shouldRetry);
    }
  }, [error, context]);

  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            setCanRetry(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  const handleCopyTransactionId = () => {
    if (context.transactionId) {
      navigator.clipboard.writeText(context.transactionId);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-5 w-5" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5" />;
      case 'low':
        return <HelpCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getGatewayDisplayName = (gateway: PaymentGateway) => {
    const names = {
      payu: 'PayU',
      stripe: 'Stripe',
      bank_transfer: 'Bank Transfer',
      esewa: 'eSewa',
      khalti: 'Khalti',
      fonepay: 'Fonepay',
      cod: 'Cash on Delivery',
    };
    return names[gateway] || gateway;
  };

  if (!parsedError) {
    return null;
  }

  const recoveryActions = PaymentErrorHandler.getRecoveryActions(parsedError, context);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className={`border-2 ${getSeverityColor(parsedError.severity)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getSeverityIcon(parsedError.severity)}
            Payment Error
            <Badge variant="outline" className="ml-auto">
              {parsedError.severity.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-base">{parsedError.userMessage}</AlertDescription>
          </Alert>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Payment Method:</span>
              <span className="ml-2">{getGatewayDisplayName(context.gateway)}</span>
            </div>

            {context.transactionId && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Transaction ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {context.transactionId}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTransactionId}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}

            {context.amount && context.currency && (
              <div>
                <span className="font-medium">Amount:</span>
                <span className="ml-2">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: context.currency,
                  }).format(context.amount)}
                </span>
              </div>
            )}

            <div>
              <span className="font-medium">Time:</span>
              <span className="ml-2">{new Date(context.timestamp).toLocaleString()}</span>
            </div>
          </div>

          {/* Recovery Actions */}
          <div className="space-y-2">
            <h4 className="font-medium">What you can do:</h4>
            <ul className="space-y-1 text-sm">
              {recoveryActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {onRetry && PaymentErrorHandler.shouldShowRetryButton(parsedError) && (
              <Button
                onClick={onRetry}
                disabled={!canRetry}
                className="flex-1"
                variant={parsedError.severity === 'low' ? 'default' : 'outline'}
              >
                {retryCountdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Retry in {retryCountdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}

            {onChangePaymentMethod && (
              <Button onClick={onChangePaymentMethod} variant="outline" className="flex-1">
                Change Payment Method
              </Button>
            )}

            {onContactSupport && (
              <Button onClick={onContactSupport} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            )}
          </div>

          {/* Technical Details (Collapsible) */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span className="text-sm text-muted-foreground">
                  {showDetails ? 'Hide' : 'Show'} technical details
                </span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 space-y-2">
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <div className="space-y-1">
                  <div>
                    <strong>Error Code:</strong> {parsedError.code}
                  </div>
                  <div>
                    <strong>Message:</strong> {parsedError.message}
                  </div>
                  <div>
                    <strong>Severity:</strong> {parsedError.severity}
                  </div>
                  <div>
                    <strong>Can Retry:</strong> {parsedError.shouldRetry ? 'Yes' : 'No'}
                  </div>
                  {parsedError.retryDelay && (
                    <div>
                      <strong>Retry Delay:</strong> {parsedError.retryDelay / 1000}s
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Include these details when contacting support for faster resolution.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};
