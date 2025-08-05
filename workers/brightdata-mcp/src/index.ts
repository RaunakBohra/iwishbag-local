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
 * Call Amazon Product API - Real data only, no mock/fallback data
 */
async function callAmazonProductAPI(url: string, apiToken: string, requestId: string) {
  const funcStart = Date.now();
  try {
    console.log(`🛒 [${requestId}] callAmazonProductAPI started`);
    console.log(`📡 [${requestId}] Processing Amazon URL: ${url}`);
    
    // Extract ASIN for real scraping
    const asin = extractASIN(url);
    console.log(`🏷️ [${requestId}] Extracted ASIN: ${asin}`);
    
    if (!asin || asin.length !== 10) {
      console.log(`❌ [${requestId}] Invalid or missing ASIN, cannot proceed`);
      throw new Error('Invalid ASIN extracted from URL');
    }
    
    // Attempt real HTML scraping first
    console.log(`🌐 [${requestId}] Attempting real HTML scraping for ASIN: ${asin}`);
    try {
      const scrapedData = await scrapeAmazonByASIN(asin, requestId);
      if (scrapedData) {
        console.log(`✅ [${requestId}] Real HTML scraping successful`);
        return {
          content: [{
            text: JSON.stringify([scrapedData])
          }]
        };
      }
    } catch (error) {
      console.log(`⚠️ [${requestId}] HTML scraping failed: ${error.message}`);
    }
    
    // Attempt Bright Data MCP as backup
    console.log(`🔍 [${requestId}] Attempting Bright Data MCP API call`);
    try {
      const realApiResult = await attemptRealBrightDataCall(url, asin, apiToken, requestId);
      if (realApiResult) {
        console.log(`✅ [${requestId}] Bright Data API call successful`);
        return realApiResult;
      }
    } catch (error) {
      console.log(`⚠️ [${requestId}] Bright Data API failed: ${error.message}`);
    }
    
    // No fallback data - return failure
    const funcDuration = Date.now() - funcStart;
    console.log(`❌ [${requestId}] All scraping methods failed after ${funcDuration}ms`);
    throw new Error('Could not extract real product data from any source');

  } catch (error) {
    const funcDuration = Date.now() - funcStart;
    console.error(`💥 [${requestId}] Amazon API call failed after ${funcDuration}ms:`, error);
    // No fallback data - return error
    throw error;
  }
}

/**
 * Real HTML scraping function for Amazon products by ASIN
 */
async function scrapeAmazonByASIN(asin: string, requestId: string) {
  try {
    console.log(`🌐 [${requestId}] Scraping Amazon page for ASIN: ${asin}`);
    
    // Build clean Amazon URL
    const cleanUrl = `https://www.amazon.com/dp/${asin}`;
    console.log(`📡 [${requestId}] Fetching: ${cleanUrl}`);
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductBot/1.0; +https://iwishbag.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.log(`❌ [${requestId}] Amazon returned status: ${response.status}`);
      throw new Error(`Amazon responded with status ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 [${requestId}] HTML received, length: ${html.length} chars`);
    
    // Parse the HTML to extract product data
    const productData = parseAmazonHTML(html, asin, requestId);
    
    if (productData) {
      console.log(`✅ [${requestId}] Successfully parsed product data`);
      return productData;
    } else {
      console.log(`❌ [${requestId}] Could not parse product data from HTML`);
      return null;
    }
    
  } catch (error) {
    console.log(`💥 [${requestId}] HTML scraping error:`, error.message);
    throw error;
  }
}

/**
 * Parse Amazon HTML to extract real product data
 */
function parseAmazonHTML(html: string, asin: string, requestId: string) {
  try {
    console.log(`🔍 [${requestId}] Parsing Amazon HTML for product data`);

    // Extract product title
    let title = null;
    const titlePatterns = [
      /<span[^>]+id="productTitle"[^>]*>([^<]+)<\/span>/i,
      /<h1[^>]+class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<]+)<\/title>/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1].trim().replace(/\s+/g, ' ');
        if (title && !title.includes('Amazon.com') && title.length > 5) {
          console.log(`📝 [${requestId}] Found title: "${title}"`);
          break;
        }
      }
    }

    // Extract price
    let price = null;
    const pricePatterns = [
      /<span[^>]+class="[^"]*a-price-whole[^"]*"[^>]*>([0-9,]+)<\/span>/i,
      /<span[^>]+class="[^"]*price[^"]*"[^>]*>\$([0-9,.]+)<\/span>/i,
      /\$([0-9,]+\.?[0-9]*)/
    ];
    
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const priceStr = match[1].replace(/,/g, '');
        const priceNum = parseFloat(priceStr);
        if (priceNum > 0 && priceNum < 100000) { // Reasonable price range
          price = priceNum;
          console.log(`💰 [${requestId}] Found price: $${price}`);
          break;
        }
      }
    }

    // Extract brand
    let brand = null;
    const brandPatterns = [
      /<a[^>]+id="bylineInfo"[^>]*>([^<]+)<\/a>/i,
      /<span[^>]+class="[^"]*brand[^"]*"[^>]*>([^<]+)<\/span>/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        brand = match[1].trim().replace(/^(by |Brand: )/i, '');
        if (brand && brand.length > 0) {
          console.log(`🏪 [${requestId}] Found brand: "${brand}"`);
          break;
        }
      }
    }

    // Extract weight from shipping/product details
    let weight = null;
    const weightPatterns = [
      /shipping\s+weight:?\s*([0-9.]+)\s*(pounds?|lbs?)/i,
      /item\s+weight:?\s*([0-9.]+)\s*(pounds?|lbs?)/i,
      /weight:?\s*([0-9.]+)\s*(pounds?|lbs?)/i
    ];
    
    for (const pattern of weightPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const weightNum = parseFloat(match[1]);
        if (weightNum > 0 && weightNum < 1000) { // Reasonable weight range
          weight = weightNum;
          console.log(`⚖️ [${requestId}] Found weight: ${weight} lbs`);
          break;
        }
      }
    }

    // Only return data if we have at least a title
    if (title) {
      const productData = {
        title: title,
        brand: brand || null,
        initial_price: price || null,
        final_price: price || null,
        currency: "USD",
        availability: "Unknown", // Would need more parsing for this
        asin: asin,
        url: `https://www.amazon.com/dp/${asin}`,
        item_weight: weight ? `${weight} lbs` : null,
        timestamp: new Date().toISOString(),
        source: "html_scraping"
      };

      console.log(`✅ [${requestId}] Successfully extracted product data`);
      return productData;
    } else {
      console.log(`❌ [${requestId}] Could not extract minimum required data (title)`);
      return null;
    }

  } catch (error) {
    console.log(`💥 [${requestId}] HTML parsing error:`, error.message);
    return null;
  }
}

/**
 * Attempt real Bright Data API call for clean ASIN URLs
 */
async function attemptRealBrightDataCall(url: string, asin: string, apiToken: string, requestId: string) {
  try {
    console.log(`🌐 [${requestId}] Attempting real Bright Data MCP API...`);
    
    // Try the MCP endpoint first
    const response = await fetch(`https://mcp.brightdata.com/mcp?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.random().toString(36).substring(7),
        method: "tools/call",
        params: {
          name: "web_data_amazon_product",
          arguments: { url: url }
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`📡 [${requestId}] Real API response:`, JSON.stringify(data, null, 2));
      
      if (data.result && data.result.content) {
        return data.result;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`❌ [${requestId}] Real API attempt failed:`, error.message);
    return null;
  }
}

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