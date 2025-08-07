import React, { useEffect, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
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
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { supabase } from '@/integrations/supabase/client';

import { useQueryClient } from '@tanstack/react-query';
import { currencyService } from '@/services/CurrencyService';

interface PayPalSuccessData {
  token: string; // PayPal order ID
  PayerID: string;
  paymentId?: string;
  ba_token?: string;
}

interface PaymentData {
  transactionId: string;
  orderId: string;
  amount: number | string;
  currency: string;
  customerEmail: string;
  payerId: string;
  status: 'completed' | 'pending' | 'uncaptured';
}

interface CheckoutData {
  quote_ids?: string[];
  amount: number;
  currency: string;
  paypal_order_id?: string;
  [key: string]: unknown;
}

const PaypalSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
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

        console.log('🔵 PayPal Success - Verifying payment:', {
          token,
          payerId,
        });

        // Look for pending payment transaction
        const { data: paymentTx, error: txError } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('paypal_order_id', token)
          .single();

        let paymentLink = paymentTx;
        const linkError = txError;

        if (linkError || !paymentLink) {
          console.error('❌ Payment transaction not found, creating new record');

          // Try to find from guest checkout session
          const { data: sessions } = await supabase
            .from('checkout_sessions')
            .select('*')
            .eq('is_guest', true)
            .ilike('metadata->>paypal_order_id', token);

          const session = sessions?.[0];
          const checkoutData = session?.checkout_data as CheckoutData;

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
                  completed_at: new Date().toISOString(),
                },
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
                      paypal_payer_id: payerId,
                    },
                  })
                  .in('id', checkoutData.quote_ids);
              }

              // Create payment ledger entry for guest checkout using the database function
              if (checkoutData.quote_ids && checkoutData.amount) {
                for (const qId of checkoutData.quote_ids) {
                  try {
                    const { data: ledgerResult, error: ledgerError } = await supabase.rpc(
                      'record_paypal_payment_to_ledger',
                      {
                        p_quote_id: qId,
                        p_transaction_id: newTx?.id || crypto.randomUUID(),
                        p_amount: checkoutData.amount,
                        p_currency: checkoutData.currency,
                        p_order_id: token,
                        p_capture_id: null,
                        p_payer_email: null,
                      },
                    );

                    if (ledgerError) {
                      console.error('Failed to create payment ledger entry:', ledgerError);
                    } else if (ledgerResult?.success) {
                      console.log('Payment ledger entry created:', ledgerResult);
                    }
                  } catch (err) {
                    console.error('Error calling ledger function:', err);
                  }
                }
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
              status: 'completed',
            });

            toast({
              title: 'Payment Successful',
              description:
                'Your PayPal payment has been completed. Our team will process your order shortly.',
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
            const {
              data: { session },
            } = await supabase.auth.getSession();

            const captureResponse = await fetch(
              `${supabaseUrl}/functions/v1/capture-paypal-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token || ''}`,
                },
                body: JSON.stringify({ orderID: token }),
              },
            );

            const captureData = await captureResponse.json();
            console.log('PayPal capture result:', captureData);

            // Check if capture was successful
            if (!captureResponse.ok || !captureData.success || !captureData.captureID) {
              throw new Error(
                captureData.error || 'PayPal capture failed - no capture ID received',
              );
            }

            // Update transaction with comprehensive capture details
            const { data: updatedTx } = await supabase
              .from('payment_transactions')
              .update({
                status: 'completed',
                paypal_payer_id: payerId,
                paypal_capture_id: captureData.captureID,
                paypal_payer_email: captureData.payerEmail,
                gateway_response: {
                  ...((paymentLink.gateway_response as Record<string, unknown>) || {}),
                  capture_details: {
                    // Core identifiers
                    capture_id: captureData.captureID,
                    order_id: token,
                    payer_id: captureData.payerID,
                    payer_email: captureData.payerEmail,

                    // Payer information
                    payer_name: captureData.payerName,
                    payer_address: captureData.payerAddress,

                    // Payment details
                    payment_source: captureData.paymentSource,
                    amount: captureData.amount,
                    status: captureData.status,

                    // Financial breakdown
                    seller_protection: captureData.sellerProtection,
                    seller_receivable_breakdown: captureData.sellerReceivableBreakdown,
                    paypal_fee: captureData.sellerReceivableBreakdown?.paypal_fee,
                    net_amount: captureData.sellerReceivableBreakdown?.net_amount,

                    // Timestamps
                    timestamps: captureData.timestamps,

                    // Order details
                    shipping: captureData.shipping,
                    invoice_id: captureData.invoiceId,
                    custom_id: captureData.customId,
                    description: captureData.description,

                    // Capture metadata
                    captured_at: new Date().toISOString(),
                    capture_response: captureData.fullResponse,
                  },
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentLink.id)
              .select()
              .single();

            if (updatedTx) {
              paymentLink = updatedTx;
            }
          } catch (captureError) {
            console.error('❌ PayPal capture failed:', captureError);

            // Mark payment as failed if capture failed
            const { data: updatedTx } = await supabase
              .from('payment_transactions')
              .update({
                status: 'failed',
                paypal_payer_id: payerId,
                gateway_response: {
                  ...((paymentLink.gateway_response as Record<string, unknown>) || {}),
                  capture_error:
                    captureError instanceof Error ? captureError.message : 'PayPal capture failed',
                  capture_attempted_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentLink.id)
              .select()
              .single();

            if (updatedTx) {
              paymentLink = updatedTx;
            }

            // Show error to user instead of false success
            throw new Error(
              'PayPal payment capture failed. Your order has been created but payment was not captured. Please contact support with your order ID: ' +
                token,
            );
          }

          // Update related quotes
          const gatewayResponse = paymentLink.gateway_response as {
            quote_ids?: string[];
          };
          const quoteIds = gatewayResponse?.quote_ids;
          if (quoteIds) {
            await supabase
              .from('quotes')
              .update({
                status: 'paid',
                payment_method: 'paypal',
                paid_at: new Date().toISOString(),
                payment_details: {
                  paypal_order_id: token,
                  paypal_payer_id: payerId,
                },
              })
              .in('id', quoteIds);

            // Create payment ledger entries using the database function
            for (const qId of quoteIds) {
              try {
                const { data: ledgerResult, error: ledgerError } = await supabase.rpc(
                  'record_paypal_payment_to_ledger',
                  {
                    p_quote_id: qId,
                    p_transaction_id: paymentLink.id,
                    p_amount: paymentLink.amount,
                    p_currency: paymentLink.currency,
                    p_order_id: token,
                    p_capture_id: paymentLink.paypal_capture_id || null,
                    p_payer_email: paymentLink.paypal_payer_email || null,
                  },
                );

                if (ledgerError) {
                  console.error('Failed to create payment ledger entry:', ledgerError);
                } else if (ledgerResult?.success) {
                  console.log('Payment ledger entry created for quote:', qId, ledgerResult);
                } else if (ledgerResult?.message) {
                  console.log('Ledger result:', ledgerResult.message);
                }
              } catch (err) {
                console.error('Error calling ledger function:', err);
              }
            }
          }
        }

        // Set payment data for display
        if (paymentLink.status === 'completed') {
          console.log('✅ Payment completed');

          // Check if payment is completed but has no capture ID (uncaptured order)
          if (!paymentLink.paypal_capture_id) {
            console.warn(
              '⚠️ Payment marked as completed but no capture ID - this is an uncaptured order',
            );

            setPaymentData({
              transactionId: 'Uncaptured Order',
              orderId: token,
              amount: paymentLink.amount,
              currency: paymentLink.currency,
              customerEmail: paymentLink.paypal_payer_email || 'Payment Approved',
              payerId: payerId || paymentLink.paypal_payer_id || 'N/A',
              status: 'uncaptured',
            });

            toast({
              title: 'Payment Approved - Processing Required',
              description:
                'Your PayPal payment has been approved but requires manual processing. Our team will complete the transaction shortly.',
              variant: 'destructive',
            });
          } else {
            setPaymentData({
              transactionId: paymentLink.paypal_capture_id,
              orderId: token,
              amount: paymentLink.amount,
              currency: paymentLink.currency,
              customerEmail: paymentLink.paypal_payer_email || 'Payment Confirmed',
              payerId: payerId || paymentLink.paypal_payer_id || 'N/A',
              status: 'completed',
            });
          }
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
            status: 'pending',
          });

          // Note: In production, PayPal would send a webhook to complete the payment
          toast({
            title: 'Payment Processing',
            description:
              "Your payment is being processed. You'll receive a confirmation email shortly.",
          });
        }

        // Cart cleared automatically when payment is processed
        // (Cart functionality has been removed)

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } catch (error) {
        console.error('❌ PayPal verification error:', error);
        setError(error instanceof Error ? error.message : 'Payment verification failed');

        toast({
          title: 'Payment Verification Error',
          description:
            "We're having trouble verifying your payment. Please contact support with your order ID.",
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    verifyPayment();
  }, [searchParams, user, queryClient, toast]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <AnimatedSection animation="fadeIn">
          <Card className="max-w-2xl mx-auto overflow-hidden">
            <div
              className={`${paymentData?.status === 'uncaptured' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 'bg-gradient-to-r from-green-500 to-teal-600'} p-6 text-white`}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-3">
                  {paymentData?.status === 'uncaptured' ? (
                    <AlertCircle className="h-12 w-12 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  )}
                </div>
              </div>
              <CardTitle className="text-3xl text-center">
                {paymentData?.status === 'uncaptured'
                  ? 'Payment Approved - Processing Required'
                  : 'Payment Successful!'}
              </CardTitle>
              <p className="text-center mt-2 text-green-50">
                {paymentData?.status === 'uncaptured'
                  ? 'Your PayPal payment has been approved but needs manual processing'
                  : 'Thank you for your purchase via PayPal'}
              </p>
            </div>

            <CardContent className="p-6">
              {paymentData && (
                <div className="space-y-6">
                  {/* Transaction Details */}
                  <AnimatedSection animation="fadeInUp" delay={100}>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-teal-600" />
                        Transaction Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Transaction ID:</span>
                          <p className="font-mono font-medium break-all">
                            {paymentData.transactionId}
                          </p>
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
                            <Badge variant="secondary" className="bg-teal-100">
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
                      <div className="bg-teal-50 rounded-lg p-4 space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Mail className="h-5 w-5 text-teal-600" />
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
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-orange-600" />
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
