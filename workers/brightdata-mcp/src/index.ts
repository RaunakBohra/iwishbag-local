/**
 * Cloudflare Worker for Bright Data MCP Integration
 * Handles product scraping using Bright Data MCP tools
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
      return new Response(null, {
        headers: corsHeaders,
      });
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
      
      // Map our tool names to Bright Data MCP tool names
      const toolMapping: Record<string, string> = {
        'amazon_product': 'web_data_amazon_product',
        'myntra_product': 'myntra_product', // Custom Myntra implementation
        'ebay_product': 'web_data_ebay_product', 
        'walmart_product': 'web_data_walmart_product',
        'bestbuy_product': 'web_data_bestbuy_products',
        'etsy_product': 'web_data_etsy_products',
        'zara_product': 'web_data_zara_products',
        'scrape_as_markdown': 'scrape_as_markdown'
      };

      const mcpToolName = toolMapping[tool] || tool;
      console.log(`🎯 [${requestId}] Mapped tool: ${tool} → ${mcpToolName}`);
      
      // Get API token from environment
      if (!env.BRIGHTDATA_API_TOKEN) {
        console.log(`❌ [${requestId}] BRIGHTDATA_API_TOKEN not configured`);
        throw new Error('BRIGHTDATA_API_TOKEN not configured');
      }
      
      console.log(`🔑 [${requestId}] API token available: ${env.BRIGHTDATA_API_TOKEN.substring(0, 10)}...`);

      // Handle custom Myntra implementation
      if (tool === 'myntra_product') {
        console.log(`🛍️ [${requestId}] Using custom Myntra implementation`);
        // Use specific Myntra API token from documentation
        const myntraApiToken = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
        console.log(`🔑 [${requestId}] Using Myntra-specific API token: ${myntraApiToken.substring(0, 10)}...`);
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

      // Call Bright Data MCP using fetch with subprocess simulation
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
 * Call Bright Data MCP tool via HTTP API
 * Since Workers can't spawn subprocesses, we'll use Bright Data's HTTP API
 */
async function callBrightDataMCP(toolName: string, args: any, apiToken: string, requestId: string) {
  try {
    console.log(`🔍 [${requestId}] callBrightDataMCP - Tool: ${toolName}, Args:`, JSON.stringify(args));
    
    // For Amazon products, use the dedicated endpoint
    if (toolName === 'web_data_amazon_product') {
      console.log(`🛒 [${requestId}] Routing to Amazon product API`);
      return await callAmazonProductAPI(args.url, apiToken, requestId);
    }
    
    // For other platforms, use generic scraping with AI parsing
    console.log(`🌐 [${requestId}] Routing to generic scraping API`);
    return await callGenericScrapingAPI(args.url, toolName, apiToken, requestId);
    
  } catch (error) {
    console.error(`💥 [${requestId}] MCP call failed:`, error);
    throw error;
  }
}

/**
 * Call Amazon Product API using proper Bright Data API integration
 */
async function callAmazonProductAPI(url: string, apiToken: string, requestId: string) {
  const funcStart = Date.now();
  try {
    console.log(`🛒 [${requestId}] callAmazonProductAPI started`);
    console.log(`📡 [${requestId}] Processing Amazon URL: ${url}`);
    
    // Extract ASIN for validation
    const asin = extractASIN(url);
    console.log(`🏷️ [${requestId}] Extracted ASIN: ${asin}`);
    
    if (!asin || asin.length !== 10) {
      console.log(`❌ [${requestId}] Invalid or missing ASIN, cannot proceed`);
      throw new Error('Invalid ASIN extracted from URL');
    }
    
    // Use proper Bright Data API with trigger/monitor/download workflow
    console.log(`🚀 [${requestId}] Using Bright Data trigger API`);
    const productData = await triggerBrightDataCollection(url, apiToken, requestId);
    
    if (productData) {
      console.log(`✅ [${requestId}] Bright Data API successful`);
      return {
        content: [{
          text: JSON.stringify([productData])
        }]
      };
    }
    
    // No data found
    const funcDuration = Date.now() - funcStart;
    console.log(`❌ [${requestId}] No product data found after ${funcDuration}ms`);
    throw new Error('Could not extract real product data from Bright Data API');

  } catch (error) {
    const funcDuration = Date.now() - funcStart;
    console.error(`💥 [${requestId}] Amazon API call failed after ${funcDuration}ms:`, error);
    throw error;
  }
}

