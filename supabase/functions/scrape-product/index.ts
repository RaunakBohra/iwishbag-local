import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticateUser,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { ScrapingCache } from '../_shared/scraping-cache.ts';

// AI Extraction Result Interface
interface AIExtractionResult {
  title: string;
  price: number;
  currency: string;
  weight: {
    value: number;
    unit: string;
    confidence: 'high' | 'medium' | 'low';
    source: string;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  category: string;
  brand?: string;
  images: string[];
  material?: string;
  hsnSuggestion?: {
    code: string;
    reasoning: string;
  };
  confidence: number;
}

// ============================================================================
// HTML PREPROCESSING FOR AI EXTRACTION
// ============================================================================

function preprocessHTMLForAI(html: string, url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Extract only product-relevant sections based on domain
    if (domain.includes('amazon')) {
      return extractAmazonProductSection(html);
    } else if (domain.includes('flipkart')) {
      return extractFlipkartProductSection(html);
    } else if (domain.includes('ebay')) {
      return extractEbayProductSection(html);
    }
    
    // Generic extraction for other sites
    return extractGenericProductSection(html);
  } catch (error) {
    console.error('HTML preprocessing error:', error);
    return html.substring(0, 50000); // Fallback to first 50KB
  }
}

function extractAmazonProductSection(html: string): string {
  const sections = [];
  
  // Title section
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>[\s\S]*?<\/span>/i);
  if (titleMatch) sections.push(titleMatch[0]);
  
  // Price section
  const priceMatch = html.match(/<div[^>]*class="[^"]*a-price[^"]*"[^>]*>[\s\S]{0,500}<\/div>/gi);
  if (priceMatch) sections.push(...priceMatch);
  
  // Product details section (contains weight)
  const detailsMatch = html.match(/<div[^>]*id="detailBullets[^"]*"[^>]*>[\s\S]{0,5000}<\/div>/i);
  if (detailsMatch) sections.push(detailsMatch[0]);
  
  // Feature bullets
  const featureMatch = html.match(/<div[^>]*id="feature-bullets"[^>]*>[\s\S]{0,3000}<\/div>/i);
  if (featureMatch) sections.push(featureMatch[0]);
  
  // Product information table
  const tableMatch = html.match(/<table[^>]*class="[^"]*prodDetTable[^"]*"[^>]*>[\s\S]{0,5000}<\/table>/i);
  if (tableMatch) sections.push(tableMatch[0]);
  
  // Technical details section
  const techMatch = html.match(/<div[^>]*class="[^"]*techD[^"]*"[^>]*>[\s\S]{0,5000}<\/div>/i);
  if (techMatch) sections.push(techMatch[0]);
  
  // Additional Information section (often contains actual product weight)
  const additionalMatch = html.match(/<h2[^>]*>Additional Information<\/h2>[\s\S]{0,3000}(?=<h2|<div[^>]*class="[^"]*section)/i);
  if (additionalMatch) sections.push(additionalMatch[0]);
  
  // Look for weight patterns anywhere in the page
  const weightPatterns = [
    /Item Weight[^<]*?(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?|g|grams?|oz|ounces?)/gi,
    /Product Weight[^<]*?(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?|g|grams?|oz|ounces?)/gi,
    /Net Weight[^<]*?(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?|g|grams?|oz|ounces?)/gi,
    /<span[^>]*>Weight<\/span>[^<]*?<span[^>]*>([^<]+)<\/span>/gi
  ];
  
  for (const pattern of weightPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      sections.push(...matches.slice(0, 3));
    }
  }
  
  return sections.join('\n\n').substring(0, 30000); // Limit to 30KB
}

function extractFlipkartProductSection(html: string): string {
  const sections = [];
  
  // Product title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>[\s\S]*?<\/h1>/i);
  if (titleMatch) sections.push(titleMatch[0]);
  
  // Price section
  const priceMatch = html.match(/<div[^>]*class="[^"]*_30jeq3[^"]*"[^>]*>[\s\S]{0,200}<\/div>/gi);
  if (priceMatch) sections.push(...priceMatch);
  
  // Specifications section
  const specsMatch = html.match(/<div[^>]*class="[^"]*_2418kt[^"]*"[^>]*>[\s\S]{0,5000}<\/div>/i);
  if (specsMatch) sections.push(specsMatch[0]);
  
  return sections.join('\n\n');
}

function extractEbayProductSection(html: string): string {
  const sections = [];
  
  // Title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*it-ttl[^"]*"[^>]*>[\s\S]*?<\/h1>/i);
  if (titleMatch) sections.push(titleMatch[0]);
  
  // Price
  const priceMatch = html.match(/<span[^>]*class="[^"]*notranslate[^"]*"[^>]*>[\s\S]{0,200}<\/span>/gi);
  if (priceMatch) sections.push(...priceMatch);
  
  // Item specifics
  const specsMatch = html.match(/<div[^>]*class="[^"]*itemAttr[^"]*"[^>]*>[\s\S]{0,5000}<\/div>/i);
  if (specsMatch) sections.push(specsMatch[0]);
  
  return sections.join('\n\n');
}

function extractGenericProductSection(html: string): string {
  // Generic extraction for unknown sites
  const sections = [];
  
  // Look for common product patterns
  const patterns = [
    /<h1[^>]*>[\s\S]{0,200}<\/h1>/gi,
    /<div[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]{0,500}<\/div>/gi,
    /<div[^>]*class="[^"]*weight[^"]*"[^>]*>[\s\S]{0,500}<\/div>/gi,
    /<div[^>]*class="[^"]*spec[^"]*"[^>]*>[\s\S]{0,2000}<\/div>/gi,
    /<table[^>]*class="[^"]*spec[^"]*"[^>]*>[\s\S]{0,3000}<\/table>/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) sections.push(...matches.slice(0, 3)); // Limit matches per pattern
  }
  
  return sections.join('\n\n').substring(0, 20000); // Max 20KB
}

// ============================================================================
// AI-POWERED EXTRACTION FUNCTIONS
// ============================================================================

