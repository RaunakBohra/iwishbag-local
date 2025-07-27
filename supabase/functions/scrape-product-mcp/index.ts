import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticateUser,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    const { url, website_domain, demo_mode } = await req.json();

    // Skip authentication for demo mode
    let user = null;
    let supabaseClient = null;
    
    if (demo_mode) {
      console.log(`🎭 Demo mode - skipping authentication`);
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      // Authenticate user for normal mode
      const authResult = await authenticateUser(req);
      user = authResult.user;
      supabaseClient = authResult.supabaseClient;
      console.log(`🔐 Authenticated user ${user.email} requesting product scraping`);
    }

    if (!url || !website_domain) {
      throw new Error('URL and website_domain are required');
    }

    console.log(`🔵 Scraping product with MCP from: ${url}`);

    // Use Bright Data MCP for scraping
    const scrapedData = await scrapeWithBrightDataMCP(url, website_domain);

    return new Response(JSON.stringify(scrapedData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Scraping error:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: null,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

async function scrapeWithBrightDataMCP(url: string, website: string) {
  const apiKey = Deno.env.get('BRIGHTDATA_API_KEY');

  if (!apiKey) {
    throw new Error('Bright Data API key not configured');
  }

  console.log(`🔵 Using Bright Data MCP Browser for ${website}: ${url}`);

  // Call Bright Data MCP API
  const response = await fetch('https://api.brightdata.com/mcp/v1/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone: 'mcp_browser',
      task: 'extract_product_data',
      url: url,
      selectors: getSelectorsForWebsite(website),
      wait_for: getWaitConditionsForWebsite(website),
      actions: getActionsForWebsite(website),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bright Data MCP error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`🔍 MCP response:`, JSON.stringify(data, null, 2));

  // Extract and normalize data
  const extractedData = normalizeMCPData(data, website);
  
  return {
    success: true,
    data: extractedData,
    confidence: 0.95, // MCP has high confidence
    method: 'brightdata-mcp',
  };
}

function getSelectorsForWebsite(website: string) {
  const selectors = {
    'amazon.com': {
      title: '#productTitle',
      price: '.a-price-whole',
      weight: '#productDetails_techSpec_section_1 tr:contains("Weight") td',
      dimensions: '#productDetails_techSpec_section_1 tr:contains("Dimensions") td',
      asin: '#ASIN',
      brand: '#bylineInfo',
      availability: '#availability',
      images: '#imageBlock img',
      hsn_code: '#productDetails_techSpec_section_1 tr:contains("HSN") td',
      battery: '#productDetails_techSpec_section_1 tr:contains("Battery") td',
      country_origin: '#productDetails_techSpec_section_1 tr:contains("Country of Origin") td',
    },
    'amazon.in': {
      title: '#productTitle',
      price: '.a-price-whole',
      weight: 'tr:contains("Item Weight") td, tr:contains("Net Weight") td',
      dimensions: 'tr:contains("Product Dimensions") td',
      asin: '#ASIN',
      brand: '#bylineInfo',
      availability: '#availability',
      images: '#imageBlock img',
      hsn_code: 'tr:contains("HSN Code") td',
      battery: 'tr:contains("Batteries") td',
      country_origin: 'tr:contains("Country of Origin") td',
    },
    'flipkart.com': {
      title: '.B_NuCI',
      price: '._30jeq3',
      weight: '._1AtVbE:contains("Weight") + ._1AtVbE',
      dimensions: '._1AtVbE:contains("Dimensions") + ._1AtVbE',
      brand: '._2WkVRV',
      availability: '._1nVtOl',
      images: '._2r_T1I img',
      country_origin: '._1AtVbE:contains("Country of Origin") + ._1AtVbE',
    },
  };

  return selectors[website] || selectors['amazon.com'];
}

function getWaitConditionsForWebsite(website: string) {
  return {
    'amazon.com': { selector: '#productTitle', timeout: 10000 },
    'amazon.in': { selector: '#productTitle', timeout: 10000 },
    'flipkart.com': { selector: '.B_NuCI', timeout: 10000 },
  }[website] || { selector: 'body', timeout: 5000 };
}

function getActionsForWebsite(website: string) {
  // Actions to perform before extraction (e.g., clicking "Show more")
  const actions = {
    'amazon.com': [
      { type: 'click', selector: '#feature-bullets-btf', optional: true },
      { type: 'wait', duration: 500 },
    ],
    'amazon.in': [
      { type: 'click', selector: '#feature-bullets-btf', optional: true },
      { type: 'wait', duration: 500 },
    ],
    'flipkart.com': [
      { type: 'click', selector: '._2KpZ6l._1FH0tX', optional: true },
      { type: 'wait', duration: 500 },
    ],
  };

  return actions[website] || [];
}

function normalizeMCPData(data: any, website: string) {
  const normalized = {
    title: data.title || 'Product (Title not found)',
    price: parseFloat(data.price?.replace(/[^0-9.]/g, '') || '0'),
    currency: detectCurrencyFromWebsite(website),
    weight: parseWeight(data.weight),
    dimensions: parseDimensions(data.dimensions),
    asin: data.asin || '',
    brand: data.brand || '',
    availability: data.availability || 'Unknown',
    images: Array.isArray(data.images) ? data.images.slice(0, 5) : [],
    hsn_code: data.hsn_code || '',
    battery_info: data.battery || 'No battery information',
    country_of_origin: data.country_origin || 'Not specified',
    category: detectCategory(data.title || '', website),
    url: data.url,
  };

  return normalized;
}

function detectCurrencyFromWebsite(website: string): string {
  const currencyMap = {
    'amazon.com': 'USD',
    'amazon.in': 'INR',
    'amazon.co.uk': 'GBP',
    'amazon.de': 'EUR',
    'amazon.jp': 'JPY',
    'flipkart.com': 'INR',
    'ebay.com': 'USD',
    'walmart.com': 'USD',
  };

  return currencyMap[website] || 'USD';
}

function parseWeight(weightStr: string): number {
  if (!weightStr) return 0.5;

  const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|lbs?|pounds?|g|grams?|oz|ounces?)/i);
  if (!match) return 0.5;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.includes('kg')) return value;
  if (unit.includes('lb') || unit.includes('pound')) return value * 0.453592;
  if (unit.includes('g') && !unit.includes('kg')) return value / 1000;
  if (unit.includes('oz') || unit.includes('ounce')) return value * 0.0283495;

  return value;
}

function parseDimensions(dimensionsStr: string) {
  if (!dimensionsStr) return null;

  // Try to parse "L x W x H" format
  const match = dimensionsStr.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    return {
      length: parseFloat(match[1]),
      width: parseFloat(match[2]),
      height: parseFloat(match[3]),
      unit: dimensionsStr.includes('cm') ? 'cm' : 'inches',
    };
  }

  return null;
}

function detectCategory(title: string, website: string): string {
  const titleLower = title.toLowerCase();

  if (titleLower.includes(' ac ') || titleLower.includes('air condition')) {
    return 'appliances';
  } else if (titleLower.includes('phone') || titleLower.includes('laptop')) {
    return 'electronics';
  } else if (titleLower.includes('shirt') || titleLower.includes('dress')) {
    return 'clothing';
  } else if (titleLower.includes('book')) {
    return 'books';
  }

  return 'general';
}