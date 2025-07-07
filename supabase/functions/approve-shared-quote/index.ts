import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { quoteId, email, action } = await req.json();

    if (!quoteId || !email || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quoteId, email, action' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate that this is a shared quote that can be updated
    const { data: quote, error: fetchError } = await supabaseClient
      .from('quotes')
      .select('id, status, is_anonymous, share_token')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!quote.is_anonymous || !quote.share_token) {
      return new Response(
        JSON.stringify({ error: 'Quote is not shareable' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Update the quote with guest approval
    const updateData = {
      email: email,
      status: action === 'approve' ? 'approved' : 'rejected',
      [action === 'approve' ? 'approved_at' : 'rejected_at']: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, quote: data[0] }),
      { headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});