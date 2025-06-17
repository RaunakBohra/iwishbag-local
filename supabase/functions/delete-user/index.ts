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
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      })
      throw new Error('Missing required environment variables')
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('Invalid request body:', e)
      throw new Error('Invalid request body')
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the user's JWT
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      throw new Error('No token provided')
    }
    console.log('Token length:', token.length)
    
    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError) {
      console.error('Auth error:', userError)
      throw new Error(`Auth error: ${userError.message}`)
    }
    
    if (!user) {
      console.error('No user found for token')
      throw new Error('User not found')
    }

    console.log('Authenticated user:', user.id)

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (roleError) {
      console.error('Role check error:', roleError)
      throw new Error(`Role check error: ${roleError.message}`)
    }
    
    if (!roleData || roleData.role !== 'admin') {
      console.error('User is not an admin:', user.id)
      throw new Error('Unauthorized: Admin access required')
    }

    // Get the user ID to delete
    const { userId } = requestBody
    if (!userId) {
      throw new Error('User ID is required')
    }

    // Prevent self-deletion
    if (userId === user.id) {
      throw new Error('Cannot delete your own account')
    }

    // Delete related data first
    const tablesToClean = [
      'user_addresses',
      'quotes',
      'user_roles',
      'profiles'
    ]

    for (const table of tablesToClean) {
      console.log(`Deleting from ${table}...`)
      const { error: deleteError } = await supabaseClient
        .from(table)
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error(`Error deleting from ${table}:`, deleteError)
        // Continue with other tables even if one fails
        continue
      }
    }

    // Delete quote items separately if they exist
    try {
      const { data: quotes, error: quoteItemsError } = await supabaseClient
        .from('quotes')
        .select('id')
        .eq('user_id', userId)

      if (!quoteItemsError && quotes && quotes.length > 0) {
        const quoteIds = quotes.map(q => q.id)
        console.log('Deleting quote items for quotes:', quoteIds)
        
        const { error: deleteQuoteItemsError } = await supabaseClient
          .from('quote_items')
          .delete()
          .in('quote_id', quoteIds)

        if (deleteQuoteItemsError) {
          console.error('Error deleting quote items:', deleteQuoteItemsError)
        }
      }
    } catch (error) {
      console.error('Error handling quote items:', error)
    }

    // Finally delete the auth user
    console.log('Deleting auth user...')
    const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError)
      throw new Error(`Error deleting auth user: ${deleteUserError.message}`)
    }

    console.log('User deleted successfully')
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 