async function extractWithCloudflareAI(brightDataResponse: any, productUrl: string): Promise<AIExtractionResult> {
  console.log('🤖 Using Cloudflare AI for product extraction...');
  
  // Preprocess HTML if it's raw HTML content
  let dataToProcess = brightDataResponse;
  if (typeof brightDataResponse === 'string' || 
      (brightDataResponse.html && typeof brightDataResponse.html === 'string') ||
      (brightDataResponse.body && typeof brightDataResponse.body === 'string')) {
    const htmlContent = typeof brightDataResponse === 'string' ? brightDataResponse : 
                       (brightDataResponse.body || brightDataResponse.html);
    console.log(`📄 Preprocessing HTML (${htmlContent.length} chars) for AI...`);
    dataToProcess = preprocessHTMLForAI(htmlContent, productUrl);
    console.log(`✂️ Reduced to ${dataToProcess.length} chars after preprocessing`);
  }
  
  const prompt = `You are a product data extraction expert. Analyze this e-commerce product data and extract the most relevant information.

Product URL: ${productUrl}

Product sections:
${typeof dataToProcess === 'string' ? dataToProcess : JSON.stringify(dataToProcess, null, 2)}

WEIGHT EXTRACTION RULES:
- Product weight NOT shipping weight
- Beds/furniture: 10-100kg range typical
- Look for "Item Weight", "Product Weight", "Net Weight"
- Ignore "Package Weight", "Shipping Weight"

Return ONLY JSON:
{
  "title": "exact product title",
  "price": numeric_value_only,
  "currency": "INR/USD/EUR/etc",
  "weight": {
    "value": numeric_value,
    "unit": "kg/lbs/g/oz",
    "confidence": "high/medium/low",
    "source": "where you found this weight"
  },
  "dimensions": {
    "length": numeric_value,
    "width": numeric_value, 
    "height": numeric_value,
    "unit": "cm/in"
  },
  "category": "furniture/electronics/clothing/accessories/books/toys/general",
  "brand": "brand name or null",
  "images": ["url1", "url2"],
  "material": "material or null",
  "hsnSuggestion": {
    "code": "suggested_hsn_code",
    "reasoning": "why this HSN code fits"
  },
  "confidence": 0.85
}`;

  try {
    // Since we're running in Supabase Edge Functions (based on Deno), 
    // we'll use a direct call to Cloudflare AI API
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    
    if (!cloudflareAccountId || !cloudflareApiToken) {
      throw new Error('Cloudflare credentials not configured');
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3-8b-instruct`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 1500,
        temperature: 0.1, // Low temperature for consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare AI error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log('🔍 Raw Cloudflare AI response:', aiResponse);
    
    // Parse the AI response - Cloudflare AI returns result.response
    const aiText = aiResponse.result?.response || aiResponse.result;
    
    // Extract JSON from markdown code blocks if present
    let jsonMatch = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      // Try to find JSON without code blocks
      jsonMatch = aiText.match(/(\{[\s\S]*\})/);
    }
    
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('No valid JSON found in AI response');
    }
    
    // Clean up JSON before parsing
    let cleanJson = jsonMatch[1]
      .replace(/\/\/[^\n]*/g, '') // Remove comments
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/`/g, "'") // Replace backticks with single quotes
      .replace(/\n/g, '\\n') // Escape newlines properly
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    // Handle null values without quotes
    cleanJson = cleanJson.replace(/:\s*null\b/g, ': null');
    
    // Additional cleanup for malformed JSON
    cleanJson = cleanJson
      .replace(/([^\\])\\([^\\nrt"'])/g, '$1\\\\$2') // Escape unescaped backslashes
      .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas before closing braces/brackets
    
    const extractedData = JSON.parse(cleanJson);
    
    console.log('✅ Cloudflare AI extraction successful');
    return extractedData;
    
  } catch (error) {
    console.error('❌ Cloudflare AI extraction failed:', error);
    throw error;
  }
}

async function extractWithClaudeHaiku(brightDataResponse: any, productUrl: string): Promise<AIExtractionResult> {
  console.log('🧠 Using Claude Haiku for complex product extraction...');
  
  // Preprocess HTML if it's raw HTML content
  let dataToProcess = brightDataResponse;
  if (typeof brightDataResponse === 'string' || 
      (brightDataResponse.html && typeof brightDataResponse.html === 'string') ||
      (brightDataResponse.body && typeof brightDataResponse.body === 'string')) {
    const htmlContent = typeof brightDataResponse === 'string' ? brightDataResponse : 
                       (brightDataResponse.body || brightDataResponse.html);
    console.log(`📄 Preprocessing HTML (${htmlContent.length} chars) for AI...`);
    dataToProcess = preprocessHTMLForAI(htmlContent, productUrl);
    console.log(`✂️ Reduced to ${dataToProcess.length} chars after preprocessing`);
  }
  
  const prompt = `You are an expert e-commerce product data analyst. Extract accurate product information from this scraped data.

Product URL: ${productUrl}

Product sections:
${typeof dataToProcess === 'string' ? dataToProcess : JSON.stringify(dataToProcess, null, 2)}

EXTRACTION REQUIREMENTS:
1. WEIGHT ACCURACY: Find the main product weight, not shipping/packaging weight
   - For beds/furniture: Expect 10-100kg range
   - For electronics: Expect appropriate weight for device type
   - Ignore obviously wrong weights (like 16g for a refrigerator)

2. IMAGE FILTERING: Only product images, exclude:
   - UI elements, logos, navigation sprites
   - Amazon/website branding
   - Tracking pixels

3. CATEGORY DETECTION: Accurate categorization based on product function

4. HSN SUGGESTION: Suggest appropriate Indian HSN code based on:
   - Material composition
   - Primary function
   - Product classification

Return as valid JSON with this structure:
{
  "title": "complete product name",
  "price": number,
  "currency": "currency_code",
  "weight": {
    "value": number,
    "unit": "kg/lbs/g/oz", 
    "confidence": "high/medium/low",
    "source": "field or location where found"
  },
  "dimensions": {
    "length": number,
    "width": number,
    "height": number,
    "unit": "cm/in"
  },
  "category": "accurate_category",
  "brand": "brand_name",
  "images": ["clean_product_image_urls"],
  "material": "primary_material",
  "hsnSuggestion": {
    "code": "hsn_code",
    "reasoning": "classification_logic"
  },
  "confidence": 0.9
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ANTHROPIC_API_KEY')}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();
    let responseText = claudeResponse.content[0].text;
    
    // Extract JSON from markdown code blocks if present
    let jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (!jsonMatch) {
      // Try to find JSON without code blocks
      jsonMatch = responseText.match(/(\{[\s\S]*\})/);
    }
    
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('No valid JSON found in Claude response');
    }
    
    // Clean up JSON before parsing (same logic as Cloudflare)
    let cleanJson = jsonMatch[1]
      .replace(/\/\/[^\n]*/g, '') // Remove comments
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/`/g, "'") // Replace backticks with single quotes
      .replace(/\n/g, '\\n') // Escape newlines properly
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    // Handle null values without quotes
    cleanJson = cleanJson.replace(/:\s*null\b/g, ': null');
    
    // Additional cleanup for malformed JSON
    cleanJson = cleanJson
      .replace(/([^\\])\\([^\\nrt"'])/g, '$1\\\\$2') // Escape unescaped backslashes
      .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas before closing braces/brackets
    
    const extractedData = JSON.parse(cleanJson);
    
    console.log('✅ Claude Haiku extraction successful');
    return extractedData;
    
  } catch (error) {
    console.error('❌ Claude Haiku extraction failed:', error);
    throw error;
  }
}

async function extractProductDataWithAI(brightDataResponse: any, productUrl: string): Promise<any> {
  console.log('🚀 Starting AI-powered product extraction...');
  console.log('📊 Response type:', typeof brightDataResponse);
  console.log('📊 Response keys:', brightDataResponse ? Object.keys(brightDataResponse).slice(0, 10) : 'null');
  
  try {
    // Try Claude Haiku first (more accurate, larger context window)
    console.log('🧠 Attempting Claude Haiku extraction...');
    const claudeResult = await extractWithClaudeHaiku(brightDataResponse, productUrl);
    console.log(`✅ Claude Haiku succeeded with confidence: ${claudeResult.confidence}`);
    console.log('🏋️ Claude extracted weight:', claudeResult.weight);
    return normalizeAIResult(claudeResult);
    
  } catch (claudeError) {
    console.log('⚠️ Claude Haiku failed:', claudeError.message);
    console.log('⚠️ Falling back to Cloudflare AI...');
    
    try {
      const cfResult = await extractWithCloudflareAI(brightDataResponse, productUrl);
      
      if (cfResult.confidence > 0.7) {
        console.log(`✅ Cloudflare AI succeeded with confidence: ${cfResult.confidence}`);
        console.log('🏋️ Cloudflare extracted weight:', cfResult.weight);
        return normalizeAIResult(cfResult);
      } else {
        console.log(`⚠️ Cloudflare AI low confidence: ${cfResult.confidence}`);
        throw new Error('Low confidence from AI extraction');
      }
      
    } catch (cloudflareError) {
      console.error('❌ Both AI methods failed:', cloudflareError.message);
      console.error('❌ Using fallback extraction');
      // Fallback to existing regex method if both AI methods fail
      return extractStructuredData(brightDataResponse, getWebsiteDomain(productUrl));
    }
  }
}

function normalizeAIResult(aiResult: AIExtractionResult): any {
  return {
    title: aiResult.title,
    price: aiResult.price,
    currency: aiResult.currency || 'USD',
    weight: aiResult.weight.value * getKgConversionFactor(aiResult.weight.unit),
    weight_value: aiResult.weight.value,
    weight_unit: aiResult.weight.unit,
    weight_raw: `${aiResult.weight.value} ${aiResult.weight.unit}`,
    images: aiResult.images || [],
    availability: 'In Stock', // Default since AI doesn't always extract this
    category: aiResult.category,
    brand: aiResult.brand,
    material: aiResult.material,
    dimensions: aiResult.dimensions,
    hsnSuggestion: aiResult.hsnSuggestion,
    confidence: aiResult.confidence,
    method: 'ai-enhanced'
  };
}

// Function to create HSN suggestion if AI has high confidence
async function createHSNSuggestionIfNeeded(
  supabaseClient: any,
  userId: string | null,
  productUrl: string,
  aiResult: AIExtractionResult
): Promise<void> {
  try {
    // Only create suggestions for high-confidence AI extractions
    if (!aiResult.hsnSuggestion || aiResult.confidence < 0.85 || !userId) {
      return;
    }

    const { hsnSuggestion } = aiResult;
    
    // Check if HSN code already exists
    const { data: existingHSN } = await supabaseClient
      .from('hsn_master')
      .select('hsn_code')
      .eq('hsn_code', hsnSuggestion.code)
      .eq('is_active', true)
      .single();

    if (existingHSN) {
      console.log(`HSN code ${hsnSuggestion.code} already exists, skipping suggestion`);
      return;
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabaseClient
      .from('user_hsn_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('hsn_code', hsnSuggestion.code)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      console.log(`Pending HSN request for ${hsnSuggestion.code} already exists`);
      return;
    }

    // Create AI HSN suggestion
    const { data: newRequest, error } = await supabaseClient.rpc('create_ai_hsn_suggestion', {
      p_user_id: userId,
      p_product_name: aiResult.title,
      p_product_url: productUrl,
      p_hsn_code: hsnSuggestion.code,
      p_description: `${aiResult.category} - ${aiResult.title}`,
      p_category: aiResult.category,
      p_subcategory: aiResult.brand || null,
      p_keywords: [aiResult.category, aiResult.brand, aiResult.material].filter(Boolean),
      p_ai_confidence: aiResult.confidence,
      p_ai_reasoning: hsnSuggestion.reasoning,
      p_extraction_data: {
        title: aiResult.title,
        category: aiResult.category,
        brand: aiResult.brand,
        material: aiResult.material,
        weight: aiResult.weight,
        dimensions: aiResult.dimensions
      }
    });

    if (error) {
      console.error('Failed to create HSN suggestion:', error);
    } else {
      console.log(`✅ Created AI HSN suggestion for ${hsnSuggestion.code} with confidence ${aiResult.confidence}`);
    }

  } catch (error) {
    console.error('Error creating HSN suggestion:', error);
  }
}

function getKgConversionFactor(unit: string): number {
  const unitLower = unit.toLowerCase();
  if (unitLower.includes('kg')) return 1;
  if (unitLower.includes('lb') || unitLower.includes('pound')) return 0.453592;
  if (unitLower.includes('oz') || unitLower.includes('ounce')) return 0.0283495;
  if (unitLower.includes('g') && !unitLower.includes('kg')) return 0.001;
  return 1; // Default to kg
}

function getWebsiteDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown.com';
  }
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    const { url, website_domain, test, demo_mode } = await req.json();

    // Skip authentication for demo mode
    let user = null;
    let supabaseClient = null;
    
    if (demo_mode) {
      console.log(`🎭 Demo mode - skipping authentication`);
      // Create a basic supabase client for demo mode
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

    // Test endpoint to verify ScrapeAPI is working
    if (test) {
      const testResult = await testScrapeAPI();
      return new Response(JSON.stringify(testResult), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!url || !website_domain) {
      throw new Error('URL and website_domain are required');
    }

    console.log(`🔵 Scraping product from: ${url}`);

    // Initialize cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cache = new ScrapingCache(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const cachedData = await cache.get(url);
    if (cachedData) {
      console.log(`📦 Returning cached data for: ${url}`);
      return new Response(JSON.stringify({
        success: true,
        data: cachedData,
        confidence: 1.0,
        method: 'cache',
        cached: true,
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Try Bright Data first, fallback to ScrapeAPI
    let scrapedData;
    try {
      scrapedData = await scrapeWithBrightData(url, website_domain);
      console.log(`✅ Successfully scraped with Bright Data: ${scrapedData.data.title}`);
    } catch (brightDataError) {
      console.log(`⚠️ Bright Data failed, trying ScrapeAPI: ${brightDataError.message}`);
      scrapedData = await scrapeWithScrapeAPI(url, website_domain);
      console.log(`✅ Successfully scraped with ScrapeAPI: ${scrapedData.data.title}`);
    }

    // Cache the successful scrape
    if (scrapedData.success && scrapedData.data) {
      await cache.set(url, scrapedData.data, scrapedData.method);
    }

    // Create HSN suggestion if AI extraction was successful and user is authenticated
    if (scrapedData.success && scrapedData.data && scrapedData.method?.includes('ai') && user?.id) {
      try {
        // Convert normalized data back to AI result format for HSN suggestion
        if (scrapedData.data.hsnSuggestion && scrapedData.data.confidence > 0.85) {
          const aiResultForHSN: AIExtractionResult = {
            title: scrapedData.data.title,
            price: scrapedData.data.price,
            currency: scrapedData.data.currency || 'USD',
            weight: {
              value: scrapedData.data.weight_value || 0.5,
              unit: scrapedData.data.weight_unit || 'kg',
              confidence: 'high' as 'high' | 'medium' | 'low',
              source: 'ai_extraction'
            },
            dimensions: scrapedData.data.dimensions,
            category: scrapedData.data.category,
            brand: scrapedData.data.brand,
            images: scrapedData.data.images || [],
            material: scrapedData.data.material,
            hsnSuggestion: scrapedData.data.hsnSuggestion,
            confidence: scrapedData.data.confidence
          };
          
          await createHSNSuggestionIfNeeded(supabaseClient, user.id, url, aiResultForHSN);
        }
      } catch (hsnError) {
        console.error('Failed to create HSN suggestion, but continuing:', hsnError);
      }
    }

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

async function scrapeWithScrapeAPI(url: string, website: string) {
  const apiKey = Deno.env.get('SCRAPER_API_KEY');

  if (!apiKey) {
    throw new Error('ScrapeAPI key not configured');
  }

  console.log(`🔵 Using ScrapeAPI for ${website}: ${url}`);

  // Use the working ScrapeAPI endpoint with autoparse
  const scrapeApiUrl = `https://api.scraperapi.com/`;

  // Build URL with parameters
  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
    output_format: 'json',
    autoparse: 'true',
    country_code: 'us',
    session_number: Math.floor(Math.random() * 1000).toString(),
  });

  const fullUrl = `${scrapeApiUrl}?${params.toString()}`;

  console.log(`🔵 Calling ScrapeAPI: ${fullUrl}`);

  const response = await fetch(fullUrl);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ScrapeAPI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract data using AI-powered system
  const extractedData = await extractProductDataWithAI(data, url);
  
  return {
    success: true,
    data: extractedData,
    confidence: extractedData.confidence || 0.8,
    method: extractedData.method || 'ai-scrapeapi',
  };
}

async function scrapeAmazonWithScrapeAPI(url: string, apiKey: string) {
  console.log(`🔵 Using ScrapeAPI Amazon scraper: ${url}`);

  // Extract ASIN from Amazon URL
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
  const asin = asinMatch ? asinMatch[1] : null;

  if (!asin) {
    throw new Error('Could not extract ASIN from Amazon URL');
  }

  // ScrapeAPI Amazon product endpoint - corrected URL
  const amazonApiUrl = `http://api.scraperapi.com/api/v1/amazon/product`;

  // Build URL with parameters
  const params = new URLSearchParams({
    api_key: apiKey,
    asin: asin,
    country_code: 'us',
    session_number: Math.floor(Math.random() * 1000).toString(),
  });

  const fullUrl = `${amazonApiUrl}?${params.toString()}`;

  console.log(`🔵 Calling ScrapeAPI: ${fullUrl}`);

  const amazonResponse = await fetch(fullUrl);

  if (!amazonResponse.ok) {
    const errorText = await amazonResponse.text();
    throw new Error(`ScrapeAPI Amazon error: ${amazonResponse.status} - ${errorText}`);
  }

  const data = await amazonResponse.json();

  // Extract data using AI-powered system
  const extractedData = await extractProductDataWithAI(data, url);

  return {
    success: true,
    data: extractedData,
    confidence: extractedData.confidence || 0.8,
    method: extractedData.method || 'ai-amazon',
  };
}

function extractAmazonDataFromScrapeAPI(data: Record<string, unknown>, url: string) {
  // ScrapeAPI Amazon returns structured data
  const product = data.result || data;
  const weightData = extractAmazonWeightFromScrapeAPI(product);

  return {
    title: product.title || product.name || 'Amazon Product (Title not found)',
    price: extractAmazonPriceFromScrapeAPI(product),
    weight: weightData?.kg || 0.5,
    weight_value: weightData?.value || 0.5,
    weight_unit: weightData?.unit || 'kg',
    weight_raw: weightData?.raw || '0.5 kg',
    images: product.images || product.image_urls || [],
    availability: product.availability || (product.in_stock ? 'In Stock' : 'Unknown'),
    category: detectCategory(product.title || product.name, 'amazon.com'),
    // Don't include URL to avoid overwriting the input field
  };
}

function extractAmazonPriceFromScrapeAPI(product: Record<string, unknown>): number {
  // Try different Amazon price fields
  const priceFields = [
    product.price,
    product.current_price,
    product.sale_price,
    product.original_price,
    product.list_price,
    product.price_value,
    product.price_amount,
  ];

  for (const price of priceFields) {
    if (price && typeof price === 'number') {
      return price;
    }
    if (price && typeof price === 'string') {
      const numericPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', ''));
      if (!isNaN(numericPrice)) {
        return numericPrice;
      }
    }
  }

  return 0;
}

function extractAmazonWeightFromScrapeAPI(product: Record<string, unknown>): WeightData | null {
  // Try different Amazon weight fields
  const weightFields = [
    product.weight,
    product.shipping_weight,
    product.package_weight,
    product.item_weight,
    product.product_weight,
  ];

  for (const weight of weightFields) {
    if (weight) {
      const weightData = extractWeightFromValue(weight);
      if (weightData) {
        return weightData;
      }
    }
  }

  // Return default weight if nothing found
  return {
    value: 0.5,
    unit: 'kg',
    raw: '0.5 kg',
    kg: 0.5
  };
}

function extractProductDataFromScrapeAPI(data: Record<string, unknown>, website: string) {
  console.log(`🔵 Extracting data from ScrapeAPI response for ${website}`);

  // Handle the structured response format from ScrapeAPI with autoparse
  const extracted = {
    name: '',
    price: '',
    weight: '',
    images: [] as string[],
    availability: '',
    category: '',
    description: '',
    brand: '',
    rating: '',
    reviews_count: '',
    url: '',
    currency: 'USD',
    country: 'US',
  };

  try {
    // Extract from the structured response
    if (data.name) {
      extracted.name = data.name;
    }

    if (data.pricing) {
      extracted.price = data.pricing;
      // Try to extract currency from price
      if (data.pricing.includes('₹')) {
        extracted.currency = 'INR';
        extracted.country = 'IN';
      } else if (data.pricing.includes('$')) {
        extracted.currency = 'USD';
        extracted.country = 'US';
      } else if (data.pricing.includes('€')) {
        extracted.currency = 'EUR';
        extracted.country = 'EU';
      }
    }

    if (data.product_information?.Item_Weight) {
      extracted.weight = data.product_information.Item_Weight;
    }

    if (data.images && Array.isArray(data.images)) {
      extracted.images = data.images.slice(0, 5); // Limit to 5 images
    }

    if (data.availability_status) {
      extracted.availability = data.availability_status;
    }

    if (data.product_category) {
      extracted.category = data.product_category;
    }

    if (data.full_description) {
      extracted.description = data.full_description;
    }

    if (data.brand) {
      extracted.brand = data.brand;
    }

    if (data.average_rating) {
      extracted.rating = data.average_rating.toString();
    }

    if (data.total_reviews) {
      extracted.reviews_count = data.total_reviews.toString();
    }

    console.log(`🔵 Extracted data:`, {
      name: extracted.name.substring(0, 50) + '...',
      price: extracted.price,
      weight: extracted.weight,
      images_count: extracted.images.length,
      availability: extracted.availability,
      currency: extracted.currency,
    });
    
    // Debug: Log the full data object keys
    console.log(`🔍 ScrapeAPI response keys:`, Object.keys(data));
  } catch (error) {
    console.error(`🔴 Error extracting data from ScrapeAPI response:`, error);
  }

  return extracted;
}

function extractPriceFromString(priceString: string): number {
  if (!priceString) return 0;

  try {
    // Remove currency symbols and extract numeric value
    const numericValue = priceString.replace(/[₹$€£,]/g, '').trim();
    const price = parseFloat(numericValue);
    return isNaN(price) ? 0 : price;
  } catch (error) {
    console.error('Error extracting price from string:', error);
    return 0;
  }
}

function extractWeightFromString(weightString: string): WeightData {
  if (!weightString) {
    return {
      value: 0.5,
      unit: 'kg',
      raw: '0.5 kg',
      kg: 0.5
    };
  }

  try {
    const weightMatch = weightString.match(/(\d+(?:\.\d+)?)\s*(ounces?|oz|lbs?|pounds?|g|grams?|kg|kilograms?)?/i);
    
    if (weightMatch) {
      const value = parseFloat(weightMatch[1]);
      const unit = weightMatch[2]?.toLowerCase() || '';
      
      // Normalize unit names
      let normalizedUnit = 'kg'; // Default if no unit specified
      if (unit) {
        if (unit.includes('ounce') || unit === 'oz') normalizedUnit = 'oz';
        else if (unit.includes('pound') || unit.includes('lb')) normalizedUnit = 'lbs';
        else if (unit.includes('gram') && !unit.includes('kg')) normalizedUnit = 'g';
        else if (unit.includes('kg')) normalizedUnit = 'kg';
      }
      
      return {
        value: value,
        unit: normalizedUnit,
        raw: weightString.trim(),
        kg: convertWeightToKg(value, normalizedUnit)
      };
    }

    // If no pattern matches, return default
    return {
      value: 0.5,
      unit: 'kg',
      raw: weightString.trim(),
      kg: 0.5
    };
  } catch (error) {
    console.error('Error extracting weight from string:', error);
    return {
      value: 0.5,
      unit: 'kg',
      raw: '0.5 kg',
      kg: 0.5
    };
  }
}

function extractPriceFromScrapeAPI(product: Record<string, unknown>): number {
  // Try different price fields
  const priceFields = [
    product.price,
    product.current_price,
    product.sale_price,
    product.original_price,
    product.list_price,
  ];

  for (const price of priceFields) {
    if (price && typeof price === 'number') {
      return price;
    }
    if (price && typeof price === 'string') {
      const numericPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', ''));
      if (!isNaN(numericPrice)) {
        return numericPrice;
      }
    }
  }

  return 0;
}

function extractWeightFromScrapeAPI(product: Record<string, unknown>): number {
  // Try different weight fields
  const weightFields = [product.weight, product.shipping_weight, product.package_weight];

  for (const weight of weightFields) {
    if (weight && typeof weight === 'number') {
      return weight;
    }
    if (weight && typeof weight === 'string') {
      // Parse weight strings like "1.2 lbs", "500g", etc.
      const weightMatch = weight.match(
        /(\d+(?:\.\d+)?)\s*(ounces?|lbs?|pounds?|g|grams?|kg|kilograms?)/i,
      );
      if (weightMatch) {
        const value = parseFloat(weightMatch[1]);
        const unit = weightMatch[2].toLowerCase();

        if (unit.includes('ounce')) {
          return value * 0.0283495; // Convert to kg
        } else if (unit.includes('lb') || unit.includes('pound')) {
          return value * 0.453592; // Convert to kg
        } else if (unit.includes('g') || unit.includes('gram')) {
          return value / 1000; // Convert to kg
        } else if (unit.includes('kg')) {
          return value;
        }
      }
    }
  }

  return 0.5; // Default weight
}

async function scrapeWithBrightData(url: string, website: string) {
  const apiKey = Deno.env.get('BRIGHTDATA_API_KEY');

  if (!apiKey) {
    throw new Error('Bright Data API key not configured');
  }

  console.log(`🔵 Using Bright Data Structured Scraper for ${website}: ${url}`);

  // Get the appropriate dataset ID for the website
  const datasetId = getDatasetIdForWebsite(website);
  
  if (!datasetId) {
    console.log(`⚠️ No structured scraper available for ${website}, falling back to Web Unlocker`);
    return scrapeWithBrightDataWebUnlocker(url, website);
  }

  // Use Bright Data Synchronous Scraper API for immediate results
  const response = await fetch('https://api.brightdata.com/datasets/v3/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      input: [{
        url: url,
        zipcode: "10001", // Default US zipcode for consistent pricing
        language: ""
      }]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`⚠️ Structured scraper failed: ${response.status} - ${errorText}, falling back to Web Unlocker`);
    return scrapeWithBrightDataWebUnlocker(url, website);
  }

  const data = await response.json();
  console.log(`🔍 Structured scraper response:`, JSON.stringify(data, null, 2));
  
  // Log specific fields we're looking for
  if (data && data.data && data.data[0]) {
    const product = data.data[0];
    console.log('📦 Product weight fields:', {
      weight: product.weight,
      item_weight: product.item_weight,
      shipping_weight: product.shipping_weight,
      product_information: product.product_information,
      specifications: product.specifications,
    });
  }
  
  // Check if we got a snapshot_id (async response) instead of direct data
  if (data.snapshot_id && !data.data) {
    console.log(`⚠️ Got async response with snapshot_id: ${data.snapshot_id}, falling back to Web Unlocker`);
    return scrapeWithBrightDataWebUnlocker(url, website);
  }

  // Extract data using AI-powered system
  const extractedData = await extractProductDataWithAI(data, url);
  
  console.log(`🔍 AI extracted data:`, {
    title: extractedData.title,
    price: extractedData.price,
    weight: extractedData.weight,
    category: extractedData.category,
    currency: extractedData.currency,
    weight_raw: extractedData.weight_raw,
    method: extractedData.method,
    confidence: extractedData.confidence,
  });

  return {
    success: true,
    data: {
      ...extractedData,
      // Don't include URL to avoid overwriting the input field
    },
    confidence: calculateConfidence(extractedData, website),
    method: 'brightdata-structured',
    rawResponse: data, // For debugging
  };
}

function getDatasetIdForWebsite(website: string): string | null {
  // Dataset IDs for different e-commerce sites
  // These need to be obtained from your Bright Data account
  const datasetIds = {
    'amazon.com': 'gd_l7q7dkf244hwjntr0', // Amazon Products dataset ID
    'amazon.in': 'gd_l7q7dkf244hwjntr0', // Same Amazon scraper works for different domains
    'amazon.co.uk': 'gd_l7q7dkf244hwjntr0',
    'amazon.de': 'gd_l7q7dkf244hwjntr0',
    'ebay.com': 'gd_lwqk8n1oqkx5y7z2', // eBay Products dataset ID (example)
    'walmart.com': 'gd_p9w3r2t5y8u1i4o6', // Walmart Products dataset ID (example)
    // Add more as needed
  };

  return datasetIds[website] || null;
}

function extractStructuredData(data: any, website: string) {
  // Handle structured response from Bright Data scrapers
  let extractedData = {
    title: 'Product (Title not found)',
    price: 0,
    weight: 0.5,
    weight_value: 0.5,
    weight_unit: 'kg',
    weight_raw: '0.5 kg',
    images: [] as string[],
    availability: 'Unknown',
    category: 'general',
    description: '',
    brand: '',
    rating: '',
    reviews_count: '',
    currency: 'USD',
    country: 'US',
  };

  try {
    // Handle different response formats
    let product = data;
    
    // If response is an array, take the first item
    if (Array.isArray(data) && data.length > 0) {
      product = data[0];
    }
    
    // If response has a data field
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      product = data.data[0];
    }

    // Extract title
    if (product.title) {
      extractedData.title = product.title;
    } else if (product.name) {
      extractedData.title = product.name;
    } else if (product.product_title) {
      extractedData.title = product.product_title;
    }

    // Extract price
    console.log(`🔍 Price extraction - checking fields:`, {
      final_price: product.final_price,
      price: product.price,
      initial_price: product.initial_price,
    });
    
    if (product.final_price) {
      extractedData.price = parseFloat(product.final_price.toString().replace(/[^0-9.]/g, ''));
      console.log(`✅ Using final_price: ${product.final_price} -> ${extractedData.price}`);
    } else if (product.price) {
      extractedData.price = parseFloat(product.price.toString().replace(/[^0-9.]/g, ''));
      console.log(`✅ Using price: ${product.price} -> ${extractedData.price}`);
    } else if (product.initial_price) {
      extractedData.price = parseFloat(product.initial_price.toString().replace(/[^0-9.]/g, ''));
      console.log(`✅ Using initial_price: ${product.initial_price} -> ${extractedData.price}`);
    } else {
      console.log(`❌ No price field found in product data`);
    }

    // Extract currency and country
    if (product.currency) {
      extractedData.currency = product.currency;
    } else if (product.country) {
      // Map country to currency
      const countryToCurrency: Record<string, string> = {
        'IN': 'INR',
        'US': 'USD',
        'GB': 'GBP',
        'DE': 'EUR',
        'FR': 'EUR',
        'JP': 'JPY',
      };
      extractedData.currency = countryToCurrency[product.country] || 'USD';
    }
    
    // Handle Indian prices that might be in INR
    if (website.includes('amazon.in') || website.includes('flipkart.com')) {
      extractedData.currency = 'INR';
    }

    // Extract images and filter out tracking pixels
    const imageUrls = product.image_urls || product.images || product.main_image || [];
    const images = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    
    extractedData.images = images
      .filter((url: string) => {
        if (!url || typeof url !== 'string') return false;
        // Filter out tracking pixels and non-product images
        const isTrackingPixel = url.includes('uedata') || 
                                url.includes('nav-sprite') || 
                                url.includes('batch/1/OP') ||
                                url.includes('omaha/images') ||
                                url.includes('yourprime');
        return !isTrackingPixel && (url.includes('.jpg') || url.includes('.png') || url.includes('.webp'));
      })
      .slice(0, 5);
      
    // If no valid images found, try main_image field
    if (extractedData.images.length === 0 && product.main_image) {
      extractedData.images = [product.main_image];
    }

    // Extract availability
    if (product.availability) {
      extractedData.availability = product.availability;
    } else if (product.in_stock !== undefined) {
      extractedData.availability = product.in_stock ? 'In Stock' : 'Out of Stock';
    }

    // Extract weight from multiple possible fields
    console.log('🔍 Looking for weight in product data...');
    const weightSources = [
      product.weight,
      product.shipping_weight,
      product.item_weight,
      product.package_weight,
      product.dimensions?.weight,
      product.product_information?.weight,
      product.product_information?.item_weight,
      product.product_information?.shipping_weight,
      product.product_information?.['Item Weight'],
      product.product_information?.['Package Weight'],
      product.product_information?.['Shipping Weight'],
      product.specifications?.weight,
      product.specifications?.['Item Weight'],
      product.specifications?.['Product Weight']
    ];
    
    console.log('📦 Weight sources found:', weightSources.filter(w => w !== undefined));

    let weightData: WeightData | null = null;
    
    for (const weightSource of weightSources) {
      if (weightSource) {
        weightData = extractWeightFromValue(weightSource);
        if (weightData) {
          // Set all weight fields
          extractedData.weight = weightData.kg; // For backward compatibility
          extractedData.weight_value = weightData.value;
          extractedData.weight_unit = weightData.unit;
          extractedData.weight_raw = weightData.raw;
          break;
        }
      }
    }

    // If no direct weight, try parsing from specifications or product_information
    if (!weightData) {
      console.log('⚠️ No direct weight found, searching in text fields...');
      
      // Try product_information as a whole
      if (product.product_information) {
        console.log('📋 Product information:', product.product_information);
        const infoString = JSON.stringify(product.product_information);
        // Look for weight patterns, prioritizing kg over other units
        const patterns = [
          /(\d+(?:\.\d+)?)\s*(kg|kilograms?)/i,
          /(\d+(?:\.\d+)?)\s*(lbs?|pounds?)/i,
          /(\d+(?:\.\d+)?)\s*(g|grams?)(?!\w)/i,
          /(\d+(?:\.\d+)?)\s*(oz|ounces?)/i
        ];
        
        for (const pattern of patterns) {
          const weightMatch = infoString.match(pattern);
          if (weightMatch) {
            const value = parseFloat(weightMatch[1]);
            const unit = weightMatch[2].toLowerCase();
            
            // Skip if value seems unrealistic for the product
            if (value > 0 && value < 1000) {
              console.log(`✅ Found weight in product_information: ${weightMatch[0]}`);
              
              // Normalize unit names
              let normalizedUnit = unit;
              if (unit.includes('ounce') || unit === 'oz') normalizedUnit = 'oz';
              else if (unit.includes('pound') || unit.includes('lb')) normalizedUnit = 'lbs';
              else if (unit.includes('gram') && !unit.includes('kg')) normalizedUnit = 'g';
              else if (unit.includes('kg')) normalizedUnit = 'kg';
              
              extractedData.weight = convertWeightToKg(value, unit); // For backward compatibility
              extractedData.weight_value = value;
              extractedData.weight_unit = normalizedUnit;
              extractedData.weight_raw = weightMatch[0];
              break;
            }
          }
        }
      }
      
      // Try specifications if still no weight
      if (!extractedData.weight_raw && product.specifications) {
        console.log('📋 Specifications:', product.specifications);
        const specString = JSON.stringify(product.specifications);
        const patterns = [
          /(\d+(?:\.\d+)?)\s*(kg|kilograms?)/i,
          /(\d+(?:\.\d+)?)\s*(lbs?|pounds?)/i,
          /(\d+(?:\.\d+)?)\s*(g|grams?)(?!\w)/i,
          /(\d+(?:\.\d+)?)\s*(oz|ounces?)/i
        ];
        
        for (const pattern of patterns) {
          const weightMatch = specString.match(pattern);
          if (weightMatch) {
            const value = parseFloat(weightMatch[1]);
            const unit = weightMatch[2].toLowerCase();
            
            if (value > 0 && value < 1000) {
              console.log(`✅ Found weight in specifications: ${weightMatch[0]}`);
              
              // Normalize unit names
              let normalizedUnit = unit;
              if (unit.includes('ounce') || unit === 'oz') normalizedUnit = 'oz';
              else if (unit.includes('pound') || unit.includes('lb')) normalizedUnit = 'lbs';
              else if (unit.includes('gram') && !unit.includes('kg')) normalizedUnit = 'g';
              else if (unit.includes('kg')) normalizedUnit = 'kg';
              
              extractedData.weight = convertWeightToKg(value, unit); // For backward compatibility
              extractedData.weight_value = value;
              extractedData.weight_unit = normalizedUnit;
              extractedData.weight_raw = weightMatch[0];
              break;
            }
          }
        }
      }
    }

    // Extract other fields
    if (product.description) {
      extractedData.description = product.description;
    }
    
    if (product.brand) {
      extractedData.brand = product.brand;
    }
    
    if (product.rating) {
      extractedData.rating = product.rating.toString();
    }
    
    if (product.reviews_count) {
      extractedData.reviews_count = product.reviews_count.toString();
    }

    // Detect category from title if not provided
    extractedData.category = detectCategory(extractedData.title, website);

    console.log(`✅ Successfully extracted structured data for: ${extractedData.title}`);
  } catch (error) {
    console.error(`🔴 Error extracting structured data:`, error);
  }

  return extractedData;
}

interface WeightData {
  value: number;
  unit: string;
  raw: string;
  kg: number; // Keep converted value for backward compatibility
}

function extractWeightFromValue(weightValue: any): WeightData | null {
  if (typeof weightValue === 'number') {
    // If it's just a number, assume kg
    return {
      value: weightValue,
      unit: 'kg',
      raw: `${weightValue} kg`,
      kg: weightValue
    };
  }
  
  if (typeof weightValue === 'string') {
    const weightMatch = weightValue.match(/(\d+(?:\.\d+)?)\s*(ounces?|oz|lbs?|pounds?|g|grams?|kg|kilograms?)/i);
    if (weightMatch) {
      const value = parseFloat(weightMatch[1]);
      const unit = weightMatch[2].toLowerCase();
      
      // Normalize unit names
      let normalizedUnit = unit;
      if (unit.includes('ounce') || unit === 'oz') normalizedUnit = 'oz';
      else if (unit.includes('pound') || unit.includes('lb')) normalizedUnit = 'lbs';
      else if (unit.includes('gram') && !unit.includes('kg')) normalizedUnit = 'g';
      else if (unit.includes('kg')) normalizedUnit = 'kg';
      
      return {
        value: value,
        unit: normalizedUnit,
        raw: weightValue.trim(),
        kg: convertWeightToKg(value, unit) // Keep for compatibility
      };
    }
  }
  
  return null;
}

function convertWeightToKg(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();
  
  if (unitLower.includes('ounce') || unitLower.includes('oz')) {
    return value * 0.0283495; // Convert to kg
  } else if (unitLower.includes('lb') || unitLower.includes('pound')) {
    return value * 0.453592; // Convert to kg
  } else if (unitLower.includes('g') || unitLower.includes('gram')) {
    return value / 1000; // Convert to kg
  } else if (unitLower.includes('kg')) {
    return value;
  }
  
  return 0.5; // Default weight
}

// Fallback to Web Unlocker for unsupported sites or when structured scraper fails
async function scrapeWithBrightDataWebUnlocker(url: string, website: string) {
  const apiKey = Deno.env.get('BRIGHTDATA_API_KEY');
  const zone = Deno.env.get('BRIGHTDATA_ZONE');

  if (!apiKey || !zone) {
    throw new Error('Bright Data credentials not configured');
  }

  console.log(`🔵 Using Bright Data Web Unlocker for ${website}: ${url}`);

  // Bright Data Web Unlocker API
  const response = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone: zone,
      url: url,
      format: 'json',
      country: 'us',
      // Add custom headers for better success rate
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bright Data API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract data using AI-powered system
  console.log('🔍 Bright Data Web Unlocker response type:', typeof data, 'keys:', Object.keys(data).slice(0, 5));
  const extractedData = await extractProductDataWithAI(data, url);
  
  console.log(`🔍 Extracted data:`, {
    title: extractedData.title,
    price: extractedData.price,
    weight: extractedData.weight,
    category: extractedData.category
  });

  return {
    success: true,
    data: extractedData,
    confidence: extractedData.confidence || 0.8,
    method: extractedData.method || 'ai-brightdata-webunlocker',
  };
}

function getWebsiteSelectors(website: string) {
  const selectors = {
    'amazon.com': {
      price: '#priceblock_ourprice, .a-price-whole, [data-a-color="price"] .a-offscreen',
      title: '#productTitle',
      weight: '.product-weight, .a-text-bold:contains("Weight")',
      images: '.product-image img, #landingImage',
      availability: '#availability',
    },
    'ebay.com': {
      price: '.x-price-primary .ux-textspans, [data-testid="x-price-primary"]',
      title: '.x-item-title__mainTitle h1, [data-testid="x-item-title__mainTitle"]',
      weight: '.x-item-condition__text, .x-item-details__item',
      images: '.ux-image-carousel-item img, .ux-image-magnify img',
    },
    'walmart.com': {
      price: '[data-price-type="finalPrice"] .price-characteristic, .price-main',
      title: '[data-testid="product-title"], .prod-ProductTitle',
      weight: '.product-identifier, .prod-ProductOffer',
      images: '.product-image img, .hover-zoom-hero-image',
    },
    'target.com': {
      price: '[data-test="product-price"], .h-text-lg',
      title: '[data-test="product-title"], .Heading__StyledHeading',
      weight: '.ProductDetails__productInfo, .ProductDetails__specs',
      images: '.ProductImage__image, .Carousel__slide img',
    },
  };

  return selectors[website] || selectors['amazon.com'];
}

function extractProductData(html: string, website: string) {
  // Simple HTML parsing (in production, you'd use a proper HTML parser)
  const title = extractTitle(html, website);
  const price = extractPrice(html, website);
  const weightData = extractWeight(html, website);
  const images = extractImages(html, website);
  const availability = extractAvailability(html, website);

  return {
    title: title || 'Product (Title not found)',
    price: price || 0,
    weight: weightData.kg, // For backward compatibility
    weight_value: weightData.value,
    weight_unit: weightData.unit,
    weight_raw: weightData.raw,
    images: images || [],
    availability: availability || 'Unknown',
    category: detectCategory(title, website),
  };
}

function extractTitle(html: string, website: string): string {
  // Multiple approaches for title extraction
  const titlePatterns = [
    // Amazon specific patterns
    /<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i,
    /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<]+)<\/title>/i,
    // Generic patterns
    /"name"\s*:\s*"([^"]+)"/i,
    /"title"\s*:\s*"([^"]+)"/i,
    // Meta tag patterns
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="title"[^>]*content="([^"]+)"/i,
  ];

  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();
      // Clean up common Amazon title artifacts
      title = title.replace(/\s*-\s*Amazon\.com$/, '');
      title = title.replace(/\s*:\s*Amazon\.com:.*$/, '');
      if (title.length > 10) { // Reasonable title length
        return title;
      }
    }
  }

  return '';
}

