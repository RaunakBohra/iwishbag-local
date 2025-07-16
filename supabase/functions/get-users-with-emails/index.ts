import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts'
import { createCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req, ['GET']);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      .select(`
        id,
        full_name,
        cod_enabled,
        internal_notes,
        created_at,
        user_addresses (
          id,
          address_line1,
          address_line2,
          city,
          country,
          postal_code,
          is_default
        )
      `)

    if (profilesError) {
      throw profilesError
    }

    // Use the service role key to access auth.users
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all user emails
    const { data: authUsers, error: authUsersError } = await serviceClient.auth.admin.listUsers()

    if (authUsersError) {
      throw authUsersError
    }

    // Create a map of user IDs to emails
    const emailMap = new Map()
    authUsers.users.forEach(authUser => {
      emailMap.set(authUser.id, authUser.email)
    })

    // Combine the data
    const usersWithEmails = profiles?.map(profile => ({
      id: profile.id,
      email: emailMap.get(profile.id) || 'No email found',
      full_name: profile.full_name,
      cod_enabled: profile.cod_enabled,
      internal_notes: profile.internal_notes,
      created_at: profile.created_at,
      user_addresses: profile.user_addresses || [],
    })) || []

    return new Response(
      JSON.stringify({ data: usersWithEmails }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 