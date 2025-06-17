import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, email, role } = await req.json()
    
    if ((!user_id && !email) || !role) {
      throw new Error('Either user_id or email is required, along with role.')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header is required.')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // For emergency admin recovery, we'll be more permissive
    // Check if there are any admins in the system first
    const { data: existingAdmins, error: adminCheckError } = await supabaseClient
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (adminCheckError) {
      throw new Error(`Failed to check existing admins: ${adminCheckError.message}`)
    }

    // If no admins exist, allow the operation (emergency recovery)
    // Otherwise, check if current user is admin
    if (existingAdmins && existingAdmins.length > 0) {
      const { data: isAdmin, error: rpcError } = await supabaseClient.rpc('is_admin')

      if (rpcError) {
        throw new Error(`Failed to check admin status: ${rpcError.message}`)
      }

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Not authorized: Admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let targetUserId = user_id

    // If email is provided instead of user_id, look up the user
    if (!targetUserId && email) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (userError) {
        throw new Error(`Failed to lookup user: ${userError.message}`)
      }

      const user = userData.users.find(u => u.email === email)
      if (!user) {
        throw new Error(`User with email ${email} not found`)
      }
      
      targetUserId = user.id
    }

    // Prevent self-demotion for admins
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (currentUser && currentUser.id === targetUserId && role !== 'admin') {
      throw new Error("Admins cannot remove their own admin privilege.");
    }

    // Clear existing roles for the user
    const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId);

    if (deleteError) {
        throw new Error(`Failed to clear existing roles: ${deleteError.message}`);
    }

    // Insert new role
    const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: targetUserId, role: role });

    if (insertError) {
        throw new Error(`Failed to set new role: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: `User role set to ${role}` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
