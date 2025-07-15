import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateUser, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts'
import { createCorsHeaders } from '../_shared/cors.ts'

interface PayPalPaymentRequest {
  quoteIds: string[];
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  metadata?: Record<string, any>;
}

interface PayPalPaymentResponse {
  success: boolean;
  order_id?: string;
  approval_url?: string;
  error?: string;
}

interface PayPalOrderRequest {
  intent: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
    invoice_id?: string;
    custom_id?: string;
  }>;
  application_context: {
    return_url: string;
    cancel_url: string;
    brand_name: string;
    landing_page: string;
    shipping_preference: string;
    user_action: string;
  };
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  scope: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// Get PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string, isLive: boolean): Promise<string> {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal auth failed: ${response.status} - ${errorText}`);
  }

  const data: PayPalAccessTokenResponse = await response.json();
  return data.access_token;
}

// Create PayPal order
async function createPayPalOrder(
  accessToken: string, 
  orderData: PayPalOrderRequest, 
  isLive: boolean
): Promise<PayPalOrderResponse> {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': crypto.randomUUID(), // Idempotency key
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal order creation failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log("🟦 === PAYPAL PAYMENT CREATION FUNCTION STARTED ===");
  const corsHeaders = createCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);
    
    console.log(`🔐 Authenticated user ${user.email} creating PayPal payment`);
    const paymentRequest: PayPalPaymentRequest = await req.json();
    console.log("🟦 PayPal payment request:", { 
      quoteIds: paymentRequest.quoteIds,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency
    });

    // Validate input
    if (!paymentRequest.quoteIds || paymentRequest.quoteIds.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: quoteIds' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid amount. Must be greater than 0.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!paymentRequest.currency) {
      return new Response(JSON.stringify({ 
        error: 'Missing required field: currency' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PayPal configuration
    const { data: paypalGateway, error: paypalGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .eq('is_active', true)
      .single();

    if (paypalGatewayError || !paypalGateway) {
      console.error("❌ PayPal gateway config missing:", paypalGatewayError);
      return new Response(JSON.stringify({ 
        error: 'PayPal gateway configuration not found' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = paypalGateway.config || {};
    const isTestMode = paypalGateway.test_mode;
    
    // Get appropriate credentials based on test mode
    const clientId = isTestMode ? config.client_id_sandbox : config.client_id_live;
    const clientSecret = isTestMode ? config.client_secret_sandbox : config.client_secret_live;
    
    if (!clientId || !clientSecret) {
      console.error("❌ PayPal credentials missing:", { 
        isTestMode,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret 
      });
      return new Response(JSON.stringify({ 
        error: 'PayPal credentials not configured' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ PayPal config loaded:", { 
      isTestMode,
      clientId: clientId.substring(0, 8) + '...',
      hasSecret: !!clientSecret
    });

    // Get quote details for order description
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('product_name, display_id')
      .in('id', paymentRequest.quoteIds);

    if (quotesError) {
      console.error("❌ Error fetching quotes:", quotesError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch quote details' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create order description
    const orderDescription = quotes && quotes.length > 0 
      ? `iwishBag Order: ${quotes.map(q => q.product_name).join(', ')}`
      : 'iwishBag International Shopping Order';

    const invoiceId = quotes && quotes.length > 0 
      ? quotes.map(q => q.display_id).join(',')
      : `IWISH_${Date.now()}`;

    // STEP 1: Initial Insert - Record pending payment BEFORE external API call
    const transactionId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log("🔄 COMPENSATION: Creating initial pending payment record BEFORE external API call");
    const { data: initialTransaction, error: initialError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        gateway_code: 'paypal',
        quote_id: paymentRequest.quoteIds[0], // Primary quote ID
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        payment_state: 'pending',
        metadata: {
          quote_ids: paymentRequest.quoteIds,
          customer_info: paymentRequest.customerInfo,
          order_description: orderDescription,
          invoice_id: invoiceId,
          compensation_step: 'initial_insert',
          created_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (initialError) {
      console.error("❌ COMPENSATION: Failed to create initial pending payment record:", initialError);
      throw new Error(`Failed to initialize payment tracking: ${initialError.message}`);
    }
    
    const paymentTransactionId = initialTransaction.id;
    console.log("✅ COMPENSATION: Initial pending payment record created:", transactionId);

    // Get PayPal access token
    console.log("🔑 Getting PayPal access token...");
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, !isTestMode);
    console.log("✅ PayPal access token obtained");

    // Prepare PayPal order data
    const orderData: PayPalOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: paymentRequest.currency,
          value: paymentRequest.amount.toFixed(2),
        },
        description: orderDescription,
        invoice_id: invoiceId,
        custom_id: paymentRequest.quoteIds.join(','), // Store quote IDs for webhook processing
      }],
      application_context: {
        return_url: paymentRequest.success_url,
        cancel_url: paymentRequest.cancel_url,
        brand_name: 'iwishBag',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    console.log("🛒 Creating PayPal order...");
    const paypalOrder = await createPayPalOrder(accessToken, orderData, !isTestMode);
    console.log("✅ PayPal order created:", paypalOrder.id);
    
    // STEP 2: External API Success - Update payment_state to external_created
    console.log("🔄 COMPENSATION: Updating payment state to external_created");
    const { error: externalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        gateway_transaction_id: paypalOrder.id,
        payment_state: 'external_created',
        gateway_response: paypalOrder,
        metadata: {
          quote_ids: paymentRequest.quoteIds,
          customer_info: paymentRequest.customerInfo,
          order_description: orderDescription,
          invoice_id: invoiceId,
          compensation_step: 'external_created',
          paypal_order_id: paypalOrder.id,
          external_api_success_at: new Date().toISOString()
        }
      })
      .eq('id', paymentTransactionId);
      
    if (externalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to external_created:", externalUpdateError);
      // Continue execution but log the issue - PayPal order exists
    } else {
      console.log("✅ COMPENSATION: Payment state updated to external_created");
    }

    // Find approval URL
    const approvalLink = paypalOrder.links.find(link => link.rel === 'approve');
    if (!approvalLink) {
      throw new Error('PayPal approval URL not found in response');
    }

    // STEP 3: Database Insert Success - Update payment_state to db_recorded
    console.log("🔄 COMPENSATION: Updating payment state to db_recorded");
    const { error: finalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        payment_state: 'db_recorded',
        metadata: {
          quote_ids: paymentRequest.quoteIds,
          customer_info: paymentRequest.customerInfo,
          order_description: orderDescription,
          invoice_id: invoiceId,
          compensation_step: 'db_recorded',
          paypal_order_id: paypalOrder.id,
          approval_url: approvalLink.href,
          db_recorded_at: new Date().toISOString()
        }
      })
      .eq('id', paymentTransactionId);
      
    if (finalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to db_recorded:", finalUpdateError);
      // Continue execution - payment is functional but state tracking incomplete
    } else {
      console.log("✅ COMPENSATION: Payment state updated to db_recorded - payment creation complete");
    }

    const response: PayPalPaymentResponse = {
      success: true,
      order_id: paypalOrder.id,
      approval_url: approvalLink.href,
    };

    console.log("🎉 PayPal payment creation successful with compensation tracking");
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ PayPal payment creation error:", error);
    
    // STEP 4: Error Handling - Update payment_state based on error context
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Determine appropriate payment_state based on error context
      let errorState = 'failed';
      let errorContext = 'unknown_error';
      
      if (error.message?.includes('PayPal')) {
        // External API error - payment might be orphaned
        errorState = 'orphaned';
        errorContext = 'paypal_api_error';
      } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
        // Database error after external API success
        errorState = 'orphaned';
        errorContext = 'database_error_after_external_success';
      }
      
      console.log(`🔄 COMPENSATION: Updating payment state to ${errorState} due to error`);
      
      // Try to update the specific payment transaction if it exists
      if (typeof paymentTransactionId !== 'undefined') {
        await supabaseAdmin
          .from('payment_transactions')
          .update({
            payment_state: errorState,
            status: 'failed',
            metadata: {
              error_context: errorContext,
              error_message: error.message,
              error_time: new Date().toISOString(),
              compensation_step: 'error_handling'
            }
          })
          .eq('id', paymentTransactionId);
      } else {
        // Fallback: try to find and update recent pending PayPal transaction
        await supabaseAdmin
          .from('payment_transactions')
          .update({
            payment_state: errorState,
            status: 'failed',
            metadata: {
              error_context: errorContext,
              error_message: error.message,
              error_time: new Date().toISOString(),
              compensation_step: 'error_handling_fallback'
            }
          })
          .eq('gateway_code', 'paypal')
          .eq('status', 'pending')
          .in('quote_id', paymentRequest?.quoteIds || [])
          .order('created_at', { ascending: false })
          .limit(1);
      }
        
      console.log(`✅ COMPENSATION: Payment state updated to ${errorState}`);
    } catch (compensationError) {
      console.error("❌ COMPENSATION: Failed to update payment state on error:", compensationError);
      // Continue with original error handling
    }
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    const response: PayPalPaymentResponse = {
      success: false,
      error: error.message || 'Failed to create PayPal payment'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});