function extractPrice(html: string, website: string): number {
  // Multiple approaches for price extraction
  const pricePatterns = [
    // Amazon specific patterns
    /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([^<]+)<\/span>/i,
    /<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$?([0-9,]+\.?\d*)<\/span>/i,
    // JSON-LD structured data
    /"price"\s*:\s*"?([0-9,]+\.?\d*)"?/i,
    /"priceValue"\s*:\s*"?([0-9,]+\.?\d*)"?/i,
    // Generic price patterns
    /\$([0-9,]+\.?\d*)/g,
    // Meta tag patterns
    /<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i,
  ];

  for (const pattern of pricePatterns) {
    const matches = html.match(pattern);
    if (matches) {
      if (pattern.global) {
        // For global patterns, find the most reasonable price
        const prices = [];
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const priceText = match[1].replace(/,/g, '');
          const price = parseFloat(priceText);
          if (!isNaN(price) && price > 0 && price < 10000) { // Reasonable price range
            prices.push(price);
          }
        }
        if (prices.length > 0) {
          return Math.min(...prices); // Return the lowest reasonable price
        }
      } else {
        const priceText = matches[1].replace(/,/g, '');
        const price = parseFloat(priceText);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
  }

  return 0;
}

function extractWeight(html: string, website: string): WeightData {
  try {
    // Search for weight patterns and keep the original format
    const weightPatterns = [
      /(\d+(?:\.\d+)?)\s*(kg|kilograms?)/gi,
      /(\d+(?:\.\d+)?)\s*(lbs?|pounds?)/gi,
      /(\d+(?:\.\d+)?)\s*(oz|ounces?)/gi,
      /(\d+(?:\.\d+)?)\s*(g|grams?)(?!\w)/gi // Negative lookahead to avoid matching 'graphics'
    ];
    
    let bestMatch: WeightData | null = null;
    let lowestKgValue = Infinity;
    
    for (const pattern of weightPatterns) {
      const matches = [...html.matchAll(pattern)];
      
      for (const match of matches) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        // Skip unrealistic values
        if (value <= 0 || value > 10000) continue;
        
        // Normalize unit names
        let normalizedUnit = unit;
        if (unit.includes('kg')) normalizedUnit = 'kg';
        else if (unit.includes('lb') || unit.includes('pound')) normalizedUnit = 'lbs';
        else if (unit.includes('oz') || unit.includes('ounce')) normalizedUnit = 'oz';
        else if (unit === 'g' || unit.includes('gram')) normalizedUnit = 'g';
        
        const kgValue = convertWeightToKg(value, normalizedUnit);
        
        // Keep the match with the lowest kg value (most likely the product weight)
        if (kgValue < lowestKgValue && kgValue > 0.01) { // At least 10g
          lowestKgValue = kgValue;
          bestMatch = {
            value: value,
            unit: normalizedUnit,
            raw: match[0].trim(),
            kg: kgValue
          };
        }
      }
    }
    
    if (bestMatch) {
      console.log(`🔵 Extracted weight: ${bestMatch.raw} (${bestMatch.kg} kg)`);
      return bestMatch;
    }
    
    // Default weight if nothing found
    return {
      value: 0.5,
      unit: 'kg',
      raw: '0.5 kg',
      kg: 0.5
    };
  } catch (error) {
    console.error('Error extracting weight:', error);
    return {
      value: 0.5,
      unit: 'kg',
      raw: '0.5 kg',
      kg: 0.5
    };
  }
}

