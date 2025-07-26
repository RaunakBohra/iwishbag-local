/**
 * Cloudflare Worker for Product Data Scraping
 * Fetches product information from e-commerce sites
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      
      if (url.pathname === '/scrape' && request.method === 'POST') {
        const { url: productUrl, site } = await request.json();
        
        // Fetch the product page
        const response = await fetch(productUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product page');
        }

        const html = await response.text();
        
        // Extract data based on site
        let productData = {};
        
        if (site === 'amazon') {
          productData = extractAmazonData(html);
        } else if (site === 'flipkart') {
          productData = extractFlipkartData(html);
        } else if (site === 'ebay') {
          productData = extractEbayData(html);
        }

        return new Response(JSON.stringify({
          success: true,
          data: productData,
          source: 'scraper'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        source: 'scraper'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};

function extractAmazonData(html) {
  const data = {};
  
  // Extract title
  const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  }
  
  // Extract price
  const priceMatch = html.match(/<span[^>]*class="a-price-whole"[^>]*>([^<]+)<\/span>/);
  if (priceMatch) {
    data.price = priceMatch[1].trim();
  }
  
  // Extract availability
  if (html.includes('In Stock') || html.includes('in stock')) {
    data.availability = 'in-stock';
  } else if (html.includes('Out of Stock') || html.includes('Currently unavailable')) {
    data.availability = 'out-of-stock';
  }
  
  // Extract weight from details
  const weightMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?|ounces?|oz|kg|g)/i);
  if (weightMatch) {
    data.weight = weightMatch[0];
  }
  
  // Extract brand
  const brandMatch = html.match(/Brand[:\s]+([^<\n]+)/i);
  if (brandMatch) {
    data.brand = brandMatch[1].trim();
  }
  
  return data;
}

function extractFlipkartData(html) {
  const data = {};
  
  // Extract title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>([^<]+)<\/h1>/);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  }
  
  // Extract price
  const priceMatch = html.match(/<div[^>]*class="[^"]*_30jeq3[^"]*"[^>]*>₹([^<]+)<\/div>/);
  if (priceMatch) {
    data.price = '₹' + priceMatch[1].trim();
    data.currency = 'INR';
  }
  
  return data;
}

function extractEbayData(html) {
  const data = {};
  
  // Extract title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*it-ttl[^"]*"[^>]*>([^<]+)<\/h1>/);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  }
  
  // Extract price
  const priceMatch = html.match(/<span[^>]*class="[^"]*prcIsum[^"]*"[^>]*>([^<]+)<\/span>/);
  if (priceMatch) {
    data.price = priceMatch[1].trim();
  }
  
  return data;
}