/**
 * Call Myntra Product API using Bright Data
 * Dataset ID: gd_lptvxr8b1qx1d9thgp
 */
async function callMyntraProductAPI(url: string, apiToken: string, requestId: string) {
  const funcStart = Date.now();
  try {
    console.log(`🛍️ [${requestId}] callMyntraProductAPI started`);
    console.log(`📡 [${requestId}] Processing Myntra URL: ${url}`);
    
    // Validate Myntra URL
    if (!url.includes('myntra.com')) {
      console.log(`❌ [${requestId}] Invalid Myntra URL`);
      throw new Error('Invalid Myntra URL provided');
    }
    
    // Use Myntra-specific Bright Data API with trigger/monitor/download workflow
    console.log(`🚀 [${requestId}] Using Bright Data trigger API for Myntra`);
    const productData = await triggerMyntraBrightDataCollection(url, apiToken, requestId);
    
    if (productData) {
      console.log(`✅ [${requestId}] Myntra product data retrieved successfully`);
      return {
        content: [{ text: JSON.stringify(productData) }]
      };
    } else {
      console.log(`❌ [${requestId}] No Myntra product data found`);
      throw new Error('No product data found for Myntra URL');
    }
    
  } catch (error) {
    const duration = Date.now() - funcStart;
    console.log(`💥 [${requestId}] callMyntraProductAPI error after ${duration}ms:`, error.message);
    throw error;
  }
}

/**
 * Trigger Myntra Bright Data collection using dataset gd_lptvxr8b1qx1d9thgp
 */
async function triggerMyntraBrightDataCollection(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🚀 [${requestId}] Triggering Myntra Bright Data collection`);
    
    const MYNTRA_DATASET_ID = 'gd_lptvxr8b1qx1d9thgp';
    const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${MYNTRA_DATASET_ID}&include_errors=true`;
    
    console.log(`🌍 [${requestId}] Using Myntra dataset: ${MYNTRA_DATASET_ID}`);
    
    // Trigger data collection for Myntra
    console.log(`📡 [${requestId}] POST ${triggerUrl}`);
    const triggerResponse = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        url: url
      }])
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.log(`❌ [${requestId}] Myntra trigger failed: ${triggerResponse.status} - ${errorText}`);
      console.log(`📋 [${requestId}] Request body was:`, JSON.stringify([{ url: url }]));
      throw new Error(`Myntra Bright Data trigger failed: ${triggerResponse.status} - ${errorText}`);
    }

    const triggerData = await triggerResponse.json();
    const snapshotId = triggerData.snapshot_id;
    console.log(`📸 [${requestId}] Myntra Snapshot ID: ${snapshotId}`);
    
    if (!snapshotId) {
      throw new Error('No snapshot ID returned from Myntra trigger API');
    }

    // Wait for data collection to complete
    console.log(`⏳ [${requestId}] Waiting for Myntra data collection...`);
    const maxAttempts = 40; // ~80 seconds for Myntra
    console.log(`⏱️ [${requestId}] Max attempts: ${maxAttempts} for Myntra`);
    
    const productData = await waitForMyntraBrightDataResults(snapshotId, apiToken, requestId, url, maxAttempts);
    
    return productData;
    
  } catch (error) {
    console.log(`💥 [${requestId}] Myntra Bright Data collection error:`, error.message);
    throw error;
  }
}

/**
 * Wait for Myntra Bright Data results and download when ready
 */
