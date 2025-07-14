import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "node:crypto"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: {
    id?: string;
    status?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    custom_id?: string;
    invoice_id?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
      };
    }>;
    payer?: {
      name?: {
        given_name?: string;
        surname?: string;
      };
      email_address?: string;
      payer_id?: string;
    };
  };
  create_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

serve(async (req) => {
  console.log("🔵 === PAYPAL WEBHOOK HANDLER STARTED ===");
  console.log("🔵 Request method:", req.method);
  console.log("🔵 Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook payload
    const webhookData: PayPalWebhookEvent = await req.json();
    console.log("🔵 Webhook event received:", webhookData.event_type);
    console.log("🔵 Resource type:", webhookData.resource_type);

    // Extract key information
    const eventType = webhookData.event_type;
    const resource = webhookData.resource;
    
    // We're primarily interested in order and payment capture events
    const relevantEvents = [
      'CHECKOUT.ORDER.APPROVED',
      'CHECKOUT.ORDER.COMPLETED',
      'PAYMENT.CAPTURE.COMPLETED',
      'PAYMENT.CAPTURE.DENIED',
      'PAYMENT.CAPTURE.REFUNDED'
    ];

    if (!relevantEvents.includes(eventType)) {
      console.log("⚠️ Ignoring non-relevant event:", eventType);
      return new Response(JSON.stringify({ 
        message: 'Event ignored' 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the link code from custom_id
    const linkCode = resource.custom_id;
    const orderId = resource.id;
    
    if (!linkCode && !orderId) {
      console.error("❌ No link code or order ID in webhook");
      return new Response(JSON.stringify({ 
        error: 'Missing link code or order ID' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the payment link
    let paymentLink = null;
    if (linkCode) {
      const { data, error } = await supabaseAdmin
        .from('payment_links')
        .select('*')
        .eq('link_code', linkCode)
        .eq('gateway', 'paypal')
        .single();
      
      if (!error && data) {
        paymentLink = data;
      }
    }
    
    // If not found by link code, try by gateway_link_id (order ID)
    if (!paymentLink && orderId) {
      const { data, error } = await supabaseAdmin
        .from('payment_links')
        .select('*')
        .eq('gateway_link_id', orderId)
        .eq('gateway', 'paypal')
        .single();
      
      if (!error && data) {
        paymentLink = data;
      }
    }

    if (!paymentLink) {
      console.error("❌ Payment link not found for:", linkCode || orderId);
      return new Response(JSON.stringify({ 
        error: 'Payment link not found' 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ Found payment link:", paymentLink.id);

    // Handle different event types
    let processed: any = { payment_link: null, payment_transaction: null, quote: null };

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Customer approved the payment, but it's not captured yet
        console.log("💳 Order approved by customer");
        
        const { data: updatedLink } = await supabaseAdmin
          .from('payment_links')
          .update({
            status: 'active',
            gateway_response: webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentLink.id)
          .select()
          .single();
        
        processed.payment_link = updatedLink;
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.COMPLETED':
        // Payment successfully captured
        console.log("✅ Payment captured successfully");
        
        // Extract capture details
        const capture = resource.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = capture?.id || resource.id;
        const captureStatus = capture?.status || resource.status;
        const amount = parseFloat(capture?.amount?.value || resource.amount?.value || paymentLink.amount);
        const currency = capture?.amount?.currency_code || resource.amount?.currency_code || paymentLink.currency;
        
        // Update payment link status
        const { data: completedLink } = await supabaseAdmin
          .from('payment_links')
          .update({
            status: 'completed',
            gateway_response: webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentLink.id)
          .select()
          .single();
        
        processed.payment_link = completedLink;

        // Create payment transaction (following PayU pattern)
        const transactionId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use the create_payment_with_ledger_entry function for proper ledger integration
        const { data: paymentResult, error: paymentError } = await supabaseAdmin
          .rpc('create_payment_with_ledger_entry', {
            p_user_id: paymentLink.user_id,
            p_quote_id: paymentLink.quote_id,
            p_amount: amount,
            p_currency: currency,
            p_payment_method: 'paypal',
            p_transaction_id: transactionId,
            p_gateway_transaction_id: captureId,
            p_gateway_response: webhookData,
            p_metadata: {
              link_code: linkCode,
              order_id: orderId,
              capture_id: captureId,
              payer_id: resource.payer?.payer_id,
              payer_email: resource.payer?.email_address,
              environment: paymentLink.metadata?.environment || 'unknown'
            }
          });

        if (paymentError) {
          console.error("❌ Error creating payment with ledger:", paymentError);
          // Fallback to direct insert if RPC fails
          const { data: transaction } = await supabaseAdmin
            .from('payment_transactions')
            .insert({
              user_id: paymentLink.user_id,
              quote_id: paymentLink.quote_id,
              amount: amount,
              currency: currency,
              status: 'completed',
              payment_method: 'paypal',
              transaction_id: transactionId,
              gateway_response: webhookData,
              paypal_order_id: orderId,
              paypal_capture_id: captureId,
              paypal_payer_id: resource.payer?.payer_id,
              paypal_payer_email: resource.payer?.email_address
            })
            .select()
            .single();
          
          processed.payment_transaction = transaction;
        } else {
          processed.payment_transaction = paymentResult;
        }

        // Update quote status if payment successful
        if (paymentLink.quote_id && processed.payment_transaction) {
          const { data: quote } = await supabaseAdmin
            .from('quotes')
            .update({
              status: 'paid',
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentLink.quote_id)
            .select()
            .single();
          
          processed.quote = quote;
          console.log("✅ Quote marked as paid");
        }
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        // Payment capture was denied
        console.log("❌ Payment capture denied");
        
        const { data: deniedLink } = await supabaseAdmin
          .from('payment_links')
          .update({
            status: 'cancelled',
            gateway_response: webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentLink.id)
          .select()
          .single();
        
        processed.payment_link = deniedLink;
        
        // Create failed transaction record
        const failedTxnId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { data: failedTransaction } = await supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: paymentLink.user_id,
            quote_id: paymentLink.quote_id,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            status: 'failed',
            payment_method: 'paypal',
            transaction_id: failedTxnId,
            gateway_response: webhookData,
            error_message: webhookData.summary || 'Payment capture denied',
            paypal_order_id: orderId
          })
          .select()
          .single();
        
        processed.payment_transaction = failedTransaction;
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        // Handle refund webhook
        console.log("💸 Payment refunded");
        
        // This should be handled by a separate refund flow
        // For now, just log it
        console.log("Refund webhook received, should be handled by refund system");
        break;
    }

    console.log("✅ Webhook processed successfully:", {
      event: eventType,
      processed: Object.keys(processed).filter(k => processed[k] !== null)
    });

    return new Response(JSON.stringify({
      success: true,
      event_type: eventType,
      processed: processed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});