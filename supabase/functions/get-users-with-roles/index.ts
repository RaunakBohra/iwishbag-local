
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header for user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create authenticated client to check user permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Check if user is admin - this function should only be accessible to admins
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc('is_admin')
    
    if (adminCheckError) {
      console.error('Error checking admin status:', adminCheckError)
      return new Response(JSON.stringify({ error: 'Failed to verify admin privileges' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isAdmin) {
      console.log('Non-admin user attempted to access user data')
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create an admin client to interact with Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Admin user accessing user data - fetching users from auth...');
    // Get all users from auth
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users.length} users`);

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Get all user addresses
    const { data: addresses, error: addressesError } = await supabaseAdmin
      .from('user_addresses')
      .select('*');

    if (addressesError) {
      console.error('Error fetching addresses:', addressesError);
      throw addressesError;
    }

    console.log(`Found ${addresses?.length || 0} addresses`);

    // Get all roles
    const { data: roles, error: rolesError } = await supabaseAdmin.from('user_roles').select('*');
    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }

    console.log(`Found ${roles?.length || 0} roles`);

    // Combine user and profile data
    const usersWithCompleteData = users.map(user => {
      const userProfile = profiles?.find(profile => profile.id === user.id);
      const userRole = roles?.find(role => role.user_id === user.id);
      const userAddresses = addresses?.filter(address => address.user_id === user.id) || [];
      
      return {
        id: user.id,
        email: user.email,
        role: userRole?.role || 'user',
        role_id: userRole?.id,
        full_name: userProfile?.full_name || null,
        cod_enabled: userProfile?.cod_enabled ?? true,
        internal_notes: userProfile?.internal_notes || null,
        created_at: userProfile?.created_at || user.created_at,
        user_addresses: userAddresses
      };
    });

    console.log(`Returning ${usersWithCompleteData.length} users with complete data to admin user`);

    return new Response(JSON.stringify(usersWithCompleteData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
