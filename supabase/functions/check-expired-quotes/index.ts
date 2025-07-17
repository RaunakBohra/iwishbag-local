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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get quotes that have expired but status is still 'calculated'
    const { data: expiredQuotes, error: fetchError } = await supabase
      .from('quotes')
      .select(
        `
        id,
        email,
        user_id,
        final_total,
        final_currency,
        product_name,
        display_id,
        profiles:user_id(preferred_display_currency)
      `,
      )
      .eq('status', 'calculated')
      .lt('expires_at', new Date().toISOString());
    if (fetchError) {
      throw fetchError;
    }
    if (!expiredQuotes || expiredQuotes.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No quotes to expire',
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Update expired quotes
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'expired',
      })
      .in(
        'id',
        expiredQuotes.map((q) => q.id),
      );
    if (updateError) {
      throw updateError;
    }
    // Send expiration emails
    const emailPromises = expiredQuotes.map((quote) => sendExpirationEmail(supabase, quote));
    await Promise.all(emailPromises);
    return new Response(
      JSON.stringify({
        message: `Expired ${expiredQuotes.length} quotes`,
        count: expiredQuotes.length,
        quotes: expiredQuotes.map((q) => ({
          id: q.id,
          email: q.email,
        })),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error checking expired quotes:', error);
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
async function sendExpirationEmail(supabase, quote) {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: quote.email,
        subject: 'Your Quote Has Expired',
        template: 'quote-expired',
        data: {
          quoteId: quote.display_id || quote.id,
          productName: quote.product_name || 'your items',
          totalAmount: quote.final_total,
          currency: quote.final_currency,
          userPreferredCurrency: quote.profiles?.preferred_display_currency,
        },
      },
    });
    if (error) {
      console.error(`Failed to send expiration email to ${quote.email}:`, error);
    }
  } catch (error) {
    console.error(`Error sending expiration email to ${quote.email}:`, error);
  }
}
