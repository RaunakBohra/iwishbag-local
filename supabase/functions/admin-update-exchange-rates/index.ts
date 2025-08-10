import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Database } from '../../../src/integrations/supabase/types.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

/**
 * Admin-accessible exchange rate update function
 * Checks for admin permissions and then calls the service function internally
 */
serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔵 === ADMIN UPDATE EXCHANGE RATES FUNCTION STARTED ===');
  const startTime = Date.now();

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405, corsHeaders);
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header provided', 401, corsHeaders);
    }

    // Initialize Supabase client with the user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables');
      return createErrorResponse('Server configuration error', 500, corsHeaders);
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return createErrorResponse('Authentication failed', 401, corsHeaders);
    }

    console.log('✅ User authenticated:', user.email);

    // Check if user has admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ Failed to fetch user profile:', profileError);
      return createErrorResponse('Failed to verify user permissions', 403, corsHeaders);
    }

    // Check if user is admin using RLS function
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_admin');

    if (adminCheckError || !isAdmin) {
      console.error('❌ Admin check failed or user is not admin:', adminCheckError);
      return createErrorResponse('Admin access required', 403, corsHeaders);
    }

    console.log('✅ Admin permissions verified for:', userProfile.email);

    // Now call the service function using service role
    console.log('🔄 Calling update-exchange-rates-service with service role...');
    
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('❌ Service role key not available');
      return createErrorResponse('Server configuration error - service key missing', 500, corsHeaders);
    }

    // Call the service function internally
    const serviceResponse = await fetch(`${supabaseUrl}/functions/v1/update-exchange-rates-service`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      console.error('❌ Service function failed:', serviceResponse.status, errorText);
      return createErrorResponse(
        `Exchange rate service failed: ${serviceResponse.statusText}`,
        serviceResponse.status,
        corsHeaders
      );
    }

    const serviceResult = await serviceResponse.json();
    console.log('✅ Service function response:', serviceResult);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Admin exchange rate update completed in ${processingTime}ms`);

    // Return the service result with admin wrapper info
    return new Response(
      JSON.stringify({
        ...serviceResult,
        admin_user: userProfile.email,
        admin_processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Top-level error in admin-update-exchange-rates:', error);

    return createErrorResponse(`Internal server error: ${errorMessage}`, 500, corsHeaders);
  }
});

function createErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}