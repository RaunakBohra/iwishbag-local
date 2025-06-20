import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@11.16.0";
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const stripe = new Stripe(stripeKey, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()
    console.log(`[get-order-details] Received request for session_id: ${session_id}`);

    if (!session_id) {
      console.error("[get-order-details] Error: Session ID is required.");
      throw new Error("Session ID is required.");
    }

    // Retrieve the session from Stripe
    console.log(`[get-order-details] Retrieving session from Stripe: ${session_id}`);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const transactionId = session.metadata.transaction_id;
    console.log(`[get-order-details] Retrieved metadata from Stripe. Internal transaction_id: ${transactionId}`);

    if (!transactionId) {
      console.error("[get-order-details] Error: Transaction ID not found in session metadata.");
      throw new Error("Transaction ID not found in session metadata.");
    }

    let transaction;
    let transactionError;
    const maxRetries = 3;
    const retryDelay = 500; // ms

    for (let i = 0; i < maxRetries; i++) {
      console.log(`[get-order-details] Attempt #${i + 1} to fetch transaction from DB with gateway_transaction_id: ${session.id}`);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          quotes:payment_transactions_quote_id_fkey (
            display_id,
            final_total,
            final_currency,
            quote_items (
              product_name,
              quantity,
              item_price
            )
          )
        `)
        .eq('gateway_transaction_id', session.id)
        .single();

      if (data && !error) {
        console.log(`[get-order-details] Attempt #${i + 1} SUCCEEDED. Found transaction:`, data);
        transaction = data;
        transactionError = null;
        break;
      }
      
      console.warn(`[get-order-details] Attempt #${i + 1} FAILED. Error:`, error);
      transactionError = error;

      if (i < maxRetries - 1) {
        console.log(`[get-order-details] Waiting ${retryDelay}ms before next retry.`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    if (transactionError || !transaction) {
      console.error(`[get-order-details] All attempts failed. Transaction not found for session ${session_id}. Final error:`, transactionError);
      throw new Error(`Transaction not found for session: ${session_id}`);
    }

    // Update the transaction status to 'completed'
    console.log(`[get-order-details] Updating transaction ${transaction.id} status to 'completed'.`);
    await supabase
      .from('payment_transactions')
      .update({ status: 'completed', gateway_response: session })
      .eq('id', transaction.id);
      
    console.log(`[get-order-details] Updating quote ${transaction.quote_id} status to 'paid'.`);
    await supabase
      .from('quotes')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', transaction.quote_id);

    return new Response(JSON.stringify({ success: true, order: transaction }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Get order details error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}) 