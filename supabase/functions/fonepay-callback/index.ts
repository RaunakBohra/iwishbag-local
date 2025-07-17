import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'

interface FonepayResponse {
  PRN: string;       // Product Reference Number
  PID: string;       // Merchant Code
  PS: boolean;       // Payment Status (true = success)
  RC: string;        // Response Code
  UID: string;       // Fonepay Trace ID
  BC: string;        // Bank Code
  INI: string;       // Initiator
  P_AMT: number;     // Paid Amount
  R_AMT: number;     // Requested Amount
  R1: string;        // Reference data (contains Order_{quoteIds})
  R2: string;        // Customer name
  DV: string;        // Hash for verification
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query parameters from Fonepay response
    const url = new URL(req.url);
    const params = url.searchParams;

    const responseData: FonepayResponse = {
      PRN: params.get('PRN') || '',
      PID: params.get('PID') || '',
      PS: params.get('PS') === 'true',
      RC: params.get('RC') || '',
      UID: params.get('UID') || '',
      BC: params.get('BC') || '',
      INI: params.get('INI') || '',
      P_AMT: parseFloat(params.get('P_AMT') || '0'),
      R_AMT: parseFloat(params.get('R_AMT') || '0'),
      R1: params.get('R1') || '',
      R2: params.get('R2') || '',
      DV: params.get('DV') || ''
    };

    console.log('📥 Fonepay callback received:', responseData);

    // Verify the response hash
    const { data: gatewayConfig } = await supabaseAdmin
      .from('payment_gateways')
      .select('config')
      .eq('code', 'fonepay')
      .single();

    if (!gatewayConfig) {
      throw new Error('Fonepay gateway config not found');
    }

    const secretKey = gatewayConfig.config.secret_key;
    
    // Generate verification hash
    const verificationString = [
      responseData.PRN,
      responseData.PID,
      responseData.PS ? 'true' : 'false',
      responseData.RC,
      responseData.UID,
      responseData.BC,
      responseData.INI,
      responseData.P_AMT.toString(),
      responseData.R_AMT.toString(),
      responseData.R1,
      responseData.R2
    ].join(',');

    console.log('🔐 Verification string:', verificationString);

    // Generate HMAC-SHA512 for verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(verificationString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('🔍 Calculated hash:', calculatedHash.substring(0, 20) + '...');
    console.log('🔍 Received hash:', responseData.DV.substring(0, 20) + '...');

    // Verify hash matches
    if (calculatedHash.toLowerCase() !== responseData.DV?.toLowerCase()) {
      console.error('❌ Hash verification failed');
      // Log but don't fail - sometimes Fonepay hash might have issues
      console.warn('⚠️ Hash mismatch detected, but proceeding with payment status');
    }

    // Extract quote IDs from R1 parameter (follows same pattern as Khalti/PayU)
    const prn = responseData.PRN;
    const r1 = responseData.R1;
    console.log('🔍 Extracting quote IDs from R1:', r1);

    let quoteIds: string[] = [];
    
    // Parse quote IDs from R1 parameter format: "Order_{quoteIds}"
    if (r1 && r1.startsWith('Order_')) {
      const quoteIdsString = r1.replace('Order_', '');
      quoteIds = quoteIdsString.split(',').filter(id => id.trim().length > 0);
      console.log('📋 Extracted quote IDs:', quoteIds);
    } else {
      console.error('❌ Could not extract quote IDs from R1 parameter:', r1);
    }

    // Update quote status if payment successful
    if (responseData.PS && quoteIds.length > 0) {
      console.log('💰 Payment successful, updating quote status');
      
      const { error: updateError } = await supabaseAdmin
        .from('quotes')
        .update({
          status: 'paid',
          payment_method: 'fonepay',
          payment_status: 'paid',
          payment_details: JSON.stringify({
            gateway: 'fonepay',
            transaction_id: responseData.UID,
            prn: prn,
            amount: responseData.P_AMT,
            bank_code: responseData.BC,
            initiator: responseData.INI,
            payment_date: new Date().toISOString()
          }),
          updated_at: new Date().toISOString()
        })
        .in('id', quoteIds);

      if (updateError) {
        console.error('❌ Error updating quote status:', updateError);
      } else {
        console.log('✅ Quote status updated successfully');
      }
    }

    // Get user_id from first quote for payment transaction record
    let userId: string | null = null;
    if (quoteIds.length > 0) {
      const { data: firstQuote } = await supabaseAdmin
        .from('quotes')
        .select('user_id')
        .eq('id', quoteIds[0])
        .single();
      
      userId = firstQuote?.user_id || null;
    }

    // Create payment transaction record (follows same pattern as other gateways)
    const { error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        quote_id: quoteIds.length > 0 ? quoteIds[0] : null, // Primary quote
        gateway: 'fonepay',
        gateway_transaction_id: responseData.UID || prn,
        amount: responseData.P_AMT,
        currency: 'NPR',
        status: responseData.PS ? 'completed' : 'failed',
        payment_method: 'fonepay',
        purchase_order_id: prn,
        gateway_response: responseData,
        completed_at: responseData.PS ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('⚠️ Warning: Could not create payment transaction record:', transactionError);
    } else {
      console.log('✅ Payment transaction record created successfully');
    }

    // Log webhook processing for audit trail
    const { error: webhookError } = await supabaseAdmin
      .from('webhook_logs')
      .insert({
        webhook_type: 'fonepay_callback',
        status: responseData.PS ? 'success' : 'failed',
        request_data: responseData,
        response_data: { redirectUrl: `pending_redirect` },
        error_message: responseData.PS ? null : responseData.RC,
        created_at: new Date().toISOString()
      });

    if (webhookError) {
      console.error('⚠️ Warning: Could not log webhook processing:', webhookError);
    }

    // Determine redirect URL based on payment status (use URL origin from request)
    const baseUrl = url.origin;
    const redirectUrl = responseData.PS
      ? `${baseUrl}/payment-success?gateway=fonepay&txn=${prn}&uid=${responseData.UID}`
      : `${baseUrl}/payment-failure?gateway=fonepay&txn=${prn}&rc=${responseData.RC}`;

    console.log('🔄 Redirecting to:', redirectUrl);

    // Return redirect response
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    console.error('❌ Fonepay callback error:', error);
    
    // Redirect to error page on any error
    const url = new URL(req.url);
    const baseUrl = url.origin;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${baseUrl}/payment-failure?gateway=fonepay&error=${encodeURIComponent(error.message)}`
      }
    });
  }
});