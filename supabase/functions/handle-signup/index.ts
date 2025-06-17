import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, record } = await req.json()

    if (type === 'INSERT' && record) {
      const { id, email, raw_user_meta_data } = record
      
      // Create profile with user metadata
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id,
          full_name: raw_user_meta_data?.name || email.split('@')[0],
          phone: raw_user_meta_data?.phone || null,
          cod_enabled: false,
          internal_notes: '',
          preferred_display_currency: 'USD'
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        throw new Error('Error creating profile: ' + profileError.message)
      }

      // Create user role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .upsert({
          user_id: id,
          role: 'user',
        }, {
          onConflict: 'user_id,role'
        })

      if (roleError) {
        console.error('Error creating user role:', roleError)
        throw new Error('Error creating user role: ' + roleError.message)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Profile created successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in handle-signup function:', error)
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