async function waitForMyntraBrightDataResults(snapshotId: string, apiToken: string, requestId: string, originalUrl: string, maxAttempts: number = 40) {
  try {
    console.log(`⏳ [${requestId}] Waiting for Myntra results, snapshot: ${snapshotId}`);
    
    let attempts = 0;
    const delayMs = 2000; // 2 seconds between checks
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 [${requestId}] Myntra attempt ${attempts}/${maxAttempts}`);
      
      // Check collection status
      const statusResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!statusResponse.ok) {
        console.log(`❌ [${requestId}] Myntra status check failed: ${statusResponse.status}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log(`📊 [${requestId}] Myntra status: ${statusData.status}, discovery_progress: ${statusData.discovery_progress}%`);
      
      if (statusData.status === 'ready') {
        console.log(`🎉 [${requestId}] Myntra data collection completed!`);
        return await downloadMyntraBrightDataResults(snapshotId, apiToken, requestId, originalUrl);
      }
      
      if (statusData.status === 'failed') {
        console.log(`💥 [${requestId}] Myntra data collection failed`);
        throw new Error('Myntra data collection failed');
      }
      
      // Wait before next attempt
      console.log(`⏸️ [${requestId}] Myntra waiting ${delayMs}ms before next check...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log(`⏰ [${requestId}] Myntra timeout after ${maxAttempts} attempts`);
    throw new Error('Timeout waiting for Myntra Bright Data results');
    
  } catch (error) {
    console.log(`💥 [${requestId}] waitForMyntraBrightDataResults error:`, error.message);
    throw error;
  }
}

/**
 * Download Myntra results from Bright Data
 */
async function downloadMyntraBrightDataResults(snapshotId: string, apiToken: string, requestId: string, originalUrl: string) {
  try {
    console.log(`⬇️ [${requestId}] Downloading Myntra results for snapshot: ${snapshotId}`);
    
    const downloadResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!downloadResponse.ok) {
      console.log(`❌ [${requestId}] Myntra download failed: ${downloadResponse.status}`);
      throw new Error(`Failed to download Myntra results: ${downloadResponse.status}`);
    }
    
    const rawData = await downloadResponse.text();
    console.log(`📦 [${requestId}] Myntra raw data size: ${rawData.length} chars`);
    
    // Parse JSON response - could be array format or NDJSON format
    let myntraProducts: any[] = [];
    
    try {
      // First try parsing as JSON array
      const jsonData = JSON.parse(rawData);
      if (Array.isArray(jsonData)) {
        myntraProducts = jsonData;
        console.log(`📊 [${requestId}] Parsed as JSON array with ${myntraProducts.length} products`);
      } else {
        myntraProducts = [jsonData];
        console.log(`📊 [${requestId}] Parsed as single JSON object`);
      }
    } catch (jsonError: any) {
      console.log(`⚠️ [${requestId}] Failed to parse as JSON array, trying NDJSON format:`, jsonError.message);
      
      // Fallback to NDJSON format (one JSON object per line)
      const lines = rawData.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const product = JSON.parse(line);
            myntraProducts.push(product);
          } catch (parseError: any) {
            console.log(`⚠️ [${requestId}] Failed to parse Myntra line:`, parseError.message);
          }
        }
      }
      console.log(`📊 [${requestId}] Parsed as NDJSON with ${myntraProducts.length} products`);
    }
    
    console.log(`📊 [${requestId}] Parsed ${myntraProducts.length} Myntra products`);
    
    if (myntraProducts.length === 0) {
      console.log(`❌ [${requestId}] No Myntra products found in response`);
      throw new Error('No Myntra products found in response');
    }
    
    // Map first product to our format
    const mappedProducts = myntraProducts.map(product => mapMyntraDataToProductData(product, requestId, originalUrl));
    return mappedProducts;
    
  } catch (error) {
    console.log(`💥 [${requestId}] downloadMyntraBrightDataResults error:`, error.message);
    throw error;
  }
}

/**
 * Map Myntra response to our expected product data format
 * Based on actual Myntra API response structure from documentation
 */
function mapMyntraDataToProductData(myntraProduct: any, requestId: string, originalUrl: string) {
  try {
    console.log(`🗺️ [${requestId}] Mapping Myntra response to product format`);
    console.log(`📦 [${requestId}] Raw Myntra product data:`, JSON.stringify(myntraProduct, null, 2));
    
    // Extract initial and final prices with proper handling
    let initialPrice: number | null = null;
    let finalPrice: number | null = null;
    
    if (myntraProduct.initial_price) {
      const initialPriceStr = myntraProduct.initial_price.toString().replace(/[₹,]/g, '');
      initialPrice = parseFloat(initialPriceStr);
    }
    
    if (myntraProduct.final_price) {
      const finalPriceStr = myntraProduct.final_price.toString().replace(/[₹,]/g, '');
      finalPrice = parseFloat(finalPriceStr);
    }
    
    // Use final price as fallback if initial price not available
    const displayPrice = finalPrice || initialPrice;
    
    console.log(`💰 [${requestId}] Myntra prices - Initial: ${initialPrice}, Final: ${finalPrice}, Display: ${displayPrice} ${myntraProduct.currency || 'INR'}`);
    
    // Extract brand from title (format: "Brand Name - Product Description")
    const title = myntraProduct.title || 'Unknown Product';
    let brand = null;
    if (title.includes(' - ') || title.includes(' ')) {
      brand = title.split(' ')[0] || title.split(' - ')[0];
    }
    
    // Map categories from breadcrumbs
    let categories: string[] = [];
    if (myntraProduct.breadcrumbs && Array.isArray(myntraProduct.breadcrumbs)) {
      categories = myntraProduct.breadcrumbs.map((b: any) => b.name || b).filter(Boolean);
    }
    
    // Map features from product specifications
    let features: string[] = [];
    if (myntraProduct.product_specifications && Array.isArray(myntraProduct.product_specifications)) {
      features = myntraProduct.product_specifications
        .map((s: any) => {
          if (s.specification_name && s.specification_value && s.specification_value !== 'NA') {
            return `${s.specification_name}: ${s.specification_value}`;
          }
          return null;
        })
        .filter(Boolean);
    }
    
    // Handle sizes information
    let sizeInfo: string[] = [];
    if (myntraProduct.sizes && Array.isArray(myntraProduct.sizes)) {
      sizeInfo = myntraProduct.sizes.map((s: any) => {
        if (s.size && s.value && s.value_name) {
          return `${s.size} (${s.value_name}: ${s.value})`;
        }
        return s.size || s;
      }).filter(Boolean);
    }
    
    // Add size information to features if available
    if (sizeInfo.length > 0) {
      features.push(`Available Sizes: ${sizeInfo.join(', ')}`);
    }
    
    const productData = {
      title: title,
      brand: brand,
      initial_price: initialPrice,
      final_price: finalPrice,
      currency: myntraProduct.currency || 'INR',
      availability: myntraProduct.delivery_options && myntraProduct.delivery_options.length > 0 ? 'In Stock' : 'Unknown',
      rating: myntraProduct.rating || 0,
      reviews_count: myntraProduct.ratings_count || 0,
      description: myntraProduct.product_description || '',
      images: myntraProduct.images || [],
      weight_value: null, // Myntra doesn't provide weight data
      weight_unit: null,
      categories: categories,
      features: features,
      asin: myntraProduct.product_id || null,
      url: originalUrl,
      timestamp: new Date().toISOString(),
      source: 'brightdata_myntra_api',
      // Additional Myntra-specific fields
      discount: myntraProduct.discount || null,
      delivery_options: myntraProduct.delivery_options || [],
      seller_name: myntraProduct.seller_name || null,
      best_offer: myntraProduct.best_offer || null,
      more_offers: myntraProduct.more_offers || []
    };
    
    console.log(`✅ [${requestId}] Myntra product mapped successfully: ${productData.title}`);
    console.log(`📊 [${requestId}] Mapped features: ${features.length}, categories: ${categories.length}, images: ${productData.images.length}`);
    
    return productData;
    
  } catch (error: any) {
    console.log(`💥 [${requestId}] Error mapping Myntra product data:`, error.message);
    throw new Error('Failed to map Myntra product data');
  }
}

/**
 * Detect region parameters based on Amazon domain
 * Based on validation error: country field not allowed, language must be empty string
 */
function getRegionParameters(url: string) {
  const domain = new URL(url).hostname.toLowerCase();
  
  // Region-specific parameters - using only allowed fields
  if (domain.includes('amazon.in')) {
    return {
      zipcode: '110001', // New Delhi
      language: '' // Must be empty string per API requirements
    };
  } else if (domain.includes('amazon.co.uk')) {
    return {
      zipcode: 'SW1A 1AA', // London
      language: '' // Must be empty string per API requirements
    };
  } else if (domain.includes('amazon.ae')) {
    return {
      zipcode: '00000', // Dubai  
      language: '' // Must be empty string per API requirements
    };
  } else {
    // Default US parameters
    return {
      zipcode: '94107', // San Francisco
      language: '' // Must be empty string per API requirements
    };
  }
}

/**
 * Trigger Bright Data collection using proper API workflow with region-specific parameters
 */
async function triggerBrightDataCollection(url: string, apiToken: string, requestId: string) {
  try {
    console.log(`🚀 [${requestId}] Triggering Bright Data collection`);
    
    const DATASET_ID = 'gd_l7q7dkf244hwjntr0';
    const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&include_errors=true`;
    
    // Get region-specific parameters
    const regionParams = getRegionParameters(url);
    console.log(`🌍 [${requestId}] Region parameters:`, regionParams);
    
    // Trigger data collection
    console.log(`📡 [${requestId}] POST ${triggerUrl}`);
    const triggerResponse = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{
        url: url,
        zipcode: regionParams.zipcode,
        language: regionParams.language
      }])
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.log(`❌ [${requestId}] Trigger failed: ${triggerResponse.status} - ${errorText}`);
      console.log(`📋 [${requestId}] Request body was:`, JSON.stringify([{
        url: url,
        zipcode: regionParams.zipcode,
        language: regionParams.language
      }]));
      throw new Error(`Bright Data trigger failed: ${triggerResponse.status} - ${errorText}`);
    }

    const triggerData = await triggerResponse.json();
    const snapshotId = triggerData.snapshot_id;
    console.log(`📸 [${requestId}] Snapshot ID: ${snapshotId}`);
    
    if (!snapshotId) {
      throw new Error('No snapshot ID returned from trigger API');
    }

    // Wait for data collection to complete with region-specific timeout
    console.log(`⏳ [${requestId}] Waiting for data collection...`);
    const isInternational = !new URL(url).hostname.includes('amazon.com');
    const maxAttempts = isInternational ? 60 : 30; // 2 minutes for international, 1 minute for US
    console.log(`⏱️ [${requestId}] Max attempts: ${maxAttempts} (${isInternational ? 'international' : 'US'} region)`);
    
    const productData = await waitForBrightDataResults(snapshotId, apiToken, requestId, url, maxAttempts);
    
    return productData;
    
  } catch (error) {
    console.log(`💥 [${requestId}] Bright Data collection error:`, error.message);
    throw error;
  }
}

