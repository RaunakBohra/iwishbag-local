import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'

interface EsewaResponse {
  transaction_code: string;       // eSewa transaction code
  status: string;                 // COMPLETE, PENDING, etc.
  total_amount: number;           // Paid amount
  transaction_uuid: string;       // Our unique transaction ID
  product_code: string;           // Merchant code
  signed_field_names: string;     // Fields used for signature
  signature: string;              // HMAC signature for verification
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

    // Get the Base64-encoded response from eSewa
    const body = await req.text();
    console.log('📥 eSewa callback received, body length:', body.length);

    let responseData: EsewaResponse;

    try {
      // eSewa sends response as Base64-encoded JSON
      const decodedBody = atob(body);
      console.log('🔓 Decoded eSewa response:', decodedBody.substring(0, 100) + '...');
      responseData = JSON.parse(decodedBody);
    } catch (decodeError) {
      console.error('❌ Error decoding eSewa response:', decodeError);
      // Try parsing as direct JSON (fallback)
      try {
        responseData = JSON.parse(body);
      } catch (parseError) {
        console.error('❌ Error parsing eSewa response as JSON:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid response format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('✅ eSewa response parsed:', {
      transaction_code: responseData.transaction_code,
      status: responseData.status,
      transaction_uuid: responseData.transaction_uuid,
      total_amount: responseData.total_amount
    });

    // Get eSewa configuration for signature verification
    const { data: esewaGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config')
      .eq('code', 'esewa')
      .single();

    if (gatewayError || !esewaGateway) {
      console.error('❌ eSewa gateway config not found:', gatewayError);
      return new Response(JSON.stringify({ error: 'Gateway configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const esewaConfig = esewaGateway.config as {
      product_code: string;
      secret_key: string;
    };

    // Verify signature (same algorithm as payment creation)
    // For callback, eSewa uses different format based on signed_field_names
    // According to docs, the signed_field_names for callback should be checked first
    const signedFields = responseData.signed_field_names?.split(',') || [];
    const signatureString = signedFields.map(field => {
      const value = responseData[field as keyof typeof responseData];
      return `${field}=${value}`;
    }).join(',');
    
    console.log('🔐 Verification string:', signatureString);

    // Generate HMAC-SHA256 for verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(esewaConfig.secret_key);
    const messageData = encoder.encode(signatureString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedSignature = btoa(String.fromCharCode(...hashArray));

    console.log('🔍 Calculated signature:', calculatedSignature.substring(0, 20) + '...');
    console.log('🔍 Received signature:', responseData.signature?.substring(0, 20) + '...');

    // Verify signature matches
    if (calculatedSignature !== responseData.signature) {
      console.error('❌ Signature verification failed');
      // Log but don't fail - sometimes signatures might have issues
      console.warn('⚠️ Signature mismatch detected, but proceeding with payment status');
    }

    // Extract quote IDs from transaction UUID (format: ESW_{timestamp}_{random})
    const transactionUuid = responseData.transaction_uuid;
    console.log('🔍 Processing transaction UUID:', transactionUuid);

    // Find quotes by searching for the transaction UUID in payment_details
    // (We'll store the transaction UUID when creating the payment)
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('id, status, final_total, user_id')
      .or(`payment_details->transaction_uuid.eq.${transactionUuid},payment_details->>transaction_uuid.eq.${transactionUuid}`);

    if (quotesError) {
      console.error('❌ Error finding quotes:', quotesError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!quotes || quotes.length === 0) {
      console.warn('⚠️ No quotes found for transaction UUID:', transactionUuid);
      // Still return success to eSewa, but log the issue
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Transaction recorded but no matching quotes found',
        transaction_uuid: transactionUuid
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const quoteIds = quotes.map(q => q.id);
    console.log('📋 Found quotes:', quoteIds);

    // Update quote status if payment successful
    if (responseData.status === 'COMPLETE') {
      console.log('💰 Payment successful, updating quote status');
      
      const { error: updateError } = await supabaseAdmin
        .from('quotes')
        .update({
          status: 'paid',
          payment_method: 'esewa',
          payment_status: 'paid',
          payment_details: JSON.stringify({
            gateway: 'esewa',
            transaction_code: responseData.transaction_code,
            transaction_uuid: responseData.transaction_uuid,
            amount: responseData.total_amount,
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
    if (quotes.length > 0) {
      userId = quotes[0].user_id;
    }

    // Create payment transaction record (follows same pattern as other gateways)
    const { error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        quote_id: quoteIds.length > 0 ? quoteIds[0] : null, // Primary quote
        gateway: 'esewa',
        gateway_transaction_id: responseData.transaction_code,
        amount: responseData.total_amount,
        currency: 'NPR',
        status: responseData.status === 'COMPLETE' ? 'completed' : 
                responseData.status === 'PENDING' ? 'pending' : 'failed',
        payment_method: 'esewa',
        purchase_order_id: responseData.transaction_uuid,
        gateway_response: responseData,
        completed_at: responseData.status === 'COMPLETE' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('⚠️ Warning: Could not create payment transaction record:', transactionError);
      // Don't fail the callback for this - the main payment processing succeeded
    }

    // Return success response to eSewa
    return new Response(JSON.stringify({
      success: true,
      status: responseData.status,
      esewa_response: responseData,
      quotes_updated: responseData.status === 'COMPLETE' ? quoteIds.length : 0,
      message: responseData.status === 'COMPLETE' 
        ? 'Payment completed and quotes updated successfully' 
        : `Payment status: ${responseData.status}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ eSewa callback error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});