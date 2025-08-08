import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWebhookHeaders } from '../_shared/cors.ts';
// Verify PayU hash to ensure request is legitimate
async function verifyPayUHash(data, salt) {
  try {
    // PayU hash format for response:
    // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const reverseHashString = [
      salt,
      data.status || '',
      '',
      '',
      '',
      '',
      '',
      '',
      data.udf5 || '',
      data.udf4 || '',
      data.udf3 || '',
      data.udf2 || '',
      data.udf1 || '',
      data.email || '',
      data.firstname || '',
      data.productinfo || '',
      data.amount || '',
      data.txnid || '',
      data.key || '',
    ].join('|');
    const encoder = new TextEncoder();
    const hashData = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return calculatedHash === data.hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createWebhookHeaders(),
    });
  }
  // This is a webhook endpoint - PayU sends server-to-server notifications
  // It should NOT redirect users, just process the payment and return 200 OK
  try {
    console.log('PayU webhook received:', req.method, req.url);
    // Webhooks should only accept POST requests
    if (req.method !== 'POST') {
      // For GET requests, show webhook info page
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PayU Webhook Handler</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 { color: #333; }
            p { color: #666; margin: 20px 0; }
            .info { 
              background: #e3f2fd; 
              padding: 15px; 
              border-radius: 5px;
              margin-top: 20px;
            }
            .webhook-info {
              background: #fff3cd;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>PayU Webhook Handler</h1>
            <p>This is a server-to-server webhook endpoint for PayU payment notifications.</p>
            <div class="info">
              <strong>Note:</strong> This endpoint only accepts POST requests from PayU servers.
            </div>
            <div class="webhook-info">
              <strong>Configuration in PayU Dashboard:</strong>
              <ul>
                <li>URL: ${req.url}</li>
                <li>Method: POST</li>
                <li>Events: Payment Success/Failure</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `;
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    // Parse POST form data from PayU
    const formData = await req.formData();
    const data = {};
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    console.log('PayU callback data:', {
      txnid: data.txnid,
      status: data.status,
      mihpayid: data.mihpayid,
      amount: data.amount,
      email: data.email,
    });
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    // Get PayU configuration to verify hash
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();
    if (payuGatewayError || !payuGateway) {
      console.error('PayU configuration not found');
      return new Response('Configuration error', {
        status: 500,
      });
    }
    const testMode = payuGateway.test_mode;
    const config = payuGateway.config || {};
    const salt = testMode ? config.test_salt_key || config.salt_key : config.salt_key;
    if (!salt) {
      console.error('PayU salt key not found');
      return new Response('Configuration error', {
        status: 500,
      });
    }
    console.log(`PayU callback processing in ${testMode ? 'TEST' : 'PRODUCTION'} mode`);
    // Skip hash verification for GET requests, test environments, or if no hash provided
    // In local environment, SUPABASE_URL inside the function is different from outside
    const isLocalEnvironment =
      req.url.includes('supabase_edge_runtime') ||
      Deno.env.get('SUPABASE_URL')?.includes('kong') ||
      Deno.env.get('SUPABASE_URL')?.includes('127.0.0.1') ||
      Deno.env.get('SUPABASE_URL')?.includes('localhost');
    const skipHashVerification =
      req.method === 'GET' || !data.hash || (isLocalEnvironment && testMode);
    if (!skipHashVerification) {
      // Verify hash to ensure request is from PayU
      const isValidHash = await verifyPayUHash(data, salt);
      if (!isValidHash) {
        console.error('Invalid PayU hash - possible security breach');
        console.error('Expected hash calculation with salt:', salt.substring(0, 4) + '***');
        return new Response('Invalid request', {
          status: 403,
        });
      }
      console.log('PayU hash verified successfully');
    } else {
      console.log('Skipping hash verification:', {
        method: req.method,
        hasHash: !!data.hash,
        isLocalEnvironment,
        testMode,
      });
    }
    // Extract quote IDs from productinfo if available
    const productInfo = data.productinfo || '';
    const quoteIdsMatch = productInfo.match(/\(([^)]+)\)$/);
    const quoteIds = quoteIdsMatch ? quoteIdsMatch[1].split(',') : [];
    const quoteId = quoteIds.length > 0 ? quoteIds[0] : null; // Use first quote ID for payment transaction
    // Get user ID from the quote if available
    let userId = null;
    if (quoteId) {
      const { data: quote } = await supabaseAdmin
        .from('quotes_v2')
        .select('user_id')
        .eq('id', quoteId)
        .single();
      if (quote) {
        userId = quote.user_id;
      }
    }
    // CRITICAL: Check for duplicate webhook processing
    console.log('Checking for duplicate webhook processing for txnid:', data.txnid);

    // Check if we've already processed this webhook by looking in webhook_logs
    const { data: existingWebhookLog } = await supabaseAdmin
      .from('webhook_logs')
      .select('id, status')
      .eq('request_id', `payu_${data.txnid}`)
      .eq('webhook_type', 'payu')
      .neq('status', 'test')
      .single();

    if (existingWebhookLog) {
      console.warn('Duplicate webhook detected via logs! Already processed:', {
        txnid: data.txnid,
        mihpayid: data.mihpayid,
        previousStatus: existingWebhookLog.status,
      });

      // Return success to acknowledge receipt but don't process again
      return new Response(
        JSON.stringify({
          message: 'Webhook already processed',
          txnid: data.txnid,
          duplicate: true,
        }),
        {
          status: 200,
          headers: createWebhookHeaders(),
        },
      );
    }

    // Check if payment already exists in payment_transactions by checking gateway_response JSONB
    const { data: existingPayments } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status, gateway_response')
      .eq('gateway_response->>txnid', data.txnid);

    const existingPayment = existingPayments?.find(
      (p) => p.gateway_response?.mihpayid === data.mihpayid,
    );

    if (existingPayment && existingPayment.status === 'completed') {
      console.warn('Payment already completed for txnid:', data.txnid);

      // Store webhook event in webhook_logs for audit but don't process
      await supabaseAdmin.from('webhook_logs').insert({
        request_id: `payu_${data.txnid}_duplicate`,
        webhook_type: 'payu',
        status: 'duplicate',
        error_message: 'Payment already completed',
        user_agent: req.headers.get('user-agent') || 'PayU Webhook',
      });

      return new Response(
        JSON.stringify({
          message: 'Payment already completed',
          txnid: data.txnid,
          duplicate: true,
        }),
        {
          status: 200,
          headers: createWebhookHeaders(),
        },
      );
    }

    // Store payment record in payment_transactions table
    const paymentRecord = {
      user_id: userId,
      quote_id: quoteId,
      amount: parseFloat(data.amount),
      currency: 'INR',
      status: data.status === 'success' ? 'completed' : data.status,
      payment_method: data.mode || 'unknown',
      gateway_code: 'payu',
      gateway_response: data,
      error_message: data.error_message || data.error || null,
    };
    // Insert payment transaction record
    const { data: insertedPayment, error: paymentError } = await supabaseAdmin
      .from('payment_transactions')
      .insert(paymentRecord)
      .select()
      .single();
    if (paymentError) {
      console.error('Error saving payment transaction:', paymentError);
      // Log error but continue processing
      await supabaseAdmin.from('webhook_logs').insert({
        request_id: `payu_${data.txnid}_${Date.now()}`,
        webhook_type: 'payu',
        status: 'warning',
        error_message: `Payment transaction save failed: ${paymentError.message}`,
        user_agent: req.headers.get('user-agent') || 'Unknown',
      });
    } else {
      console.log('Payment transaction saved:', insertedPayment?.id);
    }
    // Store webhook event in webhook_logs for audit trail
    await supabaseAdmin.from('webhook_logs').insert({
      request_id: `payu_${data.txnid}`,
      webhook_type: 'payu',
      status: data.status === 'success' ? 'success' : 'failed',
      user_agent: req.headers.get('user-agent') || 'PayU Webhook',
    });
    // Update quote status if payment was successful
    if (data.status === 'success' && quoteIds.length > 0) {
      console.log('Updating quote status for IDs:', quoteIds);
      // Also send email notification for successful payment
      if (data.email && quoteIds.length > 0) {
        try {
          await supabaseAdmin.functions.invoke('send-email', {
            body: {
              template: 'payment_success',
              to: data.email,
              data: {
                customerName: data.firstname,
                transactionId: data.txnid,
                amount: `₹${data.amount}`,
                paymentMethod: 'PayU',
                quoteIds: quoteIds.join(', '),
              },
            },
          });
        } catch (emailError) {
          console.error('Failed to send payment success email:', emailError);
        }
      }
      if (quoteIds.length > 0) {
        // First check if quotes are already paid to prevent duplicate updates
        const { data: existingQuotes } = await supabaseAdmin
          .from('quotes_v2')
          .select('id, status, payment_status')
          .in('id', quoteIds);

        const unpaidQuotes =
          existingQuotes?.filter((q) => q.status !== 'paid' && q.payment_status !== 'paid') || [];

        if (unpaidQuotes.length === 0) {
          console.warn('All quotes already paid, skipping update:', quoteIds);
        } else {
          const unpaidQuoteIds = unpaidQuotes.map((q) => q.id);
          console.log('Updating unpaid quotes:', unpaidQuoteIds);

          const { error: quoteError } = await supabaseAdmin
            .from('quotes_v2')
            .update({
              status: 'paid',
              payment_status: 'paid',
              payment_status: 'paid',
              payment_method: 'payu',
              payment_details: {
                gateway: 'payu',
                transaction_id: data.txnid,
                mihpayid: data.mihpayid,
              },
              paid_at: new Date().toISOString(),
            })
            .in('id', unpaidQuoteIds);

          if (quoteError) {
            console.error('Error updating quote status:', quoteError);
            // Log error but continue
            await supabaseAdmin.from('webhook_logs').insert({
              request_id: `payu_${data.txnid}_${Date.now()}`,
              webhook_type: 'payu',
              status: 'warning',
              error_message: `Quote update failed: ${quoteError.message}`,
              user_agent: req.headers.get('user-agent') || 'Unknown',
            });
          } else {
            console.log('Quote status updated successfully');
            // Log successful processing
            await supabaseAdmin.from('webhook_logs').insert({
              request_id: `payu_${data.txnid}_${Date.now()}`,
              webhook_type: 'payu',
              status: 'success',
              user_agent: req.headers.get('user-agent') || 'Unknown',
            });
          }
        }
      }
    } else if (data.status === 'failure' || data.status === 'failed') {
      // Handle failed payments
      console.log('Payment failed:', data.error_message || data.error || 'Unknown error');
      // Send failure notification email
      if (data.email) {
        try {
          await supabaseAdmin.functions.invoke('send-email', {
            body: {
              template: 'payment_failed',
              to: data.email,
              data: {
                customerName: data.firstname,
                transactionId: data.txnid,
                amount: `₹${data.amount}`,
                paymentMethod: 'PayU',
                errorMessage: data.error_message || data.error || 'Payment was not successful',
              },
            },
          });
        } catch (emailError) {
          console.error('Failed to send payment failure email:', emailError);
        }
      }
      // Log failed payment
      await supabaseAdmin.from('webhook_logs').insert({
        request_id: `payu_${data.txnid}_${Date.now()}`,
        webhook_type: 'payu',
        status: 'failed',
        error_message: data.error_message || data.error || 'Payment failed',
        user_agent: req.headers.get('user-agent') || 'Unknown',
      });
    }
    // Webhook should just return 200 OK to PayU
    // User redirection is handled by surl/furl configured in create-payment
    console.log('Webhook processed successfully');
    // Return 200 OK to PayU as per webhook requirements
    return new Response('OK', {
      status: 200,
      headers: createWebhookHeaders(),
    });
  } catch (error) {
    console.error('PayU webhook error:', error);
    return new Response('Internal server error', {
      status: 500,
    });
  }
});
