/**
 * Cloudflare Worker for Bright Data MCP Integration
 * Simplified implementation using proper Bright Data MCP tools with PRO_MODE
 */

export interface Env {
  BRIGHTDATA_API_TOKEN: string;
}

interface BrightDataRequest {
  tool: string;
  arguments: any;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    console.log(`🚀 [${requestId}] Request started at ${new Date().toISOString()}`);
    console.log(`📍 [${requestId}] Method: ${request.method}, URL: ${request.url}`);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      console.log(`✅ [${requestId}] CORS preflight handled`);
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        console.log(`❌ [${requestId}] Method not allowed: ${request.method}`);
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders 
        });
      }

      const requestBody = await request.json();
      const { tool, arguments: args }: BrightDataRequest = requestBody;
      
      console.log(`📦 [${requestId}] Request body:`, JSON.stringify(requestBody, null, 2));
      console.log(`🔧 [${requestId}] Tool: ${tool}, URL: ${args?.url || 'N/A'}`);
      
      // Map our tool names to proper Bright Data MCP tool names (PRO_MODE enabled)
      const toolMapping: Record<string, string> = {
        'amazon_product': 'web_data_amazon_product',
        'myntra_product': 'myntra_product', // Custom Myntra dataset implementation
        'flipkart_product': 'flipkart_product', // Custom Flipkart dataset implementation
        'target_product': 'target_product', // Custom Target implementation
        'hm_product': 'hm_product', // Custom H&M implementation
        'asos_product': 'asos_product', // Custom ASOS implementation
        'ae_product': 'ae_product', // Custom American Eagle implementation
        'etsy_product': 'etsy_product', // Custom Etsy implementation
        'zara_product': 'zara_product', // Custom Zara implementation
        'lego_product': 'lego_product', // Custom LEGO implementation
        'hermes_product': 'hermes_product', // Custom Hermes implementation
        'toysrus_product': 'toysrus_product', // Custom Toys"R"Us implementation
        'carters_product': 'carters_product', // Custom Carter's implementation
        'prada_product': 'prada_product', // Custom Prada implementation
        'ysl_product': 'ysl_product', // Custom YSL implementation
        'balenciaga_product': 'balenciaga_product', // Custom Balenciaga implementation
        'dior_product': 'dior_product', // Custom Dior implementation
        'chanel_product': 'chanel_product', // Custom Chanel implementation
        'bestbuy_product': 'web_data_bestbuy_products',
        'ebay_product': 'ebay_product', // Custom eBay implementation 
        'walmart_product': 'web_data_walmart_product',
        'scrape_as_markdown': 'scrape_as_markdown'
      };

      const mcpToolName = toolMapping[tool] || tool;
      console.log(`🎯 [${requestId}] Mapped tool: ${tool} → ${mcpToolName}`);
      
      // Handle Target with custom implementation
      if (tool === 'target_product') {
        console.log(`🎯 [${requestId}] Using custom Target implementation`);
        const targetApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const targetResult = await callTargetProductAPI(args?.url, targetApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Target request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(targetResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle H&M with custom implementation
      if (tool === 'hm_product') {
        console.log(`👕 [${requestId}] Using custom H&M implementation`);
        const hmApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const hmResult = await callHMProductAPI(args?.url, hmApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] H&M request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(hmResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle ASOS with custom implementation
      if (tool === 'asos_product') {
        console.log(`👗 [${requestId}] Using custom ASOS implementation`);
        const asosApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const asosResult = await callASOSProductAPI(args?.url, asosApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] ASOS request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(asosResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle American Eagle with custom implementation
      if (tool === 'ae_product') {
        console.log(`🦅 [${requestId}] Using custom American Eagle implementation`);
        const aeApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const aeResult = await callAEProductAPI(args?.url, aeApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] American Eagle request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(aeResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Etsy with custom implementation
      if (tool === 'etsy_product') {
        console.log(`🎨 [${requestId}] Using custom Etsy implementation`);
        const etsyApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const etsyResult = await callEtsyProductAPI(args?.url, etsyApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Etsy request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(etsyResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Zara with custom implementation
      if (tool === 'zara_product') {
        console.log(`👗 [${requestId}] Using custom Zara implementation`);
        const zaraApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const zaraResult = await callZaraProductAPI(args?.url, zaraApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Zara request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(zaraResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle LEGO with custom implementation
      if (tool === 'lego_product') {
        console.log(`🧱 [${requestId}] Using custom LEGO implementation`);
        const legoApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const legoResult = await callLegoProductAPI(args?.url, legoApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] LEGO request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(legoResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Hermes with custom implementation
      if (tool === 'hermes_product') {
        console.log(`💎 [${requestId}] Using custom Hermes implementation`);
        const hermesApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const hermesResult = await callHermesProductAPI(args?.url, hermesApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Hermes request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(hermesResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Toys"R"Us with custom implementation
      if (tool === 'toysrus_product') {
        console.log(`🧸 [${requestId}] Using custom Toys"R"Us implementation`);
        const toysrusApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const toysrusResult = await callToysrusProductAPI(args?.url, toysrusApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Toys"R"Us request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(toysrusResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Carter's with custom implementation
      if (tool === 'carters_product') {
        console.log(`👶 [${requestId}] Using custom Carter's implementation`);
        const cartersApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const cartersResult = await callCartersProductAPI(args?.url, cartersApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Carter's request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(cartersResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Prada with custom implementation
      if (tool === 'prada_product') {
        console.log(`👜 [${requestId}] Using custom Prada implementation`);
        const pradaApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const pradaResult = await callPradaProductAPI(args?.url, pradaApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Prada request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(pradaResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle YSL with custom implementation
      if (tool === 'ysl_product') {
        console.log(`💄 [${requestId}] Using custom YSL implementation`);
        const yslApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const yslResult = await callYSLProductAPI(args?.url, yslApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] YSL request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(yslResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Balenciaga with custom implementation
      if (tool === 'balenciaga_product') {
        console.log(`🏃 [${requestId}] Using custom Balenciaga implementation`);
        const balApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const balResult = await callBalenciagaProductAPI(args?.url, balApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Balenciaga request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(balResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Dior with custom implementation
      if (tool === 'dior_product') {
        console.log(`👑 [${requestId}] Using custom Dior implementation`);
        const diorApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const diorResult = await callDiorProductAPI(args?.url, diorApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Dior request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(diorResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Chanel with custom implementation
      if (tool === 'chanel_product') {
        console.log(`💎 [${requestId}] Using custom Chanel implementation`);
        const chanelApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const chanelResult = await callChanelProductAPI(args?.url, chanelApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Chanel request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(chanelResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle eBay with custom implementation
      if (tool === 'ebay_product') {
        console.log(`🛍️ [${requestId}] Using custom eBay implementation`);
        const ebayApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const ebayResult = await callEbayProductAPI(args?.url, ebayApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] eBay request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(ebayResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Myntra with custom implementation
      if (tool === 'myntra_product') {
        console.log(`👗 [${requestId}] Using custom Myntra implementation`);
        const myntraApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const myntraResult = await callMyntraProductAPI(args?.url, myntraApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Myntra request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(myntraResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Handle Flipkart with custom dataset implementation
      if (tool === 'flipkart_product') {
        console.log(`🛒 [${requestId}] Using custom Flipkart dataset implementation`);
        const flipkartApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        const flipkartResult = await callFlipkartProductAPI(args?.url, flipkartApiToken, requestId);
        
        const duration = Date.now() - startTime;
        console.log(`✅ [${requestId}] Flipkart request completed in ${duration}ms`);
        
        return new Response(
          JSON.stringify(flipkartResult),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              'X-Duration-Ms': duration.toString(),
            },
          }
        );
      }
      
      // Get API token from environment (fallback to hardcoded for testing)
      const apiToken = env.BRIGHTDATA_API_TOKEN || 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
      
      console.log(`🔑 [${requestId}] API token available: ${apiToken.substring(0, 10)}...`);

      // Special handling for scraping_browser tool - add site-specific parameters
      if (mcpToolName === 'scraping_browser') {
        console.log(`🤖 [${requestId}] Using Bright Data scraping_browser for ${tool}`);
        
        // Add site-specific scraping parameters
        if (tool === 'flipkart_product') {
          args.country = 'IN'; // Use Indian residential proxies
          args.render = true; // Enable JavaScript rendering
          args.wait_for = 3000; // Wait for Flipkart to load
          args.session_id = `flipkart_${requestId}`;
        } else if (tool === 'myntra_product') {
          args.country = 'IN'; // Use Indian residential proxies  
          args.render = true;
          args.wait_for = 2000;
          args.session_id = `myntra_${requestId}`;
        }
        // Target is handled separately above
        
        console.log(`⚙️ [${requestId}] Enhanced args for ${tool}:`, JSON.stringify(args));
      }

      // Call Bright Data MCP using proper API
      console.log(`🌐 [${requestId}] Calling Bright Data MCP...`);
      const mcpResult = await callBrightDataMCP(mcpToolName, args, apiToken, requestId);

      const duration = Date.now() - startTime;
      console.log(`✅ [${requestId}] Request completed successfully in ${duration}ms`);
      console.log(`📤 [${requestId}] Response size: ${JSON.stringify(mcpResult).length} chars`);

      return new Response(
        JSON.stringify(mcpResult),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Duration-Ms': duration.toString(),
          },
        }
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💥 [${requestId}] Request failed after ${duration}ms:`, error);
      console.error(`💥 [${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
          requestId: requestId,
          duration: duration
        }),
        { 
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Duration-Ms': duration.toString(),
          },
        }
      );
    }
  },
};

/**
 * Call Bright Data MCP tool via proper HTTP API (PRO_MODE enabled)
 * Uses actual Bright Data MCP tools instead of custom implementations
 */
async function callBrightDataMCP(toolName: string, args: any, apiToken: string, requestId: string) {
  try {
    console.log(`🔍 [${requestId}] callBrightDataMCP - Tool: ${toolName}, Args:`, JSON.stringify(args));
    
    // Use the actual Bright Data API endpoint for the specified tool
    const apiEndpoint = getBrightDataAPIEndpoint(toolName);
    console.log(`🌐 [${requestId}] Using API endpoint: ${apiEndpoint}`);
    
    // For scraping_browser, use the browser automation API
    if (toolName === 'scraping_browser') {
      return await callScrapingBrowserAPI(args, apiToken, requestId);
    }
    
    // For dataset APIs, use the trigger/monitor workflow
    if (apiEndpoint.includes('/datasets/v3/trigger')) {
      return await callDatasetAPI(args, apiToken, requestId, toolName);
    }
    
    // Default fallback - shouldn't reach here with current mapping
    throw new Error(`Unsupported tool: ${toolName}`);
    
  } catch (error) {
    console.error(`💥 [${requestId}] MCP call failed:`, error);
    throw error;
  }
}

/**
 * Call Bright Data Scraping Browser API
 */
async function callScrapingBrowserAPI(args: any, apiToken: string, requestId: string) {
  console.log(`🤖 [${requestId}] Using Bright Data Scraping Browser API`);
  
  const payload = {
    url: args.url,
    country: args.country || 'US',
    format: 'json',
    render: args.render || true,
    wait_for: args.wait_for || 2000,
    session_id: args.session_id || requestId,
    instructions: [
      'Extract product data including title, price, images, and specifications',
      'Parse structured data (JSON-LD, microdata)',
      'Get meta tags for Open Graph and Twitter Card data'
    ]
  };
  
  console.log(`📡 [${requestId}] Scraping Browser payload:`, JSON.stringify(payload));
  
  // Try the Web Scraper API instead of scraping-browser
  const response = await fetch('https://api.brightdata.com/scraper-api/collect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Scraping Browser API failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`✅ [${requestId}] Scraping Browser API successful`);
  
  return {
    content: [{
      text: JSON.stringify([result])
    }]
  };
}

/**
 * Call Bright Data Dataset API with trigger/monitor workflow
 */
async function callDatasetAPI(args: any, apiToken: string, requestId: string, toolName: string) {
  console.log(`📊 [${requestId}] Using Bright Data Dataset API for ${toolName}`);
  
  // Get dataset ID for the tool
  const datasetId = getDatasetId(toolName);
  if (!datasetId) {
    throw new Error(`No dataset ID found for tool: ${toolName}`);
  }
  
  console.log(`🆔 [${requestId}] Using dataset ID: ${datasetId}`);
  
  // Trigger data collection
  const triggerResponse = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ url: args.url }])
  });
  
  if (!triggerResponse.ok) {
    throw new Error(`Dataset trigger failed: ${triggerResponse.status} ${triggerResponse.statusText}`);
  }
  
  const triggerResult = await triggerResponse.json();
  console.log(`📋 [${requestId}] Dataset triggered:`, triggerResult);
  
  if (!triggerResult.snapshot_id) {
    throw new Error('No snapshot_id received from dataset trigger');
  }
  
  // Monitor and download results with proper polling
  const snapshotId = triggerResult.snapshot_id;
  
  // Poll for completion
  const data = await waitForDatasetResults(snapshotId, apiToken, requestId);
  console.log(`📥 [${requestId}] Downloaded ${data.length || 0} records`);
  
  return {
    content: [{
      text: JSON.stringify(data)
    }]
  };
}

/**
 * Wait for dataset results with proper polling
 */
async function waitForDatasetResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for dataset collection to complete (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Dataset polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      console.error(`❌ [${requestId}] Progress check failed: ${progressResponse.status}`);
      await new Promise(resolve => setTimeout(resolve, config.interval));
      continue;
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      // Data is ready, download it
      console.log(`✅ [${requestId}] Data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Data download failed: ${dataResponse.status}`);
      }
      
      const data = await dataResponse.json();
      return data;
      
    } else if (progressResult.status === 'failed') {
      throw new Error(`Dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Dataset collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Get the correct Bright Data API endpoint for each tool
 */
function getBrightDataAPIEndpoint(toolName: string): string {
  const endpoints: Record<string, string> = {
    'web_data_amazon_product': 'https://api.brightdata.com/datasets/v3/trigger',
    'web_data_ebay_product': 'https://api.brightdata.com/datasets/v3/trigger', 
    'web_data_walmart_product': 'https://api.brightdata.com/datasets/v3/trigger',
    'web_data_bestbuy_products': 'https://api.brightdata.com/datasets/v3/trigger',
    'scraping_browser': 'https://api.brightdata.com/scraper-api/collect',
    'scrape_as_markdown': 'https://api.brightdata.com/scraper-api/collect'
  };
  
  return endpoints[toolName] || 'https://api.brightdata.com/scraper-api/collect';
}

/**
 * Get dataset ID for specific tools (real dataset IDs from BrightData account)
 */
function getDatasetId(toolName: string): string | null {
  const datasetIds: Record<string, string> = {
    'web_data_amazon_product': 'gd_l7q7dkf244hwjntr0',
    'web_data_ebay_product': 'gd_ltr9mjt81n0zzdk1fb',
    'web_data_bestbuy_products': 'gd_ltre1jqe1jfr7cccf',
    'web_data_walmart_product': 'your_walmart_dataset_id' // Not provided
    // 'flipkart_product': Uses DCA API with collector c_mdy5p87619oyypd0k3
  };
  
  return datasetIds[toolName] || null;
}

/**
 * Target Product API Implementation
 * Uses Bright Data Datasets API with Target dataset: gd_ltppk5mx2lp0v1k0vo
 */
async function callTargetProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🎯 [${requestId}] Starting Target product scraping for: ${url}`);
    
    // Trigger data collection using Target dataset
    const datasetId = 'gd_ltppk5mx2lp0v1k0vo'; // Target dataset ID
    const triggerResult = await triggerTargetBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from Target dataset trigger');
    }
    
    console.log(`📋 [${requestId}] Target data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForTargetBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadTargetBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapTargetDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] Target scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Target API call failed:`, error);
    throw new Error(`Target scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Target data collection using Bright Data Datasets API
 */
async function triggerTargetBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering Target data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Target dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] Target trigger response:`, result);
  
  return result;
}

/**
 * Wait for Target Bright Data results with polling
 */
async function waitForTargetBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for Target data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Target polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Target progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Target progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Target data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Target data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Target data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download Target Bright Data results
 */
async function downloadTargetBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading Target results...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`Target data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📥 [${requestId}] Downloaded ${data.length || 0} Target records`);
  
  return data;
}

/**
 * Map Target data to our expected product data format
 */
function mapTargetDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Target data to product format...`);
  
  return {
    title: rawData.title || rawData.product_title || rawData.name,
    final_price: rawData.final_price || rawData.price || rawData.current_price,
    initial_price: rawData.initial_price || rawData.original_price || rawData.list_price,
    currency: rawData.currency || 'USD',
    images: rawData.images || rawData.image_urls || [],
    brand: rawData.brand || rawData.manufacturer,
    specifications: rawData.specifications || rawData.product_specifications || [],
    availability: rawData.availability || rawData.stock_status,
    weight: rawData.weight || rawData.shipping_weight,
    rating: rawData.rating || rawData.average_rating,
    reviews_count: rawData.reviews_count || rawData.total_reviews,
    highlights: rawData.highlights || rawData.key_features || [],
    product_description: rawData.product_description || rawData.description,
    breadcrumbs: rawData.breadcrumbs || [],
    category: rawData.category || rawData.product_category,
    sku: rawData.sku || rawData.product_id,
    model: rawData.model || rawData.model_number,
    url: url,
    source: 'target-dataset'
  };
}

/**
 * H&M Product API Implementation
 * Uses Bright Data Datasets API with H&M dataset: gd_lebec5ir293umvxh5g
 */
async function callHMProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👕 [${requestId}] Starting H&M product scraping for: ${url}`);
    
    // Trigger data collection using H&M dataset
    const datasetId = 'gd_lebec5ir293umvxh5g'; // H&M dataset ID
    const triggerResult = await triggerHMBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from H&M dataset trigger');
    }
    
    console.log(`📋 [${requestId}] H&M data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForHMBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadHMBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapHMDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] H&M scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] H&M API call failed:`, error);
    throw new Error(`H&M scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger H&M data collection using Bright Data Datasets API
 */
async function triggerHMBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering H&M data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`H&M dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] H&M trigger response:`, result);
  
  return result;
}

/**
 * Wait for H&M Bright Data results with polling
 */
async function waitForHMBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for H&M data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] H&M polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`H&M progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] H&M progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] H&M data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`H&M data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`H&M data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download H&M Bright Data results
 */
async function downloadHMBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading H&M results...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`H&M data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📥 [${requestId}] Downloaded ${data.length || 0} H&M records`);
  
  return data;
}

/**
 * Map H&M data to our expected product data format
 */
function mapHMDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping H&M data to product format...`);
  
  return {
    title: rawData.product_name || rawData.title || rawData.name,
    final_price: rawData.final_price || rawData.price || rawData.current_price,
    initial_price: rawData.initial_price || rawData.original_price,
    currency: rawData.currency || 'USD',
    images: rawData.image_urls || rawData.images || [],
    brand: rawData.brand || rawData.manufacturer || 'H&M',
    specifications: rawData.specifications || [],
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    rating: rawData.rating || rawData.average_rating,
    reviews_count: rawData.reviews_count || rawData.total_reviews,
    highlights: rawData.highlights || rawData.features || [],
    product_description: rawData.description || rawData.product_description,
    category: rawData.category || rawData.product_category,
    color: rawData.color,
    size: rawData.size,
    product_code: rawData.product_code,
    seller_name: rawData.seller_name,
    country_code: rawData.country_code,
    county_of_origin: rawData.county_of_origin,
    category_tree: rawData.category_tree || [],
    url: url,
    source: 'hm-dataset'
  };
}

/**
 * ASOS Product API Implementation
 * Uses Bright Data Datasets API with dataset: gd_ldbg7we91cp53nr2z4
 */
async function callASOSProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👗 [${requestId}] Starting ASOS product scraping for: ${url}`);
    
    // Trigger data collection using ASOS dataset
    const datasetId = 'gd_ldbg7we91cp53nr2z4'; // ASOS dataset ID
    const triggerResult = await triggerASOSBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from ASOS dataset trigger');
    }
    
    console.log(`📋 [${requestId}] ASOS data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForASOSBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadASOSBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapASOSDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] ASOS scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] ASOS API call failed:`, error);
    throw new Error(`ASOS scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger ASOS data collection using Bright Data Datasets API
 */
async function triggerASOSBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering ASOS data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ASOS dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] ASOS trigger response:`, result);
  
  return result;
}

/**
 * Wait for ASOS Bright Data results with polling
 */
async function waitForASOSBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for ASOS data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] ASOS polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`ASOS progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] ASOS progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] ASOS data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`ASOS data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`ASOS data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download ASOS Bright Data results
 */
async function downloadASOSBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading ASOS data...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`ASOS data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📊 [${requestId}] Downloaded ${data.length || 0} ASOS records`);
  
  return data;
}

/**
 * Map raw ASOS data to our product data format
 */
function mapASOSDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping ASOS data to product format...`);
  
  return {
    title: rawData.name || rawData.product_name || rawData.title,
    final_price: rawData.price || rawData.final_price || rawData.current_price,
    initial_price: rawData.original_price || rawData.initial_price,
    currency: rawData.currency || 'USD',
    images: rawData.image || rawData.image_urls || rawData.images || [],
    brand: rawData.brand || 'ASOS',
    specifications: rawData.specifications || [],
    availability: rawData.availability === 'in stock' ? 'in-stock' : 'out-of-stock',
    rating: rawData.rating || rawData.average_rating,
    reviews_count: rawData.reviews_count || rawData.total_reviews,
    highlights: rawData.highlights || rawData.features || [],
    product_description: rawData.description || rawData.product_details || rawData.about_me,
    category: rawData.category || rawData.product_category,
    color: rawData.color,
    size: rawData.possible_sizes,
    product_code: rawData.product_id,
    seller_name: rawData.seller_name,
    material: rawData.about_me,
    care_instructions: rawData.look_after_me,
    size_fit: rawData.size_fit,
    discount: rawData.discount,
    county_of_origin: rawData.county_of_origin,
    category_tree: rawData.breadcrumbs || [],
    url: url,
    source: 'asos-dataset'
  };
}

/**
 * American Eagle Product API Implementation
 * Uses Bright Data Datasets API with dataset: gd_le6plu065keypwyir
 */
async function callAEProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🦅 [${requestId}] Starting American Eagle product scraping for: ${url}`);
    
    // Trigger data collection using American Eagle dataset
    const datasetId = 'gd_le6plu065keypwyir'; // American Eagle dataset ID
    const triggerResult = await triggerAEBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from AE dataset trigger');
    }
    
    console.log(`📋 [${requestId}] AE data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const data = await waitForAEBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    console.log(`📥 [${requestId}] AE data collection completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify(data)
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] AE product API call failed:`, error);
    return {
      content: [{
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'American Eagle scraping failed',
          status: 'failed'
        })
      }]
    };
  }
}

/**
 * Trigger American Eagle Bright Data collection
 */
async function triggerAEBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`🚀 [${requestId}] Triggering AE data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AE dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] AE trigger response:`, result);
  
  return result;
}

/**
 * Platform-specific polling configuration
 */
const POLLING_CONFIG = {
  'ae_product': {
    interval: 5 * 60 * 1000,  // 5 minutes
    maxAttempts: 6,           // 30 minutes total
    displayName: 'American Eagle',
    totalTimeout: '30 minutes'
  },
  'default': {
    interval: 15 * 1000,      // 15 seconds
    maxAttempts: 20,          // 5 minutes total  
    displayName: 'Platform',
    totalTimeout: '5 minutes'
  }
};

/**
 * Get polling configuration for a specific platform
 */
function getPollingConfig(platform: string) {
  return POLLING_CONFIG[platform] || POLLING_CONFIG['default'];
}

/**
 * Wait for American Eagle Bright Data results with platform-specific polling (5-minute intervals)
 */
async function waitForAEBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('ae_product');
  console.log(`⏳ [${requestId}] Waiting for ${config.displayName} data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] ${config.displayName} polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000/60}min intervals)...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      console.error(`❌ [${requestId}] ${config.displayName} progress check failed: ${progressResponse.status}`);
      await new Promise(resolve => setTimeout(resolve, config.interval));
      continue;
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] ${config.displayName} progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      // Data is ready, download it
      console.log(`✅ [${requestId}] ${config.displayName} data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`${config.displayName} data download failed: ${dataResponse.status}`);
      }
      
      const data = await dataResponse.json();
      console.log(`📥 [${requestId}] Downloaded ${data.length || 0} ${config.displayName} records`);
      
      return data;
      
    } else if (progressResult.status === 'failed') {
      throw new Error(`${config.displayName} dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for platform-specific interval before next poll
    console.log(`⏳ [${requestId}] Waiting ${config.interval/1000/60} minutes before next ${config.displayName} poll...`);
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`${config.displayName} dataset collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * eBay Product API Implementation
 * Uses Bright Data Datasets API with dataset: gd_ltr9mjt81n0zzdk1fb
 */
async function callEbayProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🛍️ [${requestId}] Starting eBay product scraping for: ${url}`);
    
    // Trigger data collection using eBay dataset
    const datasetId = 'gd_ltr9mjt81n0zzdk1fb'; // eBay dataset ID
    const triggerResult = await triggerEbayBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from eBay dataset trigger');
    }
    
    console.log(`📋 [${requestId}] eBay data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForEbayBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadEbayBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapEbayDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] eBay scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] eBay API call failed:`, error);
    throw new Error(`eBay scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger eBay data collection using Bright Data Datasets API
 */
async function triggerEbayBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering eBay data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] eBay trigger response:`, result);
  
  return result;
}

/**
 * Wait for eBay Bright Data results with polling
 */
async function waitForEbayBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for eBay data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] eBay polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`eBay progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] eBay progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] eBay data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`eBay data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`eBay data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download eBay Bright Data results
 */
async function downloadEbayBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading eBay data...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`eBay data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📊 [${requestId}] Downloaded ${data.length || 0} eBay records`);
  
  return data;
}

/**
 * Map raw eBay data to our product data format
 */
function mapEbayDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping eBay data to product format...`);
  
  // Parse price safely
  let priceNumber = 0;
  if (rawData.price) {
    const priceMatch = rawData.price.match(/[\d,.]+/);
    if (priceMatch) {
      priceNumber = parseFloat(priceMatch[0].replace(/,/g, ''));
    }
  }
  
  return {
    title: rawData.title || rawData.product_name || 'eBay Product',
    final_price: rawData.price || `$${priceNumber}`,
    price: priceNumber,
    currency: rawData.currency || 'USD',
    images: rawData.images || [],
    brand: rawData.product_specifications?.find((spec: any) => spec.specification_name === 'Brand')?.specification_value || 'Unknown Brand',
    specifications: rawData.product_specifications || [],
    availability: rawData.condition === 'New' || rawData.available_count > 0 ? 'in-stock' : 'unknown',
    rating: rawData.product_ratings || 0,
    reviews_count: rawData.item_reviews || 0,
    highlights: rawData.tags?.filter(Boolean) || [],
    product_description: rawData.description_from_the_seller || rawData.description_from_the_seller_parsed || '',
    category: rawData.root_category || 'general',
    seller_name: rawData.seller_name || '',
    seller_rating: rawData.seller_rating || '',
    seller_reviews: rawData.seller_reviews || '',
    condition: rawData.condition || 'Unknown',
    item_location: rawData.item_location || '',
    ships_to: rawData.ships_to || '',
    shipping: rawData.shipping || '',
    return_policy: rawData.return_policy || '',
    breadcrumbs: rawData.breadcrumbs || [],
    seller_total_reviews: rawData.seller_total_reviews || 0,
    seller_ratings: rawData.seller_ratings || [],
    amount_of_stars: rawData.amount_of_stars || [],
    url: url,
    source: 'ebay-dataset'
  };
}

/**
 * Flipkart Product API Implementation
 * Uses Bright Data DCA API with real collector: c_mdy5p87619oyypd0k3
 */
async function callFlipkartProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🛒 [${requestId}] Starting Flipkart product scraping for: ${url}`);
    
    // Use DCA API with the real collector
    const collectorId = 'c_mdy5p87619oyypd0k3';
    const triggerResult = await triggerFlipkartDCACollection(url, collectorId, apiToken, requestId);
    
    console.log(`📋 [${requestId}] Flipkart DCA collection triggered`);
    
    // Wait for results and download
    const finalData = await waitAndDownloadFlipkartDCAResults(triggerResult, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapFlipkartDataToProductData(finalData[0] || {}, url, requestId);
    
    console.log(`✅ [${requestId}] Flipkart scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Flipkart API call failed:`, error);
    throw new Error(`Flipkart scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Flipkart data collection using Bright Data DCA API
 */
async function triggerFlipkartDCACollection(url: string, collectorId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering Flipkart DCA collection...`);
  
  const response = await fetch(`https://api.brightdata.com/dca/trigger?queue_next=1&collector=${collectorId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flipkart DCA trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] DCA trigger response:`, result);
  
  return result;
}

/**
 * Wait for and download Flipkart DCA collection results
 * Simplified approach - DCA often returns results directly or needs simpler polling
 */
async function waitAndDownloadFlipkartDCAResults(triggerResult: any, apiToken: string, requestId: string) {
  console.log(`⏳ [${requestId}] Processing Flipkart DCA results...`);
  console.log(`📋 [${requestId}] Trigger result keys:`, Object.keys(triggerResult));
  
  // Check if results are returned directly
  if (triggerResult && Array.isArray(triggerResult)) {
    console.log(`📥 [${requestId}] Got direct array results: ${triggerResult.length} records`);
    return triggerResult;
  }
  
  if (triggerResult.data && Array.isArray(triggerResult.data) && triggerResult.data.length > 0) {
    console.log(`📥 [${requestId}] Got immediate DCA results: ${triggerResult.data.length} records`);
    return triggerResult.data;
  }
  
  // Check for direct data properties
  if (triggerResult.product_title || triggerResult.current_price) {
    console.log(`📥 [${requestId}] Got single product result directly`);
    return [triggerResult];
  }
  
  // If we have an ID, try a simpler polling approach
  const resultId = triggerResult.response_id || triggerResult.id || triggerResult.request_id || triggerResult.collection_id;
  
  if (!resultId) {
    console.log(`⚠️ [${requestId}] No result ID found, trying to use trigger result as-is`);
    // Sometimes DCA returns the data directly in an unexpected format
    return [triggerResult];
  }
  
  console.log(`🔍 [${requestId}] Polling for results with ID: ${resultId}`);
  
  // Simplified polling - use optimized intervals for DCA
  const config = getPollingConfig('default');
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] DCA polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    try {
      // Try the most common DCA result endpoint
      const resultResponse = await fetch(`https://api.brightdata.com/dca/results/${resultId}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      
      if (resultResponse.ok) {
        const data = await resultResponse.json();
        console.log(`📡 [${requestId}] DCA response status: ${resultResponse.status}, data type: ${typeof data}, length: ${Array.isArray(data) ? data.length : 'N/A'}`);
        
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          console.log(`📥 [${requestId}] Downloaded DCA results successfully`);
          return Array.isArray(data) ? data : [data];
        }
      } else {
        console.log(`⚠️ [${requestId}] DCA polling response: ${resultResponse.status} ${resultResponse.statusText}`);
      }
    } catch (error) {
      console.log(`⚠️ [${requestId}] DCA polling error:`, error);
    }
    
    // Wait for optimized interval before next attempt
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Flipkart DCA collection timeout after ${config.maxAttempts} attempts - no results received`);
}


/**
 * Map Flipkart data to our expected product data format
 * Processes data from the AI-generated Bright Data parser
 */
function mapFlipkartDataToProductData(rawData: any, url: string, requestId: string): any {
  console.log(`🔄 [${requestId}] Mapping Flipkart data to product format...`);
  
  // Clean price data - handle duplicates and extract first valid price
  let current_price_number = 0;
  let original_price_number = 0;
  let clean_current_price = '';
  let clean_original_price = '';
  
  if (rawData.current_price) {
    // Extract first price from potentially duplicated string like "₹23,999₹23,999₹260₹284"
    const priceMatches = rawData.current_price.match(/₹[\d,]+/g);
    if (priceMatches && priceMatches.length > 0) {
      clean_current_price = priceMatches[0];
      current_price_number = parseFloat(clean_current_price.replace(/₹|,/g, '')) || 0;
    }
  }
  
  if (rawData.original_price) {
    // Extract first price from potentially duplicated string
    const priceMatches = rawData.original_price.match(/₹[\d,]+/g);
    if (priceMatches && priceMatches.length > 0) {
      clean_original_price = priceMatches[0];
      original_price_number = parseFloat(clean_original_price.replace(/₹|,/g, '')) || 0;
    }
  }
  
  // Fix image URLs - prefer gallery images over main_image for better quality
  let images = [];
  let main_image = '';
  
  if (rawData.image_gallery && Array.isArray(rawData.image_gallery)) {
    images = rawData.image_gallery.map((img: string) => {
      if (img && !img.startsWith('http')) {
        return img.startsWith('//') ? 'https:' + img : 'https://rukminim1.flixcart.com' + img;
      }
      return img;
    }).filter(Boolean);
    
    // Use first gallery image as main image (usually higher quality)
    main_image = images[0] || rawData.main_image;
  }
  
  // Fallback to main_image if no gallery
  if (!main_image && rawData.main_image) {
    main_image = rawData.main_image;
    if (!main_image.startsWith('http')) {
      main_image = main_image.startsWith('//') ? 'https:' + main_image : 'https://rukminim1.flixcart.com' + main_image;
    }
    images = [main_image];
  }
  
  // Extract weight from specifications
  let weight_kg = 0;
  if (rawData.specifications && rawData.specifications.weight) {
    const weightStr = rawData.specifications.weight.replace(/[^\d.]/g, '');
    weight_kg = parseFloat(weightStr) || 0;
  }
  
  // Build specifications array
  let specifications = [];
  if (rawData.specifications) {
    Object.keys(rawData.specifications).forEach(key => {
      if (rawData.specifications[key]) {
        specifications.push({
          specification_name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          specification_value: rawData.specifications[key]
        });
      }
    });
  }
  
  // Clean discount percentage - extract first valid percentage
  let clean_discount = '';
  if (rawData.discount_percentage) {
    const discountMatch = rawData.discount_percentage.match(/\d+%\s*off/);
    clean_discount = discountMatch ? discountMatch[0] : rawData.discount_percentage;
  }

  return {
    title: rawData.product_title || rawData.title || 'Flipkart Product',
    final_price: clean_current_price || `₹${current_price_number}`,
    price: current_price_number,
    initial_price: clean_original_price || `₹${original_price_number}`,
    currency: 'INR',
    images: images,
    main_image: main_image,
    brand: rawData.specifications?.brand || rawData.brand || 'Unknown Brand',
    specifications: specifications,
    availability: rawData.delivery_date ? 'in-stock' : 'unknown',
    weight: weight_kg,
    rating: rawData.rating || 0,
    reviews_count: (() => {
      if (rawData.review_count) return rawData.review_count;
      if (rawData.rating_count && typeof rawData.rating_count === 'string') {
        // Extract first number from complex strings like "40,354 Ratings & 1,979 Reviews(40,354)(297)(816)"
        const countMatch = rawData.rating_count.match(/(\d+(?:,\d+)*)/);
        return countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : 0;
      }
      return 0;
    })(),
    highlights: rawData.color_variants || [],
    product_description: rawData.specifications?.features || rawData.return_policy || '',
    category: rawData.specifications?.type || 'electronics',
    seller_name: rawData.seller_name || '',
    seller_rating: rawData.seller_rating || 0,
    discount_percentage: clean_discount,
    delivery_date: rawData.delivery_date || '',
    return_policy: rawData.return_policy || '',
    payment_options: rawData.payment_options || '',
    url: url,
    source: 'flipkart-dataset'
  };
}

/**
 * Myntra Product API Implementation
 * Uses Bright Data Datasets API with dataset: gd_lptvxr8b1qx1d9thgp
 */
async function callMyntraProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👗 [${requestId}] Starting Myntra product scraping for: ${url}`);
    
    // Trigger data collection using Myntra dataset
    const datasetId = 'gd_lptvxr8b1qx1d9thgp'; // Myntra dataset ID
    const triggerResult = await triggerMyntraBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from Myntra dataset trigger');
    }
    
    console.log(`📋 [${requestId}] Myntra data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForMyntraBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadMyntraBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapMyntraDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] Myntra scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Myntra API call failed:`, error);
    throw new Error(`Myntra scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Myntra data collection using Bright Data Datasets API
 */
async function triggerMyntraBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering Myntra data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Myntra dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] Myntra trigger response:`, result);
  
  return result;
}

/**
 * Wait for Myntra Bright Data results with polling
 */
async function waitForMyntraBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for Myntra data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Myntra polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Myntra progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Myntra progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Myntra data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Myntra data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Myntra data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download Myntra Bright Data results
 */
async function downloadMyntraBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading Myntra data...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`Myntra data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📊 [${requestId}] Downloaded ${data.length || 0} Myntra records`);
  
  return data;
}

/**
 * Map raw Myntra data to our product data format
 */
function mapMyntraDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Myntra data to product format...`);
  
  return {
    title: rawData.title || rawData.product_name || rawData.name,
    final_price: rawData.final_price || rawData.price || rawData.current_price,
    initial_price: rawData.initial_price || rawData.original_price || rawData.mrp,
    currency: rawData.currency || 'INR',
    images: rawData.images || rawData.image_urls || [],
    brand: rawData.brand || rawData.manufacturer,
    specifications: rawData.specifications || [],
    availability: rawData.availability === 'in stock' ? 'in-stock' : 'out-of-stock',
    rating: rawData.rating || rawData.average_rating,
    reviews_count: rawData.reviews_count || rawData.total_reviews,
    highlights: rawData.highlights || rawData.features || [],
    product_description: rawData.description || rawData.product_description,
    category: rawData.category || rawData.product_category || 'fashion',
    color: rawData.color,
    size: rawData.sizes || rawData.available_sizes,
    product_code: rawData.product_id || rawData.sku,
    seller_name: rawData.seller_name,
    discount: rawData.discount || rawData.discount_percentage,
    url: url,
    source: 'myntra-dataset'
  };
}

