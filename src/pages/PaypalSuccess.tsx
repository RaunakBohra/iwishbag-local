import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ExternalLink, 
  ArrowLeft, 
  CreditCard,
  Mail,
  Package,
  Sparkles,
  ShoppingBag,
  Home,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useQueryClient } from '@tanstack/react-query';
import { currencyService } from '@/services/CurrencyService';

interface PayPalSuccessData {
  token: string; // PayPal order ID
  PayerID: string;
  paymentId?: string;
  ba_token?: string;
}

const PaypalSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clearCart = useCartStore(state => state.clearCart);
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Extract PayPal return parameters
        const token = searchParams.get('token'); // PayPal order ID
        const payerId = searchParams.get('PayerID');
        
        if (!token) {
          throw new Error('Missing PayPal payment information');
        }

        console.log('🔵 PayPal Success - Verifying payment:', { token, payerId });

        // Look for pending payment transaction
        const { data: paymentTx, error: txError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('paypal_order_id', token)
          .single();

        let paymentLink = paymentTx;
        let linkError = txError;

        if (linkError || !paymentLink) {
          console.error('❌ Payment transaction not found, creating new record');
          
          // Try to find from guest checkout session
          const { data: sessions } = await supabase
            .from('guest_checkout_sessions')
            .select('*')
            .ilike('checkout_data->>paypal_order_id', token);
            
          const session = sessions?.[0];
          const checkoutData = session?.checkout_data as any;
          
          if (session && checkoutData) {
            // Create payment transaction from session data
            const { data: newTx, error: createError } = await supabase
              .from('payment_transactions')
              .insert({
                user_id: user?.id || null,
                quote_id: checkoutData.quote_ids?.[0],
                amount: checkoutData.amount,
                currency: checkoutData.currency,
                status: 'completed',
                payment_method: 'paypal',
                paypal_order_id: token,
                paypal_payer_id: payerId,
                gateway_response: {
                  ...checkoutData,
                  completed_at: new Date().toISOString()
                }
              })
              .select()
              .single();
              
            if (!createError && newTx) {
              paymentLink = newTx;
              
              // Update quotes status
              if (checkoutData.quote_ids) {
                await supabase
                  .from('quotes')
                  .update({
                    status: 'paid',
                    payment_method: 'paypal',
                    paid_at: new Date().toISOString(),
                    payment_details: {
                      paypal_order_id: token,
                      paypal_payer_id: payerId
                    }
                  })
                  .in('id', checkoutData.quote_ids);
              }
            }
          }
          
          // If still no data, show generic success
          if (!paymentLink) {
            setPaymentData({
              transactionId: token,
              orderId: token,
              amount: 'Payment Completed',
              currency: 'USD',
              customerEmail: 'Check PayPal Dashboard',
              payerId: payerId || 'N/A',
              status: 'completed'
            });
            
            toast({
              title: "Payment Successful",
              description: "Your PayPal payment has been completed. Our team will process your order shortly.",
            });
            
            setIsProcessing(false);
            return;
          }
        }

        // Update payment transaction status if needed and capture PayPal payment
        if (paymentLink.status === 'pending') {
          console.log('⏳ Capturing PayPal payment and updating status');
          
          // First, capture the PayPal payment to get capture ID
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const captureResponse = await fetch(`${supabaseUrl}/functions/v1/capture-paypal-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: token })
            });
            
            const captureData = await captureResponse.json();
            console.log('PayPal capture result:', captureData);
            
            // Update transaction with capture details
            const { data: updatedTx } = await supabase
              .from('payment_transactions')
              .update({
                status: 'completed',
                paypal_payer_id: payerId,
                paypal_capture_id: captureData.captureID,
                paypal_payer_email: captureData.payerEmail,
                updated_at: new Date().toISOString()
              })
              .eq('id', paymentLink.id)
              .select()
              .single();
              
            if (updatedTx) {
              paymentLink = updatedTx;
            }
          } catch (captureError) {
            console.error('❌ PayPal capture failed:', captureError);
            // Still update status but without capture details
            const { data: updatedTx } = await supabase
              .from('payment_transactions')
              .update({
                status: 'completed',
                paypal_payer_id: payerId,
                updated_at: new Date().toISOString()
              })
              .eq('id', paymentLink.id)
              .select()
              .single();
              
            if (updatedTx) {
              paymentLink = updatedTx;
            }
          }
          
          // Update related quotes
          const quoteIds = (paymentLink.gateway_response as any)?.quote_ids;
          if (quoteIds) {
            await supabase
              .from('quotes')
              .update({
                status: 'paid',
                payment_method: 'paypal',
                paid_at: new Date().toISOString(),
                payment_details: {
                  paypal_order_id: token,
                  paypal_payer_id: payerId
                }
              })
              .in('id', quoteIds);
          }
        }
        
        // Set payment data for display
        if (paymentLink.status === 'completed') {
          console.log('✅ Payment completed');
          
          setPaymentData({
            transactionId: paymentLink.paypal_capture_id || token,
            orderId: token,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            customerEmail: paymentLink.paypal_payer_email || 'Payment Confirmed',
            payerId: payerId || paymentLink.paypal_payer_id || 'N/A',
            status: 'completed'
          });
        } else {
          // Payment not yet completed - might still be processing
          console.log('⏳ Payment pending completion');
          
          setPaymentData({
            transactionId: 'Processing...',
            orderId: token,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            customerEmail: paymentLink.customer_email,
            payerId: payerId || 'N/A',
            status: 'pending'
          });
          
          // Note: In production, PayPal would send a webhook to complete the payment
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. You'll receive a confirmation email shortly.",
          });
        }

        // Clear cart if user is authenticated
        if (user) {
          clearCart();
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });

      } catch (error) {
        console.error('❌ PayPal verification error:', error);
        setError(error instanceof Error ? error.message : 'Payment verification failed');
        
        toast({
          title: "Payment Verification Error",
          description: "We're having trouble verifying your payment. Please contact support with your order ID.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    verifyPayment();
  }, [searchParams, user, clearCart, queryClient, toast, supabase]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <h2 className="text-xl font-semibold">Processing your payment...</h2>
              <p className="text-gray-600 text-center">
                Please wait while we confirm your PayPal payment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <ExternalLink className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Payment Processing Error</h2>
              <p className="text-gray-600 text-center">{error}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button onClick={() => navigate('/contact')} variant="default">
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="fadeIn">
          <Card className="max-w-2xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-center">Payment Successful!</CardTitle>
              <p className="text-center mt-2 text-green-50">
                Thank you for your purchase via PayPal
              </p>
            </div>
            
            <CardContent className="p-6">
              {paymentData && (
                <div className="space-y-6">
                  {/* Transaction Details */}
                  <AnimatedSection animation="fadeInUp" delay={100}>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Transaction Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Transaction ID:</span>
                          <p className="font-mono font-medium break-all">{paymentData.transactionId}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">PayPal Order ID:</span>
                          <p className="font-mono font-medium">{paymentData.orderId}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount Paid:</span>
                          <p className="font-semibold text-lg text-green-600">
                            {currencyService.formatAmount(paymentData.amount, paymentData.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Payment Method:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="bg-blue-100">
                              PayPal
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>

                  {/* Customer Information */}
                  {paymentData.customerEmail && (
                    <AnimatedSection animation="fadeInUp" delay={200}>
                      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5 text-blue-600" />
                          Customer Information
                        </h3>
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <p className="font-medium">{paymentData.customerEmail}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">PayPal Payer ID:</span>
                            <p className="font-mono text-xs">{paymentData.payerId}</p>
                          </div>
                        </div>
                      </div>
                    </AnimatedSection>
                  )}

                  {/* Next Steps */}
                  <AnimatedSection animation="fadeInUp" delay={300}>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        What's Next?
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>You'll receive an order confirmation email shortly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Our team will process your order within 24-48 hours</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>You can track your order status in your dashboard</span>
                        </li>
                      </ul>
                    </div>
                  </AnimatedSection>

                  {/* Action Buttons */}
                  <AnimatedSection animation="fadeInUp" delay={400}>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {user ? (
                        <>
                          <Link to="/dashboard/orders">
                            <Button className="w-full sm:w-auto">
                              <Package className="h-4 w-4 mr-2" />
                              View Orders
                            </Button>
                          </Link>
                          <Link to="/quote">
                            <Button variant="outline" className="w-full sm:w-auto">
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Start New Quote
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/">
                            <Button className="w-full sm:w-auto">
                              <Home className="h-4 w-4 mr-2" />
                              Back to Home
                            </Button>
                          </Link>
                          <Link to="/auth">
                            <Button variant="outline" className="w-full sm:w-auto">
                              Create Account
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </AnimatedSection>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default PaypalSuccess;