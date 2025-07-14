import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface PayPalPaymentLinkRequest {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  description?: string;
  expiryDays?: number;
  metadata?: Record<string, any>;
}

// Generate a short link code
function generateLinkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get PayPal OAuth token
async function getPayPalAccessToken(clientId: string, clientSecret: string, isLive: boolean): Promise<string> {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = btoa(credentials);
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Create PayPal Order (for payment links)
async function createPayPalOrder(
  accessToken: string, 
  orderData: PayPalPaymentLinkRequest,
  isLive: boolean
) {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  
  // Generate unique order ID
  const timestamp = Math.floor(Date.now() / 1000);
  const orderNumber = `IWB-${timestamp}-${orderData.quoteId.substring(0, 6).toUpperCase()}`;
  
  // Prepare redirect URLs
  const appUrl = 'https://iwishbag.com'; // Use your domain
  const successUrl = `${appUrl}/payment/success?quote=${orderData.quoteId}`;
  const cancelUrl = `${appUrl}/payment/cancelled?quote=${orderData.quoteId}`;
  
  const order = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: orderData.currency,
        value: orderData.amount.toFixed(2)
      },
      description: orderData.description || `Payment for iwishBag Order`,
      custom_id: orderData.quoteId,
      invoice_id: orderNumber
    }],
    application_context: {
      brand_name: 'iwishBag',
      locale: 'en-US',
      landing_page: 'LOGIN',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: successUrl,
      cancel_url: cancelUrl
    }
  };
  
  console.log('Creating PayPal order:', JSON.stringify(order, null, 2));
  
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `iwishbag-${Date.now()}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(order),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create PayPal order: ${JSON.stringify(error)}`);
  }
  
  const responseData = await response.json();
  
  console.log('📝 PayPal order response:', {
    hasId: !!responseData.id,
    hasLinks: !!responseData.links,
    status: responseData.status
  });
  
  return responseData;
}

// Extract payment URL from PayPal order response
function extractPayPalPaymentUrl(orderData: any): string | null {
  if (!orderData.links) return null;
  
  // Look for 'approve' rel (most common)
  let paypalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;
  
  // Method 2: Look for 'payer-action' rel 
  if (!paypalUrl) {
    paypalUrl = orderData.links.find((link: any) => link.rel === 'payer-action')?.href;
  }
  
  // Method 3: Look for any link containing 'checkout'
  if (!paypalUrl) {
    paypalUrl = orderData.links.find((link: any) => link.href?.includes('checkout'))?.href;
  }
  
  // Method 4: Look for any GET method link
  if (!paypalUrl) {
    paypalUrl = orderData.links.find((link: any) => link.method === 'GET')?.href;
  }
  
  return paypalUrl;
}

serve(async (req) => {
  console.log("🔵 === CREATE PAYPAL PAYMENT LINK FUNCTION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Log the request method and headers for debugging
    console.log("🔵 Request method:", req.method);
    console.log("🔵 Request headers:", Object.fromEntries(req.headers.entries()));
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const body: PayPalPaymentLinkRequest = await req.json();
    console.log("🔵 Payment link request:", { 
      quoteId: body.quoteId, 
      amount: body.amount, 
      currency: body.currency,
      customerEmail: body.customerInfo?.email 
    });

    // Validate input
    if (!body.quoteId || !body.amount || !body.currency || !body.customerInfo?.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: quoteId, amount, currency, customerInfo.email' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get PayPal gateway configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .eq('is_active', true)
      .single();

    if (gatewayError || !paypalGateway) {
      console.error('❌ PayPal gateway config missing:', gatewayError);
      return new Response(JSON.stringify({ 
        error: 'PayPal gateway configuration not found' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = paypalGateway.config || {};
    const isTestMode = paypalGateway.test_mode;
    
    // Get PayPal credentials - support both old and new config formats
    const clientId = config.client_id || (isTestMode ? config.client_id_sandbox : config.client_id_live);
    const clientSecret = config.client_secret || (isTestMode ? config.client_secret_sandbox : config.client_secret_live);

    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials missing');
      return new Response(JSON.stringify({ 
        error: 'PayPal credentials not configured' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get OAuth token
    console.log('🔑 Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, !isTestMode);
    console.log('✅ Got PayPal access token');

    // Create PayPal order for payment
    console.log('📄 Creating PayPal order...');
    console.log('Order data being sent:', {
      quoteId: body.quoteId,
      amount: body.amount,
      currency: body.currency,
      customerEmail: body.customerInfo?.email,
      isTestMode: isTestMode
    });
    
    // Generate order number (same logic as in createPayPalOrder)
    const timestamp = Math.floor(Date.now() / 1000);
    const orderNumber = `IWB-${timestamp}-${body.quoteId.substring(0, 6).toUpperCase()}`;
    
    const order = await createPayPalOrder(accessToken, body, !isTestMode);
    console.log('✅ PayPal order created:', JSON.stringify(order, null, 2));
    
    // Extract order ID
    const orderId = order.id;
    
    if (!orderId) {
      console.error('❌ No order ID found in PayPal response');
      console.error('Order response structure:', JSON.stringify(order, null, 2));
      return new Response(JSON.stringify({ 
        error: 'Failed to get order ID from PayPal response',
        details: 'Order was created but ID not found in response'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📋 Order ID:', orderId);
    console.log('📋 Order links:', order.links?.map((l: any) => ({ rel: l.rel, href: l.href })));

    // Extract payment URL from order response
    const paymentUrl = extractPayPalPaymentUrl(order);
    
    if (!paymentUrl) {
      console.error('❌ No payment URL found in PayPal order response');
      console.error('❌ Order details:', JSON.stringify(order, null, 2));
      return new Response(JSON.stringify({ 
        error: 'Failed to get payment URL from PayPal',
        details: 'No approval link found in order response'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Payment URL obtained:', paymentUrl);

    // Generate link code
    const linkCode = generateLinkCode();

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (body.expiryDays || 7));

    // Store payment link in database
    const { data: paymentLink, error: linkError } = await supabaseAdmin
      .from('payment_links')
      .insert({
        quote_id: body.quoteId,
        gateway: 'paypal',
        gateway_link_id: orderId,
        link_code: linkCode,
        title: body.description || `Payment for Order ${body.quoteId.substring(0, 8).toUpperCase()}`,
        amount: body.amount,
        currency: body.currency,
        original_amount: body.amount, // Can be different if currency conversion applied
        original_currency: body.currency,
        payment_url: paymentUrl,
        expires_at: expiryDate.toISOString(),
        status: 'active',
        gateway_request: body,
        gateway_response: order,
        customer_email: body.customerInfo.email,
        customer_name: body.customerInfo.name,
        customer_phone: body.customerInfo.phone
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ Failed to store payment link:', linkError);
      return new Response(JSON.stringify({ 
        error: 'Failed to store payment link',
        details: linkError 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Payment link created successfully');

    // Return response matching the expected format
    return new Response(JSON.stringify({
      success: true,
      linkId: paymentLink.id,
      linkCode: linkCode,
      paymentUrl: paymentUrl,
      shortUrl: paymentUrl, // PayPal doesn't provide a separate short URL
      expiresAt: expiryDate.toISOString(),
      amountInINR: body.amount.toString(), // For compatibility
      originalAmount: body.amount,
      originalCurrency: body.currency,
      exchangeRate: 1, // No conversion for PayPal
      apiVersion: 'v2',
      gateway_response: {
        order_id: orderId,
        order_number: orderNumber,
        status: order.status || 'CREATED'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    console.error('❌ Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: error.message || String(error),
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});