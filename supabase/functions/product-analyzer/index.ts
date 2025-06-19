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
        const extractRules = getExtractRules(platform)
        
        const response = await fetch('https://api.scraperapi.com/api/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${scraperApiKey}`
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
          console.log('ScraperAPI response:', data)
          analysisResult = parseScraperAPIResponse(data, url, platform)
        } else {
          console.error('ScraperAPI error:', response.status, response.statusText)
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
  const priceMatch = priceText.match(/[\d,]+\.?\d*/)
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