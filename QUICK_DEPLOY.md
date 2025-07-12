# 🚀 ONE-CLICK PayPal Refund Function Deployment

## ⚡ **Super Quick Method (2 minutes)**

### **Step 1: Open Supabase Dashboard**
**Click this link:** https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/functions

### **Step 2: Create Function**
1. Click **"Create a new function"**
2. Name: `paypal-refund`
3. Click **"Create function"**

### **Step 3: Replace Code**
1. **Select all existing code** (Ctrl+A / Cmd+A)
2. **Delete it**
3. **Copy and paste this code:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  paypal_capture_id: string;
  refund_amount?: number;
  currency?: string;
  reason_code: string;
  reason_description?: string;
  admin_notes?: string;
  customer_note?: string;
  notify_customer?: boolean;
}

serve(async (req) => {
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
          processed_by: originalTransaction.user_id
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
        processed_by: originalTransaction.user_id
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error storing refund:', refundError);
    }

    console.log('PayPal refund completed:', {
      refund_id: refundData.id,
      status: refundData.status,
      amount: finalRefundAmount
    });

    return new Response(JSON.stringify({
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
    }), { 
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

### **Step 4: Deploy**
Click **"Deploy"** button (should take 30-60 seconds)

### **Step 5: Come Back Here**
Once deployed, let me know and I'll switch your app from mock to real function automatically!

---

## 🎯 **That's It!**
- **Time needed**: 2 minutes
- **Difficulty**: Copy & paste
- **Result**: Real PayPal refund processing

**Ready to deploy? The link above takes you directly to the right page!** 🚀