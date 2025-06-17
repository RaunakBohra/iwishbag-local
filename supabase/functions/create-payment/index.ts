
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, quoteIds, productName, finalTotal, currency = "usd" } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    let userEmail: string | undefined;
    let userId: string | undefined;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user?.email) {
      userEmail = user.email;
      userId = user.id;
    } else {
      return new Response(JSON.stringify({ error: "User not authenticated." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing Stripe secret key");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }
    
    let session;
    let allQuoteIds;

    if (quoteIds && quoteIds.length > 0) {
      const { data: quotes, error } = await supabaseClient
        .from('quotes')
        .select('id, product_name, final_total, final_currency')
        .in('id', quoteIds)
        .eq('user_id', userId);

      if (error) throw error;
      if (!quotes || quotes.length === 0) throw new Error("No valid quotes found for user.");

      const line_items = quotes.map(quote => ({
        price_data: {
          currency: quote.final_currency?.toLowerCase() || currency,
          product_data: { name: quote.product_name || 'Quoted Item' },
          unit_amount: Math.round((quote.final_total || 0) * 100),
        },
        quantity: 1,
      }));

      allQuoteIds = quotes.map(q => q.id).join(',');

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userEmail,
        line_items,
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?quote_ids=${allQuoteIds}`,
        cancel_url: `${req.headers.get("origin")}/cart`,
        metadata: {
          quote_ids: allQuoteIds,
          user_id: userId ?? "",
        },
      });

    } else if (quoteId) {
      if (!finalTotal || !productName) {
        return new Response(JSON.stringify({ error: "Missing fields for single payment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      allQuoteIds = quoteId;

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userEmail,
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: productName },
              unit_amount: Math.round(finalTotal * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?quote_ids=${allQuoteIds}`,
        cancel_url: `${req.headers.get("origin")}/dashboard`,
        metadata: {
          quote_ids: allQuoteIds,
          user_id: userId ?? "",
        },
      });
    } else {
      return new Response(JSON.stringify({ error: "Missing quoteId or quoteIds" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
