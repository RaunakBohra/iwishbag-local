import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
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

  try {
    const config: R2Config = {
      accountId: Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '610762493d34333f1a6d72a037b345cf',
      bucketName: 'iwishbag-new',
      apiToken: Deno.env.get('CLOUDFLARE_API_TOKEN') || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l'
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0)
    
    // Remove 'r2-upload' from path to get the action
    const action = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'POST': {
        if (action === 'upload') {
          // Handle file upload
          const formData = await req.formData()
          const file = formData.get('file') as File
          const folder = formData.get('folder') as string || 'uploads'
          
          if (!file) {
            return new Response(
              JSON.stringify({ error: 'No file provided' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Generate unique key
          const timestamp = Date.now()
          const uniqueId = Math.random().toString(36).substring(2, 9)
          const extension = file.name.split('.').pop()
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const key = `${folder}/${timestamp}-${uniqueId}-${sanitizedName}`

          // Upload to R2
          const arrayBuffer = await file.arrayBuffer()
          
          const uploadResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects/${key}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': file.type || 'application/octet-stream',
              },
              body: arrayBuffer
            }
          )

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.text()
            console.error('R2 upload failed:', errorData)
            return new Response(
              JSON.stringify({ error: `Upload failed: ${uploadResponse.status} ${errorData}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const result = await uploadResponse.json()
          
          return new Response(
            JSON.stringify({ 
              success: true,
              key,
              url: `/api/r2/${key}`, // We'll create a proxy endpoint for serving files
              size: file.size,
              contentType: file.type
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        break
      }

      case 'DELETE': {
        if (action === 'delete') {
          const { key } = await req.json()
          
          if (!key) {
            return new Response(
              JSON.stringify({ error: 'No key provided' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects/${key}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${config.apiToken}`,
              }
            }
          )

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.text()
            return new Response(
              JSON.stringify({ error: `Delete failed: ${deleteResponse.status} ${errorData}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'GET': {
        if (action === 'list') {
          const prefix = url.searchParams.get('prefix') || ''
          
          const listUrl = new URL(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/buckets/${config.bucketName}/objects`)
          if (prefix) {
            listUrl.searchParams.set('prefix', prefix)
          }

          const listResponse = await fetch(listUrl.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
            }
          })

          if (!listResponse.ok) {
            const errorData = await listResponse.text()
            return new Response(
              JSON.stringify({ error: `List failed: ${listResponse.status} ${errorData}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const data = await listResponse.json()
          
          const files = data.result.map((obj: any) => ({
            name: obj.key.split('/').pop() || obj.key,
            size: obj.size,
            lastModified: new Date(obj.uploaded),
            key: obj.key,
            url: `/api/r2/${obj.key}`
          }))

          return new Response(
            JSON.stringify({ success: true, files }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('R2 function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})