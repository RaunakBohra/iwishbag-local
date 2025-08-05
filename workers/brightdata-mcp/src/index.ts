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
  console.log(`⏳ [${requestId}] Waiting for dataset collection to complete...`);
  
  const maxAttempts = 20; // 20 attempts * 5 seconds = 100 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Dataset polling attempt ${attempts}/${maxAttempts}...`);
    
    // Check progress
    const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!progressResponse.ok) {
      console.error(`❌ [${requestId}] Progress check failed: ${progressResponse.status}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
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
    
    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error(`Dataset collection timeout - data not ready after ${maxAttempts * 5} seconds`);
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
  console.log(`⏳ [${requestId}] Waiting for H&M data collection...`);
  
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] H&M polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('H&M data collection timeout - data not ready within 60 seconds');
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
  console.log(`⏳ [${requestId}] Waiting for ASOS data collection...`);
  
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] ASOS polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`ASOS data collection timeout after ${maxAttempts} attempts`);
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
  console.log(`⏳ [${requestId}] Waiting for eBay data collection...`);
  
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] eBay polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`eBay data collection timeout after ${maxAttempts} attempts`);
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
  
  // Simplified polling - just try the most common DCA endpoints
  const maxAttempts = 20; // Reduce attempts for faster timeout
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] DCA polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 3 seconds before next attempt (longer intervals)
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  throw new Error(`Flipkart DCA collection timeout after ${maxAttempts} attempts - no results received`);
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
  console.log(`⏳ [${requestId}] Waiting for Myntra data collection...`);
  
  const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 [${requestId}] Myntra polling attempt ${attempts}/${maxAttempts}...`);
    
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
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Myntra data collection timeout after ${maxAttempts} attempts`);
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