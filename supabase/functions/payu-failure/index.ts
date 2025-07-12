import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Redirect to the React frontend with payment failure data
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString()
      }
    });

  } catch (error) {
    console.error('❌ PayU Failure Handler Error:', error);
    
    // Fallback redirect to payment failure page
    const failureUrl = new URL('/payment-failure', 'https://whyteclub.com');
    failureUrl.searchParams.set('error', 'handler_failed');
    failureUrl.searchParams.set('message', 'Failed to process payment failure callback');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': failureUrl.toString()
      }
    });
  }
})