/**
 * Etsy Product API Implementation
 * Uses Bright Data Datasets API with dataset: gd_ltppk0jdv1jqz25mz
 */
async function callEtsyProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🎨 [${requestId}] Starting Etsy product scraping for: ${url}`);
    
    // Trigger data collection using Etsy dataset
    const datasetId = 'gd_ltppk0jdv1jqz25mz'; // Etsy dataset ID
    const triggerResult = await triggerEtsyBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResult.snapshot_id) {
      throw new Error('No snapshot_id received from Etsy dataset trigger');
    }
    
    console.log(`📋 [${requestId}] Etsy data collection triggered with snapshot: ${triggerResult.snapshot_id}`);
    
    // Wait for results with polling
    const results = await waitForEtsyBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Download and process results
    const finalData = await downloadEtsyBrightDataResults(triggerResult.snapshot_id, apiToken, requestId);
    
    // Transform data to our expected format
    const transformedData = mapEtsyDataToProductData(finalData[0] || {}, url);
    
    console.log(`✅ [${requestId}] Etsy scraping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([transformedData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Etsy API call failed:`, error);
    throw new Error(`Etsy scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Etsy data collection using Bright Data Datasets API
 */
async function triggerEtsyBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`📤 [${requestId}] Triggering Etsy data collection...`);
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }])
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Etsy dataset trigger failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] Etsy trigger response:`, result);
  
  return result;
}

/**
 * Wait for Etsy Bright Data results with polling
 */
async function waitForEtsyBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for Etsy data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Etsy polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Etsy progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Etsy progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Etsy data ready!`);
      return progressResult;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Etsy data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Etsy data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Download Etsy Bright Data results
 */
