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
  Smartphone,
  Shield,
  HelpCircle,
  Home,
  Phone,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';

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
          amount: amount ? parseFloat(amount) : undefined,
        };

        setFailureData(failureInfo);

        // Show failure toast
        toast({
          title: 'Payment Failed',
          description: failureInfo.errorMessage,
          variant: 'destructive',
        });
      } catch (error) {
        console.error('Error processing payment failure:', error);
        toast({
          title: 'Error',
          description: 'There was an issue processing your payment. Please try again.',
          variant: 'destructive',
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
      E001: 'Invalid merchant credentials',
      E002: 'Invalid transaction amount',
      E003: 'Invalid transaction ID',
      E004: 'Hash verification failed',
      E005: 'Payment gateway error',
      E006: 'Bank declined the transaction',
      E007: 'Insufficient funds',
      E008: 'Card expired',
      E009: 'Invalid card details',
      E010: 'Transaction timeout',
      E011: 'User cancelled payment',
      E012: 'Duplicate transaction',
      E013: 'Merchant account suspended',
      E014: 'Invalid currency',
      E015: 'Transaction limit exceeded',
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AnimatedSection animation="zoomIn">
          <Card className="w-full max-w-md text-center shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium">Processing payment status...</p>
              <p className="text-sm text-gray-500 mt-2">
                Please wait while we check your transaction
              </p>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float" />
        <div
          className="absolute top-0 -right-40 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-32 left-20 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-float"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <AnimatedSection animation="zoomIn">
          <Card className="w-full max-w-lg text-center shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-br from-red-500 to-red-600 text-white p-8">
              <AnimatedSection animation="zoomIn" delay={200}>
                <div className="mx-auto bg-white rounded-full p-4 w-fit shadow-lg">
                  <XCircle className="h-16 w-16 text-red-600 animate-pulse" />
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={300}>
                <CardTitle className="mt-6 text-3xl font-bold">Payment Failed</CardTitle>
                <p className="text-red-100 mt-2">Transaction could not be completed</p>
              </AnimatedSection>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <AnimatedSection animation="fadeInUp" delay={400}>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <p className="text-lg">We're sorry, but your payment could not be processed.</p>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeIn" delay={500}>
                <div className="border-t border-b py-6 space-y-4 bg-gray-50 rounded-lg">
                  {failureData?.transactionId && (
                    <div className="flex justify-between items-center px-4">
                      <span className="font-medium text-gray-600">Transaction ID:</span>
                      <Badge
                        variant="secondary"
                        className="text-sm font-mono bg-gradient-to-r from-red-100 to-pink-100"
                      >
                        {failureData.transactionId}
                      </Badge>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Payment Method:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white">
                        {getGatewayIcon(failureData?.gateway || 'payu')}
                      </div>
                      <span className="text-sm font-medium">
                        {getGatewayName(failureData?.gateway || 'payu')}
                      </span>
                    </div>
                  </div>

                  {failureData?.amount && (
                    <div className="flex justify-between items-center px-4">
                      <span className="font-medium text-gray-600">Amount:</span>
                      <span className="text-2xl font-bold text-gray-800">
                        ₹
                        <AnimatedCounter end={failureData.amount} decimals={2} />
                      </span>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={600}>
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-red-800 text-lg">Error Details</h4>
                      <p className="text-sm text-red-700 mt-2">
                        {getErrorMessage(failureData?.errorCode)}
                      </p>
                      {failureData?.errorCode && (
                        <Badge
                          variant="outline"
                          className="text-xs mt-3 border-red-300 text-red-600"
                        >
                          Error Code: {failureData.errorCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection animation="fadeIn" delay={700}>
                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Your Information is Safe
                  </h5>
                  <div className="text-sm text-gray-600 space-y-2 text-left pl-7">
                    <p className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      No charges have been made to your account
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Your payment information remains secure
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      You can try again with a different payment method
                    </p>
                  </div>
                </div>
              </AnimatedSection>

              {/* Help Section */}
              <AnimatedSection animation="fadeInUp" delay={800}>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <HelpCircle className="w-5 h-5 text-teal-600" />
                    <span className="font-medium text-teal-800">Need Help?</span>
                    <a
                      href="tel:+919999999999"
                      className="text-teal-600 hover:underline ml-auto flex items-center gap-1"
                    >
                      <Phone className="w-4 h-4" />
                      Call Support
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            </CardContent>
            <CardContent className="p-8 pt-0 space-y-3">
              <AnimatedSection animation="fadeInUp" delay={900}>
                <Button
                  onClick={handleRetryPayment}
                  className="w-full group bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Try Again
                </Button>
              </AnimatedSection>

              <AnimatedSection animation="fadeInUp" delay={1000}>
                <div className="flex gap-3">
                  <Button variant="outline" asChild className="flex-1 group">
                    <Link to="/dashboard">
                      <Home className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1 group">
                    <Link to="/contact">
                      <HelpCircle className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                      Get Help
                    </Link>
                  </Button>
                </div>
              </AnimatedSection>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default PaymentFailure;
