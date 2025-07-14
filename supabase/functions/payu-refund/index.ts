import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface PayURefundRequest {
  paymentId: string; // PayU transaction ID (mihpayid)
  amount: number;
  refundType: 'full' | 'partial';
  reason?: string;
  notes?: string;
  quoteId?: string;
  notifyCustomer?: boolean;
}

interface PayURefundResponse {
  status: number;
  msg: string;
  request_id?: string;
  bank_ref_num?: string;
  mihpayid?: string;
  refund_amount?: number;
  error_code?: string;
}

serve(async (req) => {
  console.log("=5 === PAYU REFUND FUNCTION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json();
    const {
      paymentId,
      amount,
      refundType,
      reason = 'Customer request',
      notes = '',
      quoteId,
      notifyCustomer = true
    }: PayURefundRequest = body;

    console.log("=5 Refund request:", { 
      paymentId, 
      amount, 
      refundType,
      quoteId 
    });

    // Validate input
    if (!paymentId || !amount || amount <= 0) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: paymentId and amount (must be positive)' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PayU configuration
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      console.error("L PayU gateway config missing:", payuGatewayError);
      return new Response(JSON.stringify({ 
        error: 'PayU gateway configuration not found' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    const payuConfig = {
      merchant_key: config.merchant_key,
      salt_key: config.salt_key,
      api_url: testMode ? 'https://test.payu.in' : 'https://info.payu.in'
    };

    console.log("=5 PayU config:", { 
      testMode, 
      merchant_key: payuConfig.merchant_key,
      api_url: payuConfig.api_url 
    });

    // Get transaction details from database (optional - for validation)
    let originalTransaction = null;
    if (quoteId) {
      const { data: txData } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('payment_method', 'payu')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      originalTransaction = txData;
      console.log("=5 Found original transaction:", originalTransaction?.id);
    }

    // Generate unique refund request ID
    const refundRequestId = `REF${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create refund data for PayU API
    const refundData = {
      payu_id: paymentId,
      amount: amount.toFixed(2),
      refund_request_id: refundRequestId,
      refund_type: refundType
    };

    // Generate hash for cancel_refund_transaction command
    const command = 'cancel_refund_transaction';
    const var1 = paymentId; // PayU transaction ID (mihpayid)
    const var2 = refundRequestId; // Unique token for this refund
    const var3 = amount.toFixed(2); // Refund amount
    
    // Hash formula for General APIs: sha512(key|command|var1|var2|var3|var4|var5|var6|var7|var8|salt)
    // For cancel_refund_transaction: all vars after var3 are empty
    const hashString = `${payuConfig.merchant_key}|${command}|${var1}|${var2}|${var3}|||||${payuConfig.salt_key}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log("=5 Making PayU refund API request:", {
      url: `${payuConfig.api_url}/merchant/postservice.php?form=2`,
      merchant_key: payuConfig.merchant_key,
      command: command,
      var1: var1,
      var2: var2,
      var3: var3
    });

    // Make API request to PayU
    const payuResponse = await fetch(`${payuConfig.api_url}/merchant/postservice.php?form=2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        key: payuConfig.merchant_key,
        command: command,
        hash: hash,
        var1: var1, // mihpayid
        var2: var2, // refund request ID
        var3: var3  // refund amount
      })
    });

    console.log("=5 PayU API response status:", payuResponse.status);

    if (!payuResponse.ok) {
      const errorText = await payuResponse.text();
      console.error("L PayU API request failed:", errorText);
      throw new Error(`PayU API request failed: ${payuResponse.status} - ${errorText}`);
    }

    const payuResult = await payuResponse.json() as PayURefundResponse;
    console.log("=5 PayU API response:", JSON.stringify(payuResult, null, 2));
    
    // PayU returns status: 1 for success
    // Important: error_code value 102 should be treated as success
    if (payuResult.status !== 1 && payuResult.error_code !== '102') {
      console.error("L PayU refund error:", payuResult);
      
      // Store failed refund attempt
      await supabaseAdmin
        .from('gateway_refunds')
        .insert({
          gateway_refund_id: refundRequestId,
          gateway_transaction_id: paymentId,
          gateway_code: 'payu',
          quote_id: quoteId,
          refund_amount: amount,
          original_amount: originalTransaction?.amount || amount,
          currency: originalTransaction?.currency || 'INR',
          refund_type: refundType,
          reason_code: 'CUSTOMER_REQUEST',
          reason_description: reason,
          admin_notes: notes,
          status: 'failed',
          gateway_status: payuResult.msg || 'Failed',
          gateway_response: payuResult,
          refund_date: new Date().toISOString(),
          processed_by: (await supabaseAdmin.auth.getUser()).data.user?.id
        });

      return new Response(JSON.stringify({
        success: false,
        error: payuResult.msg || 'Refund failed',
        error_code: payuResult.error_code,
        details: payuResult
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(" PayU refund initiated successfully");

    // Store successful refund record
    const { data: refundRecord, error: refundError } = await supabaseAdmin
      .from('gateway_refunds')
      .insert({
        gateway_refund_id: payuResult.request_id || refundRequestId,
        gateway_transaction_id: paymentId,
        gateway_code: 'payu',
        payment_transaction_id: originalTransaction?.id,
        quote_id: quoteId,
        refund_amount: amount,
        original_amount: originalTransaction?.amount || amount,
        currency: originalTransaction?.currency || 'INR',
        refund_type: refundType,
        reason_code: 'CUSTOMER_REQUEST',
        reason_description: reason,
        admin_notes: notes,
        customer_note: notifyCustomer ? `Refund of INR ${amount} has been initiated for your order.` : null,
        status: 'processing',
        gateway_status: payuResult.msg || 'PENDING', // Usually "Refund Request Queued"
        gateway_response: payuResult,
        refund_date: new Date().toISOString(),
        processed_by: (await supabaseAdmin.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (refundError) {
      console.error("L Error storing refund record:", refundError);
    }

    // Create payment ledger entry for the refund
    if (quoteId) {
      // Get user ID once
      const userId = (await supabaseAdmin.auth.getUser()).data.user?.id;
      
      const { error: ledgerError } = await supabaseAdmin
        .from('payment_ledger')
        .insert({
          quote_id: quoteId,
          payment_type: 'refund',
          payment_method: 'payu',
          amount: -amount, // Negative for refunds
          currency: originalTransaction?.currency || 'INR',
          status: 'processing',
          payment_date: new Date().toISOString(),
          reference_number: payuResult.request_id || refundRequestId,
          notes: `PayU Refund: ${reason}`,
          created_by: userId
        });

      if (ledgerError) {
        console.error("L Error creating ledger entry:", ledgerError);
        console.error("Ledger error details:", ledgerError.message, ledgerError.details);
      }

      // Update the original payment transaction if found
      if (originalTransaction) {
        const totalRefunded = (originalTransaction.total_refunded || 0) + amount;
        const { error: updateError } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            total_refunded: totalRefunded,
            refund_count: (originalTransaction.refund_count || 0) + 1,
            is_fully_refunded: totalRefunded >= originalTransaction.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTransaction.id);

        if (updateError) {
          console.error("L Error updating transaction:", updateError);
        }
      }

      // Update the quote's amount_paid to reflect the refund
      const { data: quoteData, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .select('amount_paid, final_total')
        .eq('id', quoteId)
        .single();
      
      if (!quoteError && quoteData) {
        const newAmountPaid = (quoteData.amount_paid || 0) - amount;
        const newPaymentStatus = newAmountPaid <= 0 ? 'unpaid' : 
                                newAmountPaid < quoteData.final_total ? 'partial' : 'paid';
        
        const { error: updateQuoteError } = await supabaseAdmin
          .from('quotes')
          .update({
            amount_paid: newAmountPaid,
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);
        
        if (updateQuoteError) {
          console.error("L Error updating quote amount_paid:", updateQuoteError);
        }
      }
    }

    // Send notification email if requested
    if (notifyCustomer && quoteId) {
      try {
        const { data: quote } = await supabaseAdmin
          .from('quotes')
          .select('email, display_id, product_name')
          .eq('id', quoteId)
          .single();

        if (quote?.email) {
          await supabaseAdmin.functions.invoke('send-email', {
            body: {
              to: quote.email,
              subject: `Refund Initiated - Order ${quote.display_id}`,
              html: `
                <p>Dear Customer,</p>
                <p>We have initiated a refund of <strong>INR ${amount}</strong> for your order <strong>${quote.display_id}</strong> (${quote.product_name}).</p>
                <p>The refund will be credited to your original payment method within 5-7 business days.</p>
                <p>Refund Reference: ${payuResult.request_id || refundRequestId}</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you for your patience.</p>
              `
            }
          });
        }
      } catch (emailError) {
        console.error("L Error sending notification email:", emailError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      refundId: payuResult.request_id || refundRequestId,
      bankRefNum: payuResult.bank_ref_num,
      message: payuResult.msg || 'Refund initiated successfully',
      amount: amount,
      status: 'processing',
      estimatedCompletion: '5-7 business days'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("L Refund processing error:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});