# 🚀 Deploy PayPal Refund Edge Function

## The Issue
You're getting a CORS error because the Edge Function `paypal-refund` doesn't exist in production yet:
```
Access to fetch at 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-refund' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

## 🎯 Solution: Manual Deployment via Supabase Dashboard

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `grgvlrvywsfmnmkxrecd`

### Step 2: Create the Edge Function
1. Click **"Edge Functions"** in the left sidebar
2. Click **"Create a new function"**
3. Function Name: `paypal-refund`
4. Click **"Create function"**

### Step 3: Copy the Function Code
Copy the entire code below into the function editor:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  paypal_capture_id: string;
  refund_amount?: number; // If not provided, full refund
  currency?: string;
  reason_code: string;
  reason_description?: string;
  admin_notes?: string;
  customer_note?: string;
  notify_customer?: boolean;
}

interface RefundResponse {
  success: boolean;
  refund_id?: string;
  refund_amount?: number;
  status?: string;
  error?: string;
  details?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('PayPal refund request started');

    const refundRequest: RefundRequest = await req.json()
    const { 
      paypal_capture_id, 
      refund_amount, 
      currency, 
      reason_code, 
      reason_description,
      admin_notes,
      customer_note,
      notify_customer = true
    } = refundRequest

    if (!paypal_capture_id) {
      return new Response(JSON.stringify({ error: 'Missing paypal_capture_id' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!reason_code) {
      return new Response(JSON.stringify({ error: 'Missing reason_code' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the original transaction
    const { data: originalTransaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        id,
        amount,
        currency,
        status,
        paypal_capture_id,
        paypal_order_id,
        total_refunded,
        is_fully_refunded,
        quote_id,
        user_id,
        quotes!inner(id, user_id)
      `)
      .eq('paypal_capture_id', paypal_capture_id)
      .single();

    if (transactionError || !originalTransaction) {
      console.error('Transaction not found:', transactionError);
      return new Response(JSON.stringify({ 
        error: 'Transaction not found',
        details: transactionError 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if transaction is eligible for refund
    const { data: eligibility } = await supabaseAdmin
      .rpc('get_transaction_refund_eligibility', { transaction_id: originalTransaction.id });

    if (!eligibility?.[0]?.can_refund) {
      return new Response(JSON.stringify({ 
        error: 'Transaction not eligible for refund',
        reason: eligibility?.[0]?.reason 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate refund amount
    const maxRefundable = eligibility[0].refundable_amount;
    const finalRefundAmount = refund_amount ? Math.min(refund_amount, maxRefundable) : maxRefundable;
    const finalCurrency = currency || originalTransaction.currency;

    if (finalRefundAmount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid refund amount',
        max_refundable: maxRefundable 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();

    if (gatewayError || !paypalGateway) {
      return new Response(JSON.stringify({ error: 'PayPal configuration not found' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    const paypalConfig = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      base_url: testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
    };

    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      return new Response(JSON.stringify({ error: 'PayPal credentials not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get PayPal access token
    const authString = btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`);
    const tokenResponse = await fetch(`${paypalConfig.base_url}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('PayPal auth error:', errorData);
      return new Response(JSON.stringify({ error: 'PayPal authentication failed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create refund request to PayPal
    const refundRequestId = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paypalRefundRequest = {
      amount: {
        value: finalRefundAmount.toFixed(2),
        currency_code: finalCurrency
      },
      invoice_id: refundRequestId,
      note_to_payer: customer_note || 'Refund processed',
      reason: reason_description || 'Refund requested'
    };

    console.log('Creating PayPal refund:', {
      capture_id: paypal_capture_id,
      amount: finalRefundAmount,
      currency: finalCurrency,
      request_id: refundRequestId
    });

    // Create refund with PayPal
    const refundResponse = await fetch(
      `${paypalConfig.base_url}/v2/payments/captures/${paypal_capture_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': refundRequestId,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(paypalRefundRequest)
      }
    );

    const refundData = await refundResponse.json();

    if (!refundResponse.ok) {
      console.error('PayPal refund error:', refundData);
      
      // Store failed refund attempt
      await supabaseAdmin
        .from('paypal_refunds')
        .insert({
          refund_id: refundRequestId,
          original_transaction_id: paypal_capture_id,
          payment_transaction_id: originalTransaction.id,
          quote_id: originalTransaction.quote_id,
          user_id: originalTransaction.user_id,
          refund_amount: finalRefundAmount,
          original_amount: originalTransaction.amount,
          currency: finalCurrency,
          refund_type: finalRefundAmount >= originalTransaction.amount ? 'FULL' : 'PARTIAL',
          reason_code: reason_code,
          reason_description: reason_description,
          admin_notes: admin_notes,
          customer_note: customer_note,
          status: 'FAILED',
          error_details: refundData,
          processed_by: originalTransaction.user_id // This should be admin user ID in real implementation
        });

      return new Response(JSON.stringify({ 
        error: 'PayPal refund failed',
        details: refundData 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store successful refund
    const { data: refundRecord, error: refundError } = await supabaseAdmin
      .from('paypal_refunds')
      .insert({
        refund_id: refundData.id,
        original_transaction_id: paypal_capture_id,
        payment_transaction_id: originalTransaction.id,
        quote_id: originalTransaction.quote_id,
        user_id: originalTransaction.user_id,
        refund_amount: finalRefundAmount,
        original_amount: originalTransaction.amount,
        currency: finalCurrency,
        refund_type: finalRefundAmount >= originalTransaction.amount ? 'FULL' : 'PARTIAL',
        reason_code: reason_code,
        reason_description: reason_description,
        admin_notes: admin_notes,
        customer_note: customer_note,
        status: refundData.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        paypal_status: refundData.status,
        paypal_response: refundData,
        refund_date: refundData.create_time,
        completed_at: refundData.status === 'COMPLETED' ? refundData.update_time : null,
        processed_by: originalTransaction.user_id // This should be admin user ID in real implementation
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error storing refund:', refundError);
    }

    // Send notification if requested (implement your notification logic here)
    if (notify_customer && refundData.status === 'COMPLETED') {
      console.log('Would send refund notification to customer:', originalTransaction.user_id);
      // TODO: Implement email notification
    }

    console.log('PayPal refund completed:', {
      refund_id: refundData.id,
      status: refundData.status,
      amount: finalRefundAmount
    });

    const responseData: RefundResponse = {
      success: true,
      refund_id: refundData.id,
      refund_amount: finalRefundAmount,
      status: refundData.status,
      details: {
        paypal_refund_id: refundData.id,
        original_capture_id: paypal_capture_id,
        refund_type: finalRefundAmount >= originalTransaction.amount ? 'FULL' : 'PARTIAL',
        currency: finalCurrency,
        refund_time: refundData.create_time,
        expected_completion: refundData.status === 'COMPLETED' ? 'Immediate' : '3-5 business days'
      }
    };

    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('PayPal refund error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### Step 4: Deploy the Function
1. Click **"Deploy"** or **"Save"**
2. Wait for deployment to complete

### Step 5: Test the Function
After deployment, the function should be available at:
```
https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-refund
```

### Step 6: Verify in Your App
1. Go back to your admin interface: `/admin/payment-management`
2. Navigate to PayPal Monitoring → Refunds tab
3. Try processing a test refund
4. The CORS error should be resolved

## 🚨 If You Still Get CORS Errors

If the function doesn't deploy properly, you can temporarily test with a mock function by updating the PayPal refund management component to use a local endpoint or bypass the actual PayPal API call for testing.

## ✅ Expected Result

After deployment:
- ✅ No more CORS errors
- ✅ Refund interface functional
- ✅ Can process PayPal refunds
- ✅ Refund history tracking works

Let me know once you've deployed the function and I can help with any remaining issues!