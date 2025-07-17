import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticateUser,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';

interface PaymentVerificationRequest {
  transaction_id: string;
  gateway: string;
  amount?: number;
  currency?: string;
  force_refresh?: boolean;
}

interface PaymentVerificationResponse {
  success: boolean;
  payment_status: 'pending' | 'completed' | 'failed';
  transaction_id: string;
  gateway: string;
  amount?: number;
  currency?: string;
  gateway_response?: Record<string, unknown>;
  verified_at: string;
  error_message?: string;
  recommendations?: string[];
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    console.log(`🔍 Payment Verification Request [${requestId}]`);

    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);

    console.log(`🔐 Authenticated user ${user.email} requesting payment verification`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const body: PaymentVerificationRequest = await req.json();

    if (!body.transaction_id || !body.gateway) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: transaction_id and gateway',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`🔍 Verifying payment: ${body.transaction_id} on ${body.gateway}`);

    let verificationResult: PaymentVerificationResponse;

    // Route to appropriate verification method based on gateway
    switch (body.gateway.toLowerCase()) {
      case 'payu':
        verificationResult = await verifyPayUPayment(supabaseAdmin, body, requestId);
        break;
      case 'stripe':
        verificationResult = await verifyStripePayment(supabaseAdmin, body, requestId);
        break;
      case 'bank_transfer':
        verificationResult = await verifyBankTransfer(supabaseAdmin, body, requestId);
        break;
      default:
        return new Response(
          JSON.stringify({
            error: `Unsupported gateway: ${body.gateway}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
    }

    // Log verification attempt
    await logVerificationAttempt(
      supabaseAdmin,
      requestId,
      body.transaction_id,
      body.gateway,
      verificationResult.success,
    );

    return new Response(JSON.stringify(verificationResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Payment verification error [${requestId}]:`, error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        error: 'Payment verification failed',
        details: error.message,
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

// PayU Payment Verification
async function verifyPayUPayment(
  supabaseAdmin: SupabaseClient,
  request: PaymentVerificationRequest,
  requestId: string,
): Promise<PaymentVerificationResponse> {
  try {
    // Get PayU configuration
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'payu',
        verified_at: new Date().toISOString(),
        error_message: 'PayU configuration not found',
        recommendations: ['Configure PayU gateway in admin panel'],
      };
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;

    if (!config.merchant_key || !config.salt_key) {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'payu',
        verified_at: new Date().toISOString(),
        error_message: 'PayU credentials missing',
        recommendations: ['Add PayU merchant key and salt key to gateway config'],
      };
    }

    // Check if we already have this payment in our database
    const { data: existingPayment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('transaction_id', request.transaction_id)
      .eq('gateway', 'payu')
      .single();

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('Database error checking existing payment:', paymentError);
    }

    // If we have a recent successful payment record and not forcing refresh, use it
    if (existingPayment && !request.force_refresh) {
      const paymentAge = Date.now() - new Date(existingPayment.created_at).getTime();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (paymentAge < maxAge) {
        return {
          success: true,
          payment_status: mapPaymentStatus(existingPayment.status),
          transaction_id: request.transaction_id,
          gateway: 'payu',
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          verified_at: new Date().toISOString(),
          gateway_response: existingPayment.gateway_response,
          recommendations: ['Payment verified from recent database record'],
        };
      }
    }

    // Call PayU Verify Payment API
    const verifyUrl = testMode
      ? 'https://test.payu.in/merchant/postservice?form=2'
      : 'https://info.payu.in/merchant/postservice?form=2';

    const verifyHash = await generatePayUVerifyHash(
      config.merchant_key,
      request.transaction_id,
      config.salt_key,
    );

    const verifyData = new URLSearchParams({
      key: config.merchant_key,
      command: 'verify_payment',
      var1: request.transaction_id,
      hash: verifyHash,
    });

    console.log(`🔍 Calling PayU verify API [${requestId}]`);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'iwishBag-PayU-Verifier/1.0',
      },
      body: verifyData,
    });

    if (!response.ok) {
      throw new Error(`PayU API returned status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`PayU verify response [${requestId}]:`, result);

    if (result.status === 1 && result.transaction_details) {
      const transaction = result.transaction_details[request.transaction_id];

      if (transaction) {
        const paymentStatus = mapPayUStatus(transaction.status);

        return {
          success: true,
          payment_status: paymentStatus,
          transaction_id: request.transaction_id,
          gateway: 'payu',
          amount: parseFloat(transaction.amount),
          currency: 'INR',
          verified_at: new Date().toISOString(),
          gateway_response: transaction,
          recommendations: generateRecommendations(paymentStatus, transaction),
        };
      }
    }

    return {
      success: false,
      payment_status: 'failed',
      transaction_id: request.transaction_id,
      gateway: 'payu',
      verified_at: new Date().toISOString(),
      error_message: 'Transaction not found at PayU',
      recommendations: [
        'Check if transaction ID is correct',
        'Verify payment was made through PayU',
        'Contact PayU support if payment was made',
      ],
    };
  } catch (error) {
    console.error(`PayU verification error [${requestId}]:`, error);

    return {
      success: false,
      payment_status: 'failed',
      transaction_id: request.transaction_id,
      gateway: 'payu',
      verified_at: new Date().toISOString(),
      error_message: error.message,
      recommendations: [
        'Check PayU configuration',
        'Verify network connectivity',
        'Try again later',
      ],
    };
  }
}

// Stripe Payment Verification
async function verifyStripePayment(
  supabaseAdmin: SupabaseClient,
  request: PaymentVerificationRequest,
  requestId: string,
): Promise<PaymentVerificationResponse> {
  try {
    // Get Stripe configuration from database
    const { data: stripeGateway, error: stripeGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'stripe')
      .single();

    if (stripeGatewayError || !stripeGateway) {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'stripe',
        verified_at: new Date().toISOString(),
        error_message: 'Stripe configuration not found',
        recommendations: ['Configure Stripe gateway in admin panel'],
      };
    }

    const config = stripeGateway.config || {};
    const testMode = stripeGateway.test_mode;

    // Get the appropriate key based on test mode
    const stripeSecretKey = testMode
      ? config.test_secret_key
      : config.live_secret_key || config.secret_key;

    if (!stripeSecretKey) {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'stripe',
        verified_at: new Date().toISOString(),
        error_message: 'Stripe secret key not configured in database',
        recommendations: ['Add Stripe secret key to gateway config'],
      };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: config.api_version || '2023-10-16',
    });

    console.log(`🔍 Retrieving Stripe PaymentIntent [${requestId}]: ${request.transaction_id}`);

    // Retrieve the PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(request.transaction_id);

    console.log(`✅ Stripe PaymentIntent retrieved [${requestId}]:`, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    // Map Stripe status to our internal status
    const paymentStatus = mapStripeStatus(paymentIntent.status);

    // Convert amount from smallest unit back to major unit
    const amountInMajorUnit = convertStripeAmountToMajorUnit(
      paymentIntent.amount,
      paymentIntent.currency,
    );

    return {
      success: true,
      payment_status: paymentStatus,
      transaction_id: request.transaction_id,
      gateway: 'stripe',
      amount: amountInMajorUnit,
      currency: paymentIntent.currency.toUpperCase(),
      verified_at: new Date().toISOString(),
      gateway_response: paymentIntent,
      recommendations: generateStripeRecommendations(paymentStatus, paymentIntent),
    };
  } catch (error) {
    console.error(`❌ Stripe verification error [${requestId}]:`, error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'stripe',
        verified_at: new Date().toISOString(),
        error_message: `Invalid PaymentIntent ID: ${error.message}`,
        recommendations: [
          'Verify the PaymentIntent ID is correct',
          'Check if the PaymentIntent exists in your Stripe dashboard',
          'Ensure the PaymentIntent belongs to your account',
        ],
      };
    }

    if (error.type === 'StripeAuthenticationError') {
      return {
        success: false,
        payment_status: 'failed',
        transaction_id: request.transaction_id,
        gateway: 'stripe',
        verified_at: new Date().toISOString(),
        error_message: 'Stripe authentication failed',
        recommendations: [
          'Check Stripe secret key configuration',
          'Verify API key permissions',
          'Ensure using correct environment (test/live)',
        ],
      };
    }

    return {
      success: false,
      payment_status: 'failed',
      transaction_id: request.transaction_id,
      gateway: 'stripe',
      verified_at: new Date().toISOString(),
      error_message: error.message || 'Unknown Stripe error',
      recommendations: [
        'Check Stripe configuration',
        'Verify network connectivity',
        'Try again later',
        'Contact support if issue persists',
      ],
    };
  }
}

// Bank Transfer Verification (placeholder)
async function verifyBankTransfer(
  supabaseAdmin: SupabaseClient,
  request: PaymentVerificationRequest,
  requestId: string,
): Promise<PaymentVerificationResponse> {
  // For bank transfers, we rely on manual verification
  const { data: existingPayment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('transaction_id', request.transaction_id)
    .eq('gateway', 'bank_transfer')
    .single();

  if (paymentError && paymentError.code !== 'PGRST116') {
    console.error('Database error checking bank transfer:', paymentError);
  }

  if (existingPayment) {
    return {
      success: true,
      payment_status: mapPaymentStatus(existingPayment.status),
      transaction_id: request.transaction_id,
      gateway: 'bank_transfer',
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      verified_at: new Date().toISOString(),
      recommendations: ['Bank transfer verified through manual process'],
    };
  }

  return {
    success: false,
    payment_status: 'pending',
    transaction_id: request.transaction_id,
    gateway: 'bank_transfer',
    verified_at: new Date().toISOString(),
    error_message: 'Bank transfer not found in records',
    recommendations: [
      'Upload bank transfer receipt in admin panel',
      'Wait for manual verification by admin',
      'Contact support if payment was made',
    ],
  };
}

// Generate hash for PayU verify payment API
async function generatePayUVerifyHash(
  merchantKey: string,
  txnid: string,
  salt: string,
): Promise<string> {
  const hashString = `${merchantKey}|verify_payment|${txnid}|${salt}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

// Map various payment statuses to our standard format
function mapPaymentStatus(status: string): 'pending' | 'completed' | 'failed' {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case 'success':
    case 'completed':
    case 'paid':
      return 'completed';
    case 'failure':
    case 'failed':
    case 'cancelled':
    case 'cancel':
      return 'failed';
    default:
      return 'pending';
  }
}

// Map PayU specific statuses
function mapPayUStatus(status: string): 'pending' | 'completed' | 'failed' {
  const statusLower = status.toLowerCase();

  switch (statusLower) {
    case 'success':
      return 'completed';
    case 'failure':
    case 'failed':
      return 'failed';
    case 'pending':
    case 'initiated':
      return 'pending';
    default:
      return 'pending';
  }
}

// Map Stripe PaymentIntent status to our internal status
function mapStripeStatus(status: string): 'pending' | 'completed' | 'failed' {
  switch (status) {
    case 'succeeded':
      return 'completed';
    case 'canceled':
    case 'payment_failed':
      return 'failed';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'processing':
    case 'requires_capture':
      return 'pending';
    default:
      return 'pending';
  }
}

// Convert Stripe amount from smallest unit to major unit
function convertStripeAmountToMajorUnit(amount: number, currency: string): number {
  const upperCurrency = currency.toUpperCase();

  // Zero decimal currencies (already in major unit)
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX'];

  // Three decimal currencies (1000 smallest units = 1 major unit)
  const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];

  if (zeroDecimalCurrencies.includes(upperCurrency)) {
    return amount;
  } else if (threeDecimalCurrencies.includes(upperCurrency)) {
    return amount / 1000;
  } else {
    return amount / 100; // Default to 2 decimal places
  }
}

// Generate recommendations based on payment status
function generateRecommendations(
  status: 'pending' | 'completed' | 'failed',
  transaction: Record<string, unknown>,
): string[] {
  const recommendations: string[] = [];

  switch (status) {
    case 'completed':
      recommendations.push('Payment verified successfully');
      recommendations.push('Order can be processed');
      break;
    case 'failed':
      recommendations.push('Payment failed - customer needs to retry');
      recommendations.push('Check error code: ' + (transaction.error_code || 'None'));
      if (transaction.error_Message) {
        recommendations.push('Error message: ' + transaction.error_Message);
      }
      break;
    case 'pending':
      recommendations.push('Payment is still processing');
      recommendations.push('Check again in a few minutes');
      break;
  }

  return recommendations;
}

// Generate Stripe-specific recommendations
function generateStripeRecommendations(
  status: 'pending' | 'completed' | 'failed',
  paymentIntent: Stripe.PaymentIntent,
): string[] {
  const recommendations: string[] = [];

  switch (status) {
    case 'completed':
      recommendations.push('Payment completed successfully');
      recommendations.push('Order can be processed and fulfilled');
      if (paymentIntent.charges?.data?.[0]?.receipt_url) {
        recommendations.push('Receipt available in Stripe dashboard');
      }
      break;
    case 'failed':
      recommendations.push('Payment failed - customer needs to retry');
      if (paymentIntent.last_payment_error?.message) {
        recommendations.push('Error: ' + paymentIntent.last_payment_error.message);
      }
      if (paymentIntent.status === 'canceled') {
        recommendations.push('Payment was canceled by customer or system');
      }
      recommendations.push('Create new PaymentIntent for retry');
      break;
    case 'pending':
      const stripeStatus = paymentIntent.status;
      switch (stripeStatus) {
        case 'requires_payment_method':
          recommendations.push('Customer needs to provide payment method');
          break;
        case 'requires_confirmation':
          recommendations.push('Payment requires confirmation');
          break;
        case 'requires_action':
          recommendations.push('Customer action required (3D Secure, etc.)');
          break;
        case 'processing':
          recommendations.push('Payment is being processed');
          recommendations.push('Check again in a few minutes');
          break;
        case 'requires_capture':
          recommendations.push('Payment authorized, requires manual capture');
          break;
        default:
          recommendations.push('Payment is pending');
      }
      break;
  }

  return recommendations;
}

// Log verification attempts
async function logVerificationAttempt(
  supabaseAdmin: SupabaseClient,
  requestId: string,
  transactionId: string,
  gateway: string,
  success: boolean,
) {
  try {
    await supabaseAdmin.from('payment_verification_logs').insert({
      request_id: requestId,
      transaction_id: transactionId,
      gateway: gateway,
      success: success,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log verification attempt:', error);
    // Don't fail the verification if logging fails
  }
}
