import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find abandoned payments (pending for more than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: abandonedPayments, error } = await supabaseAdmin
      .from('payment_transactions')
      .select(`
        *,
        quotes!inner(
          id,
          user_id,
          status,
          final_total,
          final_currency,
          product_name
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error fetching abandoned payments:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch abandoned payments' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${abandonedPayments?.length || 0} abandoned payments`);

    // Send recovery emails
    let processedCount = 0;
    for (const payment of abandonedPayments || []) {
      try {
        await sendPaymentReminder(payment, supabaseAdmin);
        processedCount++;
      } catch (error) {
        console.error(`Failed to send reminder for payment ${payment.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      total: abandonedPayments?.length || 0
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Payment recovery error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendPaymentReminder(payment: any, supabaseAdmin: any) {
  try {
    // Get user information
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, preferred_display_currency')
      .eq('id', payment.quotes.user_id)
      .single();

    if (userError || !user) {
      console.error(`User not found for payment ${payment.id}:`, userError);
      return;
    }

    // Create recovery email template
    const emailData = {
      to: user.email,
      subject: 'Complete Your Payment - Your Order is Waiting!',
      template: 'payment_reminder',
      variables: {
        customer_name: user.first_name || 'Customer',
        order_amount: payment.quotes.final_total,
        order_currency: payment.quotes.final_currency || user.preferred_display_currency || 'USD',
        product_name: payment.quotes.product_name || 'Your order',
        payment_link: `${Deno.env.get('SITE_URL') || 'https://your-site.com'}/checkout?quotes=${payment.quotes.id}`,
        transaction_id: payment.id,
        hours_abandoned: Math.floor((Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60))
      }
    };

    // Send email using the send-email function
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: emailData
    });

    if (emailError) {
      console.error(`Failed to send email for payment ${payment.id}:`, emailError);
      throw emailError;
    }

    console.log(`Successfully sent payment reminder for transaction ${payment.id} to ${user.email}`);

    // Log the recovery attempt
    await supabaseAdmin
      .from('payment_recovery_logs')
      .insert({
        transaction_id: payment.id,
        user_id: payment.quotes.user_id,
        email_sent: user.email,
        recovery_type: 'abandoned_payment',
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error(`Error in sendPaymentReminder for payment ${payment.id}:`, error);
    throw error;
  }
} 