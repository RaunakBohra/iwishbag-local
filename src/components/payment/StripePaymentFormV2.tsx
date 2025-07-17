import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
  returnUrl?: string;
}

// Payment form component that uses PaymentElement
function PaymentForm({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  returnUrl = window.location.href,
}: Omit<StripePaymentFormProps, 'client_secret' | 'className'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setProcessing(false);
      onError?.(submitError.message || 'An error occurred');
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required', // Only redirect if necessary (for 3D Secure, etc.)
    });

    if (error) {
      setError(error.message || 'An error occurred');
      setProcessing(false);
      onError?.(error.message || 'An error occurred');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setSucceeded(true);
      setProcessing(false);
      onSuccess?.(paymentIntent as Record<string, unknown>);
    }
  };

  // Format amount for display
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className={cn('h-5 w-5', succeeded ? 'text-green-500' : 'text-gray-400')} />
          Secure Payment
        </CardTitle>
        <CardDescription>
          {amount && `Total amount: ${formatAmount(amount, currency)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PaymentElement shows all available payment methods */}
          <PaymentElement
            options={{
              layout: 'tabs', // Shows payment methods as tabs
              defaultValues: {
                billingDetails: {
                  // You can pre-fill billing details here if available
                },
              },
            }}
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {succeeded && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Your order is being processed.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!stripe || processing || succeeded} className="w-full">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : succeeded ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Payment Complete
              </>
            ) : (
              `Pay ${amount ? formatAmount(amount, currency) : 'Now'}`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Your payment information is encrypted and secure. We support cards, digital wallets, and
            bank payments depending on your location.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

// Main wrapper component that provides Stripe Elements context
export function StripePaymentFormV2({
  client_secret,
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  className,
  returnUrl,
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
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Tab': {
          borderRadius: '8px',
          border: '1px solid #e0e6eb',
          boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03)',
        },
        '.Tab:hover': {
          borderColor: '#85a5cc',
        },
        '.Tab--selected': {
          borderColor: '#0570de',
          boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 0px 0px 2px #c7e0ff',
        },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <div className={className}>
        <PaymentForm
          amount={amount}
          currency={currency}
          onSuccess={onSuccess}
          onError={onError}
          returnUrl={returnUrl}
        />
      </div>
    </Elements>
  );
}
