import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface R2Config {
  accountId: string;
  bucketName: string;
  apiToken: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '610762493d34333f1a6d72a037b345cf',
      bucketName: 'iwishbag-new',
      apiToken: Deno.env.get('CLOUDFLARE_API_TOKEN') || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l'
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0)
    
    // Remove 'r2-proxy' from path to get the file key
    const key = pathSegments.slice(1).join('/')
    
    if (!key) {
      return new Response('File key required', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get file from R2
    const r2Response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects/${key}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
        }
      }
    )

    if (!r2Response.ok) {
      if (r2Response.status === 404) {
        return new Response('File not found', { 
          status: 404, 
          headers: corsHeaders 
        })
      }
      
      return new Response('Failed to fetch file', { 
        status: r2Response.status, 
        headers: corsHeaders 
      })
    }

    // Get the file content and metadata
    const fileContent = await r2Response.arrayBuffer()
    const contentType = r2Response.headers.get('Content-Type') || 'application/octet-stream'
    const contentLength = r2Response.headers.get('Content-Length')
    const etag = r2Response.headers.get('ETag')
    
    // Set appropriate headers for the response
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    }
    
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }
    
    if (etag) {
      responseHeaders['ETag'] = etag
    }

    return new Response(fileContent, {
      status: 200,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('R2 proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})