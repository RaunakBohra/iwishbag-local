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
        const response = await fetch('https://api.scraperapi.com/api/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${scraperApiKey}`
          },
          body: JSON.stringify({
            url: url,
            extract_rules: {
              name: { selector: 'h1, .product-title, .title, [data-testid="product-title"]' },
              price: { selector: '.price, .product-price, [data-price], .a-price-whole' },
              image: { selector: '.product-image img, .main-image img, [data-testid="product-image"]' },
              description: { selector: '.product-description, .description, .a-expander-content' }
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          analysisResult = parseScraperAPIResponse(data, url)
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

function parseScraperAPIResponse(data: any, url: string) {
  const hostname = new URL(url).hostname.toLowerCase()
  
  // Extract and clean data
  const name = data.name || 'Unknown Product'
  const price = extractPrice(data.price)
  const weight = estimateWeightFromName(name)
  const category = categorizeProduct(name, data.description)
  
  return {
    name: name,
    price: price,
    weight: weight,
    imageUrl: data.image,
    category: category,
    availability: true,
    currency: 'USD',
    description: data.description,
    dimensions: estimateDimensions(category, weight)
  }
}

function extractPrice(priceData: any): number {
  if (typeof priceData === 'number') return priceData
  if (typeof priceData === 'string') {
    const match = priceData.match(/[\d,]+\.?\d*/)
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0
  }
  return 0
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
    electronics: ['phone', 'laptop', 'computer', 'tablet', 'camera', 'tv', 'headphones', 'speaker', 'gaming', 'echo', 'iphone'],
    clothing: ['shirt', 'dress', 'pants', 'jeans', 'jacket', 'shoes', 'sneakers', 'boots', 'hat', 'cap'],
    home: ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'kitchen', 'bathroom', 'decor'],
    beauty: ['makeup', 'skincare', 'perfume', 'cosmetics', 'beauty', 'hair', 'nail'],
    sports: ['fitness', 'gym', 'sports', 'exercise', 'workout', 'running', 'basketball', 'soccer'],
    toys: ['toy', 'game', 'puzzle', 'doll', 'action figure', 'lego', 'board game'],
    books: ['book', 'novel', 'textbook', 'magazine', 'comic', 'manga'],
    automotive: ['car', 'auto', 'vehicle', 'motorcycle', 'bike', 'tire', 'oil']
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