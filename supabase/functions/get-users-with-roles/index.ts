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
    
    console.log(`🔐 Admin user ${user.email} accessing user roles`);

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users from authentication system' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user profiles for additional info
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authUsers.users.map(u => u.id))

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Don't fail here, we can work without profiles
    }

    // Create a map of user roles by user_id
    const rolesMap = new Map()
    userRoles?.forEach(role => {
      rolesMap.set(role.user_id, role)
    })

    // Create a map of profiles by user_id
    const profilesMap = new Map()
    profiles?.forEach(profile => {
      profilesMap.set(profile.id, profile)
    })

    // Combine auth users with their roles and profiles
    const usersWithRoles = authUsers.users.map(authUser => {
      const role = rolesMap.get(authUser.id)
      const profile = profilesMap.get(authUser.id)
      
      return {
        id: authUser.id,
        email: authUser.email || 'no-email@example.com',
        full_name: profile?.full_name || authUser.user_metadata?.full_name || null,
        role: role?.role || null,
        role_id: role?.id || null,
        created_at: authUser.created_at,
        created_by: role?.created_by || null,
        last_sign_in: authUser.last_sign_in_at,
        email_confirmed: authUser.email_confirmed_at ? true : false
      }
    })

    console.log(`Returning ${usersWithRoles.length} users with roles`)

    return new Response(
      JSON.stringify({ 
        data: usersWithRoles,
        count: usersWithRoles.length,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-users-with-roles function:', error);
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 