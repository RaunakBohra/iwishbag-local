import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, website_domain, test } = await req.json()
    
    // Test endpoint to verify ScrapeAPI is working
    if (test) {
      const testResult = await testScrapeAPI()
      return new Response(
        JSON.stringify(testResult),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    if (!url || !website_domain) {
      throw new Error('URL and website_domain are required')
    }

    console.log(`🔵 Scraping product from: ${url}`)
    
    // Try ScrapeAPI first, fallback to Bright Data
    let scrapedData
    try {
      scrapedData = await scrapeWithScrapeAPI(url, website_domain)
      console.log(`✅ Successfully scraped with ScrapeAPI: ${scrapedData.data.title}`)
    } catch (scrapeApiError) {
      console.log(`⚠️ ScrapeAPI failed, trying Bright Data: ${scrapeApiError.message}`)
      scrapedData = await scrapeWithBrightData(url, website_domain)
      console.log(`✅ Successfully scraped with Bright Data: ${scrapedData.data.title}`)
    }
    
    return new Response(
      JSON.stringify(scrapedData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('❌ Scraping error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        data: null 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function scrapeWithScrapeAPI(url: string, website: string) {
  const apiKey = Deno.env.get('VITE_SCRAPER_API_KEY')
  
  if (!apiKey) {
    throw new Error('ScrapeAPI key not configured')
  }

  console.log(`🔵 Using ScrapeAPI for ${website}: ${url}`)

  // Use the working ScrapeAPI endpoint with autoparse
  const scrapeApiUrl = `https://api.scraperapi.com/`
  
  // Build URL with parameters
  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
    output_format: 'json',
    autoparse: 'true',
    country_code: 'us',
    session_number: Math.floor(Math.random() * 1000).toString(),
  })
  
  const fullUrl = `${scrapeApiUrl}?${params.toString()}`
  
  console.log(`🔵 Calling ScrapeAPI: ${fullUrl}`)
  
  const response = await fetch(fullUrl)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ScrapeAPI error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  
  // Extract data from the structured response
  const extractedData = extractProductDataFromScrapeAPI(data, website)
  
  return {
    success: true,
    data: {
      title: extractedData.name || 'Product (Title not found)',
      price: extractPriceFromString(extractedData.price),
      weight: extractWeightFromString(extractedData.weight),
      images: extractedData.images,
      availability: extractedData.availability || 'Unknown',
      category: extractedData.category || detectCategory(extractedData.name, website),
      description: extractedData.description,
      brand: extractedData.brand,
      rating: extractedData.rating,
      reviews_count: extractedData.reviews_count,
      currency: extractedData.currency,
      country: extractedData.country,
      url: url
    },
    confidence: calculateConfidence(extractedData, website),
    method: 'scrapeapi'
  }
}

async function scrapeAmazonWithScrapeAPI(url: string, apiKey: string) {
  console.log(`🔵 Using ScrapeAPI Amazon scraper: ${url}`)
  
  // Extract ASIN from Amazon URL
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/)
  const asin = asinMatch ? asinMatch[1] : null
  
  if (!asin) {
    throw new Error('Could not extract ASIN from Amazon URL')
  }
  
  // ScrapeAPI Amazon product endpoint - corrected URL
  const amazonApiUrl = `http://api.scraperapi.com/api/v1/amazon/product`
  
  // Build URL with parameters
  const params = new URLSearchParams({
    api_key: apiKey,
    asin: asin,
    country_code: 'us',
    session_number: Math.floor(Math.random() * 1000).toString(),
  })
  
  const fullUrl = `${amazonApiUrl}?${params.toString()}`
  
  console.log(`🔵 Calling ScrapeAPI: ${fullUrl}`)
  
  const amazonResponse = await fetch(fullUrl)
  
  if (!amazonResponse.ok) {
    const errorText = await amazonResponse.text()
    throw new Error(`ScrapeAPI Amazon error: ${amazonResponse.status} - ${errorText}`)
  }
  
  const data = await amazonResponse.json()
  
  // Extract data from Amazon-specific response
  const extractedData = extractAmazonDataFromScrapeAPI(data, url)
  
  return {
    success: true,
    data: extractedData,
    confidence: calculateConfidence(extractedData, 'amazon.com'),
    method: 'scrapeapi-amazon'
  }
}

function extractAmazonDataFromScrapeAPI(data: any, url: string) {
  // ScrapeAPI Amazon returns structured data
  const product = data.result || data
  
  return {
    title: product.title || product.name || 'Amazon Product (Title not found)',
    price: extractAmazonPriceFromScrapeAPI(product),
    weight: extractAmazonWeightFromScrapeAPI(product),
    images: product.images || product.image_urls || [],
    availability: product.availability || (product.in_stock ? 'In Stock' : 'Unknown'),
    category: detectCategory(product.title || product.name, 'amazon.com'),
    url: url // Include the original URL
  }
}

function extractAmazonPriceFromScrapeAPI(product: any): number {
  // Try different Amazon price fields
  const priceFields = [
    product.price,
    product.current_price,
    product.sale_price,
    product.original_price,
    product.list_price,
    product.price_value,
    product.price_amount
  ]
  
  for (const price of priceFields) {
    if (price && typeof price === 'number') {
      return price
    }
    if (price && typeof price === 'string') {
      const numericPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', ''))
      if (!isNaN(numericPrice)) {
        return numericPrice
      }
    }
  }
  
  return 0
}

function extractAmazonWeightFromScrapeAPI(product: any): number {
  // Try different Amazon weight fields
  const weightFields = [
    product.weight,
    product.shipping_weight,
    product.package_weight,
    product.item_weight,
    product.product_weight
  ]
  
  for (const weight of weightFields) {
    if (weight && typeof weight === 'number') {
      return weight
    }
    if (weight && typeof weight === 'string') {
      // Parse weight strings like "1.2 lbs", "500g", etc.
      const weightMatch = weight.match(/(\d+(?:\.\d+)?)\s*(ounces?|lbs?|pounds?|g|grams?|kg|kilograms?)/i)
      if (weightMatch) {
        const value = parseFloat(weightMatch[1])
        const unit = weightMatch[2].toLowerCase()
        
        if (unit.includes('ounce')) {
          return value * 0.0283495 // Convert to kg
        } else if (unit.includes('lb') || unit.includes('pound')) {
          return value * 0.453592 // Convert to kg
        } else if (unit.includes('g') || unit.includes('gram')) {
          return value / 1000 // Convert to kg
        } else if (unit.includes('kg')) {
          return value
        }
      }
    }
  }
  
  return 0.5 // Default weight
}

function extractProductDataFromScrapeAPI(data: any, website: string) {
  console.log(`🔵 Extracting data from ScrapeAPI response for ${website}`)
  
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
    country: 'US'
  }

  try {
    // Extract from the structured response
    if (data.name) {
      extracted.name = data.name
    }
    
    if (data.pricing) {
      extracted.price = data.pricing
      // Try to extract currency from price
      if (data.pricing.includes('₹')) {
        extracted.currency = 'INR'
        extracted.country = 'IN'
      } else if (data.pricing.includes('$')) {
        extracted.currency = 'USD'
        extracted.country = 'US'
      } else if (data.pricing.includes('€')) {
        extracted.currency = 'EUR'
        extracted.country = 'EU'
      }
    }
    
    if (data.product_information?.Item_Weight) {
      extracted.weight = data.product_information.Item_Weight
    }
    
    if (data.images && Array.isArray(data.images)) {
      extracted.images = data.images.slice(0, 5) // Limit to 5 images
    }
    
    if (data.availability_status) {
      extracted.availability = data.availability_status
    }
    
    if (data.product_category) {
      extracted.category = data.product_category
    }
    
    if (data.full_description) {
      extracted.description = data.full_description
    }
    
    if (data.brand) {
      extracted.brand = data.brand
    }
    
    if (data.average_rating) {
      extracted.rating = data.average_rating.toString()
    }
    
    if (data.total_reviews) {
      extracted.reviews_count = data.total_reviews.toString()
    }
    
    console.log(`🔵 Extracted data:`, {
      name: extracted.name.substring(0, 50) + '...',
      price: extracted.price,
      weight: extracted.weight,
      images_count: extracted.images.length,
      availability: extracted.availability
    })
    
  } catch (error) {
    console.error(`🔴 Error extracting data from ScrapeAPI response:`, error)
  }
  
  return extracted
}

