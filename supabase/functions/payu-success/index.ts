import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

interface PayUSuccessData {
  txnid: string;
  mihpayid: string;
  status: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  mode: string;
  bankcode: string;
  bank_ref_num: string;
  error_code: string;
  error_Message: string;
  gateway?: string;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`🔔 PayU Success Handler - Method: ${req.method}, URL: ${req.url}`);
  console.log('🔔 Request Headers:', Object.fromEntries(req.headers.entries()));

  try {
    let payuData: PayUSuccessData;

    if (req.method === 'POST') {
      // Handle POST request from PayU (form data)
      console.log('📝 Processing POST request from PayU');

      const contentType = req.headers.get('content-type');
      console.log('📝 Content-Type:', contentType);

      let formData: FormData;

      try {
        if (contentType?.includes('application/x-www-form-urlencoded')) {
          // Handle URL-encoded form data
          const body = await req.text();
          console.log('📝 Raw body:', body);

          formData = new FormData();
          const params = new URLSearchParams(body);
          for (const [key, value] of params) {
            formData.append(key, value);
          }
        } else {
          // Handle regular form data
          formData = await req.formData();
        }
      } catch (parseError) {
        console.error('❌ Error parsing form data:', parseError);
        // Return a basic HTML response for debugging
        return new Response(
          `
          <html>
            <body>
              <h1>PayU Callback Received</h1>
              <p>Error parsing form data: ${parseError.message}</p>
              <p>Content-Type: ${contentType}</p>
              <script>
                // Auto-redirect to success page after 3 seconds
                setTimeout(() => {
                  window.location.href = 'https://whyteclub.com/payment-success?status=error&message=parse_error';
                }, 3000);
              </script>
            </body>
          </html>
        `,
          {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          },
        );
      }

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
        mode: formData.get('mode')?.toString() || '',
        bankcode: formData.get('bankcode')?.toString() || '',
        bank_ref_num: formData.get('bank_ref_num')?.toString() || '',
        error_code: formData.get('error_code')?.toString() || '',
        error_Message: formData.get('error_Message')?.toString() || '',
        gateway: 'payu',
      };

      console.log('📝 PayU Success Data:', {
        txnid: payuData.txnid,
        status: payuData.status,
        amount: payuData.amount,
        firstname: payuData.firstname,
        email: payuData.email?.substring(0, 3) + '***',
      });
    } else if (req.method === 'GET') {
      // Handle GET request (from browser navigation or direct access)
      console.log('📝 Processing GET request');
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
        mode: searchParams.get('mode') || '',
        bankcode: searchParams.get('bankcode') || '',
        bank_ref_num: searchParams.get('bank_ref_num') || '',
        error_code: searchParams.get('error_code') || '',
        error_Message: searchParams.get('error_Message') || '',
        gateway: searchParams.get('gateway') || 'payu',
      };
    } else {
      console.log('❌ Method not allowed:', req.method);
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Build redirect URL with all payment data
    const redirectUrl = new URL('/payment-success', 'https://whyteclub.com');

    // Add all PayU parameters to the redirect URL
    Object.entries(payuData).forEach(([key, value]) => {
      if (value) {
        redirectUrl.searchParams.set(key, value);
      }
    });

    console.log('🔄 Redirecting to:', redirectUrl.toString());

    // Use HTML redirect for better compatibility with PayU
    const htmlRedirect = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Successful - Redirecting...</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl.toString()}">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Payment Successful!</h2>
            <p>Redirecting you to the success page...</p>
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
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('❌ PayU Success Handler Error:', error);

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
        ...corsHeaders,
      },
    });
  }
});