function extractImages(html: string, website: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();
  
  // Multiple patterns to find product images
  const imagePatterns = [
    // Amazon main product image pattern
    /<img[^>]+data-a-dynamic-image=["']([^"']+)["'][^>]*>/gi,
    // Standard img src pattern
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
    // Amazon image JSON data
    /imageGalleryData[^{]*({[^}]+})/gi,
    // Image URLs in JavaScript
    /"large":\s*"([^"]+\.jpg[^"]*)"/gi,
    /"hiRes":\s*"([^"]+\.jpg[^"]*)"/gi,
  ];

  for (const pattern of imagePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let src = match[1];
      
      // Handle Amazon's dynamic image JSON
      if (src.startsWith('{')) {
        try {
          const imageData = JSON.parse(src);
          // Get the first (usually highest quality) image URL
          const urls = Object.keys(imageData);
          if (urls.length > 0) {
            src = urls[0];
          }
        } catch (e) {
          continue;
        }
      }
      
      // Filter out non-product images
      if (src && 
          !src.includes('data:') && 
          !src.includes('placeholder') &&
          !src.includes('transparent-pixel') &&
          !src.includes('nav-sprite') &&
          !src.includes('batch/1/OP') &&
          !src.includes('uedata') &&
          !seenUrls.has(src) &&
          (src.includes('.jpg') || src.includes('.png') || src.includes('.webp') || src.includes('.jpeg'))) {
        
        // Fix protocol-relative URLs
        if (src.startsWith('//')) {
          src = 'https:' + src;
        }
        
        seenUrls.add(src);
        images.push(src);
        
        if (images.length >= 5) break;
      }
    }
    
    if (images.length >= 5) break;
  }

  console.log(`🔵 Extracted ${images.length} product images`);
  return images;
}

