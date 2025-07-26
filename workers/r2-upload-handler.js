// Cloudflare Worker for handling R2 uploads
// Deploy this to your Cloudflare Workers

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Verify authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      // Extract bucket and key from path
      // Expected format: /bucket-name/path/to/file
      const pathParts = path.slice(1).split('/');
      const bucketName = pathParts[0];
      const key = pathParts.slice(1).join('/');

      if (!bucketName || !key) {
        return new Response('Invalid path', { status: 400, headers: corsHeaders });
      }

      // Get the R2 bucket
      const bucket = env[bucketName.toUpperCase().replace(/-/g, '_')];
      if (!bucket) {
        return new Response('Bucket not found', { status: 404, headers: corsHeaders });
      }

      switch (request.method) {
        case 'PUT':
        case 'POST': {
          // Upload file
          const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
          const body = await request.arrayBuffer();
          
          // Parse metadata from headers
          const metadata = {};
          for (const [key, value] of request.headers) {
            if (key.startsWith('x-metadata-')) {
              metadata[key.replace('x-metadata-', '')] = value;
            }
          }

          await bucket.put(key, body, {
            httpMetadata: {
              contentType,
            },
            customMetadata: metadata,
          });

          return new Response(JSON.stringify({
            success: true,
            key,
            url: `https://${bucketName}.${env.R2_PUBLIC_DOMAIN}/${key}`,
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        case 'GET': {
          // Get file
          const object = await bucket.get(key);
          
          if (!object) {
            return new Response('Not found', { status: 404, headers: corsHeaders });
          }

          const headers = new Headers(object.httpMetadata);
          headers.set('etag', object.httpEtag);
          Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

          return new Response(object.body, { headers });
        }

        case 'DELETE': {
          // Delete file
          await bucket.delete(key);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        default:
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        success: false,
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};