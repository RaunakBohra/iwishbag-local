import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as OTPAuth from 'https://esm.sh/otpauth@9.1.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { action, code, secret, isBackup } = await req.json()

    switch (action) {
      case 'generate-secret': {
        // Generate a new secret
        const secret = OTPAuth.Secret.fromBase32(
          OTPAuth.Secret.fromBase32(
            OTPAuth.Utils.encodeBase32(crypto.getRandomValues(new Uint8Array(20)))
          ).base32
        )

        const totp = new OTPAuth.TOTP({
          issuer: 'iwishBag',
          label: user.email,
          secret: secret,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        })

        return new Response(
          JSON.stringify({
            secret: secret.base32,
            uri: totp.toString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify-code': {
        if (!code || !secret) {
          return new Response(
            JSON.stringify({ error: 'Missing code or secret' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        // Get MFA config from database
        const { data: mfaConfig, error: mfaError } = await supabaseClient
          .from('mfa_configurations')
          .select('totp_secret, backup_codes')
          .eq('user_id', user.id)
          .single()

        if (mfaError || !mfaConfig) {
          return new Response(
            JSON.stringify({ error: 'MFA not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        let verified = false

        if (isBackup) {
          // Verify backup code
          const backupCodes = mfaConfig.backup_codes || []
          const codeIndex = backupCodes.indexOf(code.toUpperCase())
          
          if (codeIndex !== -1) {
            verified = true
            
            // Remove used backup code
            backupCodes.splice(codeIndex, 1)
            
            await supabaseClient
              .from('mfa_configurations')
              .update({ backup_codes: backupCodes })
              .eq('user_id', user.id)
              
            // Log activity
            await supabaseClient
              .from('mfa_activity_log')
              .insert({
                user_id: user.id,
                activity_type: 'backup_code_used',
                success: true,
              })
          }
        } else {
          // Verify TOTP
          const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(mfaConfig.totp_secret),
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
          })

          // Check current and adjacent time windows
          const delta = totp.validate({ token: code, window: 1 })
          verified = delta !== null

          // Log activity
          await supabaseClient
            .from('mfa_activity_log')
            .insert({
              user_id: user.id,
              activity_type: 'totp_verification',
              success: verified,
            })
        }

        if (verified) {
          // Generate session token
          const sessionToken = crypto.randomUUID()
          
          await supabaseClient
            .from('mfa_sessions')
            .insert({
              user_id: user.id,
              session_token: sessionToken,
            })

          return new Response(
            JSON.stringify({ verified: true, sessionToken }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          return new Response(
            JSON.stringify({ verified: false, error: 'Invalid code' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})