async function downloadEtsyBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  console.log(`📥 [${requestId}] Downloading Etsy data...`);
  
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`Etsy data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📊 [${requestId}] Downloaded ${data.length || 0} Etsy records`);
  
  return data;
}

/**
 * Map raw Etsy data to our product data format
 */
function mapEtsyDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Etsy data to product format...`);
  
  // Extract variations and specifications
  let specifications = [];
  if (rawData.product_specifications && Array.isArray(rawData.product_specifications)) {
    specifications = rawData.product_specifications.map((spec: any) => ({
      specification_name: spec.specification_name || 'Specification',
      specification_value: spec.specification_values || spec.value || ''
    }));
  }
  
  // Extract category from breadcrumbs or category_tree
  let category = 'handmade';
  if (rawData.category_tree && Array.isArray(rawData.category_tree) && rawData.category_tree.length > 0) {
    category = rawData.category_tree[0].toLowerCase();
  } else if (rawData.root_category) {
    category = rawData.root_category.toLowerCase();
  }
  
  // Calculate discount percentage
  let discount_percentage = rawData.discount_percentage || 0;
  if (!discount_percentage && rawData.initial_price && rawData.final_price && rawData.initial_price > rawData.final_price) {
    discount_percentage = Math.round(((rawData.initial_price - rawData.final_price) / rawData.initial_price) * 100);
  }
  
  return {
    title: rawData.title || 'Etsy Product',
    final_price: rawData.final_price || rawData.price,
    initial_price: rawData.initial_price,
    currency: rawData.currency || 'USD',
    images: rawData.images || [],
    brand: rawData.seller_name || rawData.seller_shop_name || 'Etsy Seller',
    specifications: specifications,
    availability: rawData.in_stock !== false ? 'in-stock' : 'out-of-stock',
    rating: rawData.rating || 0,
    reviews_count: rawData.reviews_count_item || rawData.reviews_count_shop || 0,
    highlights: rawData.highlights_lines?.map((h: any) => `${h.name}: ${h.value}`) || rawData.highlights || [],
    product_description: Array.isArray(rawData.item_details) ? rawData.item_details.join(' ') : (rawData.item_details || ''),
    category: category,
    seller_name: rawData.seller_name || rawData.seller_shop_name,
    seller_shop_name: rawData.seller_shop_name,
    seller_shop_url: rawData.seller_shop_url,
    product_id: rawData.product_id,
    listing_inventory_id: rawData.listing_inventory_id,
    discount_percentage: discount_percentage,
    shipping_return_policies: rawData.shipping_return_policies || [],
    variations: rawData.variations || [],
    variation: rawData.variation || [],
    top_reviews: rawData.top_reviews || [],
    photos_from_reviews: rawData.photos_from_reviews || [],
    breadcrumbs: rawData.breadcrumbs || [],
    category_tree: rawData.category_tree || [],
    listed_date: rawData.liisted_date || rawData.listed_date,
    is_star_seller: rawData.is_star_seller,
    url: url,
    source: 'etsy-dataset'
  };
}

/**
 * Process Zara URL to ensure proper regional format
 * Handles URLs like:
 * - https://www.zara.com/in/en/ (India)
 * - https://www.zara.com/us/ (US)
 * - https://www.zara.com/uk/ (UK)
 */
function processZaraUrl(url: string, requestId: string): string {
  console.log(`🔍 [${requestId}] Processing Zara URL: ${url}`);
  
  // Check if URL contains regional code
  const regionPatterns = [
    '/in/en/', '/us/', '/uk/', '/de/', '/fr/', '/es/', '/it/', '/ca/', '/au/',
    '/jp/', '/kr/', '/mx/', '/br/', '/ar/', '/cl/', '/co/', '/pe/'
  ];
  
  const hasRegion = regionPatterns.some(pattern => url.includes(pattern));
  
  if (hasRegion) {
    console.log(`✅ [${requestId}] Zara URL already has regional format`);
    return url;
  }
  
  // If no region detected, default to US
  if (url.includes('zara.com') && !hasRegion) {
    const defaultUrl = url.replace('zara.com', 'zara.com/us');
    console.log(`🔄 [${requestId}] Added US region to Zara URL: ${defaultUrl}`);
    return defaultUrl;
  }
  
  return url;
}

/**
 * Zara Product API Implementation
 * Uses Bright Data Datasets API with Zara dataset: gd_lct4vafw1tgx27d4o0
 */
async function callZaraProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👗 [${requestId}] Starting Zara product scraping for: ${url}`);
    
    // Detect and validate Zara regional URL
    const processedUrl = processZaraUrl(url, requestId);
    console.log(`🌍 [${requestId}] Processed Zara URL: ${processedUrl}`);
    
    // Trigger data collection using Zara dataset
    const datasetId = 'gd_lct4vafw1tgx27d4o0'; // Zara dataset ID
    const triggerResponse = await triggerZaraBrightDataCollection(processedUrl, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Zara dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Zara snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForZaraBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Zara product data received');
    }
    
    const productData = mapZaraDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Zara data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Zara API call failed:`, error);
    throw new Error(`Zara scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Zara Bright Data collection
 */
