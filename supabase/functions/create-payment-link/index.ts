import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateUser, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

interface PaymentLinkRequest {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  description?: string;
  expiryDays?: number; // Number of days until link expires
}

// Generate unique link code
async function generateLinkCode(supabaseAdmin: any): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const { data: existing } = await supabaseAdmin
      .from('payment_links')
      .select('id')
      .eq('link_code', code)
      .single();
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback to timestamp-based code
  return `PL${Date.now()}`;
}

// Generate PayU invoice hash
async function generatePayUInvoiceHash({
  merchantKey,
  salt,
  command,
  var1
}: {
  merchantKey: string,
  salt: string,
  command: string,
  var1: string
}): Promise<string> {
  // PayU Invoice hash format: key|command|var1|salt
  const hashString = `${merchantKey}|${command}|${var1}|${salt}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);
    
    console.log(`🔐 Authenticated user ${user.email} requesting payment link creation`);

    const { quoteId, amount, currency, customerInfo, description, expiryDays = 7 } = await req.json() as PaymentLinkRequest;

    // Validate input
    if (!quoteId || !amount || !customerInfo?.email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch PayU config
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      return new Response(JSON.stringify({ error: 'PayU gateway config missing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    const payuConfig = {
      merchant_key: config.merchant_key,
      salt_key: config.salt_key,
      api_url: testMode ? 'https://test.payu.in' : 'https://info.payu.in'
    };

    // Convert amount to INR if needed
    let amountInINR = amount;
    if (currency !== 'INR') {
      const { data: indiaSettings } = await supabaseAdmin
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', 'IN')
        .single();
      
      const exchangeRate = indiaSettings?.rate_from_usd || 83.0;
      amountInINR = amount * exchangeRate;
    }

    // Generate unique invoice ID
    const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Create invoice data
    const invoiceData = {
      txnid: invoiceId,
      amount: amountInINR.toFixed(2),
      productinfo: description || `Payment for Quote ${quoteId}`,
      firstname: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      udf1: quoteId, // Store quote ID in UDF1
      expiryDate: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD format
      templateId: 1, // Default template
      invoiceEmailNotify: 1, // Send email notification
      invoiceSMSNotify: 0 // Don't send SMS by default
    };

    // Generate hash for the request
    const command = 'create_invoice';
    const var1 = JSON.stringify(invoiceData);
    const hash = await generatePayUInvoiceHash({
      merchantKey: payuConfig.merchant_key,
      salt: payuConfig.salt_key,
      command,
      var1
    });

    // Make API request to PayU
    const payuResponse = await fetch(`${payuConfig.api_url}/merchant/postservice.php?form=2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        key: payuConfig.merchant_key,
        command: command,
        var1: var1,
        hash: hash
      })
    });

    const payuResult = await payuResponse.json();

    if (payuResult.status === 1) {
      // Success - store payment link details in database
      const { data: paymentLink, error: insertError } = await supabaseAdmin
        .from('payment_links')
        .insert({
          quote_id: quoteId,
          gateway: 'payu',
          gateway_link_id: invoiceId,
          link_code: await generateLinkCode(supabaseAdmin),
          title: description || `Payment for Quote ${quoteId}`,
          description: description,
          amount: amountInINR,
          currency: 'INR',
          original_amount: amount,
          original_currency: currency,
          payment_url: payuResult.URL || `${payuConfig.api_url}/invoice/${invoiceId}`,
          expires_at: expiryDate.toISOString(),
          status: 'active',
          gateway_request: var1,
          gateway_response: payuResult,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          metadata: {
            quote_id: quoteId,
            exchange_rate: currency !== 'INR' ? (amountInINR / amount) : 1
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error storing payment link:', insertError);
      }

      return new Response(JSON.stringify({
        success: true,
        linkId: invoiceId,
        linkCode: paymentLink?.link_code,
        paymentUrl: payuResult.URL || `${payuConfig.api_url}/invoice/${invoiceId}`,
        shortUrl: `${Deno.env.get('PUBLIC_URL') || 'https://whyteclub.com'}/pay/${paymentLink?.link_code}`,
        expiresAt: expiryDate.toISOString(),
        amountInINR: amountInINR.toFixed(2),
        originalAmount: amount,
        originalCurrency: currency,
        exchangeRate: currency !== 'INR' ? (amountInINR / amount) : 1
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Error from PayU
      console.error('PayU error:', payuResult);
      return new Response(JSON.stringify({ 
        error: 'Failed to create payment link',
        details: payuResult.msg || 'Unknown error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Payment link creation error:', error);
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})