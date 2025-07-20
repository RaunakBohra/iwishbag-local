/**
 * Cloudflare Turnstile Server-Side Verification
 * 
 * This module provides utilities for verifying Turnstile tokens on the server side.
 * It should be used in Supabase Edge Functions or other server-side code.
 */

interface TurnstileVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  details?: {
    challengeTimestamp?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
  };
}

/**
 * Verify a Turnstile token server-side
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  if (!token) {
    return {
      success: false,
      error: 'No token provided',
    };
  }

  if (!secretKey) {
    return {
      success: false,
      error: 'No secret key provided',
    };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data: TurnstileVerificationResponse = await response.json();

    if (data.success) {
      return {
        success: true,
        details: {
          challengeTimestamp: data.challenge_ts,
          hostname: data.hostname,
          action: data.action,
          cdata: data.cdata,
        },
      };
    } else {
      const errorCodes = data['error-codes'] || [];
      const errorMessage = getTurnstileErrorMessage(errorCodes);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Convert Turnstile error codes to human-readable messages
 */
function getTurnstileErrorMessage(errorCodes: string[]): string {
  const errorMessages: Record<string, string> = {
    'missing-input-secret': 'The secret parameter is missing',
    'invalid-input-secret': 'The secret parameter is invalid or malformed',
    'missing-input-response': 'The response parameter is missing',
    'invalid-input-response': 'The response parameter is invalid or malformed',
    'bad-request': 'The request is invalid or malformed',
    'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously',
    'internal-error': 'An internal error happened while validating the response',
  };

  if (errorCodes.length === 0) {
    return 'Unknown verification error';
  }

  const messages = errorCodes.map(code => errorMessages[code] || `Unknown error: ${code}`);
  return messages.join(', ');
}

/**
 * Middleware for Express/Edge Functions to verify Turnstile tokens
 */
export function createTurnstileMiddleware(secretKey: string) {
  return async (request: Request): Promise<{ success: boolean; error?: string }> => {
    try {
      const body = await request.json();
      const token = body.turnstileToken || body['cf-turnstile-response'];
      
      if (!token) {
        return {
          success: false,
          error: 'Turnstile token is required',
        };
      }

      // Get client IP from headers
      const remoteIp = request.headers.get('cf-connecting-ip') || 
                      request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip');

      const result = await verifyTurnstileToken(token, secretKey, remoteIp || undefined);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Verification failed',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process verification request',
      };
    }
  };
}

/**
 * Check if Turnstile is enabled based on environment
 */
export function isTurnstileEnabled(): boolean {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return false;
  
  // Check environment variables (Vite style)
  const enableTurnstile = import.meta.env?.VITE_ENABLE_TURNSTILE === 'true';
  const isProduction = import.meta.env?.MODE === 'production';
  
  return enableTurnstile || isProduction;
}

/**
 * Turnstile widget configuration options
 */
export const TURNSTILE_CONFIG = {
  // Only render once per form - don't re-render on input changes
  STABLE_RENDERING: true,
  
  // Reset behavior
  RESET_ON_ERROR: true,
  RESET_ON_SUBMIT_FAILURE: true,
  RESET_ON_FORM_RESET: false, // Let form handle its own reset
  
  // UI behavior
  HIDE_WHEN_DISABLED: true,
  SHOW_LOADING_STATE: true,
  
  // Performance
  CACHE_VERIFICATION: true,
} as const;

/**
 * Get Turnstile site key from environment
 */
export function getTurnstileSiteKey(): string {
  const siteKey = import.meta.env?.VITE_TURNSTILE_SITE_KEY;
  
  if (!siteKey) {
    console.warn('Turnstile site key not found in environment variables');
    return '';
  }
  
  return siteKey;
}