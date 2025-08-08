import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';

interface KhaltiLookupRequest {
  pidx: string;
}

interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: 'Completed' | 'Pending' | 'Initiated' | 'Refunded' | 'Expired' | 'User canceled';
  transaction_id: string;
  fee: number;
  refunded_amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
  extra_merchant_params: any;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { pidx }: KhaltiLookupRequest = await req.json();

    if (!pidx) {
      return new Response(JSON.stringify({ error: 'Missing pidx parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📥 Khalti webhook received for pidx:', pidx);

    // Get Khalti configuration
    const { data: khaltiGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'khalti')
      .single();

    if (gatewayError || !khaltiGateway) {
      console.error('❌ Khalti gateway config error:', gatewayError);
      return new Response(JSON.stringify({ error: 'Khalti gateway config not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = khaltiGateway.config || {};
    const testMode = khaltiGateway.test_mode;
    const khaltiConfig = {
      secret_key: testMode ? config.test_secret_key : config.live_secret_key,
      base_url: testMode ? config.sandbox_base_url : config.production_base_url,
    };

    if (!khaltiConfig.secret_key) {
      return new Response(JSON.stringify({ error: 'Khalti secret key not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lookup payment status from Khalti
    // Ensure proper URL format - remove double slashes
    const baseUrl = khaltiConfig.base_url.endsWith('/')
      ? khaltiConfig.base_url.slice(0, -1)
      : khaltiConfig.base_url;
    const khaltiResponse = await fetch(`${baseUrl}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${khaltiConfig.secret_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    if (!khaltiResponse.ok) {
      const errorData = await khaltiResponse.json();
      console.error('❌ Khalti lookup error:', errorData);
      return new Response(
        JSON.stringify({
          error: `Khalti lookup failed: ${JSON.stringify(errorData)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const khaltiData: KhaltiLookupResponse = await khaltiResponse.json();
    console.log('✅ Khalti lookup successful:', khaltiData);

    // Map Khalti status to our system status
    const paymentStatus =
      khaltiData.status === 'Completed'
        ? 'completed'
        : khaltiData.status === 'Pending'
          ? 'pending'
          : khaltiData.status === 'Expired'
            ? 'expired'
            : khaltiData.status === 'User canceled'
              ? 'cancelled'
              : 'failed';

    // Extract purchase order ID to find the quote
    const purchaseOrderId = khaltiData.purchase_order_id;
    console.log('🔍 Looking for quote with purchase order ID:', purchaseOrderId);

    // Find the quotes associated with this payment
    // Since we included quote IDs in the purchase order name, we can extract them
    const purchaseOrderName = khaltiData.purchase_order_name;
    const quoteIdMatch = purchaseOrderName.match(/\(([^)]+)\)/);
    const quoteIds = quoteIdMatch ? quoteIdMatch[1].split(',') : [];

    if (quoteIds.length === 0) {
      console.error('❌ No quote IDs found in purchase order name:', purchaseOrderName);
      return new Response(
        JSON.stringify({
          error: 'Could not extract quote IDs from purchase order',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log('📋 Found quote IDs:', quoteIds);

    // Update quote status if payment is successful
    if (khaltiData.status === 'Completed') {
      console.log('💰 Payment completed, updating quote status to paid');

      // Update all quotes in the payment to paid status
      const { error: updateError } = await supabaseAdmin
        .from('quotes_v2')
        .update({
          status: 'paid',
          payment_method: 'khalti',
          payment_status: 'paid',
          payment_details: JSON.stringify({
            gateway: 'khalti',
            transaction_id: khaltiData.transaction_id,
            pidx: khaltiData.pidx,
            amount: khaltiData.total_amount,
            fee: khaltiData.fee,
            purchase_order_id: purchaseOrderId,
            payment_date: new Date().toISOString(),
          }),
          updated_at: new Date().toISOString(),
        })
        .in('id', quoteIds);

      if (updateError) {
        console.error('❌ Error updating quote status:', updateError);
        return new Response(
          JSON.stringify({
            error: `Failed to update quote status: ${updateError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      console.log('✅ Quote status updated successfully');
    }

    // Create payment transaction record for tracking
    const { error: transactionError } = await supabaseAdmin.from('payment_transactions').insert({
      gateway: 'khalti',
      gateway_transaction_id: khaltiData.transaction_id || khaltiData.pidx,
      amount: khaltiData.total_amount / 100, // Convert paisa to NPR
      currency: 'NPR',
      status: paymentStatus,
      purchase_order_id: purchaseOrderId,
      gateway_response: khaltiData,
      completed_at: khaltiData.status === 'Completed' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (transactionError) {
      console.error('⚠️ Warning: Could not create payment transaction record:', transactionError);
      // Don't fail the webhook for this - the main payment processing succeeded
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        status: paymentStatus,
        khalti_response: khaltiData,
        quotes_updated: khaltiData.status === 'Completed' ? quoteIds.length : 0,
        message:
          khaltiData.status === 'Completed'
            ? 'Payment completed and quotes updated successfully'
            : `Payment status: ${khaltiData.status}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('❌ Khalti webhook error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
