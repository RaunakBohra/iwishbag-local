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

// Create PayPal Invoice
async function createPayPalInvoice(
  accessToken: string, 
  invoiceData: PayPalPaymentLinkRequest,
  isLive: boolean
) {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  
  // Generate invoice number
  const invoiceNumber = `IWB-${Date.now()}-${invoiceData.quoteId.substring(0, 8).toUpperCase()}`;
  
  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (invoiceData.expiryDays || 7));
  
  const invoice = {
    detail: {
      invoice_number: invoiceNumber,
      reference: invoiceData.quoteId,
      invoice_date: new Date().toISOString().split('T')[0],
      currency_code: invoiceData.currency,
      note: invoiceData.description || `Payment for iwishBag Order`,
      payment_term: {
        due_date: dueDate.toISOString().split('T')[0]
      },
      metadata: {
        ...invoiceData.metadata,
        quote_id: invoiceData.quoteId,
        created_via: 'iwishBag Payment Link'
      }
    },
    invoicer: {
      name: {
        business_name: "iwishBag"
      },
      email_address: "payments@iwishbag.com",
      website: "https://iwishbag.com",
      logo_url: "https://iwishbag.com/logo.png" // Update with actual logo URL
    },
    primary_recipients: [{
      billing_info: {
        name: {
          full_name: invoiceData.customerInfo.name
        },
        email_address: invoiceData.customerInfo.email,
        phones: invoiceData.customerInfo.phone ? [{
          country_code: "1", // Default to US, update based on actual country
          national_number: invoiceData.customerInfo.phone.replace(/\D/g, ''),
          phone_type: "MOBILE"
        }] : [],
        address: invoiceData.customerInfo.address ? {
          address_line_1: invoiceData.customerInfo.address,
          admin_area_2: "", // City
          admin_area_1: "", // State
          postal_code: "",
          country_code: "US" // Default, update based on actual country
        } : undefined
      }
    }],
    items: [{
      name: invoiceData.description || `Payment for Order #${invoiceData.quoteId.substring(0, 8).toUpperCase()}`,
      description: `iwishBag international shopping service`,
      quantity: "1",
      unit_amount: {
        currency_code: invoiceData.currency,
        value: invoiceData.amount.toFixed(2)
      },
      unit_of_measure: "QUANTITY"
    }],
    configuration: {
      partial_payment: {
        allow_partial_payment: false
      },
      allow_tip: false,
      tax_inclusive: true
    }
  };
  
  console.log('Creating PayPal invoice:', JSON.stringify(invoice, null, 2));
  
  const response = await fetch(`${baseUrl}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `iwishbag-${Date.now()}` // Idempotency key
    },
    body: JSON.stringify(invoice),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create PayPal invoice: ${JSON.stringify(error)}`);
  }
  
  return await response.json();
}

// Send PayPal Invoice
async function sendPayPalInvoice(accessToken: string, invoiceId: string, isLive: boolean) {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  
  const response = await fetch(`${baseUrl}/v2/invoicing/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `iwishbag-send-${Date.now()}`
    },
    body: JSON.stringify({
      send_to_invoicer: false,
      send_to_recipient: true,
      additional_recipients: [],
      note: "Thank you for your order with iwishBag!",
      send_to_payer: true
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send PayPal invoice: ${JSON.stringify(error)}`);
  }
  
  // Send returns 204 No Content on success
  return { sent: true };
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
    
    // Get PayPal credentials
    const clientId = isTestMode ? config.client_id_sandbox : config.client_id_live;
    const clientSecret = isTestMode ? config.client_secret_sandbox : config.client_secret_live;

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

    // Create invoice
    console.log('📄 Creating PayPal invoice...');
    const invoice = await createPayPalInvoice(accessToken, body, !isTestMode);
    console.log('✅ PayPal invoice created:', invoice.id);

    // Send invoice to generate payment link
    console.log('📧 Sending PayPal invoice...');
    await sendPayPalInvoice(accessToken, invoice.id, !isTestMode);
    console.log('✅ PayPal invoice sent');

    // Find the payment view link
    const paymentUrl = invoice.links?.find((link: any) => 
      link.rel === 'payer-view' || link.rel === 'approve'
    )?.href;

    if (!paymentUrl) {
      console.error('❌ No payment URL found in PayPal response');
      return new Response(JSON.stringify({ 
        error: 'Failed to get payment URL from PayPal' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
        gateway_link_id: invoice.id,
        link_code: linkCode,
        title: body.description || `Payment for Order ${body.quoteId.substring(0, 8).toUpperCase()}`,
        description: `iwishBag international shopping service`,
        amount: body.amount,
        currency: body.currency,
        original_amount: body.amount, // Can be different if currency conversion applied
        original_currency: body.currency,
        payment_url: paymentUrl,
        expires_at: expiryDate.toISOString(),
        status: 'active',
        gateway_request: body,
        gateway_response: invoice,
        customer_email: body.customerInfo.email,
        customer_name: body.customerInfo.name,
        customer_phone: body.customerInfo.phone,
        metadata: {
          ...body.metadata,
          invoice_number: invoice.detail.invoice_number,
          paypal_invoice_id: invoice.id
        }
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
        invoice_id: invoice.id,
        invoice_number: invoice.detail.invoice_number,
        status: invoice.status
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