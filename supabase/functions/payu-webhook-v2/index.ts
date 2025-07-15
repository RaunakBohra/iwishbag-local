import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "node:crypto"
import { Database } from '../../src/integrations/supabase/types.ts';

// Webhooks should not use CORS - they are called by external services, not browsers
// Remove CORS headers for security
const corsHeaders = {}

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

// Enhanced type interfaces for better type safety
interface WebhookLogEntry {
  gateway_code: string;
  webhook_type: string;
  request_headers: Record<string, string>;
  request_body: PayUWebhookPayload;
  quote_id: string | null;
  transaction_id: string | null;
  processed_at: string;
  response_status?: number;
  response_body?: Record<string, unknown>;
  error_message?: string;
}

interface ProcessedWebhookResult {
  payment_transaction?: { id: string } | null;
  payment_link?: { id: string } | null;
  quote?: { id: string } | null;
}

interface PaymentStatusUpdateResult {
  success: boolean;
  error?: string;
  processed?: ProcessedWebhookResult;
}

interface AtomicProcessingResult {
  success: boolean;
  payment_transaction_id?: string;
  quote_updated?: boolean;
  payment_ledger_entry_id?: string;
  error_message?: string;
}

// Security configuration
const WEBHOOK_CONFIG = {
  MAX_PROCESSING_TIME: 30000, // 30 seconds
  REPLAY_WINDOW: 5 * 60 * 1000, // 5 minutes
  REQUIRED_HEADERS: ['content-type'],
  MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB
};

// Request cache for replay attack prevention
const processedRequests = new Map<string, number>();

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log("🔵 === PAYU WEBHOOK V2 FUNCTION STARTED ===");
  console.log("🔵 Request ID:", requestId);
  console.log("🔵 Request method:", req.method);
  console.log("🔵 Request URL:", req.url);
  console.log("🔵 Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Security timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), WEBHOOK_CONFIG.MAX_PROCESSING_TIME);
  });
  
  // Webhooks should only accept POST requests
  if (req.method !== 'POST') {
    console.error("❌ Invalid request method:", req.method);
    return createErrorResponse('Method not allowed', 405);
  }
  
  // Basic security headers validation
  const missingHeaders = WEBHOOK_CONFIG.REQUIRED_HEADERS.filter(header => !req.headers.get(header));
  if (missingHeaders.length > 0) {
    console.error("❌ Missing required headers:", missingHeaders);
    return createErrorResponse('Missing required headers', 400);
  }

  try {
    const supabaseAdmin: SupabaseClient<Database> = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Wrap processing in timeout
    const processPromise = processWebhookRequest(req, supabaseAdmin, requestId, startTime);
    const result = await Promise.race([processPromise, timeoutPromise]);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("❌ Webhook processing error:", error);
    
    // Log error
    try {
      const supabaseAdmin: SupabaseClient<Database> = createClient(
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
          error_message: errorMessage,
          processed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error("❌ Failed to log webhook error:", logError);
    }

    return createErrorResponse('Internal server error', 500);
  }
});

/**
 * Process webhook request with enhanced security
 */
