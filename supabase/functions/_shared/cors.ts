/**
 * CORS Utility for Supabase Functions
 * 
 * This utility implements dynamic origin matching to handle multiple allowed origins
 * while respecting the CORS specification that requires only ONE origin in the
 * Access-Control-Allow-Origin header.
 */

/**
 * Get the appropriate allowed origin for the current request
 * 
 * @param req - The incoming request object
 * @returns The specific origin that should be returned in the Access-Control-Allow-Origin header
 */
export function getAllowedOrigin(req: Request): string {
  const requestOrigin = req.headers.get('origin');
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8080').split(',').map(origin => origin.trim());

  console.log('🔍 CORS Debug:', {
    requestOrigin,
    allowedOrigins,
    environmentVariable: Deno.env.get('ALLOWED_ORIGINS')
  });

  // Return the requesting origin if it's in our allowed list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    console.log('✅ Origin allowed:', requestOrigin);
    return requestOrigin;
  }

  // Default fallback - return the first allowed origin
  const fallbackOrigin = allowedOrigins[0] || 'https://iwishbag.com';
  console.log('⚠️ Using fallback origin:', fallbackOrigin, '(requested:', requestOrigin, ')');
  return fallbackOrigin;
}

/**
 * Create standard CORS headers with dynamic origin matching
 * 
 * @param req - The incoming request object
 * @param additionalMethods - Additional HTTP methods to allow (default: 'POST')
 * @returns Object containing the appropriate CORS headers
 */
export function createCorsHeaders(req: Request, additionalMethods: string[] = ['POST']): Record<string, string> {
  const methods = ['OPTIONS', ...additionalMethods].join(', ');
  
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-guest-checkout',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Create CORS headers for webhook endpoints (no CORS needed)
 * Webhooks are called by external services, not browsers
 * 
 * @returns Empty object (no CORS headers for webhooks)
 */
export function createWebhookHeaders(): Record<string, string> {
  return {};
}