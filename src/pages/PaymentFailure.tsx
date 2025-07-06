import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  XCircle, 
  ArrowLeft, 
  RefreshCw,
  AlertTriangle,
  IndianRupee,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentFailureData {
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  gateway: string;
  amount?: number;
}

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [failureData, setFailureData] = useState<PaymentFailureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processPaymentFailure = async () => {
      try {
        // Extract payment data from URL parameters
        const txnid = searchParams.get('txnid');
        const status = searchParams.get('status');
        const error_code = searchParams.get('error_code');
        const error_Message = searchParams.get('error_Message');
        const amount = searchParams.get('amount');
        const gateway = searchParams.get('gateway') || 'payu';

        const failureInfo: PaymentFailureData = {
          transactionId: txnid || undefined,
          errorCode: error_code || undefined,
          errorMessage: error_Message || 'Payment could not be processed',
          gateway: gateway,
          amount: amount ? parseFloat(amount) : undefined
        };

        setFailureData(failureInfo);

        // Show failure toast
        toast({
          title: "Payment Failed",
          description: failureInfo.errorMessage,
          variant: "destructive"
        });

      } catch (error) {
        console.error('Error processing payment failure:', error);
        toast({
          title: "Error",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    processPaymentFailure();
  }, [searchParams, toast]);

  const getGatewayIcon = (gateway: string) => {
    switch (gateway.toLowerCase()) {
      case 'payu':
        return <Smartphone className="h-6 w-6" />;
      default:
        return <IndianRupee className="h-6 w-6" />;
    }
  };

  const getGatewayName = (gateway: string) => {
    switch (gateway.toLowerCase()) {
      case 'payu':
        return 'PayU';
      default:
        return gateway;
    }
  };

  const getErrorMessage = (errorCode?: string) => {
    if (!errorCode) return 'Payment could not be processed';
    
    const errorMessages: Record<string, string> = {
      'E001': 'Invalid merchant credentials',
      'E002': 'Invalid transaction amount',
      'E003': 'Invalid transaction ID',
      'E004': 'Hash verification failed',
      'E005': 'Payment gateway error',
      'E006': 'Bank declined the transaction',
      'E007': 'Insufficient funds',
      'E008': 'Card expired',
      'E009': 'Invalid card details',
      'E010': 'Transaction timeout',
      'E011': 'User cancelled payment',
      'E012': 'Duplicate transaction',
      'E013': 'Merchant account suspended',
      'E014': 'Invalid currency',
      'E015': 'Transaction limit exceeded'
    };

    return errorMessages[errorCode] || 'Payment could not be processed';
  };

  const handleRetryPayment = () => {
    // Navigate back to checkout with the same quote IDs
    const quotes = searchParams.get('quotes');
    if (quotes) {
      navigate(`/checkout?quotes=${quotes}`);
    } else {
      navigate('/checkout');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Processing payment status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="bg-red-500 text-red-50 p-6">
          <div className="mx-auto bg-white rounded-full p-2 w-fit">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-2xl">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg text-muted-foreground">
            We're sorry, but your payment could not be processed.
          </p>
          
          <div className="border-t border-b py-4 space-y-3">
            {failureData?.transactionId && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Transaction ID:</span>
                <Badge variant="secondary" className="text-sm font-mono">
                  {failureData.transactionId}
                </Badge>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Payment Method:</span>
              <div className="flex items-center gap-2">
                {getGatewayIcon(failureData?.gateway || 'payu')}
                <span className="text-sm">{getGatewayName(failureData?.gateway || 'payu')}</span>
              </div>
            </div>
            
            {failureData?.amount && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Amount:</span>
                <span className="font-bold text-lg">
                  ₹{failureData.amount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-red-800">Error Details</h4>
                <p className="text-sm text-red-700 mt-1">
                  {getErrorMessage(failureData?.errorCode)}
                </p>
                {failureData?.errorCode && (
                  <p className="text-xs text-red-600 mt-1">
                    Error Code: {failureData.errorCode}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• No charges have been made to your account</p>
            <p>• Your payment information is secure</p>
            <p>• You can try again with a different payment method</p>
          </div>
        </CardContent>
        <CardContent className="p-6 pt-0 space-y-3">
          <Button onClick={handleRetryPayment} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure; 