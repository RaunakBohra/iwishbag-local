import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
// Verify PayU hash to ensure request is legitimate
async function verifyPayUHash(data, salt) {
  try {
    // PayU hash format for response:
    // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const reverseHashString = [
      salt,
      data.status || '',
      '',
      '',
      '',
      '',
      '',
      '',
      data.udf5 || '',
      data.udf4 || '',
      data.udf3 || '',
      data.udf2 || '',
      data.udf1 || '',
      data.email || '',
      data.firstname || '',
      data.productinfo || '',
      data.amount || '',
      data.txnid || '',
      data.key || '',
    ].join('|');
    const encoder = new TextEncoder();
    const hashData = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return calculatedHash === data.hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req),
    });
  }
  // This endpoint must be public for PayU to access it
  // PayU cannot send authorization headers
  try {
    console.log('PayU callback received:', req.method, req.url);
    // Check if this is a GET request with PayU parameters
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const params = url.searchParams;
      // Check if this looks like a PayU redirect (has txnid parameter)
      if (params.get('txnid')) {
        // PayU might be doing a GET redirect, handle it
        console.log('PayU GET redirect detected, processing...');
        // Extract parameters from URL
        const data = {
          txnid: params.get('txnid') || '',
          status: params.get('status') || '',
          mihpayid: params.get('mihpayid') || '',
          amount: params.get('amount') || '',
          email: params.get('email') || '',
          firstname: params.get('firstname') || '',
          productinfo: params.get('productinfo') || '',
          hash: params.get('hash') || '',
          error: params.get('error') || '',
          error_message: params.get('error_Message') || '',
          udf1: params.get('udf1') || '',
          udf2: params.get('udf2') || '',
          key: params.get('key') || '',
        };
        // Process as if it were a POST request
        req.method = 'POST'; // Trick the rest of the code
        // Continue processing below
      } else {
        // Regular GET request without PayU params - show info page
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>PayU Callback Handler</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 { color: #333; }
              p { color: #666; margin: 20px 0; }
              .info { 
                background: #e3f2fd; 
                padding: 15px; 
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>PayU Callback Handler</h1>
              <p>This endpoint is designed to receive requests from PayU after payment processing.</p>
              <div class="info">
                <strong>Note:</strong> Direct access via browser is not supported. 
                This URL should only be called by PayU's payment system.
              </div>
            </div>
          </body>
          </html>
        `;
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        });
      }
    }
    // Handle POST requests from PayU
    let data;
    if (req.method === 'POST' && !req.url.includes('txnid=')) {
      // Original POST request handling
      const formData = await req.formData();
      data = {};
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
    } else {
      // Use data from GET parameters (already extracted above)
      const url = new URL(req.url);
      const params = url.searchParams;
      data = {
        txnid: params.get('txnid') || '',
        status: params.get('status') || '',
        mihpayid: params.get('mihpayid') || '',
        amount: params.get('amount') || '',
        email: params.get('email') || '',
        firstname: params.get('firstname') || '',
        productinfo: params.get('productinfo') || '',
        hash: params.get('hash') || '',
        error: params.get('error') || '',
        error_message: params.get('error_Message') || '',
        udf1: params.get('udf1') || '',
        udf2: params.get('udf2') || '',
        key: params.get('key') || '',
      };
    }
    console.log('PayU callback data:', {
      txnid: data.txnid,
      status: data.status,
      mihpayid: data.mihpayid,
      amount: data.amount,
      email: data.email,
    });
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    // Get PayU configuration to verify hash
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();
    if (payuGatewayError || !payuGateway) {
      console.error('PayU configuration not found');
      return new Response('Configuration error', {
        status: 500,
      });
    }
    const testMode = payuGateway.test_mode;
    const config = payuGateway.config || {};
    const salt = testMode ? config.test_salt_key || config.salt_key : config.salt_key;
    if (!salt) {
      console.error('PayU salt key not found');
      return new Response('Configuration error', {
        status: 500,
      });
    }
    console.log(`PayU callback processing in ${testMode ? 'TEST' : 'PRODUCTION'} mode`);
    // Skip hash verification for GET requests or if no hash provided
    const skipHashVerification = req.method === 'GET' || !data.hash;
    if (!skipHashVerification) {
      // Verify hash to ensure request is from PayU
      const isValidHash = await verifyPayUHash(data, salt);
      if (!isValidHash) {
        console.error('Invalid PayU hash - possible security breach');
        return new Response('Invalid request', {
          status: 403,
        });
      }
      console.log('PayU hash verified successfully');
    } else {
      console.log('Skipping hash verification for GET request or missing hash');
    }
    // Store payment record in database
    const paymentRecord = {
      transaction_id: data.txnid,
      gateway: 'payu',
      status: data.status,
      amount: parseFloat(data.amount),
      currency: 'INR',
      customer_email: data.email,
      customer_name: data.firstname,
      customer_phone: data.phone,
      gateway_response: data,
      error_message: data.error_message || data.error || null,
    };
    // Insert or update payment record
    const { error: paymentError } = await supabaseAdmin.from('payments').upsert(paymentRecord, {
      onConflict: 'transaction_id',
    });
    if (paymentError) {
      console.error('Error saving payment record:', paymentError);
    }
    // Update quote status if payment was successful
    if (data.status === 'success') {
      // Extract quote IDs from productinfo (format: "Order: Product Name (quote1,quote2)")
      const productInfo = data.productinfo || '';
      const quoteIdsMatch = productInfo.match(/\(([^)]+)\)$/);
      const quoteIds = quoteIdsMatch ? quoteIdsMatch[1].split(',') : [];
      console.log('Updating quote status for IDs:', quoteIds);
      if (quoteIds.length > 0) {
        const { error: quoteError } = await supabaseAdmin
          .from('quotes_v2')
          .update({
            status: 'paid',
            payment_status: 'paid',
            payment_gateway: 'payu',
            payment_transaction_id: data.txnid,
          })
          .in('id', quoteIds);
        if (quoteError) {
          console.error('Error updating quote status:', quoteError);
        } else {
          console.log('Quote status updated successfully');
        }
      }
    }
    // Determine redirect URL based on environment
    // Use the origin URL stored in udf2 during payment creation
    let baseUrl = 'https://whyteclub.com'; // default production URL
    // Check if origin URL was stored in udf2
    if (data.udf2 && (data.udf2.startsWith('http://') || data.udf2.startsWith('https://'))) {
      baseUrl = data.udf2;
      console.log('Using origin URL from payment data:', baseUrl);
    } else {
      // Fallback: Check headers for localhost
      const origin = req.headers.get('origin');
      const referrer = req.headers.get('referer');
      if (origin?.includes('localhost') || referrer?.includes('localhost')) {
        baseUrl = 'http://localhost:8080';
        console.log('Detected localhost from headers, redirecting to:', baseUrl);
      }
    }
    // Create redirect URL based on payment status
    let redirectUrl;
    if (data.status === 'success') {
      redirectUrl = `${baseUrl}/payment-success?gateway=payu&txnid=${data.txnid}`;
    } else {
      redirectUrl = `${baseUrl}/payment-failure?gateway=payu&txnid=${data.txnid}&reason=${encodeURIComponent(data.error_message || data.error || 'Payment failed')}`;
    }
    // If guest session token exists, append it
    if (data.udf1) {
      redirectUrl += `&guest_token=${data.udf1}`;
    }
    console.log('Redirecting to:', redirectUrl);
    // Return HTML form that auto-submits to redirect
    // This is the proper way to handle PayU's POST-redirect flow
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Processing</title>
        <meta charset="utf-8">
      </head>
      <body>
        <form id="payuRedirect" method="GET" action="${redirectUrl}">
          <input type="hidden" name="status" value="${data.status}" />
          <input type="hidden" name="txnid" value="${data.txnid}" />
          <input type="hidden" name="amount" value="${data.amount}" />
          <input type="hidden" name="mihpayid" value="${data.mihpayid}" />
        </form>
        <script>
          document.getElementById('payuRedirect').submit();
        </script>
      </body>
      </html>
    `;
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('PayU callback error:', error);
    return new Response('Internal server error', {
      status: 500,
    });
  }
});
