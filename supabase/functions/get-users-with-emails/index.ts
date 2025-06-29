import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user to verify admin access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 