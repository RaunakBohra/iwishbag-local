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
    // Get the expired quote with all its items
    const { data: expiredQuote, error: fetchError } = await supabase
      .from('quotes')
      .select(
        `
        *,
        quote_items(*),
        profiles:user_id(preferred_display_currency)
      `,
      )
      .eq('id', expiredQuoteId)
      .eq('status', 'expired')
      .single();
    if (fetchError || !expiredQuote) {
      throw new Error('Expired quote not found');
    }
    // Create new quote with same data but current prices
    const newQuoteData = {
      email: expiredQuote.email,
      user_id: expiredQuote.user_id,
      country_code: expiredQuote.country_code,
      status: 'pending',
      currency: expiredQuote.currency,
      items_currency: expiredQuote.items_currency,
      destination_currency:
        expiredQuote.profiles?.preferred_display_currency || expiredQuote.destination_currency,
      customs_percentage: expiredQuote.customs_percentage,
      internal_notes: `Re-requested from expired quote ${expiredQuote.display_id || expiredQuote.id}`,
      // Reset all calculated fields
      item_price: null,
      item_weight: null,
      sub_total: 0,
      domestic_shipping: 0,
      international_shipping: null,
      merchant_shipping_price: null,
      sales_tax_price: null,
      vat: null,
      customs_and_ecs: null,
      handling_charge: null,
      insurance_amount: null,
      payment_gateway_fee: null,
      discount: null,
      final_total_usd: null,
      final_total_local: null,
      exchange_rate: 1,
      in_cart: false,
      payment_method: null,
      shipping_carrier: null,
      shipping_delivery_days: null,
      shipping_method: null,
      shipping_route_id: null,
      origin_country: null,
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
    // Copy quote items to new quote
    if (expiredQuote.quote_items && expiredQuote.quote_items.length > 0) {
      const newQuoteItems = expiredQuote.quote_items.map((item) => ({
        quote_id: newQuote.id,
        product_url: item.product_url,
        product_name: item.product_name,
        quantity: item.quantity,
        options: item.options,
        image_url: item.image_url,
        item_currency: item.item_currency,
        item_price: null,
        item_weight: null, // Reset weight for recalculation
      }));
      const { error: itemsError } = await supabase.from('quote_items').insert(newQuoteItems);
      if (itemsError) {
        throw itemsError;
      }
    }
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
        to: newQuote.email,
        subject: 'New Quote Requested',
        template: 'quote-re-requested',
        data: {
          newQuoteId: newQuote.display_id || newQuote.id,
          expiredQuoteId: expiredQuote.display_id || expiredQuote.id,
          productName: expiredQuote.product_name || 'your items',
          email: newQuote.email,
        },
      },
    });
    if (error) {
      console.error(`Failed to send re-request email to ${newQuote.email}:`, error);
    }
  } catch (error) {
    console.error(`Error sending re-request email to ${newQuote.email}:`, error);
  }
}