function extractPriceFromString(priceString: string): number {
  if (!priceString) return 0
  
  try {
    // Remove currency symbols and extract numeric value
    const numericValue = priceString.replace(/[₹$€£,]/g, '').trim()
    const price = parseFloat(numericValue)
    return isNaN(price) ? 0 : price
  } catch (error) {
    console.error('Error extracting price from string:', error)
    return 0
  }
}

function extractWeightFromString(weightString: string): number {
  if (!weightString) return 0.5 // Default weight
  
  try {
    // Extract numeric value from weight string (e.g., "200 g" -> 200)
    const numericValue = weightString.replace(/[^\d.]/g, '')
    const weight = parseFloat(numericValue)
    
    // Convert to kg if in grams
    if (weightString.toLowerCase().includes('g') && weight > 100) {
      return weight / 1000
    }
    
    return isNaN(weight) ? 0.5 : weight
  } catch (error) {
    console.error('Error extracting weight from string:', error)
    return 0.5
  }
}

function extractPriceFromScrapeAPI(product: any): number {
  // Try different price fields
  const priceFields = [
    product.price,
    product.current_price,
    product.sale_price,
    product.original_price,
    product.list_price
  ]
  
  for (const price of priceFields) {
    if (price && typeof price === 'number') {
      return price
    }
    if (price && typeof price === 'string') {
      const numericPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', ''))
      if (!isNaN(numericPrice)) {
        return numericPrice
      }
    }
  }
  
  return 0
}

