import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { PaymentGateway } from '@/types/payment';

interface PaymentStatusTrackerProps {
  transactionId: string;
  gateway: PaymentGateway;
  onStatusChange?: (status: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimated_completion?: string;
  gateway_status?: string;
  last_update: string;
  error_message?: string;
}

export const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  transactionId,
  _gateway,
  onStatusChange,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [status, setStatus] = useState<PaymentStatus>({
    status: 'pending',
    progress: 0,
    last_update: new Date().toISOString(),
  });
  const [isChecking, setIsChecking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Start timer when component mounts
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initial status check when component mounts
  useEffect(() => {
    checkPaymentStatus();
  }, [transactionId]);

  // Auto-refresh payment status
  useEffect(() => {
    if (!autoRefresh) return;

    const checkStatus = async () => {
      if (status.status === 'completed' || status.status === 'failed') {
        return; // Stop checking if payment is final
      }

      await checkPaymentStatus();
    };

    const interval = setInterval(checkStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, status.status]);

  const checkPaymentStatus = async () => {
    // Add null check for transactionId
    if (!transactionId) {
      console.error('No transaction ID provided for payment status check');
      return;
    }

    setIsChecking(true);
    try {
      // Call the real payment status verification API
      const response = await fetch(`/supabase/functions/verify-payment-status/${transactionId}`);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setStatus(data);
          onStatusChange?.(data.status);
        }
      } else {
        // If API call fails, set error status
        const errorData = await response.json().catch(() => ({}));
        setStatus((prev) => ({
          ...prev,
          error_message: errorData.error || 'Failed to check payment status',
          last_update: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus((prev) => ({
        ...prev,
        error_message: 'Network error while checking payment status',
        last_update: new Date().toISOString(),
      }));
    } finally {
      setIsChecking(false);
    }
  };

  const _getGatewayStatus = (_gateway: PaymentGateway, _progress: number): string => {
    // Validate progress parameter
    const validProgress = Math.max(0, Math.min(100, _progress || 0));

    const statuses = {
      stripe: [
        'Initializing...',
        'Processing payment...',
        'Confirming transaction...',
        'Payment successful',
      ],
      payu: [
        'Redirecting to PayU...',
        'Payment in progress...',
        'Verifying payment...',
        'Payment confirmed',
      ],
      esewa: [
        'Generating QR code...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
      khalti: [
        'Generating QR code...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
      fonepay: [
        'Generating QR code...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
      bank_transfer: [
        'Preparing transfer details...',
        'Transfer initiated...',
        'Processing transfer...',
        'Transfer completed',
      ],
      cod: [
        'Order confirmed...',
        'Preparing for delivery...',
        'Out for delivery...',
        'Payment on delivery',
      ],
      airwallex: [
        'Initializing...',
        'Processing payment...',
        'Confirming transaction...',
        'Payment successful',
      ],
      razorpay: [
        'Initializing...',
        'Processing payment...',
        'Confirming transaction...',
        'Payment successful',
      ],
      paypal: [
        'Redirecting to PayPal...',
        'Processing payment...',
        'Confirming transaction...',
        'Payment successful',
      ],
      upi: [
        'Generating UPI request...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
      paytm: [
        'Redirecting to Paytm...',
        'Payment in progress...',
        'Verifying payment...',
        'Payment confirmed',
      ],
      grabpay: [
        'Generating QR code...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
      alipay: [
        'Generating QR code...',
        'Waiting for payment...',
        'Verifying payment...',
        'Payment received',
      ],
    };

    const gatewayStatuses = statuses[_gateway] || statuses.stripe;
    const statusIndex = Math.floor((validProgress / 100) * (gatewayStatuses.length - 1));
    return gatewayStatuses[Math.min(statusIndex, gatewayStatuses.length - 1)] || 'Processing...';
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-teal-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedTime = (): string => {
    if (status.estimated_completion) {
      const estimated = new Date(status.estimated_completion);
      const now = new Date();
      const diffMs = estimated.getTime() - now.getTime();
      const diffMins = Math.ceil(diffMs / (1000 * 60));
      return diffMins > 0 ? `${diffMins} minutes` : 'Almost done';
    }
    return 'Calculating...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={`text-xs ${getStatusColor()}`}>
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(status.progress)}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {/* Gateway Status */}
        {status.gateway_status && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Gateway:</span>
            <span className="text-sm font-medium">{status.gateway_status}</span>
          </div>
        )}

        {/* Time Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Time Elapsed:</span>
            <span className="text-sm font-medium">{formatTime(timeElapsed)}</span>
          </div>

          {status.estimated_completion &&
            status.status !== 'completed' &&
            status.status !== 'failed' && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Estimated Completion:</span>
                <span className="text-sm font-medium">{getEstimatedTime()}</span>
              </div>
            )}
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Last Update:</span>
          <span className="text-sm text-muted-foreground">
            {new Date(status.last_update).toLocaleTimeString()}
          </span>
        </div>

        {/* Action Buttons */}
        {status.status !== 'completed' && status.status !== 'failed' && (
          <Button
            onClick={checkPaymentStatus}
            disabled={isChecking}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Status'}
          </Button>
        )}

        {/* Error Message */}
        {status.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{status.error_message}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {status.status === 'completed' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Payment completed successfully! Your order has been confirmed.
              </span>
            </div>
          </div>
        )}

        {/* Failure Message */}
        {status.status === 'failed' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">
                Payment failed. Please try again or contact support.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
