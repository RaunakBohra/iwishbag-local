import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductAnalysisRequest {
  url: string;
  productName?: string;
}

interface ProductAnalysis {
  name: string;
  price: number;
  weight: number;
  imageUrl?: string;
  category: string;
  availability: boolean;
  currency: string;
  originalPrice?: number;
  description?: string;
  brand?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingWeight?: number;
  platform?: string;
  averageRating?: number;
  totalReviews?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, productName }: ProductAnalysisRequest = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Mock product analysis for local development
    // In production, this would use ScraperAPI or similar service
    const mockAnalysis: ProductAnalysis = {
      name: productName || 'Sample Product',
      price: Math.floor(Math.random() * 1000) + 50,
      weight: Math.floor(Math.random() * 5) + 1,
      imageUrl: 'https://via.placeholder.com/300x300?text=Product+Image',
      category: 'Electronics',
      availability: true,
      currency: 'USD',
      originalPrice: Math.floor(Math.random() * 1200) + 100,
      description: 'This is a mock product description for local development testing.',
      brand: 'Sample Brand',
      dimensions: {
        length: Math.floor(Math.random() * 20) + 10,
        width: Math.floor(Math.random() * 15) + 5,
        height: Math.floor(Math.random() * 10) + 2
      },
      shippingWeight: Math.floor(Math.random() * 3) + 1,
      platform: 'amazon',
      averageRating: 4.2,
      totalReviews: Math.floor(Math.random() * 1000) + 100
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return new Response(
      JSON.stringify(mockAnalysis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Product analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 