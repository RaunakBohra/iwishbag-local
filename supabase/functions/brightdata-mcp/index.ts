import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrightDataRequest {
  tool: string;
  arguments: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tool, arguments: args }: BrightDataRequest = await req.json()
    
    // Map our tool names to Bright Data MCP tool names
    const toolMapping: Record<string, string> = {
      'amazon_product': 'web_data_amazon_product',
      'ebay_product': 'web_data_ebay_product', 
      'walmart_product': 'web_data_walmart_product',
      'bestbuy_product': 'web_data_bestbuy_products',
      'etsy_product': 'web_data_etsy_products',
      'zara_product': 'web_data_zara_products',
      'scrape_as_markdown': 'scrape_as_markdown'
    }

    const mcpToolName = toolMapping[tool] || tool
    
    // Get Bright Data API token from environment or fallback
    const apiToken = Deno.env.get('BRIGHTDATA_API_TOKEN') || 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b'
    if (!apiToken) {
      throw new Error('BRIGHTDATA_API_TOKEN not configured')
    }

    // Call Bright Data MCP using subprocess
    const command = new Deno.Command('npx', {
      args: ['@brightdata/mcp'],
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
      env: {
        'API_TOKEN': apiToken,
        'NODE_ENV': 'production'
      }
    })

    const child = command.spawn()
    
    // Prepare the MCP request
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: mcpToolName,
        arguments: args
      }
    }

    // Write the request to stdin
    const writer = child.stdin.getWriter()
    await writer.write(new TextEncoder().encode(JSON.stringify(mcpRequest) + '\n'))
    await writer.close()

    // Read the response
    const output = await child.output()
    
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr)
      throw new Error(`MCP call failed: ${errorText}`)
    }

    const responseText = new TextDecoder().decode(output.stdout)
    console.log('Raw MCP response:', responseText)

    // Parse the JSON-RPC response
    const lines = responseText.trim().split('\n')
    let mcpResponse = null
    
    // Find the result line (ignore progress notifications)
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.result) {
          mcpResponse = parsed
          break
        }
      } catch (e) {
        // Skip invalid JSON lines
        continue
      }
    }

    if (!mcpResponse || !mcpResponse.result) {
      throw new Error('No valid response from Bright Data MCP')
    }

    return new Response(
      JSON.stringify(mcpResponse.result), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Bright Data MCP Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})