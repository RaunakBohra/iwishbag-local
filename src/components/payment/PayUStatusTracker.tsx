import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  Smartphone,
  CreditCard,
  Building,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayUStatusTrackerProps {
  transactionId: string;
  amount: number;
  amountInINR: number;
  exchangeRate: number;
  onStatusChange?: (status: string) => void;
  onComplete?: (success: boolean) => void;
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  message: string;
  details?: string;
  timestamp: string;
}

const PAYMENT_STATUSES = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    message: 'Payment initiated',
    description: 'Your payment request has been sent to PayU',
  },
  processing: {
    icon: RefreshCw,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    message: 'Processing payment',
    description: 'PayU is processing your payment',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    message: 'Payment successful',
    description: 'Your payment has been completed successfully',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    message: 'Payment failed',
    description: 'Your payment could not be processed',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    message: 'Payment cancelled',
    description: 'You cancelled the payment',
  },
};

export const PayUStatusTracker: React.FC<PayUStatusTrackerProps> = ({
  transactionId,
  amount,
  amountInINR,
  exchangeRate,
  onStatusChange,
  onComplete,
}) => {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>({
    status: 'pending',
    message: 'Payment initiated',
    timestamp: new Date().toISOString(),
  });
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Simulate payment status progression
  useEffect(() => {
    const statusProgression = [
      { status: 'pending', delay: 0 },
      { status: 'processing', delay: 2000 },
      { status: 'success', delay: 5000 },
    ];

    statusProgression.forEach(({ status, delay }) => {
      setTimeout(() => {
        const newStatus: PaymentStatus = {
          status: status as 'pending' | 'processing' | 'success' | 'failed' | 'cancelled',
          message: PAYMENT_STATUSES[status as keyof typeof PAYMENT_STATUSES].message,
          timestamp: new Date().toISOString(),
        };

        setCurrentStatus(newStatus);
        onStatusChange?.(status);

        if (status === 'success') {
          onComplete?.(true);
          stopPolling();
        } else if (status === 'failed' || status === 'cancelled') {
          onComplete?.(false);
          stopPolling();
        }
      }, delay);
    });
  }, []);

  const startPolling = () => {
    setIsPolling(true);
    const interval = setInterval(() => {
      // In a real implementation, you would check the payment status from your backend
      console.log('Polling payment status for:', transactionId);
    }, 5000); // Poll every 5 seconds
    setPollingInterval(interval);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
  };

  const handleRetry = () => {
    toast({
      title: 'Retrying payment',
      description: 'Redirecting to PayU payment page...',
    });
    // In a real implementation, you would redirect to PayU again
  };

  const handleCancel = () => {
    setCurrentStatus({
      status: 'cancelled',
      message: 'Payment cancelled',
      timestamp: new Date().toISOString(),
    });
    onComplete?.(false);
    stopPolling();
  };

  const currentStatusConfig = PAYMENT_STATUSES[currentStatus.status];
  const StatusIcon = currentStatusConfig.icon;

  const getProgressValue = () => {
    switch (currentStatus.status) {
      case 'pending':
        return 25;
      case 'processing':
        return 75;
      case 'success':
        return 100;
      case 'failed':
        return 100;
      case 'cancelled':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <IndianRupee className="h-5 w-5" />
          PayU Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div
          className={`p-4 rounded-lg border ${currentStatusConfig.bgColor} ${currentStatusConfig.borderColor}`}
        >
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${currentStatusConfig.color}`} />
            <div className="flex-1">
              <h3 className={`font-semibold ${currentStatusConfig.color}`}>
                {currentStatusConfig.message}
              </h3>
              <p className="text-sm text-gray-600">{currentStatusConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Payment Progress</span>
            <span>{getProgressValue()}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>

        {/* Payment Details */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Transaction ID:</span>
            <span className="font-mono text-xs">{transactionId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount (USD):</span>
            <span className="font-semibold">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Amount (INR):</span>
            <span className="font-semibold">₹{amountInINR.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Exchange Rate:</span>
            <span>1 USD = ₹{exchangeRate.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Accepted Payment Methods:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              Cards
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              UPI
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              Net Banking
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {currentStatus.status === 'pending' && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1">
                Cancel Payment
              </Button>
              <Button size="sm" onClick={startPolling} disabled={isPolling} className="flex-1">
                {isPolling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>
            </>
          )}

          {currentStatus.status === 'failed' && (
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {currentStatus.status === 'success' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => (window.location.href = '/orders')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Orders
            </Button>
          )}
        </div>

        {/* Status Timestamp */}
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(currentStatus.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};