function extractWeightFromScrapeAPI(product: any): number {
  // Try different weight fields
  const weightFields = [
    product.weight,
    product.shipping_weight,
    product.package_weight
  ]
  
  for (const weight of weightFields) {
    if (weight && typeof weight === 'number') {
      return weight
    }
    if (weight && typeof weight === 'string') {
      // Parse weight strings like "1.2 lbs", "500g", etc.
      const weightMatch = weight.match(/(\d+(?:\.\d+)?)\s*(ounces?|lbs?|pounds?|g|grams?|kg|kilograms?)/i)
      if (weightMatch) {
        const value = parseFloat(weightMatch[1])
        const unit = weightMatch[2].toLowerCase()
        
        if (unit.includes('ounce')) {
          return value * 0.0283495 // Convert to kg
        } else if (unit.includes('lb') || unit.includes('pound')) {
          return value * 0.453592 // Convert to kg
        } else if (unit.includes('g') || unit.includes('gram')) {
          return value / 1000 // Convert to kg
        } else if (unit.includes('kg')) {
          return value
        }
      }
    }
  }
  
  return 0.5 // Default weight
}

async function scrapeWithBrightData(url: string, website: string) {
  const username = Deno.env.get('BRIGHTDATA_USERNAME')
  const password = Deno.env.get('BRIGHTDATA_PASSWORD')
  
  if (!username || !password) {
    throw new Error('Bright Data credentials not configured')
  }

  // Get website-specific selectors
  const selectors = getWebsiteSelectors(website)
  
  console.log(`🔵 Using selectors for ${website}:`, selectors)

  // Bright Data Scraping Browser API
  const response = await fetch('https://brd.superproxy.io:22225', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      browser: 'chrome',
      country: 'us',
      session_id: Math.random().toString(36).substring(7),
      // Custom selectors based on website
      ...selectors
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bright Data API error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  
  // Extract data using website-specific rules
  const extractedData = extractProductData(data.html, website)
  
  return {
    success: true,
    data: {
      ...extractedData,
      url: url // Include the original URL
    },
    confidence: calculateConfidence(extractedData, website),
    rawHtml: data.html // For debugging
  }
}

function getWebsiteSelectors(website: string) {
  const selectors = {
    'amazon.com': {
      price: '#priceblock_ourprice, .a-price-whole, [data-a-color="price"] .a-offscreen',
      title: '#productTitle',
      weight: '.product-weight, .a-text-bold:contains("Weight")',
      images: '.product-image img, #landingImage',
      availability: '#availability'
    },
    'ebay.com': {
      price: '.x-price-primary .ux-textspans, [data-testid="x-price-primary"]',
      title: '.x-item-title__mainTitle h1, [data-testid="x-item-title__mainTitle"]',
      weight: '.x-item-condition__text, .x-item-details__item',
      images: '.ux-image-carousel-item img, .ux-image-magnify img'
    },
    'walmart.com': {
      price: '[data-price-type="finalPrice"] .price-characteristic, .price-main',
      title: '[data-testid="product-title"], .prod-ProductTitle',
      weight: '.product-identifier, .prod-ProductOffer',
      images: '.product-image img, .hover-zoom-hero-image'
    },
    'target.com': {
      price: '[data-test="product-price"], .h-text-lg',
      title: '[data-test="product-title"], .Heading__StyledHeading',
      weight: '.ProductDetails__productInfo, .ProductDetails__specs',
      images: '.ProductImage__image, .Carousel__slide img'
    }
  }
  
  return selectors[website] || selectors['amazon.com']
}

function extractProductData(html: string, website: string) {
  // Simple HTML parsing (in production, you'd use a proper HTML parser)
  const title = extractTitle(html, website)
  const price = extractPrice(html, website)
  const weight = extractWeight(html, website)
  const images = extractImages(html, website)
  const availability = extractAvailability(html, website)
  
  return {
    title: title || 'Product (Title not found)',
    price: price || 0,
    weight: weight || 0.5, // Default weight
    images: images || [],
    availability: availability || 'Unknown',
    category: detectCategory(title, website)
  }
}

function extractTitle(html: string, website: string): string {
  const titleSelectors = {
    'amazon.com': ['#productTitle', '.product-title'],
    'ebay.com': ['.x-item-title__mainTitle h1', '[data-testid="x-item-title__mainTitle"]'],
    'walmart.com': ['[data-testid="product-title"]', '.prod-ProductTitle'],
    'target.com': ['[data-test="product-title"]', '.Heading__StyledHeading']
  }
  
  const selectors = titleSelectors[website] || titleSelectors['amazon.com']
  
  for (const selector of selectors) {
    const match = html.match(new RegExp(`<[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>([^<]*)</`, 'i'))
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return ''
}

function extractPrice(html: string, website: string): number {
  const priceSelectors = {
    'amazon.com': ['#priceblock_ourprice', '.a-price-whole', '[data-a-color="price"]'],
    'ebay.com': ['.x-price-primary .ux-textspans', '[data-testid="x-price-primary"]'],
    'walmart.com': ['[data-price-type="finalPrice"]', '.price-main'],
    'target.com': ['[data-test="product-price"]', '.h-text-lg']
  }
  
  const selectors = priceSelectors[website] || priceSelectors['amazon.com']
  
  for (const selector of selectors) {
    const match = html.match(new RegExp(`<[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>([^<]*)</`, 'i'))
    if (match && match[1]) {
      const priceText = match[1].replace(/[^\d.,]/g, '')
      const price = parseFloat(priceText.replace(',', ''))
      if (!isNaN(price)) {
        return price
      }
    }
  }
  
  return 0
}

function extractWeight(html: string, website: string): number {
  // Weight extraction is complex and often requires multiple approaches
  const weightPatterns = [
    /(\d+(?:\.\d+)?)\s*(ounces?|lbs?|pounds?)/gi,
    /Weight[:\s]*(\d+(?:\.\d+)?)\s*(ounces?|lbs?|pounds?)/gi,
    /(\d+(?:\.\d+)?)\s*(kg|kilograms?)/gi
  ]
  
  for (const pattern of weightPatterns) {
    const match = html.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      
      if (unit.includes('ounce')) {
        return value * 0.0283495 // Convert to kg
      } else if (unit.includes('lb') || unit.includes('pound')) {
        return value * 0.453592 // Convert to kg
      } else if (unit.includes('kg')) {
        return value
      }
    }
  }
  
  return 0.5 // Default weight
}

function extractImages(html: string, website: string): string[] {
  const imagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const images: string[] = []
  let match
  
  while ((match = imagePattern.exec(html)) !== null) {
    const src = match[1]
    if (src && !src.includes('data:') && !src.includes('placeholder')) {
      images.push(src)
    }
  }
  
  return images.slice(0, 5) // Return first 5 images
}

function extractAvailability(html: string, website: string): string {
  const availabilityPatterns = [
    /In Stock/i,
    /Available/i,
    /Add to Cart/i,
    /Buy Now/i
  ]
  
  for (const pattern of availabilityPatterns) {
    if (pattern.test(html)) {
      return 'In Stock'
    }
  }
  
  return 'Unknown'
}

function detectCategory(title: string, website: string): string {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('phone') || titleLower.includes('smartphone') || titleLower.includes('iphone')) {
    return 'electronics'
  } else if (titleLower.includes('shirt') || titleLower.includes('dress') || titleLower.includes('pants')) {
    return 'clothing'
  } else if (titleLower.includes('book') || titleLower.includes('novel')) {
    return 'books'
  } else if (titleLower.includes('toy') || titleLower.includes('game')) {
    return 'toys'
  }
  
  return 'general'
}