async function triggerZaraBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });
  
  if (!response.ok) {
    throw new Error(`Zara dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] Zara trigger response:`, result);
  
  return result;
}

/**
 * Wait for Zara Bright Data results with polling
 */
async function waitForZaraBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for Zara data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Zara polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Zara progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Zara progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Zara data download failed: ${dataResponse.status}`);
      }
      
      const data = await dataResponse.json();
      console.log(`📊 [${requestId}] Downloaded ${data.length || 0} Zara records`);
      
      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Zara data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Zara data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Map raw Zara data to our product data format
 */
function mapZaraDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Zara data to product format...`);
  console.log(`📊 Raw Zara data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Zara data received:`, rawData);
    throw new Error('Invalid Zara product data structure');
  }
  
  return {
    title: rawData.product_name || 'Zara Product',
    final_price: rawData.price || 0,
    initial_price: rawData.price || 0,
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image) ? rawData.image.slice(0, 8) : [],
    brand: 'Zara',
    rating: 0, // Zara doesn't provide ratings in dataset
    reviews_count: 0,
    description: rawData.description || '',
    color: rawData.colour || rawData.color,
    size: rawData.size,
    availability: rawData.availability ? 'in-stock' : (rawData.low_on_stock ? 'low-stock' : 'out-of-stock'),
    in_stock: rawData.availability,
    low_on_stock: rawData.low_on_stock,
    sku: rawData.sku,
    product_id: rawData.product_id,
    category_id: rawData.category_id,
    section: rawData.section, // WOMAN, MAN, KID
    product_family: rawData.product_family, // DRESS, SHIRT, etc.
    product_subfamily: rawData.product_subfamily,
    care_instructions: rawData.care?.instructions || [],
    materials: rawData.materials || rawData.materials_description,
    dimension: rawData.dimension,
    you_may_also_like: rawData.you_may_also_like || [],
    url: url,
    source: 'zara-dataset'
  };
}

