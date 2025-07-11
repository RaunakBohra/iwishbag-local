import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimated_completion?: string;
  gateway_status?: string;
  last_update: string;
  error_message?: string;
  transaction_id?: string;
  amount?: number;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const transactionId = url.pathname.split('/').pop();
    
    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'Missing transaction ID' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`🔍 Checking payment status for transaction: ${transactionId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check our payments table for existing payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('Error fetching payment record:', paymentError);
      return new Response(JSON.stringify({ error: 'Database error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let statusResponse: PaymentStatusResponse;

    if (paymentRecord) {
      // Payment record exists - return the status
      console.log(`✅ Payment record found with status: ${paymentRecord.status}`);
      
      statusResponse = {
        status: mapPaymentStatus(paymentRecord.status),
        progress: getProgressFromStatus(paymentRecord.status),
        gateway_status: getGatewayStatusMessage(paymentRecord.gateway, paymentRecord.status),
        last_update: paymentRecord.created_at || new Date().toISOString(),
        transaction_id: paymentRecord.transaction_id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        error_message: paymentRecord.error_message || undefined
      };
    } else {
      // No payment record found - check if we can verify with PayU directly
      console.log('🔍 No payment record found, checking PayU status...');
      
      const payuStatus = await checkPayUStatus(transactionId);
      
      if (payuStatus) {
        statusResponse = payuStatus;
      } else {
        // Payment still pending or not found
        statusResponse = {
          status: 'pending',
          progress: 10,
          gateway_status: 'Waiting for payment confirmation...',
          last_update: new Date().toISOString(),
          transaction_id: transactionId
        };
      }
    }

    // Add estimated completion time for pending/processing payments
    if (statusResponse.status === 'pending' || statusResponse.status === 'processing') {
      const estimatedMinutes = statusResponse.status === 'pending' ? 5 : 2;
      statusResponse.estimated_completion = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    }

    return new Response(JSON.stringify(statusResponse), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return new Response(JSON.stringify({ 
      error: 'Payment status check failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Helper function to check PayU payment status directly
async function checkPayUStatus(transactionId: string): Promise<PaymentStatusResponse | null> {
  try {
    // Get PayU configuration
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      console.error('PayU configuration not found');
      return null;
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    
    if (!config.merchant_key || !config.salt_key) {
      console.error('PayU credentials missing');
      return null;
    }

    // PayU Verify Payment API
    const verifyUrl = testMode 
      ? 'https://test.payu.in/merchant/postservice?form=2'
      : 'https://info.payu.in/merchant/postservice?form=2';

    // Generate hash for verification
    const verifyHash = await generatePayUVerifyHash(
      config.merchant_key,
      transactionId,
      config.salt_key
    );

    const verifyData = new URLSearchParams({
      key: config.merchant_key,
      command: 'verify_payment',
      var1: transactionId,
      hash: verifyHash
    });

    console.log(`🔍 Calling PayU verify API for transaction: ${transactionId}`);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'iwishBag-PayU-Verifier/1.0'
      },
      body: verifyData
    });

    if (!response.ok) {
      console.error('PayU verify API failed:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('PayU verify API response:', result);

    if (result.status === 1 && result.transaction_details) {
      const transaction = result.transaction_details[transactionId];
      
      if (transaction) {
        return {
          status: mapPayUStatus(transaction.status),
          progress: getProgressFromStatus(transaction.status),
          gateway_status: getGatewayStatusMessage('payu', transaction.status),
          last_update: transaction.addedon || new Date().toISOString(),
          transaction_id: transactionId,
          amount: parseFloat(transaction.amount),
          currency: 'INR'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('PayU status check error:', error);
    return null;
  }
}

// Generate hash for PayU verify payment API
async function generatePayUVerifyHash(merchantKey: string, txnid: string, salt: string): Promise<string> {
  const hashString = `${merchantKey}|verify_payment|${txnid}|${salt}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Map various payment statuses to our standard format
function mapPaymentStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'success':
    case 'completed':
    case 'paid':
      return 'completed';
    case 'failure':
    case 'failed':
    case 'cancelled':
    case 'cancel':
      return 'failed';
    case 'processing':
    case 'in_progress':
      return 'processing';
    default:
      return 'pending';
  }
}

// Map PayU specific statuses
function mapPayUStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'success':
      return 'completed';
    case 'failure':
    case 'failed':
      return 'failed';
    case 'pending':
    case 'initiated':
      return 'processing';
    default:
      return 'pending';
  }
}

// Get progress percentage based on status
function getProgressFromStatus(status: string): number {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'success':
    case 'completed':
    case 'paid':
      return 100;
    case 'failure':
    case 'failed':
    case 'cancelled':
    case 'cancel':
      return 0;
    case 'processing':
    case 'in_progress':
    case 'initiated':
      return 60;
    default:
      return 20;
  }
}

// Get user-friendly gateway status message
function getGatewayStatusMessage(gateway: string, status: string): string {
  const statusLower = status.toLowerCase();
  
  if (gateway === 'payu') {
    switch (statusLower) {
      case 'success':
        return 'Payment confirmed by PayU';
      case 'failure':
      case 'failed':
        return 'Payment failed at PayU';
      case 'processing':
      case 'initiated':
        return 'Payment being processed by PayU';
      case 'pending':
        return 'Waiting for PayU confirmation';
      default:
        return 'Payment status unknown';
    }
  }
  
  // Default messages for other gateways
  switch (statusLower) {
    case 'success':
    case 'completed':
      return 'Payment completed successfully';
    case 'failure':
    case 'failed':
      return 'Payment failed';
    case 'processing':
      return 'Processing payment';
    default:
      return 'Checking payment status';
  }
}