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
        'myntra_product': 'scraping_browser', // Use browser automation for Myntra
        'flipkart_product': 'scrape_as_markdown', // Use markdown scraping for Flipkart
        'target_product': 'target_product', // Custom Target implementation
        'bestbuy_product': 'web_data_bestbuy_products',
        'ebay_product': 'web_data_ebay_product', 
        'walmart_product': 'web_data_walmart_product',
        'etsy_product': 'web_data_etsy_products',
        'zara_product': 'web_data_zara_products',
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
      
      // Get API token from environment
      if (!env.BRIGHTDATA_API_TOKEN) {
        console.log(`❌ [${requestId}] BRIGHTDATA_API_TOKEN not configured`);
        throw new Error('BRIGHTDATA_API_TOKEN not configured');
      }
      
      console.log(`🔑 [${requestId}] API token available: ${env.BRIGHTDATA_API_TOKEN.substring(0, 10)}...`);

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
      const mcpResult = await callBrightDataMCP(mcpToolName, args, env.BRIGHTDATA_API_TOKEN, requestId);

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
    
    // Default fallback
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: args.url,
        ...args
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ [${requestId}] Bright Data API call successful`);
    
    // Return in MCP format
    return {
      content: [{
        text: JSON.stringify(Array.isArray(result) ? result : [result])
      }]
    };
    
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
  
  // Monitor and download results (simplified - in production, you'd poll)
  const snapshotId = triggerResult.snapshot_id;
  
  // Wait a bit for data collection
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Download results
  const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!dataResponse.ok) {
    throw new Error(`Data download failed: ${dataResponse.status}`);
  }
  
  const data = await dataResponse.json();
  console.log(`📥 [${requestId}] Downloaded ${data.length || 0} records`);
  
  return {
    content: [{
      text: JSON.stringify(data)
    }]
  };
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
    'web_data_etsy_products': 'https://api.brightdata.com/datasets/v3/trigger',
    'web_data_zara_products': 'https://api.brightdata.com/datasets/v3/trigger',
    'scraping_browser': 'https://api.brightdata.com/scraper-api/collect',
    'scrape_as_markdown': 'https://api.brightdata.com/scraper-api/collect'
  };
  
  return endpoints[toolName] || 'https://api.brightdata.com/scraper-api/collect';
}

/**
 * Get dataset ID for specific tools (you'd get these from your Bright Data account)
 */
function getDatasetId(toolName: string): string | null {
  const datasetIds: Record<string, string> = {
    'web_data_amazon_product': 'gd_l7q7zkd11qzin7vg6', // Example dataset ID
    'web_data_ebay_product': 'your_ebay_dataset_id',
    'web_data_walmart_product': 'your_walmart_dataset_id',
    'web_data_bestbuy_products': 'your_bestbuy_dataset_id',
    'web_data_etsy_products': 'your_etsy_dataset_id',
    'web_data_zara_products': 'your_zara_dataset_id'
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
    const datasetId = 'gd_ltppk5mx2lp0v1k0vo'; // Target dataset ID from your documentation
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
  console.log(`⏳ [${requestId}] Waiting for Target data collection...`);
  
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Target polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Target data collection timeout - data not ready within 60 seconds');
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