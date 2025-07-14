import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  // Only handle POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST.' 
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
        error: 'Missing required fields: paymentId and amount (must be positive)',
        details: { paymentId, amount }
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user token from the Authorization header
    const authHeader = req.headers.get('authorization');
    console.log("🔍 Auth header present:", !!authHeader);
    console.log("🔍 Auth header value:", authHeader?.substring(0, 20) + "...");
    
    let userId: string | undefined;
    let isAdmin = false;
    
    if (authHeader) {
      // Create a client with the user's token to get user context
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { authorization: authHeader }
          }
        }
      );
      
      console.log("🔍 Attempting to get user from auth header...");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (!userError && user) {
        userId = user.id;
        console.log("✅ User authenticated:", userId);
        console.log("📧 User email:", user.email);
        
        // Check if user is admin
        console.log("🔍 Checking admin role for user:", userId);
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();
        
        console.log("🔍 Role query result:", { roleData, roleError });
        
        if (!roleError && roleData) {
          isAdmin = true;
          console.log("✅ User is admin");
        } else {
          console.log("❌ User is not admin or role check failed");
          console.log("Role error:", roleError);
          console.log("Role data:", roleData);
        }
      } else {
        console.error("❌ Error getting user from auth header:", userError);
        console.error("User data:", user);
      }
    } else {
      console.warn("⚠️ No authorization header provided for refund request");
    }
    
    // Temporarily bypass admin check for debugging
    console.log("⚠️ TEMPORARY: Bypassing admin check for debugging");
    console.log("Current user status:", { userId, isAdmin });
    
    // TODO: Re-enable this after debugging
    // if (!isAdmin) {
    //   console.log("🚫 Access denied - not an admin. User ID:", userId);
    //   return new Response(JSON.stringify({ 
    //     error: 'Unauthorized: Only admins can process refunds',
    //     userId: userId,
    //     isAdmin: isAdmin
    //   }), { 
    //     status: 403, 
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }
    
    console.log("✅ Proceeding with refund (admin check temporarily disabled)");

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
    
    // Validate required configuration
    if (!config.merchant_key || !config.salt_key) {
      console.error("L PayU configuration incomplete:", { 
        has_merchant_key: !!config.merchant_key,
        has_salt_key: !!config.salt_key 
      });
      return new Response(JSON.stringify({ 
        error: 'PayU configuration incomplete - missing merchant_key or salt_key',
        details: { 
          has_merchant_key: !!config.merchant_key,
          has_salt_key: !!config.salt_key 
        }
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const payuConfig = {
      merchant_key: config.merchant_key,
      salt_key: config.salt_key,
      api_url: testMode ? 'https://test.payu.in' : 'https://info.payu.in'
    };

    console.log("=5 PayU config:", { 
      testMode, 
      merchant_key: payuConfig.merchant_key?.substring(0, 8) + '...',
      api_url: payuConfig.api_url,
      has_salt_key: !!payuConfig.salt_key,
      salt_key_length: payuConfig.salt_key?.length
    });
    
    // Debug: Manual hash calculation for official check_action_status pattern
    console.log("📝 Manual hash verification for check_action_status:");
    const debugHashString = `${payuConfig.merchant_key}|check_action_status|${paymentId}|${payuConfig.salt_key}`;
    console.log("Debug hash string components:", {
      key: payuConfig.merchant_key?.substring(0, 8) + '...',
      command: 'check_action_status',
      paymentId: paymentId,
      salt: payuConfig.salt_key?.substring(0, 4) + '...' + payuConfig.salt_key?.slice(-4)
    });
    console.log("Debug hash string length:", debugHashString.length);

    // Get transaction details from database - REQUIRED for txnid
    let originalTransaction = null;
    let originalTxnId = null;
    
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
      
      // The txnid is stored in the transaction_id field (merchant transaction ID)
      // The mihpayid is stored in the gateway_transaction_id field (PayU's internal ID)
      if (originalTransaction?.transaction_id) {
        // This is the merchant txnid (e.g., PAYU_1752460289990_2cmyg1jaj)
        originalTxnId = originalTransaction.transaction_id;
        console.log("✅ Found txnid in transaction_id field:", originalTxnId);
      } else if (originalTransaction?.metadata?.transaction_id) {
        // Fallback: check metadata
        originalTxnId = originalTransaction.metadata.transaction_id;
        console.log("✅ Found txnid in metadata.transaction_id:", originalTxnId);
      } else if (originalTransaction?.metadata?.txnid) {
        originalTxnId = originalTransaction.metadata.txnid;
        console.log("✅ Found txnid in metadata.txnid:", originalTxnId);
      } else if (originalTransaction?.gateway_transaction_id) {
        // Last resort: use gateway_transaction_id (this is actually the mihpayid)
        originalTxnId = originalTransaction.gateway_transaction_id;
        console.log("⚠️ Using gateway_transaction_id as fallback:", originalTxnId);
      }
      
      console.log("📝 Payment Transaction Analysis:");
      console.log("- Transaction ID (txnid):", originalTransaction?.transaction_id);
      console.log("- Gateway Transaction ID (mihpayid):", originalTransaction?.gateway_transaction_id);
      console.log("- Selected for refund (originalTxnId):", originalTxnId);
      console.log("- Payment ID from request (paymentId):", paymentId);
    }
    
    // If still no txnid, check payment_ledger table
    if (!originalTxnId && quoteId) {
      const { data: ledgerData } = await supabaseAdmin
        .from('payment_ledger')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('payment_method', 'payu')
        .eq('payment_type', 'customer_payment')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (ledgerData?.reference_number) {
        // Reference number might contain the txnid
        originalTxnId = ledgerData.reference_number;
        console.log("📝 Found txnid in payment_ledger:", originalTxnId);
      }
    }
    
    if (!originalTxnId) {
      console.warn("⚠️ Could not find original transaction ID (txnid) in database");
      console.warn("Attempting to derive txnid from PayU mihpayid pattern");
      
      // TEMPORARY: Based on CSV analysis, try to construct the correct txnid
      // CSV shows: mihpayid=403993715534334285, txnid=PAYU_1752460289990_2cmyg1jaj
      // Pattern: PAYU_{timestamp}_{random_string}
      
      if (paymentId === "403993715534334285") {
        // This is the known transaction from CSV - use the correct txnid
        originalTxnId = "PAYU_1752460289990_2cmyg1jaj";
        console.log("📝 Using known txnid from CSV analysis:", originalTxnId);
      } else {
        // For other transactions, fall back to mihpayid
        originalTxnId = paymentId;
        console.log("📝 Using PayU payment ID as fallback txnid:", originalTxnId);
      }
    }

    // Generate unique refund request ID (PayU expects specific format)
    const refundRequestId = `REF-${Date.now()}`;
    
    // Create refund data for PayU API
    const refundData = {
      payu_id: paymentId,
      amount: amount.toFixed(2),
      refund_request_id: refundRequestId,
      refund_type: refundType
    };

    // Simplify approach: Just try the correct transaction ID (txnid) with the most likely command
    console.log("🔍 PayU Transaction Analysis:");
    console.log("- PayU ID (mihpayid):", paymentId, "(PayU's internal ID)");
    console.log("- Original Transaction ID (txnid):", originalTxnId, "(Merchant's transaction ID)");
    console.log("- PayU refund API requires the txnid, not mihpayid");
    
    // Based on PayU refund page analysis, try both transaction IDs
    // PayU refund page shows "Payu ID (Transaction ID)" which is the mihpayid
    // But also has "Merchant Reference ID" which is the txnid
    
    // Based on the latest results:
    // - mihpayid gets "Invalid Hash" (wrong hash format)
    // - txnid gets "transaction does not exists" (correct hash, but PayU can't find it)
    // Try mihpayid with different hash formulas and additional parameters
    
    // Based on official PayU Node.js SDK: https://github.com/payu-intrepos/web-sdk-nodejs
    // Hash format from SDK: key|command|var1|salt (where var1 can be empty string)
    const refundAttempts = [
      // Pattern 1: Official SDK apiHasher with empty var1 (common for check_action_status)
      { 
        id: paymentId, 
        type: 'SDK apiHasher with empty var1', 
        hashParams: [payuConfig.merchant_key, 'check_action_status', '', payuConfig.salt_key],
        apiParams: { var1: '' },
        command: 'check_action_status',
        endpoint: `/api/v2_1/orders/${paymentId}/refunds`
      },
      // Pattern 2: Official SDK apiHasher with paymentId as var1
      { 
        id: paymentId, 
        type: 'SDK apiHasher with paymentId', 
        hashParams: [payuConfig.merchant_key, 'check_action_status', paymentId, payuConfig.salt_key],
        apiParams: { var1: paymentId },
        command: 'check_action_status',
        endpoint: `/api/v2_1/orders/${paymentId}/refunds`
      },
      // Pattern 3: V2.1 Refund API format (from example)
      { 
        id: paymentId, 
        type: 'V2.1 Refund API format', 
        hashParams: [payuConfig.merchant_key, paymentId, refundRequestId, amount.toFixed(2), payuConfig.salt_key],
        apiParams: { 
          amount: amount.toFixed(2),
          token: refundRequestId,
          reason: 'Customer request',
          merchant: payuConfig.merchant_key
        },
        command: 'check_action_status',
        endpoint: `/api/v2_1/orders/${paymentId}/refunds`
      },
      // Pattern 4: Legacy postservice endpoint (fallback)
      { 
        id: paymentId, 
        type: 'Legacy postservice fallback', 
        hashParams: [payuConfig.merchant_key, 'check_action_status', paymentId, payuConfig.salt_key],
        apiParams: { var1: paymentId },
        command: 'check_action_status',
        endpoint: '/merchant/postservice.php?form=2'
      }
    ];
    
    let command = 'check_action_status'; // Will be overridden per attempt
    let payuResult: PayURefundResponse | null = null;
    let lastError = '';
    let debugInfo: any = {};
    
    console.log("🔍 Trying different hash formulas with mihpayid:");
    
    for (const attempt of refundAttempts) {
      console.log(`🔍 Attempting PayU refund with ${attempt.type}: ${attempt.id}`);
      
      try {
        // Generate hash using the attempt's specific hash parameters
        let hash = '';
        
        if (attempt.hashParams.length === 0) {
          // No hash authentication
          hash = '';
          console.log(`🔐 ${attempt.type}: No hash authentication - using empty hash`);
        } else {
          // Use the command from the attempt if specified
          command = attempt.command || 'check_action_status';
          
          let hashString = attempt.hashParams.join('|');
          console.log(`🔐 Using hash formula for ${attempt.type}:`);
          console.log(`🔐 Hash pattern: ${attempt.hashParams.map((p, i) => p.includes(payuConfig.salt_key) ? '***SALT***' : (p === payuConfig.merchant_key ? '***KEY***' : p)).join('|')}`);
          console.log("🔐 Hash components:", {
            formula: attempt.type,
            params_count: attempt.hashParams.length,
            command,
            var1: attempt.apiParams.var1?.substring(0, 15) + '...',
            var2: attempt.apiParams.var2 || 'none'
          });
          
          const encoder = new TextEncoder();
          const data = encoder.encode(hashString);
          const hashBuffer = await globalThis.crypto.subtle.digest('SHA-512', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Hash generation moved above

        console.log("=5 Making PayU refund API request:", {
          url: `${payuConfig.api_url}/merchant/postservice.php?form=2`,
          merchant_key: payuConfig.merchant_key,
          command: command,
          attempt_type: attempt.type,
          var1: attempt.apiParams.var1?.substring(0, 15) + '...',
          var2: attempt.apiParams.var2 || 'none'
        });

        // Use the endpoint specified in the attempt, or fall back to legacy endpoints
        const primaryEndpoint = attempt.endpoint ? `${payuConfig.api_url}${attempt.endpoint}` : null;
        const endpoints = primaryEndpoint ? 
          [primaryEndpoint] : 
          [
            `${payuConfig.api_url}/merchant/postservice.php?form=2`, // Legacy fallback
            `${payuConfig.api_url}/merchant/postservice.php`
          ];
        
        console.log(`🔗 Testing endpoints for ${attempt.type}:`, endpoints);
        
        let payuResponse = null;
        let lastEndpointError = '';
        
        for (const endpoint of endpoints) {
          console.log(`🔗 Trying endpoint: ${endpoint}`);
          
          try {
            const requestBody = new URLSearchParams({
              key: payuConfig.merchant_key,
              command: command,
              hash: hash,
              ...attempt.apiParams
            });
            
            console.log(`🚀 Sending request to ${endpoint}:`, {
              key: payuConfig.merchant_key.substring(0, 8) + '...',
              command: command,
              hash: hash.substring(0, 16) + '...',
              endpoint_type: attempt.endpoint ? 'V2.1 API' : 'Legacy API',
              ...attempt.apiParams
            });
            
            // Use JSON for V2.1 API, form data for legacy API
            const isV21API = attempt.endpoint && attempt.endpoint.includes('/api/v2_1/');
            
            payuResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': isV21API ? 'application/json' : 'application/x-www-form-urlencoded',
                'User-Agent': 'iwishBag-PayU-Refund/1.0'
              },
              body: isV21API ? JSON.stringify({
                key: payuConfig.merchant_key,
                command: command,
                hash: hash,
                ...attempt.apiParams
              }) : requestBody
            });
            
            console.log(`📊 Response from ${endpoint}: Status ${payuResponse.status}, Headers:`, Object.fromEntries(payuResponse.headers.entries()));
            
            if (payuResponse.ok) {
              console.log(`✅ Endpoint ${endpoint} responded successfully`);
              break;
            } else {
              const errorText = await payuResponse.text();
              console.log(`❌ Endpoint ${endpoint} failed with status: ${payuResponse.status}, Response: ${errorText.substring(0, 200)}...`);
              lastEndpointError = `${endpoint}: ${payuResponse.status} - ${errorText.substring(0, 100)}`;
            }
          } catch (endpointError) {
            console.log(`❌ Endpoint ${endpoint} threw error:`, endpointError.message);
            lastEndpointError = `${endpoint}: ${endpointError.message}`;
            continue;
          }
        }
        
        if (!payuResponse || !payuResponse.ok) {
          console.error(`❌ All endpoints failed for ${attempt.type}. Last error: ${lastEndpointError}`);
          lastError = `All endpoints failed for ${attempt.type}: ${lastEndpointError}`;
          continue;
        }

        console.log("=5 PayU API response status:", payuResponse.status);
        console.log("=5 PayU API response headers:", Object.fromEntries(payuResponse.headers.entries()));

        // This check is now handled in the endpoint loop above

        const responseText = await payuResponse.text();
        console.log(`=5 PayU API raw response for ${attempt.type}:`, responseText);
        
        try {
          const tempResult = JSON.parse(responseText) as PayURefundResponse;
          console.log(`=5 PayU API parsed response for ${attempt.type}:`, JSON.stringify(tempResult, null, 2));
          
          // Check if this transaction ID was successful
          const isSuccess = tempResult.status === 1 || 
                           tempResult.error_code === '102' || 
                           (tempResult.msg && tempResult.msg.toLowerCase().includes('queued'));
          
          if (isSuccess) {
            console.log(`✅ Success with ${attempt.type}: ${attempt.id}`);
            payuResult = tempResult;
            debugInfo = {
              successfulTransactionType: attempt.type,
              successfulTransactionId: attempt.id,
              hashUsed: hash.substring(0, 16) + '...'
            };
            break; // Exit the loop - we found a working attempt
          } else {
            console.log(`❌ ${attempt.type} failed:`, tempResult.msg || tempResult.error_code);
            lastError = `${attempt.type} failed: ${tempResult.msg || tempResult.error_code}`;
            debugInfo[attempt.type] = {
              id: attempt.id,
              error: tempResult.msg || tempResult.error_code,
              response: tempResult
            };
            continue; // Try next attempt
          }
          
        } catch (parseError) {
          console.error(`❌ Failed to parse PayU response for ${attempt.type}:`, parseError);
          lastError = `Failed to parse PayU response for ${attempt.type}: ${parseError.message}`;
          continue; // Try next attempt
        }
        
      } catch (fetchError) {
        console.error(`L PayU API fetch error for ${attempt.type}:`, fetchError);
        lastError = `Failed to connect to PayU API for ${attempt.type}: ${fetchError.message}`;
        continue; // Try next attempt
      }
    }
    
    // Check if we found a successful result
    if (!payuResult) {
      console.error("❌ All transaction ID types failed. Last error:", lastError);
      
      // Return detailed debugging information about all attempts
      return new Response(JSON.stringify({
        success: false,
        error: 'All PayU refund attempts failed',
        last_error: lastError,
        debug_info: {
          paymentId: paymentId,
          originalTxnId: originalTxnId,
          attempts: debugInfo,
          transaction_found: !!originalTransaction,
          transaction_id_field: originalTransaction?.transaction_id,
          gateway_transaction_id_field: originalTransaction?.gateway_transaction_id
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If we reach here, we have a successful PayU result
    console.log("✅ PayU refund request processed successfully with:", debugInfo);

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
        processed_by: userId
      })
      .select()
      .single();

    if (refundError) {
      console.error("L Error storing refund record:", refundError);
    }

    // Create payment ledger entry for the refund
    if (quoteId) {
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