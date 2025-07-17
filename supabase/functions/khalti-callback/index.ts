import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';

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

    // Parse query parameters from Khalti callback
    const url = new URL(req.url);
    const params = url.searchParams;

    const pidx = params.get('pidx');
    const txnId = params.get('transaction_id');
    const tidx = params.get('tidx');
    const amount = params.get('amount');
    const mobile = params.get('mobile');
    const status = params.get('status');

    console.log('📥 Khalti callback received:', {
      pidx,
      txnId,
      tidx,
      amount,
      mobile,
      status,
    });

    if (!pidx) {
      console.error('❌ Missing pidx in callback');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: '/payment-failure?error=missing_pidx&gateway=khalti',
        },
      });
    }

    // Call our webhook function to verify the payment
    const webhookResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/khalti-webhook`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      },
    );

    if (!webhookResponse.ok) {
      console.error('❌ Webhook verification failed');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `/payment-failure?error=verification_failed&gateway=khalti&pidx=${pidx}`,
        },
      });
    }

    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook verification result:', webhookResult);

    // Redirect based on payment status
    if (webhookResult.success && webhookResult.status === 'completed') {
      // Successful payment
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `/payment-success?gateway=khalti&pidx=${pidx}&txn=${txnId || pidx}`,
        },
      });
    } else if (webhookResult.success && webhookResult.status === 'pending') {
      // Payment is pending
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `/payment-pending?gateway=khalti&pidx=${pidx}&txn=${txnId || pidx}`,
        },
      });
    } else {
      // Payment failed or other status
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `/payment-failure?gateway=khalti&pidx=${pidx}&status=${webhookResult.status || 'failed'}`,
        },
      });
    }
  } catch (error) {
    console.error('❌ Khalti callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: '/payment-failure?error=callback_error&gateway=khalti',
      },
    });
  }
});