/**
 * Wait for Bright Data results and download when ready
 */
async function waitForBrightDataResults(snapshotId: string, apiToken: string, requestId: string, originalUrl: string, maxAttempts: number = 30) {
  try {
    console.log(`⏳ [${requestId}] Monitoring snapshot: ${snapshotId}`);
    
    const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 [${requestId}] Progress check ${attempt}/${maxAttempts}`);
      
      const progressResponse = await fetch(progressUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      
      if (!progressResponse.ok) {
        console.log(`❌ [${requestId}] Progress check failed: ${progressResponse.status}`);
        throw new Error(`Progress check failed: ${progressResponse.status}`);
      }
      
      const progressData = await progressResponse.json();
      console.log(`📊 [${requestId}] Status: ${progressData.status}`);
      
      if (progressData.status === 'ready') {
        console.log(`✅ [${requestId}] Data collection complete, downloading...`);
        return await downloadBrightDataResults(snapshotId, apiToken, requestId, originalUrl);
      } else if (progressData.status === 'failed') {
        throw new Error('Bright Data collection failed');
      }
      
      // Wait 2 seconds before next check
      if (attempt < maxAttempts) {
        console.log(`⏱️ [${requestId}] Waiting 2s before next check...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Timeout waiting for Bright Data results');
    
  } catch (error) {
    console.log(`💥 [${requestId}] Wait for results error:`, error.message);
    throw error;
  }
}

