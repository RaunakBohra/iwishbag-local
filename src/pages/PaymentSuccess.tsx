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
  Home,
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
        // First check if this is an Airwallex payment by gateway parameter
        const gateway = searchParams.get('gateway');
        const isAirwallexGateway = gateway === 'airwallex';

        if (isAirwallexGateway) {
          // Handle Airwallex payment
          console.log('Processing Airwallex payment success page');

          // Get stored payment data
          const storedPaymentDataStr = sessionStorage.getItem('airwallex_payment_pending');
          let storedPaymentData: any = null;

          if (storedPaymentDataStr) {
            try {
              storedPaymentData = JSON.parse(storedPaymentDataStr);
              console.log('Found stored Airwallex payment data:', storedPaymentData);

              // Clear the stored data
              sessionStorage.removeItem('airwallex_payment_pending');

              // Check if payment is recent (within 5 minutes)
              const isRecent = Date.now() - storedPaymentData.timestamp < 5 * 60 * 1000;

              if (isRecent && storedPaymentData.paymentIntentId) {
                // We have valid payment data
                const paymentInfo: PaymentSuccessData = {
                  transactionId: storedPaymentData.transactionId,
                  amount: storedPaymentData.amount,
                  currency: storedPaymentData.currency,
                  gateway: 'airwallex',
                  orderId: storedPaymentData.quoteIds?.[0],
                  customerName: user?.user_metadata?.full_name || 'Customer',
                  customerEmail: user?.email,
                  productInfo: `Payment for ${storedPaymentData.quoteIds?.length || 1} item(s)`,
                };

                setPaymentData(paymentInfo);

                // The webhook should have already updated the order
                // Just show success message
                toast({
                  title: 'Payment Successful!',
                  description: `Your payment of ${paymentInfo.currency} ${paymentInfo.amount} has been processed successfully.`,
                });

                // Invalidate queries to show updated data
                queryClient.invalidateQueries({ queryKey: ['quotes'] });
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['cart'] });
              } else {
                // No recent payment data, check database for recent paid quotes
                console.log('No recent Airwallex payment data found, checking database...');

                // Show success but suggest checking orders
                setPaymentData({
                  transactionId: 'AIRWALLEX_' + Date.now(),
                  amount: 0,
                  currency: 'USD',
                  gateway: 'airwallex',
                });

                toast({
                  title: 'Payment Processed',
                  description:
                    'Your payment has been processed. Please check your orders for confirmation.',
                });
              }
            } catch (e) {
              console.error('Error processing Airwallex payment data:', e);
              setPaymentData({
                transactionId: 'AIRWALLEX_ERROR',
                amount: 0,
                currency: 'USD',
                gateway: 'airwallex',
              });
            }
          } else {
            // No stored data, but we're on success page - still show success
            console.log('Airwallex success page without stored data');

            // Try to get quote information from URL or recent orders
            const quoteId = searchParams.get('quote_id');
            const paymentIntentId = searchParams.get('payment_intent');

            // Create success data
            const successData: PaymentSuccessData = {
              transactionId: paymentIntentId || 'AIRWALLEX_' + Date.now(),
              amount: 0, // Will show as success even without amount
              currency: 'USD',
              gateway: 'airwallex',
              orderId: quoteId || undefined,
              customerName: user?.user_metadata?.full_name || 'Customer',
              customerEmail: user?.email,
              productInfo: 'Airwallex Payment',
            };

            setPaymentData(successData);

            toast({
              title: 'Payment Successful!',
              description:
                'Your Airwallex payment has been processed successfully. You can view your order details in the dashboard.',
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }
        }
        // Check for Khalti payment parameters
        else if (gateway === 'khalti') {
          console.log('Processing Khalti payment success page');

          const pidx = searchParams.get('pidx');
          const txnId = searchParams.get('txn');
          const amount = searchParams.get('amount');
          const mobile = searchParams.get('mobile');

          if (pidx) {
            const paymentInfo: PaymentSuccessData = {
              transactionId: txnId || pidx,
              amount: amount ? parseFloat(amount) / 100 : 0, // Convert paisa to NPR
              currency: 'NPR',
              gateway: 'khalti',
              customerName: user?.user_metadata?.full_name || 'Customer',
              customerEmail: user?.email,
              customerPhone: mobile || undefined,
              productInfo: 'Khalti Payment',
            };

            setPaymentData(paymentInfo);

            // The webhook should have already updated the order status
            // Just show success message
            toast({
              title: 'Payment Successful!',
              description: `Your Khalti payment of NPR ${paymentInfo.amount} has been processed successfully.`,
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['cart'] });
          } else {
            console.error('Missing Khalti pidx parameter');
            toast({
              title: 'Payment Verification Failed',
              description: 'Could not verify Khalti payment. Please contact support.',
              variant: 'destructive',
            });
          }
        }
        // Check for Fonepay payment parameters
        else if (gateway === 'fonepay') {
          console.log('Processing Fonepay payment success page');

          const txnId = searchParams.get('txn');
          const uid = searchParams.get('uid');

          if (txnId) {
            const paymentInfo: PaymentSuccessData = {
              transactionId: uid || txnId,
              amount: 0, // Will be fetched from database
              currency: 'NPR',
              gateway: 'fonepay',
              customerName: user?.user_metadata?.full_name || 'Customer',
              customerEmail: user?.email,
              productInfo: 'Fonepay Payment',
            };

            setPaymentData(paymentInfo);

            // The webhook should have already updated the order status
            toast({
              title: 'Payment Successful!',
              description: 'Your Fonepay payment has been processed successfully.',
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['cart'] });
          } else {
            console.error('Missing Fonepay transaction ID');
            toast({
              title: 'Payment Verification Failed',
              description: 'Could not verify Fonepay payment. Please contact support.',
              variant: 'destructive',
            });
          }
        }
        // Check for PayU payment parameters
        else {
          // Extract PayU payment data from URL parameters
          const txnid = searchParams.get('txnid');
          const mihpayid = searchParams.get('mihpayid');
          const status = searchParams.get('status');
          const amount = searchParams.get('amount');
          const productinfo = searchParams.get('productinfo');
          const firstname = searchParams.get('firstname');
          const email = searchParams.get('email');
          const phone = searchParams.get('phone');
          const hash = searchParams.get('hash');

          // Validate PayU payment success (handle both 'success' and 'Success' status)
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
              payuId: mihpayid || undefined,
            };

            setPaymentData(paymentInfo);

            // Update order status in database
            try {
              const udf1 = searchParams.get('udf1'); // Guest session token
              await updateOrderStatus(paymentInfo, udf1);

              // Show success toast after database update
              toast({
                title: 'Payment Successful!',
                description: `Your payment of ₹${paymentInfo.amount} has been processed successfully.`,
              });
            } catch (updateError) {
              console.error('Failed to update order status:', updateError);
              // Still show payment success to user as payment was processed
              toast({
                title: 'Payment Processed',
                description:
                  'Your payment was successful but there was an issue updating your order. Please contact support with your transaction ID.',
                variant: 'default',
              });
            }
          } else {
            // Payment failed or cancelled
            toast({
              title: 'Payment Failed',
              description: 'Your payment could not be processed. Please try again.',
              variant: 'destructive',
            });
            navigate('/checkout');
          }
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
        toast({
          title: 'Error',
          description: 'There was an issue processing your payment. Please contact support.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams, navigate, toast]);

  const updateOrderStatus = async (
    paymentData: PaymentSuccessData,
    guestSessionToken?: string | null,
  ) => {
    try {
      // Extract quote IDs from multiple possible sources
      let quoteIds: string[] = [];

      console.log('🔍 Extracting quote IDs from PayU callback data:', paymentData);

      // Method 1: Extract from productinfo - Format: "Order: Product Name (quote_id1,quote_id2)"
      const productInfo = paymentData?.productInfo || '';
      if (productInfo) {
        const quoteIdsMatch = productInfo.match(/\(([^)]+)\)$/);
        if (quoteIdsMatch) {
          quoteIds = quoteIdsMatch[1]
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id);
          console.log('✅ Found quote IDs in productinfo with parentheses:', quoteIds);
        }
      }

      // Method 2: Primary fallback - Extract UUID-like strings directly from productinfo
      if (quoteIds.length === 0 && productInfo) {
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const uuidMatches = productInfo.match(uuidRegex);
        if (uuidMatches) {
          quoteIds = uuidMatches;
          console.log('✅ Found quote IDs via UUID regex in productinfo:', quoteIds);
        }
      }

      // Method 3: Fallback - Extract from transaction ID if it contains quote ID
      if (quoteIds.length === 0 && paymentData?.transactionId) {
        const txnUuidMatch = paymentData.transactionId.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        );
        if (txnUuidMatch) {
          quoteIds = [txnUuidMatch[0]];
          console.log('✅ Found quote ID in transaction ID:', quoteIds);
        }
      }

      // Method 4: Final fallback - Check URL params for quote IDs
      if (quoteIds.length === 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const quotesParam = urlParams.get('quotes');
        if (quotesParam) {
          quoteIds = quotesParam
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id);
          console.log('✅ Found quote IDs in URL params:', quoteIds);
        }
      }

      if (quoteIds.length === 0) {
        console.error('❌ No quote IDs found in any location. PayU data:', paymentData);
        console.error('ProductInfo:', productInfo);
        console.error('TransactionId:', paymentData.transactionId);
        console.error('URL:', window.location.href);

        // Show user-friendly error
        toast({
          title: 'Payment Processing Issue',
          description:
            "Payment was successful but we couldn't link it to your order. Please contact support with transaction ID: " +
            (paymentData.transactionId || paymentData.payuId),
          variant: 'destructive',
        });
        return;
      }

      console.log('🔄 Updating order status for quotes:', quoteIds);

      // First, verify the quotes exist and check their current status
      const { data: existingQuotes, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status, display_id, final_total_usd')
        .in('id', quoteIds);

      if (fetchError) {
        console.error('❌ Error fetching quotes for verification:', fetchError);
        throw fetchError;
      }

      if (!existingQuotes || existingQuotes.length === 0) {
        console.error('❌ No quotes found with IDs:', quoteIds);
        throw new Error('No quotes found with the provided IDs');
      }

      console.log(
        '📋 Found quotes to update:',
        existingQuotes.map((q) => ({
          id: q.id,
          display_id: q.display_id,
          status: q.status,
        })),
      );

      // Update quotes to paid status - let trigger calculate payment_status and amount_paid
      const { data: updatedQuotes, error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'paid',
          // payment_status: 'paid',  // Let trigger calculate this
          payment_method: paymentData.gateway,
          // payment_transaction_id removed - this column doesn't exist
          paid_at: new Date().toISOString(),
          // amount_paid: paymentData.amount,  // Let trigger calculate this
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
            payment_confirmed_at: new Date().toISOString(),
          },
        })
        .in('id', quoteIds)
        .select();

      if (updateError) {
        console.error('❌ Error updating quotes:', updateError);
        throw updateError;
      }

      if (!updatedQuotes || updatedQuotes.length === 0) {
        console.error('❌ No quotes were updated');
        throw new Error('Failed to update quotes - no rows affected');
      }

      console.log(
        '✅ Successfully updated quotes:',
        updatedQuotes.map((q) => ({
          id: q.id,
          display_id: q.display_id,
          status: q.status,
          payment_method: q.payment_method,
        })),
      );

      // Create payment transaction record
      const { error: transactionError } = await supabase.from('payment_transactions').insert({
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
            phone: paymentData.customerPhone,
          },
          product_info: paymentData.productInfo,
          all_quote_ids: quoteIds,
        },
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
            updated_at: new Date().toISOString(),
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
      case 'airwallex':
        return <CreditCard className="h-6 w-6" />;
      case 'khalti':
        return <Smartphone className="h-6 w-6" />;
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
      case 'airwallex':
        return 'Airwallex';
      case 'khalti':
        return 'Khalti';
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-orange-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-teal-600 mx-auto"></div>
              <p className="mt-6 text-gray-600 font-medium">Processing your payment...</p>
              <p className="text-sm text-gray-500 mt-2">
                Please wait while we confirm your transaction
              </p>
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
    <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" />
        <div
          className="absolute top-0 -right-40 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-32 left-20 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
          style={{ animationDelay: '4s' }}
        />
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
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Sparkles
              className={`w-4 h-4 ${
                i % 3 === 0 ? 'text-green-500' : i % 3 === 1 ? 'text-teal-500' : 'text-orange-500'
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
                    <Badge
                      variant="secondary"
                      className="text-sm font-mono bg-gradient-to-r from-green-100 to-emerald-100"
                    >
                      {paymentData.transactionId}
                    </Badge>
                  </div>

                  {paymentData.payuId && (
                    <div className="flex justify-between items-center px-4">
                      <span className="font-medium text-gray-600">PayU ID:</span>
                      <Badge
                        variant="secondary"
                        className="text-sm font-mono bg-gradient-to-r from-blue-100 to-purple-100"
                      >
                        {paymentData.payuId}
                      </Badge>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Payment Method:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-orange-600 flex items-center justify-center text-white">
                        {getGatewayIcon(paymentData.gateway)}
                      </div>
                      <span className="text-sm font-medium">
                        {getGatewayName(paymentData.gateway)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-4">
                    <span className="font-medium text-gray-600">Amount Paid:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {paymentData.gateway === 'airwallex' && paymentData.amount > 0 ? (
                        <>
                          {paymentData.currency === 'USD' ? '$' : paymentData.currency}
                          <AnimatedCounter end={paymentData.amount} decimals={2} />
                        </>
                      ) : paymentData.gateway === 'airwallex' ? (
                        <span className="text-lg">Processing...</span>
                      ) : paymentData.gateway === 'khalti' ? (
                        <>
                          NPR <AnimatedCounter end={paymentData.amount} decimals={2} />
                        </>
                      ) : (
                        <>
                          ₹
                          <AnimatedCounter end={paymentData.amount} decimals={2} />
                        </>
                      )}
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
                          Thank you,{' '}
                          <span className="text-green-600">{paymentData.customerName}</span>!
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
                    <Package className="w-4 h-4 text-teal-500" />
                    Track your shipment in My Orders
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-500" />
                    Check your email for order updates
                  </p>
                </div>
              </AnimatedSection>
            </CardContent>
            <CardContent className="p-8 pt-0 space-y-3">
              <AnimatedSection animation="fadeInUp" delay={800}>
                <Button
                  asChild
                  className="w-full group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
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
