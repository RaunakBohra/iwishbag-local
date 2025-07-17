import React, { useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  XCircle,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Home,
  ShoppingCart,
  AlertCircle,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const PaypalFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Extract PayPal cancel/error parameters
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('🔴 PayPal payment cancelled/failed:', {
      token,
      error,
      errorDescription,
    });

    // Show appropriate toast message
    if (error) {
      toast({
        title: 'Payment Failed',
        description: errorDescription || 'There was an error processing your PayPal payment.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Payment Cancelled',
        description: 'You cancelled the PayPal payment. Your order has not been placed.',
        variant: 'default',
      });
    }
  }, [searchParams, toast]);

  const handleRetryPayment = () => {
    // Navigate back to cart/checkout
    if (user) {
      navigate('/cart');
    } else {
      navigate('/guest-checkout');
    }
  };

  const handleContactSupport = () => {
    navigate('/contact');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="fadeIn">
          <Card className="max-w-2xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-center">Payment Unsuccessful</CardTitle>
              <p className="text-center mt-2 text-red-50">
                Your PayPal payment could not be completed
              </p>
            </div>

            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Error Information */}
                <AnimatedSection animation="fadeInUp" delay={100}>
                  <div className="bg-red-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      What Happened?
                    </h3>
                    <div className="text-sm space-y-2 text-gray-700">
                      <p>Your PayPal payment was not completed. This could be because:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>You cancelled the payment on PayPal</li>
                        <li>There was an issue with your PayPal account</li>
                        <li>The payment authorization failed</li>
                        <li>A technical error occurred during processing</li>
                      </ul>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Order Status */}
                <AnimatedSection animation="fadeInUp" delay={200}>
                  <div className="bg-yellow-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-yellow-600" />
                      Your Order Status
                    </h3>
                    <div className="text-sm space-y-2">
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Your cart items are still saved</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>No payment has been charged</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <span>Your order has not been placed</span>
                      </p>
                    </div>
                  </div>
                </AnimatedSection>

                {/* What to Do Next */}
                <AnimatedSection animation="fadeInUp" delay={300}>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      What Can You Do?
                    </h3>
                    <div className="text-sm space-y-3">
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="bg-blue-100">
                          1
                        </Badge>
                        <div>
                          <p className="font-medium">Try Again</p>
                          <p className="text-gray-600">
                            Return to your cart and try the payment again
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="bg-blue-100">
                          2
                        </Badge>
                        <div>
                          <p className="font-medium">Use a Different Payment Method</p>
                          <p className="text-gray-600">We accept multiple payment options</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="bg-blue-100">
                          3
                        </Badge>
                        <div>
                          <p className="font-medium">Contact Support</p>
                          <p className="text-gray-600">
                            Our team can help resolve any payment issues
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Transaction Details if available */}
                {searchParams.get('token') && (
                  <AnimatedSection animation="fadeInUp" delay={400}>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-sm text-gray-600">Reference Information</h3>
                      <p className="font-mono text-xs break-all">
                        Order Token: {searchParams.get('token')}
                      </p>
                      {searchParams.get('error') && (
                        <p className="text-xs text-red-600">Error: {searchParams.get('error')}</p>
                      )}
                    </div>
                  </AnimatedSection>
                )}

                {/* Action Buttons */}
                <AnimatedSection animation="fadeInUp" delay={500}>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleRetryPayment} className="w-full sm:w-auto">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Payment Again
                    </Button>
                    <Button
                      onClick={handleContactSupport}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Link to="/">
                      <Button variant="ghost" className="w-full sm:w-auto">
                        <Home className="h-4 w-4 mr-2" />
                        Go to Home
                      </Button>
                    </Link>
                  </div>
                </AnimatedSection>

                {/* Support Information */}
                <AnimatedSection animation="fadeInUp" delay={600}>
                  <div className="text-center text-sm text-gray-500 pt-4 border-t">
                    <p>Need help? Contact our support team:</p>
                    <p className="font-medium">support@iwishbag.com</p>
                    <p>Available Monday-Friday, 9 AM - 6 PM IST</p>
                  </div>
                </AnimatedSection>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default PaypalFailure;