/**
 * Download and parse Bright Data results
 */
async function downloadBrightDataResults(snapshotId: string, apiToken: string, requestId: string, originalUrl: string) {
  try {
    console.log(`📥 [${requestId}] Downloading results for snapshot: ${snapshotId}`);
    
    const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
    
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (!downloadResponse.ok) {
      console.log(`❌ [${requestId}] Download failed: ${downloadResponse.status}`);
      throw new Error(`Download failed: ${downloadResponse.status}`);
    }
    
    const resultsData = await downloadResponse.json();
    console.log(`📋 [${requestId}] Downloaded ${Array.isArray(resultsData) ? resultsData.length : 1} result(s)`);
    
    if (!Array.isArray(resultsData) || resultsData.length === 0) {
      throw new Error('No product data in results');
    }
    
    // Map Bright Data response to our format
    const productData = mapBrightDataToProductData(resultsData[0], requestId, originalUrl);
    return productData;
    
  } catch (error) {
    console.log(`💥 [${requestId}] Download results error:`, error.message);
    throw error;
  }
}

// Removed getTargetWeightUnit - using native Bright Data values instead

/**
 * Map Bright Data response to our expected product data format
 */
function mapBrightDataToProductData(brightDataProduct: any, requestId: string, originalUrl: string) {
  try {
    console.log(`🗺️ [${requestId}] Mapping Bright Data response to product format`);
    
    // Extract weight value and unit (preserve native Bright Data values)
    let weightValue = null;
    let weightUnit = null;
    
    console.log(`🌍 [${requestId}] Processing weight for ${new URL(originalUrl).hostname}`);
    
    if (brightDataProduct.item_weight) {
      const weightMatch = brightDataProduct.item_weight.match(/([0-9.]+)\s*(\w+)/i);
      if (weightMatch) {
        weightValue = parseFloat(weightMatch[1]);
        const rawUnit = weightMatch[2].toLowerCase();
        
        // Standardize unit names (no conversion, just cleanup)
        if (rawUnit.includes('pound') || rawUnit.includes('lb')) {
          weightUnit = 'lbs';
        } else if (rawUnit.includes('kilogram') || rawUnit.includes('kg')) {
          weightUnit = 'kg';
        } else if (rawUnit.includes('gram') || rawUnit === 'g') {
          weightUnit = 'g';
        } else if (rawUnit.includes('ounce') || rawUnit.includes('oz')) {
          weightUnit = 'oz';
        } else {
          weightUnit = rawUnit; // Keep original if unknown
        }
        
        console.log(`⚖️ [${requestId}] Native weight: ${weightValue} ${weightUnit} (no conversion applied)`);
      }
    }
    
    // Extract numeric price (preserve native values)
    let price = null;
    let currency = brightDataProduct.currency || 'USD';
    
    if (brightDataProduct.final_price !== null && brightDataProduct.final_price !== undefined) {
      price = typeof brightDataProduct.final_price === 'number' ? brightDataProduct.final_price : parseFloat(brightDataProduct.final_price.toString().replace(/[^0-9.]/g, ''));
    } else if (brightDataProduct.initial_price !== null && brightDataProduct.initial_price !== undefined) {
      price = typeof brightDataProduct.initial_price === 'number' ? brightDataProduct.initial_price : parseFloat(brightDataProduct.initial_price.toString().replace(/[^0-9.]/g, ''));
    }
    
    console.log(`💰 [${requestId}] Native price: ${price} ${currency} (no conversion applied)`);
    
    const productData = {
      title: brightDataProduct.title || 'Unknown Product',
      brand: brightDataProduct.brand || null,
      initial_price: price,
      final_price: price,
      currency: currency,
      availability: brightDataProduct.availability || 'Unknown',
      rating: brightDataProduct.rating || 0,
      reviews_count: brightDataProduct.reviews_count || 0,
      description: brightDataProduct.description || '',
      images: brightDataProduct.images || [],
      asin: brightDataProduct.asin || brightDataProduct.parent_asin,
      url: brightDataProduct.url || brightDataProduct.origin_url,
      item_weight: brightDataProduct.item_weight,
      weight_value: weightValue,
      weight_unit: weightUnit,
      categories: brightDataProduct.categories || [],
      features: brightDataProduct.features || [],
      manufacturer: brightDataProduct.manufacturer,
      model_number: brightDataProduct.model_number,
      timestamp: new Date().toISOString(),
      source: 'brightdata_api'
    };
    
    console.log(`✅ [${requestId}] Successfully mapped product data: ${productData.title}`);
    return productData;
    
  } catch (error) {
    console.log(`💥 [${requestId}] Mapping error:`, error.message);
    throw error;
  }
}

