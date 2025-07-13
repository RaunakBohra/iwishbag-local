import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "node:crypto"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface PayUWebhookPayload {
  // Common fields
  key?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  hash?: string;
  status?: string;
  
  // Payment specific fields
  mihpayid?: string;
  mode?: string;
  bankcode?: string;
  bank_ref_num?: string;
  cardCategory?: string;
  cardnum?: string;
  issuing_bank?: string;
  
  // UDF fields (User Defined Fields)
  udf1?: string; // Usually contains quote_id
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  
  // Error fields
  error?: string;
  error_Message?: string;
  
  // Additional fields
  addedon?: string;
  payment_source?: string;
  unmappedstatus?: string;
  
  // Payment link specific fields
  invoice_id?: string;
  payment_link_id?: string;
  link_status?: string;
}

serve(async (req) => {
  console.log("🔵 === PAYU WEBHOOK V2 FUNCTION STARTED ===");
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
    let webhookData: PayUWebhookPayload;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      webhookData = await req.json();
    } else {
      // Parse form data
      const formData = await req.formData();
      webhookData = {};
      for (const [key, value] of formData.entries()) {
        webhookData[key as keyof PayUWebhookPayload] = value.toString();
      }
    }

    console.log("🔵 Webhook payload received:", JSON.stringify(webhookData, null, 2));

    // Extract key information
    const {
      key,
      txnid,
      amount,
      status,
      mihpayid,
      hash,
      udf1: quoteId,
      email,
      firstname,
      error,
      error_Message,
      invoice_id,
      payment_link_id
    } = webhookData;

    // Log webhook request
    const webhookLogEntry = {
      gateway_code: 'payu',
      webhook_type: 'payment_status',
      request_headers: Object.fromEntries(req.headers.entries()),
      request_body: webhookData,
      quote_id: quoteId || null,
      transaction_id: mihpayid || txnid || null,
      processed_at: new Date().toISOString()
    };

    // Get PayU configuration for hash verification
    const { data: payuGateway } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (!payuGateway) {
      console.error("❌ PayU gateway configuration not found");
      await logWebhookError(supabaseAdmin, webhookLogEntry, 'PayU gateway configuration not found');
      return createErrorResponse('Gateway configuration not found', 500);
    }

    const config = payuGateway.config || {};
    const saltKey = config.salt_key;

    // Verify hash if provided
    if (hash && saltKey) {
      const isValidHash = await verifyPayUHash(webhookData, saltKey);
      if (!isValidHash) {
        console.error("❌ Invalid PayU hash");
        await logWebhookError(supabaseAdmin, webhookLogEntry, 'Invalid PayU hash');
        return createErrorResponse('Invalid hash', 400);
      }
      console.log("✅ PayU hash verified successfully");
    }

    // Process payment status update
    const result = await processPaymentStatusUpdate(supabaseAdmin, webhookData, webhookLogEntry);
    
    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to process payment update', 500);
    }

    // Log successful processing
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        ...webhookLogEntry,
        response_status: 200,
        response_body: { success: true, processed: result.processed }
      });

    console.log("✅ Webhook processed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      processed: result.processed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    
    // Log error
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin
        .from('webhook_logs')
        .insert({
          gateway_code: 'payu',
          webhook_type: 'payment_status',
          request_headers: Object.fromEntries(req.headers.entries()),
          response_status: 500,
          error_message: error.message,
          processed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error("❌ Failed to log webhook error:", logError);
    }

    return createErrorResponse('Internal server error', 500);
  }
});

/**
 * Verify PayU hash
 */
async function verifyPayUHash(data: PayUWebhookPayload, saltKey: string): Promise<boolean> {
  try {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      hash: receivedHash
    } = data;

    // Reconstruct hash string for verification
    // Format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = [
      saltKey,
      data.status || '',
      '', '', '', '', '', // Reserved fields
      udf5 || '',
      udf4 || '',
      udf3 || '',
      udf2 || '',
      udf1 || '',
      email || '',
      firstname || '',
      productinfo || '',
      amount || '',
      txnid || '',
      key || ''
    ].join('|');

    const calculatedHash = createHash('sha512').update(hashString).digest('hex');
    
    console.log("🔵 Hash verification:");
    console.log("  - Hash string:", hashString);
    console.log("  - Calculated hash:", calculatedHash);
    console.log("  - Received hash:", receivedHash);
    
    return calculatedHash.toLowerCase() === receivedHash?.toLowerCase();
  } catch (error) {
    console.error("❌ Hash verification error:", error);
    return false;
  }
}

/**
 * Process payment status update
 */