function calculateConfidence(data: any, website: string): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on data quality
  if (data.title && data.title !== 'Product (Title not found)') {
    confidence += 0.2
  }
  
  if (data.price && data.price > 0) {
    confidence += 0.2
  }
  
  if (data.weight && data.weight > 0) {
    confidence += 0.1
  }
  
  if (data.images && data.images.length > 0) {
    confidence += 0.1
  }
  
  // Website-specific confidence adjustments
  const websiteConfidence = {
    'amazon.com': 0.1,
    'ebay.com': 0.05,
    'walmart.com': 0.1,
    'target.com': 0.1
  }
  
  confidence += websiteConfidence[website] || 0
  
  return Math.min(confidence, 1.0) // Cap at 1.0
}

async function testScrapeAPI() {
  const apiKey = Deno.env.get('VITE_SCRAPER_API_KEY')
  
  if (!apiKey) {
    return {
      success: false,
      error: 'ScrapeAPI key not configured',
      method: 'test'
    }
  }

  try {
    // Test with a simple Amazon product
    const testUrl = 'https://www.amazon.com/dp/B08N5WRWNW' // Echo Dot
    
    console.log(`🧪 Testing ScrapeAPI with key: ${apiKey.substring(0, 10)}...`)
    
    // Test the general scraper first
    const testData = await scrapeWithScrapeAPI(testUrl, 'amazon.com')
    
    return {
      success: true,
      message: 'ScrapeAPI is working correctly',
      testData: testData.data,
      method: 'test'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: 'test'
    }
  }
} 