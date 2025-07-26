/**
 * Cloudflare Worker for handling quote request file uploads to R2
 * 
 * This worker handles file uploads from the quote request form,
 * storing them in R2 with proper organization and metadata
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    
    try {
      // Upload quote file
      if (url.pathname === "/upload/quote" && request.method === "POST") {
        return await handleQuoteUpload(request, env);
      }
      
      // Get file (with caching)
      if (url.pathname.startsWith("/files/") && request.method === "GET") {
        return await handleFileGet(request, env, ctx);
      }
      
      // Delete file
      if (url.pathname.startsWith("/files/") && request.method === "DELETE") {
        return await handleFileDelete(request, env);
      }
      
      // List files for a quote
      if (url.pathname.startsWith("/quote/") && url.pathname.endsWith("/files")) {
        return await handleListQuoteFiles(request, env);
      }
      
      return new Response("Not found", { status: 404 });
      
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};

async function handleQuoteUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get("file");
  const sessionId = formData.get("sessionId") || crypto.randomUUID();
  const productIndex = formData.get("productIndex") || "0";
  
  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return new Response(JSON.stringify({ error: "File size must be less than 10MB" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  
  // Generate organized file path
  const timestamp = Date.now();
  const uniqueId = crypto.randomUUID().split('-')[0];
  const extension = file.name.split('.').pop();
  const fileName = `${timestamp}-${uniqueId}.${extension}`;
  
  // Organize by date and session
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const key = `quote-requests/${year}/${month}/${day}/${sessionId}/product-${productIndex}/${fileName}`;
  
  // Upload to R2
  await env.IWISHBAG_NEW.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
    customMetadata: {
      originalName: file.name,
      sessionId: sessionId,
      productIndex: productIndex,
      uploadedAt: new Date().toISOString(),
      fileSize: String(file.size),
    }
  });
  
  // Generate public URL
  const publicUrl = `https://r2.whyteclub.com/${key}`;
  
  // Log upload for analytics (optional)
  ctx.waitUntil(logUpload(env, {
    key,
    sessionId,
    fileSize: file.size,
    fileType: file.type,
    timestamp: new Date().toISOString(),
  }));
  
  return new Response(JSON.stringify({
    success: true,
    key,
    url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handleFileGet(request, env, ctx) {
  const url = new URL(request.url);
  const key = url.pathname.replace("/files/", "");
  
  // Try to get from cache first
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const cachedResponse = await cache.match(cacheKey);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Get from R2
  const object = await env.IWISHBAG_NEW.get(key);
  
  if (!object) {
    return new Response("File not found", {
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
  
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000"); // 1 year
  headers.set("Access-Control-Allow-Origin", "*");
  
  // Add content disposition for downloads
  if (object.customMetadata?.originalName) {
    headers.set("Content-Disposition", `inline; filename="${object.customMetadata.originalName}"`);
  }
  
  const response = new Response(object.body, { headers });
  
  // Cache the response
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  
  return response;
}

async function handleFileDelete(request, env) {
  const url = new URL(request.url);
  const key = url.pathname.replace("/files/", "");
  
  await env.IWISHBAG_NEW.delete(key);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handleListQuoteFiles(request, env) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const sessionId = pathParts[2];
  
  const prefix = `quote-requests/${sessionId}/`;
  const list = await env.IWISHBAG_NEW.list({ prefix, limit: 100 });
  
  const files = list.objects.map(obj => ({
    key: obj.key,
    url: `https://r2.whyteclub.com/${obj.key}`,
    size: obj.size,
    uploaded: obj.uploaded,
    metadata: obj.customMetadata,
  }));
  
  return new Response(JSON.stringify({ files }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Analytics logging (optional)
async function logUpload(env, data) {
  // You can log to KV, D1, or external analytics
  if (env.IWISHBAG_CACHE) {
    const today = new Date().toISOString().split('T')[0];
    const key = `upload-stats:${today}`;
    
    // Get current stats
    const current = await env.IWISHBAG_CACHE.get(key, "json") || { count: 0, totalSize: 0 };
    
    // Update stats
    current.count++;
    current.totalSize += data.fileSize;
    
    // Save back
    await env.IWISHBAG_CACHE.put(key, JSON.stringify(current), {
      expirationTtl: 86400 * 30 // 30 days
    });
  }
}