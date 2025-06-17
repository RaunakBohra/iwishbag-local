import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a Supabase client with the auth header for verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user from the auth header
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !currentUser) {
      throw new Error('Error getting current user: ' + (userError?.message || 'No user found'))
    }

    // Check if the current user is an admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'admin') {
      throw new Error('Only admins can create users')
    }

    // Create a new client with service role key for admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const { email, password, full_name, phone } = await req.json()

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    console.log('Creating new user with email:', email)

    // Create the user in auth using admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw new Error('Error creating user: ' + authError.message)
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth creation')
    }

    console.log('Auth user created successfully:', authData.user.id)

    // Try to create the profile, but handle the case where it might already exist
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: full_name || email.split('@')[0],
        phone: phone || null,
        cod_enabled: false,
        internal_notes: '',
        preferred_display_currency: 'USD'
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      // Try to clean up the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw new Error('Error creating profile: ' + profileError.message)
    }

    console.log('Profile created/updated successfully')

    // Create user role entry using admin client
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .upsert({
        user_id: authData.user.id,
        role: 'user',
      }, {
        onConflict: 'user_id,role'
      })

    if (roleInsertError) {
      console.error('Error creating/updating user role:', roleInsertError)
      // Try to clean up if role creation fails
      await adminClient.from('profiles').delete().eq('id', authData.user.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw new Error('Error creating user role: ' + roleInsertError.message)
    }

    console.log('User role created/updated successfully')

    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email: email,
          full_name: full_name || email.split('@')[0],
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 