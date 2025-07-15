import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

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
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Only handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST.' 
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
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

    // Find approval URL
    const approvalLink = paypalOrder.links.find(link => link.rel === 'approve');
    if (!approvalLink) {
      throw new Error('PayPal approval URL not found in response');
    }

    // Store payment transaction in database
    const transactionId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        gateway_transaction_id: paypalOrder.id, // PayPal order ID
        gateway_code: 'paypal',
        quote_id: paymentRequest.quoteIds[0], // Primary quote ID
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        gateway_response: paypalOrder,
        metadata: {
          quote_ids: paymentRequest.quoteIds,
          customer_info: paymentRequest.customerInfo,
          order_description: orderDescription,
          invoice_id: invoiceId
        }
      });

    if (transactionError) {
      console.error("❌ Error storing transaction:", transactionError);
      // Don't fail the payment, just log the error
    } else {
      console.log("✅ Payment transaction stored:", transactionId);
    }

    const response: PayPalPaymentResponse = {
      success: true,
      order_id: paypalOrder.id,
      approval_url: approvalLink.href,
    };

    console.log("🎉 PayPal payment creation successful");
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ PayPal payment creation error:", error);
    
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