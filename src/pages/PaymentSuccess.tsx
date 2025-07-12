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
  Smartphone,
  Mail,
  Package,
  Sparkles,
  ShoppingBag,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentSuccessData {
  transactionId: string;
  amount: number;
  currency: string;
  gateway: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productInfo?: string;
  payuId?: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

        // Validate payment success (handle both 'success' and 'Success' status)
        if ((status === 'success' || status === 'Success') && txnid) {
          const paymentInfo: PaymentSuccessData = {
            transactionId: txnid,
            amount: parseFloat(amount || '0'),
            currency: 'INR', // PayU always returns INR
            gateway: gateway,
            customerName: firstname || undefined,
            customerEmail: email || undefined,
            customerPhone: phone || undefined,
            productInfo: productinfo || undefined,
            payuId: mihpayid || undefined
          };

          setPaymentData(paymentInfo);

          // Update order status in database
          try {
            const udf1 = searchParams.get('udf1'); // Guest session token
            await updateOrderStatus(paymentInfo, udf1);
            
            // Show success toast after database update
            toast({
              title: "Payment Successful!",
              description: `Your payment of ₹${paymentInfo.amount} has been processed successfully.`,
            });
          } catch (updateError) {
            console.error('Failed to update order status:', updateError);
            // Still show payment success to user as payment was processed
            toast({
              title: "Payment Processed",
              description: "Your payment was successful but there was an issue updating your order. Please contact support with your transaction ID.",
              variant: "default"
            });
          }
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

  const updateOrderStatus = async (paymentData: PaymentSuccessData, guestSessionToken?: string | null) => {
    try {
      // Extract quote IDs from productinfo
      // Format: "Order: Product Name (quote_id1,quote_id2)"
      const productInfo = paymentData.productInfo || '';
      const quoteIdsMatch = productInfo.match(/\(([^)]+)\)$/);
      const quoteIds = quoteIdsMatch ? quoteIdsMatch[1].split(',') : [];

      if (quoteIds.length === 0) {
        console.error('No quote IDs found in productinfo:', productInfo);
        return;
      }

      console.log('Updating order status for quotes:', quoteIds);

      // Update quotes to paid status
      const { data: updatedQuotes, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'paid',
          payment_status: 'paid',
          payment_method: paymentData.gateway,
          payment_transaction_id: paymentData.payuId || paymentData.transactionId,
          paid_at: new Date().toISOString(),
          amount_paid: paymentData.amount,
          in_cart: false,
          payment_details: {
            gateway: paymentData.gateway,
            transaction_id: paymentData.transactionId,
            payu_id: paymentData.payuId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            customer_name: paymentData.customerName,
            customer_email: paymentData.customerEmail,
            customer_phone: paymentData.customerPhone,
            payment_confirmed_at: new Date().toISOString()
          }
        })
        .in('id', quoteIds)
        .select();

      if (updateError) {
        console.error('Error updating quotes:', updateError);
        throw updateError;
      }

      console.log('Successfully updated quotes:', updatedQuotes);

      // Create payment transaction record
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          quote_id: quoteIds[0], // Primary quote ID
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'completed',
          payment_method: paymentData.gateway,
          gateway_response: {
            transaction_id: paymentData.transactionId,
            payu_id: paymentData.payuId,
            customer_info: {
              name: paymentData.customerName,
              email: paymentData.customerEmail,
              phone: paymentData.customerPhone
            },
            product_info: paymentData.productInfo,
            all_quote_ids: quoteIds
          }
        });

      if (transactionError) {
        console.error('Error creating payment transaction:', transactionError);
        // Don't throw - this is not critical for the user experience
      }

      // Clear cart items for paid quotes
      const { bulkDelete } = useCartStore.getState();
      bulkDelete(quoteIds);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });

      // Handle guest checkout session if present
      if (guestSessionToken) {
        const { error: sessionError } = await supabase
          .from('guest_checkout_sessions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('session_token', guestSessionToken);

        if (sessionError) {
          console.error('Error updating guest session:', sessionError);
        }
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AnimatedSection animation="zoomIn">
          <Card className="w-full max-w-md text-center shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium">Processing your payment...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait while we confirm your transaction</p>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AnimatedSection animation="fadeIn">
          <Card className="w-full max-w-md text-center shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-red-500 to-red-600 text-white p-8">
              <AnimatedSection animation="zoomIn" delay={200}>
                <div className="mx-auto bg-white rounded-full p-3 w-fit shadow-lg">
                  <CheckCircle className="h-12 w-12 text-red-600" />
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={300}>
                <CardTitle className="mt-4 text-2xl">Payment Error</CardTitle>
              </AnimatedSection>
            </CardHeader>
            <CardContent className="p-8">
              <AnimatedSection animation="fadeInUp" delay={400}>
                <p className="text-gray-600 text-lg">
                  There was an issue processing your payment. Please try again or contact support.
                </p>
              </AnimatedSection>
            </CardContent>
            <CardContent className="p-8 pt-0">
              <AnimatedSection animation="fadeInUp" delay={500}>
                <Button asChild className="w-full group">
                  <Link to="/checkout">
                    <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Try Again
                  </Link>
                </Button>
              </AnimatedSection>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-20 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <Sparkles 
              className={`w-4 h-4 ${
                i % 3 === 0 ? 'text-green-500' : i % 3 === 1 ? 'text-blue-500' : 'text-purple-500'
              }`} 
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <AnimatedSection animation="zoomIn">
          <Card className="w-full max-w-lg text-center shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-8">
              <AnimatedSection animation="zoomIn" delay={200}>
                <div className="mx-auto bg-white rounded-full p-4 w-fit shadow-lg animate-glow">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={300}>
                <CardTitle className="mt-6 text-3xl font-bold">Payment Successful!</CardTitle>
                <p className="text-green-100 mt-2">Your transaction has been completed</p>
              </AnimatedSection>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <AnimatedSection animation="fadeInUp" delay={400}>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <ShoppingBag className="w-5 h-5" />
                  <p className="text-lg">
                    Thank you for your purchase. Your order has been confirmed.
                  </p>
                </div>
              </AnimatedSection>
              
              <AnimatedSection animation="fadeIn" delay={500}>
                <div className="border-t border-b py-6 space-y-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Transaction ID:</span>
                    <Badge variant="secondary" className="text-sm font-mono bg-gradient-to-r from-green-100 to-emerald-100">
                      {paymentData.transactionId}
                    </Badge>
                  </div>
                  
                  {paymentData.payuId && (
                    <div className="flex justify-between items-center px-4">
                      <span className="font-medium text-gray-600">PayU ID:</span>
                      <Badge variant="secondary" className="text-sm font-mono bg-gradient-to-r from-blue-100 to-purple-100">
                        {paymentData.payuId}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Payment Method:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        {getGatewayIcon(paymentData.gateway)}
                      </div>
                      <span className="text-sm font-medium">{getGatewayName(paymentData.gateway)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Amount Paid:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹<AnimatedCounter end={paymentData.amount} decimals={2} />
                    </span>
                  </div>
                </div>
              </AnimatedSection>

              {(paymentData.customerName || paymentData.productInfo) && (
                <AnimatedSection animation="fadeInUp" delay={600}>
                  <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    {paymentData.customerName && (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-gray-700">
                          Thank you, <span className="text-green-600">{paymentData.customerName}</span>!
                        </p>
                      </div>
                    )}
                    
                    {paymentData.customerEmail && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <p>Confirmation sent to {paymentData.customerEmail}</p>
                      </div>
                    )}
                    
                    {paymentData.customerPhone && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Smartphone className="w-4 h-4" />
                        <p>SMS updates to {paymentData.customerPhone}</p>
                      </div>
                    )}
                    
                    {paymentData.productInfo && (
                      <div className="mt-3 pt-3 border-t border-green-100">
                        <div className="flex items-start justify-center gap-2 text-sm text-gray-600">
                          <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-center">{paymentData.productInfo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              )}

              {/* Success Tips */}
              <AnimatedSection animation="fadeIn" delay={700}>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Your order is being processed
                  </p>
                  <p className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    Track your shipment in My Orders
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-500" />
                    Check your email for order updates
                  </p>
                </div>
              </AnimatedSection>
            </CardContent>
            <CardContent className="p-8 pt-0 space-y-3">
              <AnimatedSection animation="fadeInUp" delay={800}>
                <Button asChild className="w-full group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                  <Link to="/dashboard/orders">
                    <Package className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                    View My Orders
                  </Link>
                </Button>
              </AnimatedSection>
              
              <AnimatedSection animation="fadeInUp" delay={900}>
                <div className="flex gap-3">
                  <Button variant="outline" asChild className="flex-1 group">
                    <Link to="/dashboard">
                      <Home className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1 group">
                    <Link to="/">
                      <ShoppingBag className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      Continue Shopping
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

export default PaymentSuccess; 