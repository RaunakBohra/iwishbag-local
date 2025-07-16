import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateUser, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);
    
    console.log(`🔐 Authenticated user ${user.email} requesting shared quote approval`);

    // Create admin client for database operations
    const supabaseAdmin = createClient(
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
    const { data: quote, error: fetchError } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
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
    console.error('Shared quote approval error:', error);
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});