/**
 * LEGO Product API Implementation
 * Uses Bright Data Datasets API with LEGO dataset: gd_leenwt162rg85apy87
 */
async function callLegoProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🧱 [${requestId}] Starting LEGO product scraping for: ${url}`);
    
    // Trigger data collection using LEGO dataset
    const datasetId = 'gd_leenwt162rg85apy87'; // LEGO dataset ID
    const triggerResponse = await triggerLegoBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from LEGO dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] LEGO snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForLegoBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No LEGO product data received');
    }
    
    const productData = mapLegoDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] LEGO data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] LEGO API call failed:`, error);
    throw new Error(`LEGO scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger LEGO Bright Data collection
 */
async function triggerLegoBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });
  
  if (!response.ok) {
    throw new Error(`LEGO dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] LEGO trigger response:`, result);
  
  return result;
}

/**
 * Wait for LEGO Bright Data results with polling
 */
async function waitForLegoBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for LEGO data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] LEGO polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`LEGO progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] LEGO progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`LEGO data download failed: ${dataResponse.status}`);
      }
      
      const data = await dataResponse.json();
      console.log(`📊 [${requestId}] Downloaded ${data.length || 0} LEGO records`);
      
      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`LEGO data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`LEGO data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Map raw LEGO data to our product data format
 */
function mapLegoDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping LEGO data to product format...`);
  
  return {
    title: rawData.product_name || 'LEGO Set',
    final_price: rawData.final_price || rawData.initial_price || 0,
    initial_price: rawData.initial_price || rawData.final_price || 0,
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || rawData.manufacturer || 'LEGO',
    rating: rawData.rating || 0,
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || rawData.features_text || '',
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    in_stock: rawData.in_stock,
    category: rawData.category || 'toys',
    age_range: rawData.age_range,
    piece_count: rawData.piece_count,
    product_code: rawData.product_code,
    bullet_text: rawData.bullet_text,
    features: rawData.features || [],
    features_text: rawData.features_text,
    headline_text: rawData.headline_text,
    image_count: rawData.image_count,
    is_new: rawData.is_new,
    max_order_quantity: rawData.max_order_quantity,
    on_sale: rawData.on_sale,
    discount: rawData.discount || 0,
    related_products: rawData.related_products,
    similar_products: rawData.similar_products,
    top_reviews: rawData.top_reviews,
    video_count: rawData.video_count,
    videos: rawData.videos,
    vip_points: rawData.vip_points,
    seller_name: rawData.seller_name || 'LEGO',
    seller_url: rawData.seller_url,
    delivery: rawData.delivery,
    url: url,
    source: 'lego-dataset'
  };
}

/**
 * Hermes Product API Implementation  
 * Uses Bright Data Datasets API with Hermes dataset: gd_lh7sn8rz1g95zt4lwk
 */
async function callHermesProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`💎 [${requestId}] Starting Hermes product scraping for: ${url}`);
    
    // Trigger data collection using Hermes dataset
    const datasetId = 'gd_lh7sn8rz1g95zt4lwk'; // Hermes dataset ID
    const triggerResponse = await triggerHermesBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Hermes dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Hermes snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForHermesBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Hermes product data received');
    }
    
    const productData = mapHermesDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Hermes data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Hermes API call failed:`, error);
    throw new Error(`Hermes scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Hermes Bright Data collection
 */
async function triggerHermesBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });
  
  if (!response.ok) {
    throw new Error(`Hermes dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`📋 [${requestId}] Hermes trigger response:`, result);
  
  return result;
}

/**
 * Wait for Hermes Bright Data results with polling
 */
async function waitForHermesBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = getPollingConfig('default');
  console.log(`⏳ [${requestId}] Waiting for Hermes data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Hermes polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Hermes progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Hermes progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Hermes data download failed: ${dataResponse.status}`);
      }
      
      const data = await dataResponse.json();
      console.log(`📊 [${requestId}] Downloaded ${data.length || 0} Hermes records`);
      
      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Hermes data collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait for optimized interval before next poll
    await new Promise(resolve => setTimeout(resolve, config.interval));
  }
  
  throw new Error(`Hermes data collection timeout - data not ready within ${config.totalTimeout}`);
}

/**
 * Map raw Hermes data to our product data format
 */
function mapHermesDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Hermes data to product format...`);
  console.log(`📊 Raw Hermes data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Hermes data received:`, rawData);
    throw new Error('Invalid Hermes product data structure');
  }
  
  // Parse price strings like "$4,135.00"
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'Hermes Product',
    final_price: parsePrice(rawData.final_price),
    initial_price: parsePrice(rawData.initial_price),
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || rawData.seller || 'Hermès',
    rating: 0, // Hermes doesn't provide ratings in dataset
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || '',
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category_name: rawData.category_name,
    category_url: rawData.category_url,
    category_path: rawData.category_path,
    root_category_name: rawData.root_category_name,
    root_category_url: rawData.root_category_url,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    gtin: rawData.gtin,
    mpn: rawData.mpn,
    product_id: rawData.product_id,
    product_details: rawData.product_details,
    product_story: rawData.product_story,
    features: rawData.features,
    dimensions: rawData.dimensions,
    variations: rawData.variations,
    tags: rawData.tags,
    material: rawData.material,
    top_reviews: rawData.top_reviews,
    seller_name: rawData.seller || 'Hermès',
    country: rawData.country,
    url: url,
    source: 'hermes-dataset'
  };
}

/**
 * Toys"R"Us Product API Implementation
 * Uses Bright Data Datasets API with Toys"R"Us dataset: gd_lemuapao1lkjggvn05
 */
async function callToysrusProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🧸 [${requestId}] Starting Toys"R"Us product scraping for: ${url}`);
    
    // Trigger data collection using Toys"R"Us dataset
    const datasetId = 'gd_lemuapao1lkjggvn05'; // Toys"R"Us dataset ID
    const triggerResponse = await triggerToysrusBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Toys"R"Us dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Toys"R"Us snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForToysrusBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Toys"R"Us product data received');
    }
    
    const productData = mapToysrusDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Toys"R"Us data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Toys"R"Us API call failed:`, error);
    throw new Error(`Toys"R"Us scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Toys"R"Us Bright Data collection
 */
async function triggerToysrusBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });

  if (!response.ok) {
    throw new Error(`Toys"R"Us dataset trigger failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Wait for Toys"R"Us Bright Data results with polling
 */
async function waitForToysrusBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = {
    maxAttempts: 30,
    interval: 2000, // 2 seconds
    totalTimeout: '60 seconds'
  };
  
  console.log(`⏳ [${requestId}] Waiting for Toys"R"Us data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Toys"R"Us polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!progressResponse.ok) {
      throw new Error(`Toys"R"Us progress check failed: ${progressResponse.status}`);
    }

    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Toys"R"Us progress status: ${progressResult.status}`);

    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Toys"R"Us data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (!dataResponse.ok) {
        throw new Error(`Toys"R"Us data download failed: ${dataResponse.status}`);
      }

      const data = await dataResponse.json();
      console.log(`📥 [${requestId}] Downloaded ${data.length || 0} Toys"R"Us records`);

      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Toys"R"Us dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, config.interval));
  }

  throw new Error('Toys"R"Us dataset collection timeout - data not ready within 60 seconds');
}

/**
 * Map raw Toys"R"Us data to our product data format
 */
function mapToysrusDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Toys"R"Us data to product format...`);
  console.log(`📊 Raw Toys"R"Us data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Toys"R"Us data received:`, rawData);
    throw new Error('Invalid Toys"R"Us product data structure');
  }
  
  return {
    title: rawData.product_name || 'Toys"R"Us Product',
    final_price: rawData.final_price || rawData.initial_price || 0,
    initial_price: rawData.initial_price || 0,
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || 'Toys"R"Us',
    rating: rawData.rating || 0,
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || '',
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    in_stock: rawData.in_stock,
    weight: rawData.weight,
    model_number: rawData.model_number,
    product_id: rawData.product_id,
    gtin_ean_pn: rawData.gtin_ean_pn,
    category_tree: rawData.category_tree || [],
    category_url: rawData.category_url,
    root_category: rawData.root_category,
    delivery: rawData.delivery || [],
    discount: rawData.discount || 0,
    url: url,
    source: 'toysrus-dataset'
  };
}

/**
 * Carter's Product API Implementation
 * Uses Bright Data Datasets API with Carter's dataset: gd_le60f5v0dj17xgv6u
 */
