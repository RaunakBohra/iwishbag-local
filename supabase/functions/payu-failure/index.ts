import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createCorsHeaders } from '../_shared/cors.ts'

interface PayUFailureData {
  txnid: string;
  mihpayid: string;
  status: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  error_code: string;
  error_Message: string;
  gateway?: string;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`🔔 PayU Failure Handler - Method: ${req.method}, URL: ${req.url}`);

  try {
    let payuData: PayUFailureData;

    if (req.method === 'POST') {
      // Handle POST request from PayU (form data)
      const formData = await req.formData();
      
      payuData = {
        txnid: formData.get('txnid')?.toString() || '',
        mihpayid: formData.get('mihpayid')?.toString() || '',
        status: formData.get('status')?.toString() || '',
        amount: formData.get('amount')?.toString() || '',
        productinfo: formData.get('productinfo')?.toString() || '',
        firstname: formData.get('firstname')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        phone: formData.get('phone')?.toString() || '',
        hash: formData.get('hash')?.toString() || '',
        error_code: formData.get('error_code')?.toString() || '',
        error_Message: formData.get('error_Message')?.toString() || '',
        gateway: 'payu'
      };

      console.log('📝 PayU Failure Data:', {
        txnid: payuData.txnid,
        status: payuData.status,
        error_code: payuData.error_code,
        error_Message: payuData.error_Message
      });

    } else if (req.method === 'GET') {
      // Handle GET request (from browser navigation or direct access)
      const url = new URL(req.url);
      const searchParams = url.searchParams;

      payuData = {
        txnid: searchParams.get('txnid') || '',
        mihpayid: searchParams.get('mihpayid') || '',
        status: searchParams.get('status') || '',
        amount: searchParams.get('amount') || '',
        productinfo: searchParams.get('productinfo') || '',
        firstname: searchParams.get('firstname') || '',
        email: searchParams.get('email') || '',
        phone: searchParams.get('phone') || '',
        hash: searchParams.get('hash') || '',
        error_code: searchParams.get('error_code') || '',
        error_Message: searchParams.get('error_Message') || '',
        gateway: searchParams.get('gateway') || 'payu'
      };

    } else {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Build redirect URL with all payment data
    const redirectUrl = new URL('/payment-failure', 'https://whyteclub.com');
    
    // Add all PayU parameters to the redirect URL
    Object.entries(payuData).forEach(([key, value]) => {
      if (value) {
        redirectUrl.searchParams.set(key, value);
      }
    });

    console.log('🔄 Redirecting to failure page:', redirectUrl.toString());

    // Use HTML redirect for better compatibility with PayU
    const htmlRedirect = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Failed - Redirecting...</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl.toString()}">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Payment Failed</h2>
            <p>Redirecting you to the payment page...</p>
            <p>If you are not redirected automatically, <a href="${redirectUrl.toString()}">click here</a>.</p>
          </div>
          <script>
            window.location.href = "${redirectUrl.toString()}";
          </script>
        </body>
      </html>
    `;

    return new Response(htmlRedirect, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('❌ PayU Failure Handler Error:', error);
    
    // Return HTML error page with redirect
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Processing Error</title>
          <meta http-equiv="refresh" content="3;url=https://whyteclub.com/payment-failure?error=handler_error">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Processing Error</h2>
            <p>There was an issue processing your payment callback.</p>
            <p>Redirecting to payment page...</p>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = "https://whyteclub.com/payment-failure?error=handler_error&message=${encodeURIComponent(error.message)}";
            }, 3000);
          </script>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 200, // Return 200 to avoid PayU retries
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });
  }
})