import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req, ['GET', 'POST']);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Log all debug information
  const debugInfo = {
    method: req.method,
    url: req.url,
    origin: req.headers.get('origin'),
    environmentVariable: Deno.env.get('ALLOWED_ORIGINS'),
    parsedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8080')
      .split(',')
      .map((o) => o.trim()),
    corsHeaders: corsHeaders,
    timestamp: new Date().toISOString(),
  };

  console.log('🔍 CORS Debug Info:', JSON.stringify(debugInfo, null, 2));

  return new Response(
    JSON.stringify({
      message: 'CORS test successful',
      debug: debugInfo,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
