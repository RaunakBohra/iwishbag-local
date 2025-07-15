import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface StripePaymentFormProps {
  client_secret: string;
  amount?: number;
  currency?: string;
  onSuccess?: (paymentIntent: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Main wrapper component that provides Stripe Elements context
export function StripePaymentForm({ 
  client_secret, 
  amount, 
  currency = 'USD',
  onSuccess, 
  onError,
  className 
}: StripePaymentFormProps) {
  const options = {
    clientSecret: client_secret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        spacingUnit: '2px',
        borderRadius: '4px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentFormContent
        client_secret={client_secret}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        className={className}
      />
    </Elements>
  );
}

// Internal component that handles the payment form logic
function StripePaymentFormContent({
  client_secret,
  amount,
  currency,
  onSuccess,
  onError,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<Record<string, unknown> | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded
      setError('Stripe is not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Submit the form first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'An error occurred');
        setIsLoading(false);
        onError?.(submitError.message || 'An error occurred');
        return;
      }

      // Confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return URL for redirect-based payment methods
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required', // Only redirect if necessary (3D Secure, etc.)
      });

      if (result.error) {
        // Payment failed
        const errorMessage = result.error.message || 'An unknown error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
        console.error('Payment failed:', result.error);
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Payment succeeded
        setPaymentSucceeded(true);
        setPaymentIntent(result.paymentIntent);
        onSuccess?.(result.paymentIntent);
        console.log('Payment succeeded:', result.paymentIntent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (paymentSucceeded) {
    return (
      <Card className={cn('w-full max-w-md mx-auto', className)}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-900">Payment Successful!</CardTitle>
          <CardDescription className="text-green-700">
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentIntent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Payment ID:</span>
                  <span className="font-mono text-green-800">{paymentIntent.id}</span>
                </div>
                {amount && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Amount:</span>
                    <span className="font-semibold text-green-800">
                      {formatAmount(amount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-700">Status:</span>
                  <span className="font-semibold text-green-800 capitalize">
                    {paymentIntent.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          {amount && currency ? (
            <>Complete your payment of {formatAmount(amount, currency)}</>
          ) : (
            <>Enter your payment information below</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <PaymentElement 
              options={{
                layout: 'tabs',
                defaultValues: {
                  billingDetails: {
                    // You can pre-fill billing details here if available
                  }
                }
              }}
            />
          </div>

          <Button
            type="submit"
            disabled={!stripe || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                {amount && currency ? (
                  <>Pay {formatAmount(amount, currency)}</>
                ) : (
                  <>Complete Payment</>
                )}
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Your payment information is secure and encrypted.</p>
            <p>We accept cards, digital wallets, and bank payments</p>
            <p>Powered by Stripe</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}