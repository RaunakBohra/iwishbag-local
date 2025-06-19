import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    const { url, productName } = await req.json()

    if (!url && !productName) {
      return new Response(
        JSON.stringify({ error: 'URL or product name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get ScraperAPI key from environment
    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY')

    let analysisResult = null

    if (url && scraperApiKey) {
      // Try to analyze with ScraperAPI
      try {
        const platform = detectPlatform(url)
        
        if (platform === 'amazon') {
          // Use structured Amazon API for Amazon products
          analysisResult = await analyzeAmazonProduct(url, scraperApiKey)
        } else if (platform === 'ebay') {
          // Use structured eBay API for eBay products
          analysisResult = await analyzeEbayProduct(url, scraperApiKey)
        } else {
          // Use generic scraping for other platforms
          analysisResult = await analyzeGenericProduct(url, scraperApiKey, platform)
        }
      } catch (error) {
        console.error('ScraperAPI error:', error)
      }
    }

    // If no analysis result, create manual analysis task
    if (!analysisResult) {
      const { data, error } = await supabase
        .from('manual_analysis_tasks')
        .insert({
          url: url,
          product_name: productName,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create manual analysis task' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      analysisResult = {
        name: productName || 'Product (Manual Review Required)',
        price: 0,
        weight: 0,
        category: 'unknown',
        availability: true,
        currency: 'USD',
        error: 'Requires manual analysis'
      }
    }

    return new Response(
      JSON.stringify(analysisResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function analyzeAmazonProduct(url: string, apiKey: string) {
  try {
    // Extract ASIN from Amazon URL
    const asin = extractASIN(url)
    if (!asin) {
      throw new Error('Could not extract ASIN from Amazon URL')
    }

    // Detect country from Amazon URL
    const countryCode = detectAmazonCountry(url)
    
    // Build API URL with appropriate parameters
    let apiUrl = `https://api.scraperapi.com/structured/amazon/product?api_key=${apiKey}&asin=${asin}&country_code=${countryCode}`
    
    // Add TLD parameter for non-US domains
    if (countryCode !== 'us') {
      const tld = getTLDForCountry(countryCode)
      if (tld) {
        apiUrl += `&tld=${tld}`
      }
    }
    
    console.log('Fetching Amazon product data for ASIN:', asin, 'Country:', countryCode, 'URL:', apiUrl)
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`Amazon API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Amazon API response received')
    
    return parseAmazonProductResponse(data, url)
    
  } catch (error) {
    console.error('Amazon product analysis failed:', error)
    throw error
  }
}

function getTLDForCountry(countryCode: string): string | null {
  // Map country codes to TLDs
  const tldMap: Record<string, string> = {
    'uk': 'co.uk',
    'de': 'de',
    'fr': 'fr',
    'it': 'it',
    'es': 'es',
    'ca': 'ca',
    'au': 'com.au',
    'in': 'in',
    'jp': 'co.jp',
    'br': 'com.br',
    'mx': 'com.mx',
    'nl': 'nl',
    'se': 'se',
    'pl': 'pl',
    'sg': 'sg',
    'ae': 'ae',
    'sa': 'sa',
    'eg': 'eg',
    'tr': 'com.tr'
  }
  
  return tldMap[countryCode] || null
}

function detectAmazonCountry(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  
  // Map Amazon domains to country codes
  const amazonDomains: Record<string, string> = {
    'amazon.com': 'us',
    'amazon.co.uk': 'uk',
    'amazon.de': 'de',
    'amazon.fr': 'fr',
    'amazon.it': 'it',
    'amazon.es': 'es',
    'amazon.ca': 'ca',
    'amazon.com.au': 'au',
    'amazon.in': 'in',
    'amazon.co.jp': 'jp',
    'amazon.com.br': 'br',
    'amazon.com.mx': 'mx',
    'amazon.nl': 'nl',
    'amazon.se': 'se',
    'amazon.pl': 'pl',
    'amazon.sg': 'sg',
    'amazon.ae': 'ae',
    'amazon.sa': 'sa',
    'amazon.eg': 'eg',
    'amazon.com.tr': 'tr'
  }
  
  for (const [domain, country] of Object.entries(amazonDomains)) {
    if (hostname.includes(domain)) {
      return country
    }
  }
  
  // Default to US if no match found
  return 'us'
}

async function analyzeGenericProduct(url: string, apiKey: string, platform: string) {
  const extractRules = getExtractRules(platform)
  
  const response = await fetch('https://api.scraperapi.com/api/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url: url,
      render_js: true,
      wait_for: '.product-info, .product-details, .a-section, .product',
      extract_rules: extractRules
    })
  })

  if (response.ok) {
    const data = await response.json()
    console.log('Generic ScraperAPI response:', data)
    return parseScraperAPIResponse(data, url, platform)
  } else {
    console.error('Generic ScraperAPI error:', response.status, response.statusText)
    throw new Error(`Generic scraping failed: ${response.status}`)
  }
}

function extractASIN(url: string): string | null {
  // Extract ASIN from various Amazon URL formats
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/ASIN\/([A-Z0-9]{10})/,
    /\/ref=.*\/([A-Z0-9]{10})/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

function parseAmazonProductResponse(data: any, url: string) {
  console.log('Parsing Amazon product response')
  
  // Detect country and currency
  const countryCode = detectAmazonCountry(url)
  const currency = getCurrencyForCountry(countryCode)
  
  // Extract basic information
  const name = cleanText(data.name || 'Unknown Product')
  const price = extractPrice(data.pricing)
  const originalPrice = data.list_price ? extractPrice(data.list_price) : undefined
  const brand = cleanText(data.brand)
  const description = cleanText(data.full_description)
  const category = categorizeProduct(name, description)
  
  // Extract weight from product information
  let weight = 0
  if (data.product_information?.product_dimensions) {
    weight = extractWeight(data.product_information.product_dimensions) || 0
  }
  if (weight === 0) {
    weight = estimateWeightFromName(name)
  }
  
  // Determine availability
  const availability = data.availability_status?.toLowerCase().includes('in stock') || true
  
  // Get primary image
  const imageUrl = data.images && data.images.length > 0 ? data.images[0] : undefined
  
  // Extract dimensions if available
  let dimensions = undefined
  if (data.product_information?.product_dimensions) {
    dimensions = extractDimensions(data.product_information.product_dimensions)
  }
  if (!dimensions) {
    dimensions = estimateDimensions(category, weight)
  }
  
  console.log('Amazon product parsed:', { 
    name, 
    price, 
    originalPrice, 
    weight, 
    category, 
    brand,
    availability,
    imageUrl,
    currency,
    countryCode
  })
  
  return {
    name: name,
    price: price,
    weight: weight,
    imageUrl: imageUrl,
    category: category,
    availability: availability,
    currency: currency,
    originalPrice: originalPrice,
    description: description,
    brand: brand,
    dimensions: dimensions,
    platform: 'amazon',
    // Additional Amazon-specific data
    averageRating: data.average_rating,
    totalReviews: data.total_reviews,
    featureBullets: data.feature_bullets,
    shippingPrice: data.shipping_price,
    shippingTime: data.shipping_time
  }
}

function getCurrencyForCountry(countryCode: string): string {
  // Map country codes to currencies
  const currencyMap: Record<string, string> = {
    'us': 'USD',
    'uk': 'GBP',
    'de': 'EUR',
    'fr': 'EUR',
    'it': 'EUR',
    'es': 'EUR',
    'ca': 'CAD',
    'au': 'AUD',
    'in': 'INR',
    'jp': 'JPY',
    'br': 'BRL',
    'mx': 'MXN',
    'nl': 'EUR',
    'se': 'SEK',
    'pl': 'PLN',
    'sg': 'SGD',
    'ae': 'AED',
    'sa': 'SAR',
    'eg': 'EGP',
    'tr': 'TRY'
  }
  
  return currencyMap[countryCode] || 'USD'
}

function detectPlatform(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  
  if (hostname.includes('amazon')) return 'amazon'
  if (hostname.includes('ebay')) return 'ebay'
  if (hostname.includes('walmart')) return 'walmart'
  if (hostname.includes('target')) return 'target'
  if (hostname.includes('bestbuy')) return 'bestbuy'
  if (hostname.includes('aliexpress')) return 'aliexpress'
  if (hostname.includes('taobao')) return 'taobao'
  if (hostname.includes('jd.com')) return 'jd'
  if (hostname.includes('rakuten')) return 'rakuten'
  if (hostname.includes('yahoo.co.jp')) return 'yahoo_japan'
  if (hostname.includes('mercari')) return 'mercari'
  if (hostname.includes('etsy')) return 'etsy'
  
  return 'generic'
}

function getExtractRules(platform: string) {
  const baseRules = {
    name: { 
      selector: 'h1, .product-title, .title, [data-testid="product-title"], .a-size-large, .product-name, .item-title' 
    },
    price: { 
      selector: '.price, .product-price, [data-price], .a-price-whole, .price-current, .price-value, .current-price' 
    },
    image: { 
      selector: '.product-image img, .main-image img, [data-testid="product-image"], .a-dynamic-image, .product-photo img' 
    },
    description: { 
      selector: '.product-description, .description, .a-expander-content, .product-details, .item-description' 
    },
    weight: {
      selector: '.weight, .shipping-weight, .product-weight, .item-weight, [data-weight]'
    },
    brand: {
      selector: '.brand, .product-brand, .manufacturer, .item-brand'
    }
  }

  // Platform-specific rules
  switch (platform) {
    case 'amazon':
      return {
        ...baseRules,
        name: { selector: '.a-size-large, .a-size-base-plus, h1#title, .product-title' },
        price: { selector: '.a-price-whole, .a-price .a-offscreen, .a-price-current .a-offscreen' },
        image: { selector: '.a-dynamic-image, #landingImage, .imgTagWrapper img' },
        description: { selector: '.a-expander-content, #feature-bullets, .product-description' }
      }
    case 'ebay':
      return {
        ...baseRules,
        name: { selector: '.x-item-title__mainTitle, .item-title, h1' },
        price: { selector: '.x-price-primary .ux-textspans, .price-current, .price-value' },
        image: { selector: '.ux-image-carousel-item img, .ux-image-magnify img' },
        description: { selector: '.item-description, .item-description__content' }
      }
    case 'walmart':
      return {
        ...baseRules,
        name: { selector: '.prod-ProductTitle, h1, .product-name' },
        price: { selector: '.price-characteristic, .price-current, .price-main' },
        image: { selector: '.prod-hero-image-carousel img, .product-image img' },
        description: { selector: '.product-description, .about-details' }
      }
    case 'aliexpress':
      return {
        ...baseRules,
        name: { selector: '.product-title, .item-title, h1' },
        price: { selector: '.product-price, .price-current, .price-value' },
        image: { selector: '.product-image img, .main-image img' },
        description: { selector: '.product-description, .item-description' }
      }
    default:
      return baseRules
  }
}

function extractDimensions(dimensionsText: string) {
  if (!dimensionsText) return null
  
  // Parse dimensions like "2.4 x 2.4 x 4.5 inches"
  const match = dimensionsText.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(inches?|cm|mm)/i)
  if (match) {
    const length = parseFloat(match[1])
    const width = parseFloat(match[2])
    const height = parseFloat(match[3])
    const unit = match[4].toLowerCase()
    
    // Convert to cm
    const multiplier = unit.includes('inch') ? 2.54 : unit === 'mm' ? 0.1 : 1
    
    return {
      length: length * multiplier,
      width: width * multiplier,
      height: height * multiplier
    }
  }
  
  return null
}

function parseScraperAPIResponse(data: any, url: string, platform: string) {
  console.log('Parsing response for platform:', platform)
  console.log('Raw data:', data)
  
  // Extract and clean data
  const name = cleanText(data.name || 'Unknown Product')
  const price = extractPrice(data.price)
  const weight = extractWeight(data.weight) || estimateWeightFromName(name)
  const category = categorizeProduct(name, data.description)
  const brand = cleanText(data.brand)
  
  console.log('Extracted data:', { name, price, weight, category, brand })
  
  return {
    name: name,
    price: price,
    weight: weight,
    imageUrl: data.image,
    category: category,
    availability: true,
    currency: 'USD',
    description: cleanText(data.description),
    brand: brand,
    dimensions: estimateDimensions(category, weight),
    platform: platform
  }
}

function cleanText(text: any): string {
  if (!text) return ''
  if (typeof text === 'string') {
    return text.trim().replace(/\s+/g, ' ')
  }
  if (Array.isArray(text)) {
    return text.map(t => cleanText(t)).join(' ').trim()
  }
  return String(text).trim()
}

function extractPrice(priceData: any): number {
  if (typeof priceData === 'number') return priceData
  
  const priceText = cleanText(priceData)
  if (!priceText) return 0
  
  // Remove currency symbols and extract numbers
  // Handle various currencies: $, ₹, £, €, etc.
  const priceMatch = priceText.replace(/[₹$£€¥]/g, '').match(/[\d,]+\.?\d*/)
  if (priceMatch) {
    return parseFloat(priceMatch[0].replace(/,/g, ''))
  }
  
  return 0
}

function extractWeight(weightData: any): number | null {
  if (typeof weightData === 'number') return weightData
  
  const weightText = cleanText(weightData)
  if (!weightText) return null
  
  // Parse weight strings like "2.5 lbs", "1.2 kg", etc.
  const match = weightText.match(/(\d+\.?\d*)\s*(lbs?|kg|g|oz)/i)
  if (match) {
    const value = parseFloat(match[1])
    const unit = match[2].toLowerCase()
    
    // Convert to kg
    switch (unit) {
      case 'lbs':
      case 'lb':
        return value * 0.453592
      case 'kg':
        return value
      case 'g':
        return value / 1000
      case 'oz':
        return value * 0.0283495
      default:
        return value
    }
  }
  
  return null
}

function estimateWeightFromName(name: string): number {
  const text = name.toLowerCase()
  
  const categoryEstimates: Record<string, number> = {
    electronics: 0.5,
    clothing: 0.3,
    home: 2.0,
    beauty: 0.2,
    sports: 1.0,
    toys: 0.4,
    books: 0.6,
    automotive: 5.0,
    other: 0.5
  }

  const category = categorizeProduct(name, '')
  let baseWeight = categoryEstimates[category] || 0.5

  if (text.includes('mini') || text.includes('small')) baseWeight *= 0.5
  if (text.includes('large') || text.includes('big')) baseWeight *= 2.0
  if (text.includes('heavy') || text.includes('weight')) baseWeight *= 1.5
  if (text.includes('light') || text.includes('portable')) baseWeight *= 0.7

  return baseWeight
}

function categorizeProduct(name: string, description?: string): string {
  const text = `${name} ${description || ''}`.toLowerCase()
  
  const categories = {
    electronics: ['phone', 'laptop', 'computer', 'tablet', 'camera', 'tv', 'headphones', 'speaker', 'gaming', 'echo', 'iphone', 'samsung', 'apple', 'android', 'wireless', 'bluetooth', 'smart', 'digital', 'electronic'],
    clothing: ['shirt', 'dress', 'pants', 'jeans', 'jacket', 'shoes', 'sneakers', 'boots', 'hat', 'cap', 'sweater', 'hoodie', 't-shirt', 'blouse', 'skirt', 'shorts'],
    home: ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'kitchen', 'bathroom', 'decor', 'cushion', 'pillow', 'blanket', 'curtain', 'rug', 'mirror'],
    beauty: ['makeup', 'skincare', 'perfume', 'cosmetics', 'beauty', 'hair', 'nail', 'lotion', 'cream', 'serum', 'mask', 'brush'],
    sports: ['fitness', 'gym', 'sports', 'exercise', 'workout', 'running', 'basketball', 'soccer', 'tennis', 'yoga', 'dumbbell', 'treadmill'],
    toys: ['toy', 'game', 'puzzle', 'doll', 'action figure', 'lego', 'board game', 'stuffed', 'plush', 'educational'],
    books: ['book', 'novel', 'textbook', 'magazine', 'comic', 'manga', 'journal', 'notebook'],
    automotive: ['car', 'auto', 'vehicle', 'motorcycle', 'bike', 'tire', 'oil', 'accessory', 'tool']
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category
    }
  }

  return 'other'
}

function estimateDimensions(category: string, weight: number) {
  const baseDimensions: Record<string, { length: number; width: number; height: number }> = {
    electronics: { length: 15, width: 10, height: 5 },
    clothing: { length: 30, width: 20, height: 2 },
    home: { length: 50, width: 40, height: 30 },
    beauty: { length: 10, width: 5, height: 3 },
    sports: { length: 40, width: 30, height: 15 },
    toys: { length: 20, width: 15, height: 10 },
    books: { length: 25, width: 18, height: 3 },
    automotive: { length: 100, width: 50, height: 30 },
    other: { length: 20, width: 15, height: 10 }
  }

  const base = baseDimensions[category] || baseDimensions.other
  const scale = Math.sqrt(weight / 0.5)
  
  return {
    length: base.length * scale,
    width: base.width * scale,
    height: base.height * scale
  }
}

async function analyzeEbayProduct(url: string, apiKey: string) {
  try {
    // Extract product ID from eBay URL
    const productId = extractEbayProductId(url)
    if (!productId) {
      throw new Error('Could not extract product ID from eBay URL')
    }

    // Use structured eBay API
    const apiUrl = `https://api.scraperapi.com/structured/ebay/product?api_key=${apiKey}&product_id=${productId}`
    
    console.log('Fetching eBay product data for Product ID:', productId)
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('eBay API response received')
    
    return parseEbayProductResponse(data, url)
    
  } catch (error) {
    console.error('eBay product analysis failed:', error)
    throw error
  }
}

function extractEbayProductId(url: string): string | null {
  // Extract product ID from various eBay URL formats
  const patterns = [
    /\/itm\/(\d+)/,
    /\/p\/(\d+)/,
    /item=(\d+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

function parseEbayProductResponse(data: any, url: string) {
  console.log('Parsing eBay product response')
  
  // Extract basic information
  const name = cleanText(data.title || 'Unknown Product')
  const price = data.price?.value || 0
  const currency = data.price?.currency || 'USD'
  const brand = cleanText(data.brand)
  const condition = cleanText(data.condition)
  const seller = data.seller?.name
  const location = data.location
  
  // Extract shipping cost
  const shippingCost = data.shipping_costs?.value || 0
  const shippingCurrency = data.shipping_costs?.currency || currency
  
  // Get primary image
  const imageUrl = data.images && data.images.length > 0 ? data.images[0] : undefined
  
  // Extract item specifics for description
  let description = ''
  if (data.item_specifics && Array.isArray(data.item_specifics)) {
    description = data.item_specifics.map((spec: any) => `${spec.label}: ${spec.value}`).join(', ')
  }
  
  // Determine category from item specifics or name
  const category = categorizeProduct(name, description)
  
  // Estimate weight from category and name
  const weight = estimateWeightFromName(name)
  
  // Determine availability
  const availability = data.available || false
  
  // Extract dimensions if available in item specifics
  let dimensions = undefined
  if (data.item_specifics) {
    const dimensionSpec = data.item_specifics.find((spec: any) => 
      spec.label.toLowerCase().includes('dimension') || 
      spec.label.toLowerCase().includes('size')
    )
    if (dimensionSpec) {
      dimensions = extractDimensions(dimensionSpec.value)
    }
  }
  if (!dimensions) {
    dimensions = estimateDimensions(category, weight)
  }
  
  console.log('eBay product parsed:', { 
    name, 
    price, 
    currency,
    brand,
    condition,
    seller,
    location,
    shippingCost,
    availability,
    imageUrl 
  })
  
  return {
    name: name,
    price: price,
    weight: weight,
    imageUrl: imageUrl,
    category: category,
    availability: availability,
    currency: currency,
    description: description,
    brand: brand,
    dimensions: dimensions,
    platform: 'ebay',
    // eBay-specific data
    condition: condition,
    seller: seller,
    location: location,
    shippingCost: shippingCost,
    shippingCurrency: shippingCurrency,
    availableQuantity: data.available_quantity,
    soldItems: data.sold_items,
    estimatedDeliveryMin: data.estimated_delivery_min,
    estimatedDeliveryMax: data.estimated_delivery_max,
    returnPolicy: data.return_policy,
    sellerReviews: data.seller?.seller_reviews_count,
    sellerRating: data.seller?.seller_review,
    itemSpecifics: data.item_specifics
  }
} 