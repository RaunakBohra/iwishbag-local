import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quote ID is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use environment variables for security
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseServiceRoleKey);

    // First, check if the quote exists and can be renewed
    const { data: quote, error: fetchError } = await client
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (fetchError || !quote) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quote not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if quote is expired and hasn't been renewed before
    if (quote.status !== 'expired') {
      return new Response(
        JSON.stringify({ success: false, error: 'Quote is not expired' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (quote.renewal_count >= 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Quote has already been renewed once' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Renew the quote
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    const { error: updateError } = await client
      .from("quotes")
      .update({
        status: 'pending',
        sent_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        renewed_at: now.toISOString(),
        renewal_count: 1
      })
      .eq("id", quoteId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quote renewed successfully',
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

 