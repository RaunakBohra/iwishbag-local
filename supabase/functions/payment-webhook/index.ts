import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayUWebhookData {
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
  cardMask: string;
  name_on_card: string;
  card_no: string;
  is_seamless: string;
  surl: string;
  furl: string;
  merchant_key: string;
  merchant_salt: string;
  merchant_txnid: string;
  merchant_hash: string;
  merchant_udf1: string;
  merchant_udf2: string;
  merchant_udf3: string;
  merchant_udf4: string;
  merchant_udf5: string;
  merchant_udf6: string;
  merchant_udf7: string;
  merchant_udf8: string;
  merchant_udf9: string;
  merchant_udf10: string;
  merchant_udf11: string;
  merchant_udf12: string;
  merchant_udf13: string;
  merchant_udf14: string;
  merchant_udf15: string;
  merchant_udf16: string;
  merchant_udf17: string;
  merchant_udf18: string;
  merchant_udf19: string;
  merchant_udf20: string;
  merchant_udf21: string;
  merchant_udf22: string;
  merchant_udf23: string;
  merchant_udf24: string;
  merchant_udf25: string;
  merchant_udf26: string;
  merchant_udf27: string;
  merchant_udf28: string;
  merchant_udf29: string;
  merchant_udf30: string;
  merchant_udf31: string;
  merchant_udf32: string;
  merchant_udf33: string;
  merchant_udf34: string;
  merchant_udf35: string;
  merchant_udf36: string;
  merchant_udf37: string;
  merchant_udf38: string;
  merchant_udf39: string;
  merchant_udf40: string;
  merchant_udf41: string;
  merchant_udf42: string;
  merchant_udf43: string;
  merchant_udf44: string;
  merchant_udf45: string;
  merchant_udf46: string;
  merchant_udf47: string;
  merchant_udf48: string;
  merchant_udf49: string;
  merchant_udf50: string;
  merchant_udf51: string;
  merchant_udf52: string;
  merchant_udf53: string;
  merchant_udf54: string;
  merchant_udf55: string;
  merchant_udf56: string;
  merchant_udf57: string;
  merchant_udf58: string;
  merchant_udf59: string;
  merchant_udf60: string;
  merchant_udf61: string;
  merchant_udf62: string;
  merchant_udf63: string;
  merchant_udf64: string;
  merchant_udf65: string;
  merchant_udf66: string;
  merchant_udf67: string;
  merchant_udf68: string;
  merchant_udf69: string;
  merchant_udf70: string;
  merchant_udf71: string;
  merchant_udf72: string;
  merchant_udf73: string;
  merchant_udf74: string;
  merchant_udf75: string;
  merchant_udf76: string;
  merchant_udf77: string;
  merchant_udf78: string;
  merchant_udf79: string;
  merchant_udf80: string;
  merchant_udf81: string;
  merchant_udf82: string;
  merchant_udf83: string;
  merchant_udf84: string;
  merchant_udf85: string;
  merchant_udf86: string;
  merchant_udf87: string;
  merchant_udf88: string;
  merchant_udf89: string;
  merchant_udf90: string;
  merchant_udf91: string;
  merchant_udf92: string;
  merchant_udf93: string;
  merchant_udf94: string;
  merchant_udf95: string;
  merchant_udf96: string;
  merchant_udf97: string;
  merchant_udf98: string;
  merchant_udf99: string;
  merchant_udf100: string;
}