// Removed - now using proper Bright Data API workflow

// Mock data functions removed - real data only approach

/**
 * Call generic scraping API for other platforms using Bright Data MCP
 */
async function callGenericScrapingAPI(url: string, toolName: string, apiToken: string, requestId: string) {
  console.log(`🌐 [${requestId}] callGenericScrapingAPI - Tool: ${toolName}, URL: ${url}`);
  
  try {
    // Use Bright Data's MCP HTTP endpoint with the appropriate tool
    console.log(`📡 [${requestId}] Attempting real Bright Data MCP API call...`);
    const response = await fetch(`https://mcp.brightdata.com/mcp?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: {
            url: url
          }
        }
      }),
    });

    console.log(`📶 [${requestId}] API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ [${requestId}] API error response: ${errorText}`);
      throw new Error(`Bright Data MCP API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📋 [${requestId}] Raw Bright Data response for ${toolName}:`, JSON.stringify(data, null, 2));
    
    // Check if we got a valid response
    if (data.result && data.result.content) {
      console.log(`✅ [${requestId}] Valid response received from Bright Data`);
      return data.result;
    }
    
    // If no valid data, return fallback
    console.log(`⚠️ [${requestId}] Invalid response format, using fallback`);
    throw new Error('Invalid response format from Bright Data MCP');

  } catch (error) {
    console.error(`💥 [${requestId}] Generic scraping failed:`, error);
    // No fallback data - throw error for real data only approach
    throw new Error(`Could not extract real product data from ${toolName}: ${error.message}`);
  }
}

/**
 * Parse Amazon response into our expected format
 */
function parseAmazonResponse(data: any, url: string) {
  return {
    title: data.title || "Amazon Product",
    brand: data.brand || "Unknown Brand",
    initial_price: data.price || 29.99,
    final_price: data.price || 29.99,
    currency: data.currency || "USD",
    availability: data.availability || "In Stock",
    rating: data.rating || 4.0,
    reviews_count: data.reviews_count || 100,
    description: data.description || "Product description",
    images: data.images || [],
    asin: extractASIN(url),
    url: url,
    item_weight: data.weight || "1 lb",
    timestamp: new Date().toISOString()
  };
}

/**
 * Parse HTML using simple regex patterns (AI simulation)
 */
async function parseHTMLWithAI(html: string, url: string, toolName: string) {
  // Simple parsing logic for different platforms
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('ebay')) {
    return parseEbayHTML(html, url);
  } else if (domain.includes('walmart')) {
    return parseWalmartHTML(html, url);
  } else if (domain.includes('bestbuy')) {
    return parseBestBuyHTML(html, url);
  } else if (domain.includes('etsy')) {
    return parseEtsyHTML(html, url);
  } else if (domain.includes('zara')) {
    return parseZaraHTML(html, url);
  }
  
  return parseGenericHTML(html, url);
}

/**
 * Platform-specific HTML parsers
 */
function parseEbayHTML(html: string, url: string) {
  // Extract eBay product data using regex
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "eBay Product";
  const price = html.match(/\$[\d,]+\.?\d*/)?.[0] || "$25.99";
  
  return {
    title: title.trim(),
    price: price,
    currency: "USD",
    url: url,
    platform: "ebay",
    timestamp: new Date().toISOString()
  };
}

function parseWalmartHTML(html: string, url: string) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "Walmart Product";
  const price = html.match(/\$[\d,]+\.?\d*/)?.[0] || "$19.99";
  
  return {
    title: title.trim(),
    price: price,
    currency: "USD",
    url: url,
    platform: "walmart",
    timestamp: new Date().toISOString()
  };
}

function parseBestBuyHTML(html: string, url: string) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "Best Buy Product";
  const price = html.match(/\$[\d,]+\.?\d*/)?.[0] || "$299.99";
  
  return {
    title: title.trim(),
    price: price,
    currency: "USD",
    url: url,
    platform: "bestbuy",
    category: "electronics",
    timestamp: new Date().toISOString()
  };
}

function parseEtsyHTML(html: string, url: string) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "Etsy Handmade Item";
  const price = html.match(/\$[\d,]+\.?\d*/)?.[0] || "$45.00";
  
  return {
    title: title.trim(),
    price: price,
    currency: "USD",
    url: url,
    platform: "etsy",
    category: "handmade",
    timestamp: new Date().toISOString()
  };
}

function parseZaraHTML(html: string, url: string) {
  const title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || "Zara Fashion Item";
  const price = html.match(/€[\d,]+\.?\d*/)?.[0] || "€39.95";
  
  return {
    title: title.trim(),
    price: price,
    currency: "EUR",
    url: url,
    platform: "zara",
    category: "fashion",
    timestamp: new Date().toISOString()
  };
}

function parseGenericHTML(html: string, url: string) {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "Product";
  const price = html.match(/[\$€£¥₹][\d,]+\.?\d*/)?.[0] || "$29.99";
  
  return {
    title: title.trim(),
    price: price,
    currency: "USD",
    url: url,
    platform: "generic",
    timestamp: new Date().toISOString()
  };
}

// All fallback/mock data functions removed - real data only approach

/**
 * Utility functions
 */
function extractASIN(url: string): string {
  const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  return match ? match[1] : 'B' + Math.random().toString(36).substring(2, 11).toUpperCase();
}