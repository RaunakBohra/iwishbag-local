import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`🔔 PayU Success Handler - Method: ${req.method}, URL: ${req.url}`);

  try {
    let payuData: PayUSuccessData;

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
        mode: formData.get('mode')?.toString() || '',
        bankcode: formData.get('bankcode')?.toString() || '',
        bank_ref_num: formData.get('bank_ref_num')?.toString() || '',
        error_code: formData.get('error_code')?.toString() || '',
        error_Message: formData.get('error_Message')?.toString() || '',
        gateway: 'payu'
      };

      console.log('📝 PayU Success Data:', {
        txnid: payuData.txnid,
        status: payuData.status,
        amount: payuData.amount,
        firstname: payuData.firstname,
        email: payuData.email
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
        mode: searchParams.get('mode') || '',
        bankcode: searchParams.get('bankcode') || '',
        bank_ref_num: searchParams.get('bank_ref_num') || '',
        error_code: searchParams.get('error_code') || '',
        error_Message: searchParams.get('error_Message') || '',
        gateway: searchParams.get('gateway') || 'payu'
      };

    } else {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Validate required fields
    if (!payuData.txnid || !payuData.status) {
      console.error('❌ Missing required fields:', { txnid: payuData.txnid, status: payuData.status });
      return new Response('Missing required payment data', { 
        status: 400, 
        headers: corsHeaders 
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

    // Redirect to the React frontend with payment data
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString()
      }
    });

  } catch (error) {
    console.error('❌ PayU Success Handler Error:', error);
    
    // Redirect to payment failure page on error
    const failureUrl = new URL('/payment-failure', 'https://whyteclub.com');
    failureUrl.searchParams.set('error', 'processing_failed');
    failureUrl.searchParams.set('message', 'Failed to process payment callback');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': failureUrl.toString()
      }
    });
  }
})