// Verify PayU webhook hash
async function verifyPayUHash(data: PayUWebhookData, salt: string): Promise<boolean> {
  try {
    // PayU webhook verification hash
    const hashString = [
      salt,
      data.txnid,
      data.status,
      data.amount,
      data.productinfo,
      data.firstname,
      data.email,
      data.udf1 || '',
      data.udf2 || '',
      data.udf3 || '',
      data.udf4 || '',
      data.udf5 || '',
      data.udf6 || '',
      data.udf7 || '',
      data.udf8 || '',
      data.udf9 || '',
      data.udf10 || ''
    ].join('|');

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return calculatedHash === data.hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 PayU Webhook Received');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook data
    const webhookData: PayUWebhookData = await req.json();
    
    console.log('PayU Webhook Data:', {
      txnid: webhookData.txnid,
      status: webhookData.status,
      amount: webhookData.amount,
      mihpayid: webhookData.mihpayid,
      email: webhookData.email,
      productinfo: webhookData.productinfo
    });

    // Verify webhook hash
    const salt = Deno.env.get('PAYU_SALT_KEY');
    if (!salt) {
      console.error('PayU salt key not configured');
      return new Response(JSON.stringify({ error: 'Configuration error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const isValidHash = await verifyPayUHash(webhookData, salt);
    if (!isValidHash) {
      console.error('Invalid webhook hash');
      return new Response(JSON.stringify({ error: 'Invalid hash' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('✅ Webhook hash verified');

    // Extract quote IDs from productinfo
    const productInfo = webhookData.productinfo || '';
    const quoteIdsMatch = productInfo.match(/\(([^)]+)\)/);
    const quoteIds = quoteIdsMatch ? quoteIdsMatch[1].split(',') : [];

    console.log('Quote IDs extracted:', quoteIds);

    // Determine payment status
    let paymentStatus: 'success' | 'failed' | 'pending';
    let orderStatus: 'paid' | 'failed' | 'pending';
    
    switch (webhookData.status.toLowerCase()) {
      case 'success':
        paymentStatus = 'success';
        orderStatus = 'paid';
        break;
      case 'failure':
      case 'failed':
        paymentStatus = 'failed';
        orderStatus = 'failed';
        break;
      default:
        paymentStatus = 'pending';
        orderStatus = 'pending';
    }

    // Update quotes status
    if (quoteIds.length > 0) {
      const { error: quotesError } = await supabaseAdmin
        .from('quotes')
        .update({
          status: orderStatus,
          payment_method: 'payu',
          payment_transaction_id: webhookData.mihpayid || webhookData.txnid,
          paid_at: orderStatus === 'paid' ? new Date().toISOString() : null,
          payment_details: {
            gateway: 'payu',
            transaction_id: webhookData.mihpayid || webhookData.txnid,
            status: webhookData.status,
            amount: webhookData.amount,
            currency: 'INR',
            payment_mode: webhookData.mode,
            bank_code: webhookData.bankcode,
            bank_ref_num: webhookData.bank_ref_num,
            card_mask: webhookData.cardMask,
            name_on_card: webhookData.name_on_card,
            error_code: webhookData.error_code,
            error_message: webhookData.error_Message,
            webhook_received_at: new Date().toISOString()
          }
        })
        .in('id', quoteIds);

      if (quotesError) {
        console.error('Error updating quotes:', quotesError);
        return new Response(JSON.stringify({ error: 'Failed to update quotes' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.log(`✅ Updated ${quoteIds.length} quotes to status: ${orderStatus}`);
    }

    // Create payment record
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        transaction_id: webhookData.mihpayid || webhookData.txnid,
        gateway: 'payu',
        status: paymentStatus,
        amount: parseFloat(webhookData.amount),
        currency: 'INR',
        quote_ids: quoteIds,
        customer_email: webhookData.email,
        customer_name: webhookData.firstname,
        customer_phone: webhookData.phone,
        payment_mode: webhookData.mode,
        bank_code: webhookData.bankcode,
        bank_ref_num: webhookData.bank_ref_num,
        card_mask: webhookData.cardMask,
        name_on_card: webhookData.name_on_card,
        error_code: webhookData.error_code,
        error_message: webhookData.error_Message,
        gateway_response: webhookData,
        created_at: new Date().toISOString()
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Don't fail the webhook if payment record creation fails
    } else {
      console.log('✅ Payment record created');
    }

    // If payment is successful, create order
    if (orderStatus === 'paid' && quoteIds.length > 0) {
      try {
        // Get the first quote to create order
        const { data: quoteData, error: quoteError } = await supabaseAdmin
          .from('quotes')
          .select('*')
          .eq('id', quoteIds[0])
          .single();

        if (!quoteError && quoteData) {
          const { error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
              order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              user_id: quoteData.user_id,
              quote_ids: quoteIds,
              total_amount: parseFloat(webhookData.amount),
              currency: 'INR',
              status: 'confirmed',
              payment_method: 'payu',
              payment_transaction_id: webhookData.mihpayid || webhookData.txnid,
              customer_email: webhookData.email,
              customer_name: webhookData.firstname,
              customer_phone: webhookData.phone,
              created_at: new Date().toISOString()
            });

          if (orderError) {
            console.error('Error creating order:', orderError);
          } else {
            console.log('✅ Order created successfully');
          }
        }
      } catch (error) {
        console.error('Error in order creation:', error);
      }
    }

    // Send success response
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Payment ${paymentStatus}`,
      quoteIds,
      transactionId: webhookData.mihpayid || webhookData.txnid
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('PayU webhook error:', error);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}) 