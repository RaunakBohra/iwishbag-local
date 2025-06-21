import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.12.0?target=deno&deno-std=0.132.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

// This should match src/types/payment.ts PaymentRequest
interface PaymentRequest {
  quoteIds: string[];
  success_url: string;
  cancel_url: string;
}

// This should match src/types/payment.ts PaymentResponse
interface PaymentResponse {
  success: boolean;
  url?: string | null;
  qr_code?: string | null;
  transaction_id?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Stripe Key:', Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 10));
    console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'));

    const { quoteIds, success_url, cancel_url }: PaymentRequest = await req.json()

    if (!quoteIds || quoteIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing quoteIds' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('product_name, final_total, quantity, final_currency')
      .in('id', quoteIds);

    if (quotesError) {
      throw quotesError;
    }

    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid quotes found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const line_items = quotes.map(quote => ({
      price_data: {
        currency: quote.final_currency || 'usd',
        product_data: {
          name: quote.product_name || 'Unnamed Product',
        },
        unit_amount: Math.round(quote.final_total * 100), // Stripe expects amount in cents
      },
      quantity: quote.quantity,
    }));
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        quoteIds: quoteIds.join(','),
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Payment creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 