import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  requireAdmin,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req, ['GET']);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    validateMethod(req, ['GET']);

    // Authenticate and require admin access
    const { user, supabaseClient } = await requireAdmin(req);

    console.log(`🔐 Admin user ${user.email} accessing user emails`);

    // Fetch all profiles with their addresses
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select(
        'id, full_name, cod_enabled, internal_notes, created_at, user_addresses(id, address_line1, address_line2, city, country, postal_code, is_default)',
      );

    if (profilesError) {
      throw profilesError;
    }

    // Use the service role key to access auth.users
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get all user emails
    const { data: authUsers, error: authUsersError } = await serviceClient.auth.admin.listUsers();

    if (authUsersError) {
      throw authUsersError;
    }

    // Create a map of user IDs to user data including metadata
    const userDataMap = new Map();
    authUsers.users.forEach((authUser) => {
      userDataMap.set(authUser.id, {
        email: authUser.email,
        role: authUser.role,
        phone: authUser.phone,
        avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
        user_metadata: authUser.user_metadata,
        last_sign_in_at: authUser.last_sign_in_at,
      });
    });

    // Combine the data
    const usersWithEmails =
      profiles?.map((profile) => {
        const authUser = userDataMap.get(profile.id);
        return {
          id: profile.id,
          email: authUser?.email || 'No email found',
          full_name: profile.full_name,
          cod_enabled: profile.cod_enabled,
          internal_notes: profile.internal_notes,
          created_at: profile.created_at,
          user_addresses: profile.user_addresses || [],
          role: authUser?.role || 'customer',
          phone: authUser?.phone,
          avatar_url: authUser?.avatar_url,
          last_sign_in_at: authUser?.last_sign_in_at,
        };
      }) || [];

    return new Response(JSON.stringify({ data: usersWithEmails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
