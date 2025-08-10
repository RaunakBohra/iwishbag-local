import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req),
    });
  }
  try {
    const { url, productName } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({
          error: 'URL is required',
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
    // Get ScraperAPI key from environment
    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY') || '33a27d4eb3da57503b7819845dca495e';
    // Uncomment below for production:
    // let scraperApiKey = Deno.env.get('SCRAPER_API_KEY');
    console.log('ScraperAPI key found:', !!scraperApiKey);
    console.log('ScraperAPI key length:', scraperApiKey?.length);
    if (!scraperApiKey) {
      console.warn('ScraperAPI key not found, using mock data');
      return new Response(JSON.stringify(await getMockAnalysis(url, productName)), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    // Detect platform
    const platform = detectPlatform(url);
    if (!platform) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported platform. Currently supporting Amazon and eBay.',
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
    // Use ScraperAPI to get real data
    const analysis = await scrapeProduct(url, platform, scraperApiKey);
    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Product analysis error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('ebay')) return 'ebay';
    return null;
  } catch {
    return null;
  }
}
async function scrapeProduct(url, platform, apiKey) {
  try {
    // Construct ScraperAPI URL with output_format=json and autoparse=true for structured data
    const scraperUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}&output_format=json&autoparse=true`;
    console.log(`Scraping ${platform} product: ${url}`);
    console.log(`ScraperAPI URL: ${scraperUrl}`);
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!response.ok) {
      throw new Error(`ScraperAPI request failed: ${response.status} ${response.statusText}`);
    }
    const responseText = await response.text();
    console.log(`ScraperAPI response length: ${responseText.length}`);
    console.log(`ScraperAPI response preview: ${responseText.substring(0, 200)}...`);
    // Check if response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error(
        'ScraperAPI returned HTML instead of JSON. Amazon may be blocking the request.',
      );
      throw new Error('ScraperAPI returned HTML - Amazon blocking detected');
    }
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse ScraperAPI response as JSON:', parseError);
      throw new Error('Invalid JSON response from ScraperAPI');
    }
    console.log('ScraperAPI success, parsing data...');
    // Parse the scraped data based on platform
    return parseScrapedData(data, platform, url);
  } catch (error) {
    console.error('Scraping failed:', error);
    // Fallback to mock data if scraping fails
    return await getMockAnalysis(url, '');
  }
}
function parseScrapedData(data, platform, originalUrl) {
  let analysis = {
    name: data.name || 'Unknown Product',
    price: 0,
    weight: 1,
    imageUrl: data.images?.[0] || '',
    category: data.product_category || 'General',
    availability: data.availability_status !== 'Out of Stock',
    currency: 'USD',
    platform: platform,
    description: data.full_description || '',
    brand: data.brand || data.product_information?.Brand || '',
    shippingCost: 0,
    shippingCurrency: 'USD',
    dimensions: {
      length: 10,
      width: 5,
      height: 2,
    },
    shippingWeight: 1,
    averageRating: data.average_rating || 0,
    totalReviews: data.total_reviews || 0,
  };
  // Parse price from pricing field
  if (data.pricing) {
    const priceStr = data.pricing.toString();
    const priceMatch = priceStr.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      analysis.price = parseFloat(priceMatch[0].replace(/,/g, ''));
    }
  }
  // Parse original price if available
  if (data.list_price) {
    const originalPriceStr = data.list_price.toString();
    const originalPriceMatch = originalPriceStr.match(/[\d,]+\.?\d*/);
    if (originalPriceMatch) {
      analysis.originalPrice = parseFloat(originalPriceMatch[0].replace(/,/g, ''));
    }
  }
  // Parse weight from product_information
  if (data.product_information && data.product_information['Item Weight']) {
    const weightStr = data.product_information['Item Weight'];
    const weightMatch = weightStr.match(/([\d,]+\.?\d*)\s*(lbs|kg|pounds|kilograms)/i);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1].replace(/,/g, ''));
      if (weightMatch[2].toLowerCase().includes('kg')) {
        analysis.weight = weight * 2.20462; // Convert kg to lbs
      } else {
        analysis.weight = weight;
      }
      analysis.shippingWeight = analysis.weight;
    }
  }
  // Parse shipping cost
  if (data.shipping_price) {
    if (data.shipping_price.toLowerCase().includes('free')) {
      analysis.shippingCost = 0;
    } else {
      const shippingStr = data.shipping_price.toString();
      const shippingMatch = shippingStr.match(/[\d,]+\.?\d*/);
      if (shippingMatch) {
        analysis.shippingCost = parseFloat(shippingMatch[0].replace(/,/g, ''));
      }
    }
  }
  // Parse dimensions from product_information
  if (data.product_information && data.product_information['Product Dimensions']) {
    const dimensionsStr = data.product_information['Product Dimensions'];
    const dimensionsMatch = dimensionsStr.match(
      /([\d,]+\.?\d*)\s*[xX]\s*([\d,]+\.?\d*)\s*[xX]\s*([\d,]+\.?\d*)/,
    );
    if (dimensionsMatch) {
      analysis.dimensions = {
        length: parseFloat(dimensionsMatch[1].replace(/,/g, '')),
        width: parseFloat(dimensionsMatch[2].replace(/,/g, '')),
        height: parseFloat(dimensionsMatch[3].replace(/,/g, '')),
      };
    }
  }
  // Platform-specific parsing
  if (platform === 'amazon') {
    analysis = parseAmazonData(data, analysis);
  } else if (platform === 'ebay') {
    analysis = parseEbayData(data, analysis);
  }
  return analysis;
}
function parseAmazonData(data, analysis) {
  // Amazon-specific parsing - the new API format already provides most data
  // Additional Amazon-specific logic can be added here if needed
  // Extract brand from product_information if not already set
  if (!analysis.brand && data.product_information?.Brand) {
    analysis.brand = data.product_information.Brand;
  }
  return analysis;
}
function parseEbayData(data, analysis) {
  // eBay-specific parsing - the new API format should work for eBay too
  // Additional eBay-specific logic can be added here if needed
  return analysis;
}
async function getMockAnalysis(url, productName) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const platform = detectPlatform(url) || 'amazon';
  // Extract product ID from Amazon URL for more realistic mock data
  let extractedProductId = '';
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const dpIndex = pathParts.findIndex((part) => part === 'dp');
    if (dpIndex !== -1 && pathParts[dpIndex + 1]) {
      extractedProductId = pathParts[dpIndex + 1];
    }
  } catch (error) {
    console.log('Could not extract product ID from URL');
  }
  // Generate realistic product data based on platform
  const mockProducts = {
    amazon: {
      name: productName || `Amazon Product ${extractedProductId || 'Sample'}`,
      price: Math.floor(Math.random() * 500) + 50,
      weight: Math.floor(Math.random() * 10) + 1,
      imageUrl: `https://images-na.ssl-images-amazon.com/images/P/${extractedProductId || 'B08N5WRWNW'}.L.jpg`,
      category: 'Electronics',
      brand: 'Amazon Brand',
      description:
        'This is a realistic product description for Amazon products. Features include high quality, reliable performance, and excellent customer reviews.',
      averageRating: 4.2 + Math.random() * 0.8,
      totalReviews: Math.floor(Math.random() * 5000) + 100,
      shippingCost: Math.floor(Math.random() * 15) + 5,
    },
    ebay: {
      name: productName || `eBay Product ${extractedProductId || 'Sample'}`,
      price: Math.floor(Math.random() * 300) + 25,
      weight: Math.floor(Math.random() * 8) + 1,
      imageUrl: `https://i.ebayimg.com/images/g/${extractedProductId || 'sample'}/s-l1600.jpg`,
      category: 'Collectibles',
      brand: 'eBay Seller',
      description:
        'Authentic product from trusted eBay seller. Fast shipping and excellent condition.',
      averageRating: 4.0 + Math.random() * 1.0,
      totalReviews: Math.floor(Math.random() * 1000) + 50,
      shippingCost: Math.floor(Math.random() * 10) + 3,
    },
  };
  const productData = mockProducts[platform] || mockProducts.amazon;
  return {
    name: productData.name,
    price: productData.price,
    weight: productData.weight,
    imageUrl: productData.imageUrl,
    category: productData.category,
    availability: true,
    currency: 'USD',
    originalPrice: Math.floor(productData.price * 1.2),
    description: productData.description,
    brand: productData.brand,
    dimensions: {
      length: Math.floor(Math.random() * 20) + 10,
      width: Math.floor(Math.random() * 15) + 5,
      height: Math.floor(Math.random() * 10) + 2,
    },
    shippingWeight: productData.weight,
    platform: platform,
    averageRating: productData.averageRating,
    totalReviews: productData.totalReviews,
    shippingCost: productData.shippingCost,
    shippingCurrency: 'USD',
  };
}
