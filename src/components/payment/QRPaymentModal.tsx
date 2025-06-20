import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode, 
  Smartphone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Copy,
  ExternalLink,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentGateway } from '@/types/payment';
import { cn } from '@/lib/utils';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  gateway: PaymentGateway;
  qrCodeUrl: string;
  amount: number;
  currency: string;
  transactionId: string;
  onPaymentComplete?: () => void;
  onPaymentFailed?: () => void;
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  message: string;
  icon: React.ReactNode;
}

const getGatewayInfo = (gateway: PaymentGateway) => {
  switch (gateway) {
    case 'esewa':
      return {
        name: 'eSewa',
        appName: 'eSewa',
        instructions: [
          'Open the eSewa app on your phone',
          'Tap on "Scan QR" or "Pay with QR"',
          'Point your camera at the QR code',
          'Confirm the payment amount and details',
          'Enter your eSewa PIN to complete payment'
        ],
        appStoreUrl: 'https://play.google.com/store/apps/details?id=com.esewa.android',
        appStoreUrlIOS: 'https://apps.apple.com/app/esewa/id1452062926'
      };
    case 'khalti':
      return {
        name: 'Khalti',
        appName: 'Khalti',
        instructions: [
          'Open the Khalti app on your phone',
          'Tap on "Scan QR" or "Pay with QR"',
          'Point your camera at the QR code',
          'Verify the payment details',
          'Enter your Khalti PIN to complete payment'
        ],
        appStoreUrl: 'https://play.google.com/store/apps/details?id=com.khalti.customer',
        appStoreUrlIOS: 'https://apps.apple.com/app/khalti/id1452062926'
      };
    case 'fonepay':
      return {
        name: 'Fonepay',
        appName: 'Fonepay',
        instructions: [
          'Open the Fonepay app on your phone',
          'Tap on "Scan QR" or "Pay with QR"',
          'Point your camera at the QR code',
          'Confirm the payment amount',
          'Enter your Fonepay PIN to complete payment'
        ],
        appStoreUrl: 'https://play.google.com/store/apps/details?id=com.fonepay.customer',
        appStoreUrlIOS: 'https://apps.apple.com/app/fonepay/id1452062926'
      };
    default:
      return {
        name: 'Mobile Payment',
        appName: 'Mobile App',
        instructions: [
          'Open the payment app on your phone',
          'Scan the QR code',
          'Confirm payment details',
          'Complete the transaction'
        ],
        appStoreUrl: '',
        appStoreUrlIOS: ''
      };
  }
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
  onPaymentFailed
}) => {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'pending',
    message: 'Waiting for payment...',
    icon: <Clock className="h-5 w-5 text-yellow-600" />
  });
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isPolling, setIsPolling] = useState(false);

  const gatewayInfo = getGatewayInfo(gateway);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus({
            status: 'timeout',
            message: 'Payment timeout. Please try again.',
            icon: <XCircle className="h-5 w-5 text-red-600" />
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Poll for payment status
  useEffect(() => {
    if (!isOpen || paymentStatus.status !== 'pending') return;

    const pollPaymentStatus = async () => {
      try {
        // This would be replaced with actual API call to check payment status
        const response = await fetch(`/api/payment-status/${transactionId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setPaymentStatus({
            status: 'completed',
            message: 'Payment completed successfully!',
            icon: <CheckCircle className="h-5 w-5 text-green-600" />
          });
          onPaymentComplete?.();
        } else if (data.status === 'failed') {
          setPaymentStatus({
            status: 'failed',
            message: 'Payment failed. Please try again.',
            icon: <XCircle className="h-5 w-5 text-red-600" />
          });
          onPaymentFailed?.();
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    };

    const interval = setInterval(pollPaymentStatus, 5000); // Poll every 5 seconds
    setIsPolling(true);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [isOpen, paymentStatus.status, transactionId, onPaymentComplete, onPaymentFailed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyTransactionId = () => {
    navigator.clipboard.writeText(transactionId);
    toast({
      title: 'Transaction ID Copied',
      description: 'Transaction ID has been copied to clipboard.',
    });
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `payment-qr-${transactionId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetPayment = () => {
    setPaymentStatus({
      status: 'pending',
      message: 'Waiting for payment...',
      icon: <Clock className="h-5 w-5 text-yellow-600" />
    });
    setTimeLeft(300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {gatewayInfo.name} Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Status */}
          <Alert className={cn(
            "border-l-4",
            paymentStatus.status === 'completed' && "border-green-500 bg-green-50",
            paymentStatus.status === 'failed' && "border-red-500 bg-red-50",
            paymentStatus.status === 'timeout' && "border-red-500 bg-red-50",
            paymentStatus.status === 'pending' && "border-yellow-500 bg-yellow-50"
          )}>
            <div className="flex items-center gap-2">
              {paymentStatus.icon}
              <AlertDescription className="font-medium">
                {paymentStatus.message}
              </AlertDescription>
            </div>
          </Alert>

          {/* Timer */}
          {paymentStatus.status === 'pending' && (
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                <Clock className="h-3 w-3 mr-1" />
                Time remaining: {formatTime(timeLeft)}
              </Badge>
            </div>
          )}

          {/* QR Code */}
          {paymentStatus.status === 'pending' && (
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadQRCode}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download QR
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyTransactionId}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy ID
                </Button>
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          {paymentStatus.status === 'pending' && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">How to pay:</h4>
              <ol className="text-sm space-y-2 text-muted-foreground">
                {gatewayInfo.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* App Download Links */}
          {paymentStatus.status === 'pending' && (gatewayInfo.appStoreUrl || gatewayInfo.appStoreUrlIOS) && (
            <Alert className="border-blue-200 bg-blue-50">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Don't have the app?</strong>
                <div className="flex gap-2 mt-2">
                  {gatewayInfo.appStoreUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(gatewayInfo.appStoreUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Android
                    </Button>
                  )}
                  {gatewayInfo.appStoreUrlIOS && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(gatewayInfo.appStoreUrlIOS, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      iOS
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Payment Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{amount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-xs">{transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span>{gatewayInfo.name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {paymentStatus.status === 'pending' && (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            
            {paymentStatus.status === 'completed' && (
              <Button 
                onClick={onClose}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Continue
              </Button>
            )}
            
            {paymentStatus.status === 'failed' && (
              <Button 
                onClick={resetPayment}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Try Again
              </Button>
            )}
            
            {paymentStatus.status === 'timeout' && (
              <Button 
                onClick={resetPayment}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 