async function callCartersProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👶 [${requestId}] Starting Carter's product scraping for: ${url}`);
    
    // Trigger data collection using Carter's dataset
    const datasetId = 'gd_le60f5v0dj17xgv6u'; // Carter's dataset ID
    const triggerResponse = await triggerCartersBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Carter\'s dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Carter's snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForCartersBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Carter\'s product data received');
    }
    
    const productData = mapCartersDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Carter's data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Carter's API call failed:`, error);
    throw new Error(`Carter's scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Carter's Bright Data collection
 */
async function triggerCartersBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });

  if (!response.ok) {
    throw new Error(`Carter's dataset trigger failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Wait for Carter's Bright Data results with polling
 */
async function waitForCartersBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = {
    maxAttempts: 30,
    interval: 2000, // 2 seconds
    totalTimeout: '60 seconds'
  };
  
  console.log(`⏳ [${requestId}] Waiting for Carter's data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Carter's polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!progressResponse.ok) {
      throw new Error(`Carter's progress check failed: ${progressResponse.status}`);
    }

    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Carter's progress status: ${progressResult.status}`);

    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Carter's data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (!dataResponse.ok) {
        throw new Error(`Carter's data download failed: ${dataResponse.status}`);
      }

      const data = await dataResponse.json();
      console.log(`📥 [${requestId}] Downloaded ${data.length || 0} Carter's records`);

      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Carter's dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, config.interval));
  }

  throw new Error('Carter\'s dataset collection timeout - data not ready within 60 seconds');
}

/**
 * Map raw Carter's data to our product data format
 */
function mapCartersDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Carter's data to product format...`);
  console.log(`📊 Raw Carter's data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Carter's data received:`, rawData);
    throw new Error('Invalid Carter\'s product data structure');
  }
  
  return {
    title: rawData.product_name || 'Carter\'s Product',
    final_price: rawData.final_price || rawData.initial_price || 0,
    initial_price: rawData.initial_price || 0,
    currency: rawData.currency === '$' ? 'USD' : (rawData.currency || 'USD'),
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : [],
    brand: rawData.brand || rawData.seller_name || 'Carter\'s',
    rating: rawData.rating || 0,
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || '',
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category: rawData.category,
    category_url: rawData.category_url,
    category_tree: rawData.category_tree || [],
    features: rawData.features || [],
    similar_products: rawData.similar_products || [],
    other_attributes: rawData.other_attributes || [],
    model_number: rawData.model_number,
    product_id: rawData.product_id,
    discount: rawData.discount || 0,
    country_code: rawData.country_code,
    url: url,
    source: 'carters-dataset'
  };
}

/**
 * Prada Product API Implementation
 * Uses Bright Data Datasets API with Prada dataset: gd_lhahqiq52egng5v35i
 */
async function callPradaProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👜 [${requestId}] Starting Prada product scraping for: ${url}`);
    
    // Trigger data collection using Prada dataset
    const datasetId = 'gd_lhahqiq52egng5v35i'; // Prada dataset ID
    const triggerResponse = await triggerPradaBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Prada dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Prada snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForPradaBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Prada product data received');
    }
    
    const productData = mapPradaDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Prada data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Prada API call failed:`, error);
    throw new Error(`Prada scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger Prada Bright Data collection
 */
async function triggerPradaBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });

  if (!response.ok) {
    throw new Error(`Prada dataset trigger failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Wait for Prada Bright Data results with polling
 */
async function waitForPradaBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = {
    maxAttempts: 30,
    interval: 2000, // 2 seconds
    totalTimeout: '60 seconds'
  };
  
  console.log(`⏳ [${requestId}] Waiting for Prada data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Prada polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!progressResponse.ok) {
      throw new Error(`Prada progress check failed: ${progressResponse.status}`);
    }

    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Prada progress status: ${progressResult.status}`);

    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] Prada data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (!dataResponse.ok) {
        throw new Error(`Prada data download failed: ${dataResponse.status}`);
      }

      const data = await dataResponse.json();
      console.log(`📥 [${requestId}] Downloaded ${data.length || 0} Prada records`);

      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`Prada dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, config.interval));
  }

  throw new Error('Prada dataset collection timeout - data not ready within 60 seconds');
}

/**
 * Map raw Prada data to our product data format
 */
function mapPradaDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Prada data to product format...`);
  console.log(`📊 Raw Prada data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Prada data received:`, rawData);
    throw new Error('Invalid Prada product data structure');
  }
  
  // Parse price strings like "€1,100.00"
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'Prada Product',
    final_price: parsePrice(rawData.final_price || rawData.initial_price),
    initial_price: parsePrice(rawData.initial_price),
    currency: rawData.currency || 'EUR',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || 'PRADA',
    rating: 0, // Prada doesn't provide ratings in dataset
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || '',
    availability: rawData.in_stock ? 'in-stock' : 'out-of-stock',
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category_name: rawData.category_name,
    category_url: rawData.category_url,
    category_path: rawData.category_path,
    root_category_name: rawData.root_category_name,
    root_category_url: rawData.root_category_url,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    gtin: rawData.gtin,
    mpn: rawData.mpn,
    material: rawData.material,
    product_id: rawData.product_id,
    product_details: rawData.product_details,
    product_story: rawData.product_story,
    features: rawData.features,
    dimensions: rawData.dimensions,
    variations: rawData.variations || [],
    tags: rawData.tags,
    country: rawData.country,
    url: url,
    source: 'prada-dataset'
  };
}

/**
 * YSL Product API Implementation
 * Uses Bright Data Datasets API with YSL dataset: gd_lhai2io04wilkad5z
 */
async function callYSLProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`💄 [${requestId}] Starting YSL product scraping for: ${url}`);
    
    // Trigger data collection using YSL dataset
    const datasetId = 'gd_lhai2io04wilkad5z'; // YSL dataset ID
    const triggerResponse = await triggerYSLBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from YSL dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] YSL snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForYSLBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No YSL product data received');
    }
    
    const productData = mapYSLDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] YSL data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] YSL API call failed:`, error);
    throw new Error(`YSL scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger YSL Bright Data collection
 */
async function triggerYSLBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  const triggerPayload = [{ url }];
  
  const response = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(triggerPayload)
  });

  if (!response.ok) {
    throw new Error(`YSL dataset trigger failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Wait for YSL Bright Data results with polling
 */
async function waitForYSLBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const config = {
    maxAttempts: 30,
    interval: 2000, // 2 seconds
    totalTimeout: '60 seconds'
  };
  
  console.log(`⏳ [${requestId}] Waiting for YSL data collection (up to ${config.totalTimeout})...`);
  
  let attempts = 0;
  
  while (attempts < config.maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] YSL polling attempt ${attempts}/${config.maxAttempts} (${config.interval/1000}s intervals)...`);
    
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!progressResponse.ok) {
      throw new Error(`YSL progress check failed: ${progressResponse.status}`);
    }

    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] YSL progress status: ${progressResult.status}`);

    if (progressResult.status === 'ready') {
      console.log(`✅ [${requestId}] YSL data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (!dataResponse.ok) {
        throw new Error(`YSL data download failed: ${dataResponse.status}`);
      }

      const data = await dataResponse.json();
      console.log(`📥 [${requestId}] Downloaded ${data.length || 0} YSL records`);

      return data;
    } else if (progressResult.status === 'failed') {
      throw new Error(`YSL dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, config.interval));
  }

  throw new Error('YSL dataset collection timeout - data not ready within 60 seconds');
}

/**
 * Map raw YSL data to our product data format
 */
function mapYSLDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping YSL data to product format...`);
  console.log(`📊 Raw YSL data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid YSL data received:`, rawData);
    throw new Error('Invalid YSL product data structure');
  }
  
  // Parse price strings like "SAR 1,400.00"
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'YSL Product',
    final_price: parsePrice(rawData.final_price || rawData.initial_price),
    initial_price: parsePrice(rawData.initial_price),
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || rawData.seller || 'Yves Saint Laurent',
    rating: 0, // YSL doesn't provide ratings in dataset
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || rawData.product_details || '',
    availability: rawData.in_stock ? 'in-stock' : (rawData.in_stock === false ? 'out-of-stock' : 'unknown'),
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category_name: rawData.category_name,
    category_url: rawData.category_url,
    category_path: rawData.category_path,
    root_category_name: rawData.root_category_name,
    root_category_url: rawData.root_category_url,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    gtin: rawData.gtin,
    mpn: rawData.mpn,
    material: rawData.material,
    product_id: rawData.product_id,
    product_details: rawData.product_details,
    product_story: rawData.product_story,
    features: rawData.features || [],
    dimensions: rawData.dimensions,
    variations: rawData.variations || [],
    tags: rawData.tags || [],
    country: rawData.country,
    url: url,
    source: 'ysl-dataset'
  };
}

// ==================== BALENCIAGA PRODUCT API ====================