function extractAvailability(html: string, website: string): string {
  const availabilityPatterns = [/In Stock/i, /Available/i, /Add to Cart/i, /Buy Now/i];

  for (const pattern of availabilityPatterns) {
    if (pattern.test(html)) {
      return 'In Stock';
    }
  }

  return 'Unknown';
}

function detectCategory(title: string, website: string): string {
  const titleLower = title.toLowerCase();

  // Furniture and Home
  if (
    titleLower.includes('bed') ||
    titleLower.includes('sofa') ||
    titleLower.includes('chair') ||
    titleLower.includes('table') ||
    titleLower.includes('desk') ||
    titleLower.includes('wardrobe') ||
    titleLower.includes('mattress') ||
    titleLower.includes('furniture') ||
    titleLower.includes('cabinet') ||
    titleLower.includes('shelf') ||
    titleLower.includes('drawer')
  ) {
    return 'furniture';
  }
  
  // Electronics and appliances
  if (
    titleLower.includes('phone') ||
    titleLower.includes('smartphone') ||
    titleLower.includes('iphone') ||
    titleLower.includes('laptop') ||
    titleLower.includes('tablet') ||
    titleLower.includes('computer') ||
    titleLower.includes('monitor') ||
    titleLower.includes('television') ||
    titleLower.includes('tv ') ||
    titleLower.includes(' ac ') ||
    titleLower.includes('air condition') ||
    titleLower.includes('split ac') ||
    titleLower.includes('refrigerator') ||
    titleLower.includes('washing machine') ||
    titleLower.includes('microwave') ||
    titleLower.includes('camera') ||
    titleLower.includes('headphone') ||
    titleLower.includes('earphone') ||
    titleLower.includes('speaker')
  ) {
    return 'electronics';
  } else if (
    titleLower.includes('shirt') ||
    titleLower.includes('dress') ||
    titleLower.includes('pants') ||
    titleLower.includes('jeans') ||
    titleLower.includes('jacket') ||
    titleLower.includes('coat') ||
    titleLower.includes('sweater') ||
    titleLower.includes('kurta') ||
    titleLower.includes('saree') ||
    titleLower.includes('lehenga')
  ) {
    return 'clothing';
  } else if (
    titleLower.includes('shoe') ||
    titleLower.includes('sneaker') ||
    titleLower.includes('sandal') ||
    titleLower.includes('boot') ||
    titleLower.includes('slipper')
  ) {
    return 'footwear';
  } else if (titleLower.includes('book') || titleLower.includes('novel')) {
    return 'books';
  } else if (titleLower.includes('toy') || titleLower.includes('game')) {
    return 'toys';
  } else if (
    titleLower.includes('watch') ||
    titleLower.includes('jewelry') ||
    titleLower.includes('necklace') ||
    titleLower.includes('ring') ||
    titleLower.includes('bracelet')
  ) {
    return 'accessories';
  }

  return 'general';
}

