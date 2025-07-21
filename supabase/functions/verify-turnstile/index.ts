import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TurnstileVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface RequestBody {
  token: string;
  action?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get environment variables
    const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY');

    if (!TURNSTILE_SECRET_KEY) {
      console.error('TURNSTILE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { token, action } = body;

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Get client IP
    const remoteIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip');

    // Verify with Cloudflare
    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const verificationResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!verificationResponse.ok) {
      throw new Error(`Cloudflare API error: ${verificationResponse.status}`);
    }

    const verificationData: TurnstileVerificationResponse = await verificationResponse.json();

    // Log verification attempt (for monitoring)
    console.log('Turnstile verification:', {
      success: verificationData.success,
      action: action || 'unknown',
      hostname: verificationData.hostname,
      timestamp: new Date().toISOString(),
      ip: remoteIp,
    });

    if (verificationData.success) {
      return new Response(
        JSON.stringify({
          success: true,
          details: {
            challengeTimestamp: verificationData.challenge_ts,
            hostname: verificationData.hostname,
            action: verificationData.action,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    } else {
      const errorCodes = verificationData['error-codes'] || [];
      const errorMessage = getErrorMessage(errorCodes);

      // Log failed verification
      console.warn('Turnstile verification failed:', {
        errorCodes,
        action: action || 'unknown',
        hostname: verificationData.hostname,
        timestamp: new Date().toISOString(),
        ip: remoteIp,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          errorCodes,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
});

function getErrorMessage(errorCodes: string[]): string {
  const errorMessages: Record<string, string> = {
    'missing-input-secret': 'Server configuration error',
    'invalid-input-secret': 'Server configuration error',
    'missing-input-response': 'Security verification is required',
    'invalid-input-response': 'Security verification failed. Please try again.',
    'bad-request': 'Invalid request. Please refresh and try again.',
    'timeout-or-duplicate': 'Security verification expired. Please try again.',
    'internal-error': 'Verification service temporarily unavailable. Please try again.',
  };

  if (errorCodes.length === 0) {
    return 'Security verification failed';
  }

  const messages = errorCodes.map((code) => errorMessages[code] || 'Security verification failed');

  return messages[0]; // Return first (most relevant) error message
}