async function processWebhookRequest(
  req: Request,
  supabaseAdmin: SupabaseClient<Database>,
  requestId: string,
  startTime: number
): Promise<Response> {
  try {

    // Parse webhook payload with size validation
    let webhookData: PayUWebhookPayload;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const rawBody = await req.text();
      if (rawBody.length > WEBHOOK_CONFIG.MAX_BODY_SIZE) {
        throw new Error('Request body too large');
      }
      webhookData = JSON.parse(rawBody);
    } else {
      // Parse form data
      const formData = await req.formData();
      webhookData = {};
      for (const [key, value] of formData.entries()) {
        webhookData[key as keyof PayUWebhookPayload] = value.toString();
      }
    }

    console.log("🔵 Webhook payload received:", JSON.stringify(webhookData, null, 2));
    
    // Validate required payload fields
    if (!webhookData.txnid) {
      throw new Error('Missing required field: txnid');
    }
    
    // Replay attack prevention
    const replayKey = `${webhookData.txnid}_${webhookData.status}_${webhookData.amount}`;
    const now = Date.now();
    
    if (processedRequests.has(replayKey)) {
      const lastProcessed = processedRequests.get(replayKey)!;
      if (now - lastProcessed < WEBHOOK_CONFIG.REPLAY_WINDOW) {
        console.log("🔁 Duplicate request detected, ignoring");
        return new Response(JSON.stringify({ success: true, message: 'Duplicate request ignored' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Mark request as processed
    processedRequests.set(replayKey, now);
    
    // Clean up old entries (keep map size manageable)
    for (const [key, timestamp] of processedRequests.entries()) {
      if (now - timestamp > WEBHOOK_CONFIG.REPLAY_WINDOW) {
        processedRequests.delete(key);
      }
    }

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

    // Log webhook request with enhanced information
    const webhookLogEntry: WebhookLogEntry = {
      gateway_code: 'payu',
      webhook_type: 'payment_status',
      request_headers: Object.fromEntries(req.headers.entries()),
      request_body: webhookData,
      quote_id: quoteId || null,
      transaction_id: mihpayid || txnid || null,
      processed_at: new Date().toISOString()
    };
    
    // Add request metadata to log entry
    webhookLogEntry.request_headers['x-request-id'] = requestId;
    webhookLogEntry.request_headers['x-processing-start'] = startTime.toString();

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

    const processingTime = Date.now() - startTime;
    console.log("✅ Webhook processed successfully in", processingTime, "ms");

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      processed: result.processed,
      processing_time_ms: processingTime
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("❌ Webhook processing error:", error);
    
    // Log error
    try {
      const supabaseAdmin: SupabaseClient<Database> = createClient(
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
          error_message: errorMessage,
          processed_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error("❌ Failed to log webhook error:", logError);
    }

    return createErrorResponse('Internal server error', 500);
  }
});

/**
 * Verify PayU hash - CRITICAL: Do not modify this function
 * This implements PayU's required hash verification format
 */
async function verifyPayUHash(data: PayUWebhookPayload, saltKey: string): Promise<boolean> {
  const verificationTimeout = 5000; // 5 seconds timeout for hash verification
  
  const verificationPromise = new Promise<boolean>((resolve, reject) => {
    setTimeout(() => reject(new Error('Hash verification timeout')), verificationTimeout);
    
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
      
      resolve(calculatedHash.toLowerCase() === receivedHash?.toLowerCase());
    } catch (error) {
      console.error("❌ Hash verification error:", error);
      resolve(false);
    }
  });
  
  try {
    return await verificationPromise;
  } catch (error) {
    console.error("❌ Hash verification timeout or error:", error);
    return false;
  }
}

/**
 * Process payment status update
 */
async function processPaymentStatusUpdate(
  supabaseAdmin: SupabaseClient<Database>, 
  webhookData: PayUWebhookPayload,
  webhookLogEntry: WebhookLogEntry
): Promise<PaymentStatusUpdateResult> {
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
    const processed: ProcessedWebhookResult = { payment_transaction: null, payment_link: null, quote: null };

    // Use atomic function for successful payments with quote_id
    if (status === 'success' && quoteId && amount && parseFloat(amount) > 0) {
      console.log("🔄 Processing payment atomically...");
      
      const { data: result, error: rpcError } = await supabaseAdmin
        .rpc('process_payu_payment_atomic', {
          p_transaction_id: txnid || '',
          p_gateway_transaction_id: mihpayid || '',
          p_amount: parseFloat(amount),
          p_currency: 'INR',
          p_status: 'completed',
          p_gateway_response: webhookData,
          p_quote_id: quoteId,
          p_customer_email: email || '',
          p_customer_name: firstname || '',
          p_payment_method: 'payu',
          p_notes: `PayU payment via ${webhookData.mode || 'unknown'} mode (₹${amount} INR)`
        });
      
      if (rpcError || !result || !result[0]?.success) {
        const errorMessage = rpcError?.message || result?.[0]?.error_message || 'Unknown error';
        console.error("❌ Atomic payment processing failed:", errorMessage);
        return { success: false, error: errorMessage };
      }
      
      const processingResult = result[0] as AtomicProcessingResult;
      console.log("✅ Payment processed atomically:", {
        payment_transaction_id: processingResult.payment_transaction_id,
        quote_updated: processingResult.quote_updated,
        payment_ledger_entry_id: processingResult.payment_ledger_entry_id
      });
      
      // Set processed result
      processed.payment_transaction = processingResult.payment_transaction_id ? { id: processingResult.payment_transaction_id } : null;
      processed.quote = processingResult.quote_updated ? { id: quoteId } : null;
      
    } else {
      // Fallback to individual updates for non-success payments or those without quote_id
      console.log("🔄 Processing payment with individual updates...");
      
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
          processed.payment_transaction = transaction ? { id: transaction.id } : null;
          console.log("✅ Payment transaction updated");
        }
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
        processed.payment_link = paymentLink ? { id: paymentLink.id } : null;
        console.log("✅ Payment link updated");
      }
    }

    // Note: Quote and ledger updates are now handled by atomic function for successful payments
    // This section only handles non-success payments or those without quote_id

    // Send notification for failed payments
    if (status === 'failure' || status === 'cancel') {
      // You could add email notification logic here
      console.log("📧 Payment failed - notification should be sent");
    }

    return { success: true, processed };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("❌ Error processing payment status update:", error);
    return { success: false, error: errorMessage };
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
async function logWebhookError(supabaseAdmin: SupabaseClient<Database>, webhookLogEntry: WebhookLogEntry, errorMessage: string) {
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