function calculateConfidence(data: Record<string, unknown>, website: string): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on data quality
  if (data.title && data.title !== 'Product (Title not found)') {
    confidence += 0.2;
  }

  if (data.price && data.price > 0) {
    confidence += 0.2;
  }

  if (data.weight && data.weight > 0) {
    confidence += 0.1;
  }

  if (data.images && data.images.length > 0) {
    confidence += 0.1;
  }

  // Website-specific confidence adjustments
  const websiteConfidence = {
    'amazon.com': 0.1,
    'ebay.com': 0.05,
    'walmart.com': 0.1,
    'target.com': 0.1,
  };

  confidence += websiteConfidence[website] || 0;

  return Math.min(confidence, 1.0); // Cap at 1.0
}

async function testScrapeAPI() {
  const apiKey = Deno.env.get('SCRAPER_API_KEY');

  if (!apiKey) {
    return {
      success: false,
      error: 'ScrapeAPI key not configured',
      method: 'test',
    };
  }

  try {
    // Test with a simple Amazon product
    const testUrl = 'https://www.amazon.com/dp/B08N5WRWNW'; // Echo Dot

    console.log(`🧪 Testing ScrapeAPI with key: ${apiKey.substring(0, 10)}...`);

    // Test the general scraper first
    const testData = await scrapeWithScrapeAPI(testUrl, 'amazon.com');

    return {
      success: true,
      message: 'ScrapeAPI is working correctly',
      testData: testData.data,
      method: 'test',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: 'test',
    };
  }
}
