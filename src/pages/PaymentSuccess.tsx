import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ExternalLink, 
  ArrowLeft, 
  IndianRupee,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentSuccessData {
  transactionId: string;
  amount: number;
  currency: string;
  gateway: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        // Extract payment data from URL parameters
        const txnid = searchParams.get('txnid');
        const mihpayid = searchParams.get('mihpayid');
        const status = searchParams.get('status');
        const amount = searchParams.get('amount');
        const productinfo = searchParams.get('productinfo');
        const firstname = searchParams.get('firstname');
        const email = searchParams.get('email');
        const phone = searchParams.get('phone');
        const hash = searchParams.get('hash');
        const gateway = searchParams.get('gateway') || 'payu';

        // Validate payment success
        if (status === 'success' && txnid) {
          const paymentInfo: PaymentSuccessData = {
            transactionId: txnid,
            amount: parseFloat(amount || '0'),
            currency: 'INR', // PayU always returns INR
            gateway: gateway,
            customerName: firstname || undefined,
            customerEmail: email || undefined
          };

          setPaymentData(paymentInfo);

          // Show success toast
          toast({
            title: "Payment Successful!",
            description: `Your payment of ₹${paymentInfo.amount} has been processed successfully.`,
          });

          // Update order status in database
          await updateOrderStatus(txnid, 'completed');
        } else {
          // Payment failed or cancelled
          toast({
            title: "Payment Failed",
            description: "Your payment could not be processed. Please try again.",
            variant: "destructive"
          });
          navigate('/checkout');
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
        toast({
          title: "Error",
          description: "There was an issue processing your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams, navigate, toast]);

  const updateOrderStatus = async (transactionId: string, status: string) => {
    try {
      // Update the order status in your database
      // This would typically be done via a webhook, but we can also do it here
      console.log('Updating order status:', { transactionId, status });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getGatewayIcon = (gateway: string) => {
    switch (gateway.toLowerCase()) {
      case 'payu':
        return <Smartphone className="h-6 w-6" />;
      case 'stripe':
        return <CreditCard className="h-6 w-6" />;
      default:
        return <IndianRupee className="h-6 w-6" />;
    }
  };

  const getGatewayName = (gateway: string) => {
    switch (gateway.toLowerCase()) {
      case 'payu':
        return 'PayU';
      case 'stripe':
        return 'Credit Card';
      default:
        return gateway;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="bg-red-500 text-red-50 p-6">
            <div className="mx-auto bg-white rounded-full p-2 w-fit">
              <CheckCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="mt-4 text-2xl">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              There was an issue processing your payment. Please try again or contact support.
            </p>
          </CardContent>
          <CardContent className="p-6 pt-0">
            <Button asChild className="w-full">
              <Link to="/checkout">Try Again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="bg-green-500 text-green-50 p-6">
          <div className="mx-auto bg-white rounded-full p-2 w-fit">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          
          <div className="border-t border-b py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Transaction ID:</span>
              <Badge variant="secondary" className="text-sm font-mono">
                {paymentData.transactionId}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Payment Method:</span>
              <div className="flex items-center gap-2">
                {getGatewayIcon(paymentData.gateway)}
                <span className="text-sm">{getGatewayName(paymentData.gateway)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Amount Paid:</span>
              <span className="font-bold text-lg">
                ₹{paymentData.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {paymentData.customerName && (
            <div className="text-sm text-muted-foreground">
              <p>Thank you, <span className="font-medium">{paymentData.customerName}</span>!</p>
              {paymentData.customerEmail && (
                <p>A confirmation email has been sent to {paymentData.customerEmail}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardContent className="p-6 pt-0 space-y-3">
          <Button asChild className="w-full">
            <Link to="/dashboard/orders">
              <ExternalLink className="h-4 w-4 mr-2" />
              View My Orders
            </Link>
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

export default PaymentSuccess; 