async function processPaymentStatusUpdate(
  supabaseAdmin: any, 
  webhookData: PayUWebhookPayload,
  webhookLogEntry: any
): Promise<{ success: boolean; error?: string; processed?: any }> {
  const {
    txnid,
    amount,
    status,
    mihpayid,
    udf1: quoteId,
    email,
    firstname,
    error: payuError,
    error_Message,
    invoice_id,
    payment_link_id
  } = webhookData;

  try {
    let processed: any = { payment_transaction: null, payment_link: null, quote: null };

    // Update payment transaction if exists
    if (mihpayid || txnid) {
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: mapPayUStatusToInternal(status),
          gateway_response: webhookData,
          updated_at: new Date().toISOString(),
          ...(mihpayid && { gateway_transaction_id: mihpayid }),
          ...(payuError && { error_message: `${payuError}: ${error_Message}` })
        })
        .eq('transaction_id', txnid)
        .or(`gateway_transaction_id.eq.${mihpayid}`)
        .select()
        .single();

      if (txError) {
        console.log("⚠️ Transaction not found or update failed:", txError.message);
      } else {
        processed.payment_transaction = transaction;
        console.log("✅ Payment transaction updated");
      }
    }

    // Update payment link if exists
    if (invoice_id || payment_link_id || txnid) {
      const { data: paymentLink, error: linkError } = await supabaseAdmin
        .from('payment_links')
        .update({
          status: mapPayUStatusToLinkStatus(status),
          gateway_response: webhookData,
          updated_at: new Date().toISOString(),
          ...(status === 'success' && { completed_at: new Date().toISOString() })
        })
        .or(`gateway_link_id.eq.${invoice_id || txnid},id.eq.${payment_link_id}`)
        .select()
        .single();

      if (linkError) {
        console.log("⚠️ Payment link not found or update failed:", linkError.message);
      } else {
        processed.payment_link = paymentLink;
        console.log("✅ Payment link updated");
      }
    }

    // Update quote status if payment is successful
    if (status === 'success' && quoteId) {
      const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (quoteError) {
        console.log("⚠️ Quote not found or update failed:", quoteError.message);
      } else {
        processed.quote = quote;
        console.log("✅ Quote status updated to paid");
      }

      // Record payment in ledger
      if (amount && parseFloat(amount) > 0) {
        // Convert INR amount back to USD for consistent storage
        // Get exchange rate from country_settings
        const { data: indiaSettings } = await supabaseAdmin
          .from('country_settings')
          .select('rate_from_usd')
          .eq('code', 'IN')
          .single();
        
        const exchangeRate = indiaSettings?.rate_from_usd || 83.0;
        const amountInUSD = parseFloat(amount) / exchangeRate;
        
        const { error: ledgerError } = await supabaseAdmin
          .from('payment_ledger')
          .insert({
            quote_id: quoteId,
            transaction_type: 'customer_payment',
            amount: amountInUSD,
            currency: 'USD',
            payment_method: 'payu',
            reference_number: mihpayid || txnid,
            status: 'completed',
            notes: `PayU payment via ${webhookData.mode || 'unknown'} mode (₹${amount} INR converted to USD)`,
            gateway_transaction_id: mihpayid,
            gateway_code: 'payu',
            gateway_response: webhookData,
            metadata: {
              original_amount_inr: parseFloat(amount),
              exchange_rate: exchangeRate,
              converted_to_usd: amountInUSD
            }
          });

        if (ledgerError) {
          console.error("❌ Failed to record payment in ledger:", ledgerError);
        } else {
          console.log("✅ Payment recorded in ledger");
        }
      }
    }

    // Send notification for failed payments
    if (status === 'failure' || status === 'cancel') {
      // You could add email notification logic here
      console.log("📧 Payment failed - notification should be sent");
    }

    return { success: true, processed };

  } catch (error) {
    console.error("❌ Error processing payment status update:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Map PayU status to internal status
 */
function mapPayUStatusToInternal(payuStatus?: string): string {
  const statusMap: { [key: string]: string } = {
    'success': 'completed',
    'failure': 'failed',
    'pending': 'pending',
    'cancel': 'cancelled',
    'in progress': 'processing'
  };
  
  return statusMap[payuStatus?.toLowerCase() || ''] || 'unknown';
}

/**
 * Map PayU status to payment link status
 */
function mapPayUStatusToLinkStatus(payuStatus?: string): string {
  const statusMap: { [key: string]: string } = {
    'success': 'completed',
    'failure': 'failed',
    'pending': 'pending',
    'cancel': 'cancelled',
    'in progress': 'active'
  };
  
  return statusMap[payuStatus?.toLowerCase() || ''] || 'active';
}

/**
 * Log webhook error
 */
async function logWebhookError(supabaseAdmin: any, webhookLogEntry: any, errorMessage: string) {
  try {
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        ...webhookLogEntry,
        response_status: 400,
        error_message: errorMessage
      });
  } catch (error) {
    console.error("❌ Failed to log webhook error:", error);
  }
}

/**
 * Create error response
 */
function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}