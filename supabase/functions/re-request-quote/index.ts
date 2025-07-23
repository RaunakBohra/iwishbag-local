import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    const { expiredQuoteId } = await req.json();
    if (!expiredQuoteId) {
      throw new Error('expiredQuoteId is required');
    }
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get the expired quote with unified structure
    const { data: expiredQuote, error: fetchError } = await supabase
      .from('quotes')
      .select(
        `
        *,
        profiles:user_id(preferred_display_currency)
      `,
      )
      .eq('id', expiredQuoteId)
      .eq('status', 'expired')
      .single();
    if (fetchError || !expiredQuote) {
      throw new Error('Expired quote not found');
    }
    // Create new quote with unified structure data
    const newQuoteData = {
      user_id: expiredQuote.user_id,
      status: 'pending',
      origin_country: expiredQuote.origin_country,
      destination_country: expiredQuote.destination_country,
      items: expiredQuote.items, // Copy the items JSONB array
      base_total_usd: 0, // Reset for recalculation
      final_total_usd: 0, // Reset for recalculation
      calculation_data: {
        breakdown: {
          items_total: 0,
          shipping: 0,
          customs: 0,
          taxes: 0,
          fees: 0,
          discount: 0,
        },
        exchange_rate: {
          rate: 1,
          source: 'unified_configuration',
          confidence: 1,
        },
        smart_optimizations: [],
      },
      customer_data: expiredQuote.customer_data,
      operational_data: {
        ...expiredQuote.operational_data,
        admin: {
          ...expiredQuote.operational_data?.admin,
          notes: `Re-requested from expired quote ${expiredQuote.display_id || expiredQuote.id}`,
        },
      },
      currency: expiredQuote.currency,
      in_cart: false,
      smart_suggestions: [],
      weight_confidence: 0.5,
      optimization_score: 0,
      is_anonymous: expiredQuote.is_anonymous,
      quote_source: expiredQuote.quote_source || 're-request',
    };
    // Insert new quote
    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert(newQuoteData)
      .select()
      .single();
    if (insertError) {
      throw insertError;
    }
    // Items are already copied as part of the unified quote structure
    // No separate quote_items table needed - everything is in the items JSONB array
    // Send re-request confirmation email
    await sendReRequestEmail(supabase, newQuote, expiredQuote);
    return new Response(
      JSON.stringify({
        message: 'Quote re-requested successfully',
        newQuoteId: newQuote.id,
        displayId: newQuote.display_id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error re-requesting quote:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
async function sendReRequestEmail(supabase, newQuote, expiredQuote) {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: newQuote.customer_data?.info?.email || expiredQuote.customer_data?.info?.email,
        subject: 'New Quote Requested',
        template: 'quote-re-requested',
        data: {
          newQuoteId: newQuote.display_id || newQuote.id,
          expiredQuoteId: expiredQuote.display_id || expiredQuote.id,
          productName: expiredQuote.items?.[0]?.name || 'your items',
          email: newQuote.customer_data?.info?.email || expiredQuote.customer_data?.info?.email,
        },
      },
    });
    if (error) {
      console.error(`Failed to send re-request email:`, error);
    }
  } catch (error) {
    console.error(`Error sending re-request email:`, error);
  }
}