async function callBalenciagaProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🏃 [${requestId}] Starting Balenciaga product scraping for: ${url}`);
    
    // Trigger data collection using Balenciaga dataset
    const datasetId = 'gd_lh7oemkb2f9h596dfn'; // Balenciaga dataset ID
    const triggerResponse = await triggerBalenciagaBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Balenciaga dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Balenciaga snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForBalenciagaBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Balenciaga product data received');
    }
    
    const productData = mapBalenciagaDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Balenciaga data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Balenciaga API error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Balenciaga scraping failed',
      requestId,
      duration: Date.now()
    };
  }
}

async function triggerBalenciagaBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`🚀 [${requestId}] Triggering Balenciaga data collection...`);
  
  const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`;
  const payload = [{ url }];
  
  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Balenciaga dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function waitForBalenciagaBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Balenciaga polling attempt ${attempts}/${maxAttempts}...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Balenciaga progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Balenciaga progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      // Data is ready, download it
      console.log(`✅ [${requestId}] Balenciaga data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Balenciaga data download failed: ${dataResponse.status}`);
      }
      
      return await dataResponse.json();
    } else if (progressResult.status === 'failed') {
      throw new Error(`Balenciaga dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Balenciaga dataset collection timeout - data not ready within 60 seconds');
}

function mapBalenciagaDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Balenciaga data to product format...`);
  console.log(`📊 Raw Balenciaga data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Balenciaga data received:`, rawData);
    throw new Error('Invalid Balenciaga product data structure');
  }
  
  // Parse price strings like "$995.00"
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'Balenciaga Product',
    final_price: parsePrice(rawData.final_price || rawData.initial_price),
    initial_price: parsePrice(rawData.initial_price),
    currency: rawData.currency || 'USD',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || rawData.seller || 'BALENCIAGA',
    rating: 0, // Balenciaga doesn't provide ratings in dataset
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || rawData.product_details || rawData.product_story || '',
    availability: rawData.in_stock ? 'in-stock' : (rawData.in_stock === false ? 'out-of-stock' : 'unknown'),
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category_name: rawData.category_name,
    category_url: rawData.category_url,
    category_path: rawData.category_path,
    root_category_name: rawData.root_category_name,
    root_category_url: rawData.root_category_url,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    gtin: rawData.gtin,
    mpn: rawData.mpn,
    material: rawData.material,
    product_id: rawData.product_id,
    product_details: rawData.product_details,
    product_story: rawData.product_story,
    features: rawData.features || [],
    dimensions: rawData.dimensions,
    variations: rawData.variations || [],
    tags: rawData.tags || [],
    country: rawData.country,
    url: url,
    source: 'balenciaga-dataset'
  };
}

// ==================== DIOR PRODUCT API ====================

async function callDiorProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`👑 [${requestId}] Starting Dior product scraping for: ${url}`);
    
    // Trigger data collection using Dior dataset
    const datasetId = 'gd_lh7o3kqu6wp7qmqkl'; // Dior dataset ID
    const triggerResponse = await triggerDiorBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Dior dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Dior snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForDiorBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Dior product data received');
    }
    
    const productData = mapDiorDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Dior data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Dior API error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Dior scraping failed',
      requestId,
      duration: Date.now()
    };
  }
}

async function triggerDiorBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`🚀 [${requestId}] Triggering Dior data collection...`);
  
  const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`;
  const payload = [{ url }];
  
  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Dior dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function waitForDiorBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Dior polling attempt ${attempts}/${maxAttempts}...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Dior progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Dior progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      // Data is ready, download it
      console.log(`✅ [${requestId}] Dior data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Dior data download failed: ${dataResponse.status}`);
      }
      
      return await dataResponse.json();
    } else if (progressResult.status === 'failed') {
      throw new Error(`Dior dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Dior dataset collection timeout - data not ready within 60 seconds');
}

function mapDiorDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Dior data to product format...`);
  console.log(`📊 Raw Dior data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Dior data received:`, rawData);
    throw new Error('Invalid Dior product data structure');
  }
  
  // Parse price (could be numeric or string)
  const parsePrice = (priceValue: any): number => {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return 0;
    return parseFloat(priceValue.toString().replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'Dior Product',
    final_price: parsePrice(rawData.final_price || rawData.initial_price),
    initial_price: parsePrice(rawData.initial_price),
    currency: rawData.currency || 'EUR',
    images: Array.isArray(rawData.image_urls) ? rawData.image_urls.slice(0, 8) : (rawData.main_image ? [rawData.main_image] : []),
    brand: rawData.brand || rawData.seller || 'Dior',
    rating: 0, // Dior doesn't provide ratings in dataset
    reviews_count: rawData.reviews_count || 0,
    description: rawData.description || rawData.product_details || '',
    availability: rawData.in_stock ? 'in-stock' : (rawData.in_stock === false ? 'out-of-stock' : 'unknown'),
    in_stock: rawData.in_stock,
    size: rawData.size,
    color: rawData.color,
    category_name: rawData.category_name,
    category_url: rawData.category_url,
    category_path: rawData.category_path,
    root_category_name: rawData.root_category_name,
    root_category_url: rawData.root_category_url,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    gtin: rawData.gtin,
    mpn: rawData.mpn,
    material: rawData.material,
    product_id: rawData.product_id,
    product_details: rawData.product_details,
    product_story: rawData.product_story,
    features: rawData.features || [],
    dimensions: rawData.dimensions,
    variations: rawData.variations || [],
    tags: rawData.tags || [],
    country: rawData.country,
    timestamp: rawData.timestamp,
    url: url,
    source: 'dior-dataset'
  };
}

// ==================== CHANEL PRODUCT API ====================

async function callChanelProductAPI(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`💎 [${requestId}] Starting Chanel product scraping for: ${url}`);
    
    // Trigger data collection using Chanel dataset
    const datasetId = 'gd_ldwwuwqe1oh3zav3js'; // Chanel dataset ID
    const triggerResponse = await triggerChanelBrightDataCollection(url, datasetId, apiToken, requestId);
    
    if (!triggerResponse.snapshot_id) {
      throw new Error('No snapshot_id received from Chanel dataset trigger');
    }
    
    const snapshotId = triggerResponse.snapshot_id;
    console.log(`🔍 [${requestId}] Chanel snapshot ID: ${snapshotId}`);
    
    // Wait for results with optimized polling
    const data = await waitForChanelBrightDataResults(snapshotId, apiToken, requestId);
    
    if (!data || data.length === 0) {
      throw new Error('No Chanel product data received');
    }
    
    const productData = mapChanelDataToProductData(data[0], url);
    console.log(`✅ [${requestId}] Chanel data mapping completed successfully`);
    
    return {
      content: [{
        text: JSON.stringify([productData])
      }]
    };
    
  } catch (error) {
    console.error(`💥 [${requestId}] Chanel API error:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Chanel scraping failed',
      requestId,
      duration: Date.now()
    };
  }
}

async function triggerChanelBrightDataCollection(url: string, datasetId: string, apiToken: string, requestId: string) {
  console.log(`🚀 [${requestId}] Triggering Chanel data collection...`);
  
  const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&include_errors=true`;
  const payload = [{ url }];
  
  const response = await fetch(triggerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Chanel dataset trigger failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function waitForChanelBrightDataResults(snapshotId: string, apiToken: string, requestId: string) {
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Chanel polling attempt ${attempts}/${maxAttempts}...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    
    if (!progressResponse.ok) {
      throw new Error(`Chanel progress check failed: ${progressResponse.status}`);
    }
    
    const progressResult = await progressResponse.json();
    console.log(`📊 [${requestId}] Chanel progress status: ${progressResult.status}`);
    
    if (progressResult.status === 'ready') {
      // Data is ready, download it
      console.log(`✅ [${requestId}] Chanel data ready! Downloading...`);
      
      const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Chanel data download failed: ${dataResponse.status}`);
      }
      
      return await dataResponse.json();
    } else if (progressResult.status === 'failed') {
      throw new Error(`Chanel dataset collection failed: ${progressResult.error || 'Unknown error'}`);
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Chanel dataset collection timeout - data not ready within 60 seconds');
}

function mapChanelDataToProductData(rawData: any, url: string): any {
  console.log(`🔄 Mapping Chanel data to product format...`);
  console.log(`📊 Raw Chanel data structure:`, Object.keys(rawData || {}));
  
  // Defensive check for undefined rawData
  if (!rawData || typeof rawData !== 'object') {
    console.error(`❌ Invalid Chanel data received:`, rawData);
    throw new Error('Invalid Chanel product data structure');
  }
  
  // Parse price (Chanel uses regular_price field)
  const parsePrice = (priceValue: any): number => {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return 0;
    return parseFloat(priceValue.toString().replace(/[^0-9.]/g, '')) || 0;
  };
  
  return {
    title: rawData.product_name || 'Chanel Product',
    final_price: parsePrice(rawData.regular_price || rawData.member_price),
    initial_price: parsePrice(rawData.regular_price),
    currency: rawData.currency || 'EUR',
    images: Array.isArray(rawData.image_slider) ? rawData.image_slider.slice(0, 8) : (rawData.image ? [rawData.image] : []),
    brand: rawData.product_brand || 'Chanel',
    rating: 0, // Chanel doesn't provide ratings in dataset
    reviews_count: 0,
    description: rawData.product_description || '',
    availability: rawData.stock ? 'in-stock' : (rawData.stock === false ? 'out-of-stock' : 'unknown'),
    in_stock: rawData.stock,
    color: rawData.color,
    shade: rawData.shade,
    volume: rawData.volume,
    product_category: rawData.product_category,
    loyalty_points: rawData.loyalty_points,
    member_price: rawData.member_price,
    retailer_price: rawData.retailer_price,
    material: rawData.material,
    breadcrumbs: rawData.breadcrumbs || [],
    sku: rawData.sku,
    product_gift: rawData.product_gift,
    variations: rawData.variations || [],
    free_sample: rawData.free_sample,
    pdp_plus: rawData.pdp_plus,
    type: rawData.type,
    video: rawData.video,
    country: rawData.country,
    url: url,
    source: 'chanel-dataset'
  };
}