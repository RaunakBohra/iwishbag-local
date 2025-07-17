import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  QrCode,
  Smartphone,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import { PaymentGateway } from '@/types/payment';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  gateway: PaymentGateway;
  qrCodeUrl: string;
  amount: number;
  currency: string;
  transactionId: string;
  onPaymentComplete: () => void;
  onPaymentFailed: (error: string) => void;
}

const GATEWAY_INSTRUCTIONS = {
  esewa: {
    name: 'eSewa',
    steps: [
      'Open the eSewa mobile app on your phone',
      'Tap on "Scan QR" or "Pay with QR"',
      'Scan the QR code displayed on screen',
      'Review payment details and confirm',
      'Enter your eSewa PIN to complete payment',
    ],
    appStoreUrl: 'https://play.google.com/store/apps/details?id=com.esewa.android',
    appStoreName: 'Google Play Store',
  },
  khalti: {
    name: 'Khalti',
    steps: [
      'Open the Khalti mobile app on your phone',
      'Tap on "Scan QR" or "Pay with QR"',
      'Scan the QR code displayed on screen',
      'Review payment details and confirm',
      'Enter your Khalti PIN to complete payment',
    ],
    appStoreUrl: 'https://play.google.com/store/apps/details?id=com.khalti.customer',
    appStoreName: 'Google Play Store',
  },
  fonepay: {
    name: 'Fonepay',
    steps: [
      'Open the Fonepay mobile app on your phone',
      'Tap on "Scan QR" or "Pay with QR"',
      'Scan the QR code displayed on screen',
      'Review payment details and confirm',
      'Enter your Fonepay PIN to complete payment',
    ],
    appStoreUrl: 'https://play.google.com/store/apps/details?id=com.fonepay.customer',
    appStoreName: 'Google Play Store',
  },
};

export const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  gateway,
  qrCodeUrl,
  amount,
  currency,
  transactionId,
  onPaymentComplete,
  onPaymentFailed,
}) => {
  const { toast } = useToast();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasApp, setHasApp] = useState(false);

  const instructions = GATEWAY_INSTRUCTIONS[gateway as keyof typeof GATEWAY_INSTRUCTIONS];

  useEffect(() => {
    if (!isOpen) return;

    // Start timer
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    // Check payment status every 10 seconds
    const paymentCheckInterval = setInterval(() => {
      checkPaymentStatus();
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(paymentCheckInterval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeElapsed(0);
      setPaymentStatus('pending');
      checkIfAppInstalled();
    }
  }, [isOpen]);

  const checkIfAppInstalled = async () => {
    // In a real implementation, you would check if the app is installed
    // For now, we'll assume it's not installed and show the download option
    setHasApp(false);
  };

  const checkPaymentStatus = async () => {
    if (paymentStatus !== 'pending') return;

    // Add null check for transactionId
    if (!transactionId) {
      console.error('No transaction ID provided');
      return;
    }

    setIsCheckingPayment(true);
    try {
      // Call the Supabase function to check payment status
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('User is not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/check-payment-status/${transactionId}`;

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();

      if (data && data.success) {
        if (data.status === 'completed') {
          setPaymentStatus('completed');
          onPaymentComplete?.();
        } else if (data.status === 'failed') {
          setPaymentStatus('failed');
          onPaymentFailed?.(data.error || 'Payment failed');
        }
      } else {
        console.error('Payment status check failed:', data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const copyTransactionId = () => {
    if (!transactionId) {
      toast({
        title: 'Error',
        description: 'No transaction ID available',
        variant: 'destructive',
      });
      return;
    }

    navigator.clipboard
      .writeText(transactionId)
      .then(() => {
        toast({
          title: 'Transaction ID copied',
          description: 'Transaction ID has been copied to clipboard',
        });
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to copy transaction ID',
          variant: 'destructive',
        });
      });
  };

  const downloadApp = () => {
    if (instructions?.appStoreUrl) {
      window.open(instructions.appStoreUrl, '_blank');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    setTimeElapsed(0);
    setPaymentStatus('pending');
    checkPaymentStatus();
  };

  if (!instructions) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pay with {instructions.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Amount */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-center">
                {amount != null && !isNaN(amount) ? amount.toFixed(2) : '0.00'} {currency || 'USD'}
              </div>
              <div className="text-sm text-muted-foreground text-center mt-1">
                Transaction ID: {transactionId}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTransactionId}
                  className="ml-2 h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Scan QR Code</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-gray-50 p-4 rounded-lg inline-block">
                <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Scan this QR code with your {instructions.name} app
              </p>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">How to Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* App Download */}
          {!hasApp && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Don't have the {instructions.name} app?</span>
                  <Button variant="outline" size="sm" onClick={downloadApp}>
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time Elapsed:</span>
                  <span className="text-sm font-medium">{formatTime(timeElapsed)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Status:</span>
                  <Badge
                    variant={
                      paymentStatus === 'completed'
                        ? 'default'
                        : paymentStatus === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="flex items-center gap-1"
                  >
                    {paymentStatus === 'completed' && <CheckCircle className="h-3 w-3" />}
                    {paymentStatus === 'failed' && <AlertTriangle className="h-3 w-3" />}
                    {paymentStatus === 'pending' && <Clock className="h-3 w-3" />}
                    {paymentStatus}
                  </Badge>
                </div>

                {paymentStatus === 'pending' && (
                  <Button
                    onClick={handleRefresh}
                    disabled={isCheckingPayment}
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isCheckingPayment ? 'animate-spin' : ''}`}
                    />
                    {isCheckingPayment ? 'Checking...' : 'Check Payment Status'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            {paymentStatus === 'completed' && (
              <Button onClick={onClose} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
            )}
          </div>

          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Do not close this window until payment is completed. If
              you encounter any issues, contact support with your transaction ID.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
