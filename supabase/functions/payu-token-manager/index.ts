import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface TokenRequest {
  action: 'get' | 'refresh' | 'validate';
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}

// Cache for tokens to avoid excessive API calls
const tokenCache = new Map<string, { token: TokenResponse; expiresAt: number }>();

serve(async (req) => {
  console.log("🔵 === PAYU TOKEN MANAGER FUNCTION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json();
    const { action, clientId, clientSecret, scope = 'create_payment_links' }: TokenRequest = body;

    console.log("🔵 Token request:", { action, scope, hasClientId: !!clientId });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PayU configuration from database
    const { data: payuGateway, error: configError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (configError || !payuGateway) {
      console.error("❌ PayU gateway config missing:", configError);
      return new Response(JSON.stringify({ 
        error: 'PayU gateway configuration not found' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    
    // Use provided credentials or fall back to config
    const finalClientId = clientId || config.client_id;
    const finalClientSecret = clientSecret || config.client_secret;
    
    if (!finalClientId || !finalClientSecret) {
      console.error("❌ PayU OAuth credentials missing");
      return new Response(JSON.stringify({ 
        error: 'PayU OAuth credentials not configured. Please add client_id and client_secret to PayU gateway config.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const cacheKey = `${finalClientId}_${scope}`;
    const baseUrl = testMode ? 'https://uat-accounts.payu.in' : 'https://accounts.payu.in';

    switch (action) {
      case 'get':
        return await getToken(cacheKey, baseUrl, finalClientId, finalClientSecret, scope);
      
      case 'refresh':
        return await refreshToken(cacheKey, baseUrl, finalClientId, finalClientSecret, scope);
      
      case 'validate':
        return await validateToken(cacheKey);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use "get", "refresh", or "validate".' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

  } catch (error) {
    console.error("❌ Token manager error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Get or create a new access token
 */
async function getToken(
  cacheKey: string, 
  baseUrl: string, 
  clientId: string, 
  clientSecret: string, 
  scope: string
): Promise<Response> {
  console.log("🔵 Getting token for:", { cacheKey, scope });

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log("✅ Using cached token");
    return new Response(JSON.stringify({
      success: true,
      token: cached.token,
      cached: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Request new token from PayU
  console.log("🔵 Requesting new token from PayU...");
  
  try {
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope
      })
    });

    console.log("🔵 PayU token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ PayU token request failed:", errorText);
      return new Response(JSON.stringify({
        error: 'Failed to obtain access token from PayU',
        details: errorText,
        status: tokenResponse.status
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    console.log("✅ Token obtained successfully");

    // Add creation timestamp for tracking
    tokenData.created_at = Date.now();

    // Cache the token (expires 5 minutes before actual expiry for safety)
    const expiresAt = Date.now() + ((tokenData.expires_in - 300) * 1000);
    tokenCache.set(cacheKey, { token: tokenData, expiresAt });

    return new Response(JSON.stringify({
      success: true,
      token: tokenData,
      cached: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Error requesting token:", error);
    return new Response(JSON.stringify({
      error: 'Network error while requesting token',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Force refresh token (clear cache and get new)
 */
async function refreshToken(
  cacheKey: string, 
  baseUrl: string, 
  clientId: string, 
  clientSecret: string, 
  scope: string
): Promise<Response> {
  console.log("🔵 Forcing token refresh for:", cacheKey);
  
  // Clear cache
  tokenCache.delete(cacheKey);
  
  // Get new token
  return await getToken(cacheKey, baseUrl, clientId, clientSecret, scope);
}

/**
 * Validate current token
 */
async function validateToken(cacheKey: string): Promise<Response> {
  console.log("🔵 Validating token for:", cacheKey);

  const cached = tokenCache.get(cacheKey);
  if (!cached) {
    return new Response(JSON.stringify({
      valid: false,
      reason: 'No token found in cache'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const isValid = cached.expiresAt > Date.now();
  const timeRemaining = Math.max(0, cached.expiresAt - Date.now());

  return new Response(JSON.stringify({
    valid: isValid,
    token: isValid ? cached.token : null,
    expiresAt: cached.expiresAt,
    timeRemaining: timeRemaining,
    timeRemainingFormatted: formatDuration(timeRemaining)
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Helper function to format duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}