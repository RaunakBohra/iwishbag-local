import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

interface NCMRateRequest {
  creation: string;
  destination: string;
  type: 'Pickup' | 'Collect';
  weight?: number;
}

interface NCMRateResponse {
  service_type: 'pickup' | 'collect';
  rate: number; // in NPR
  estimated_days: number;
  service_name: string;
  available: boolean;
  error?: string;
}

interface NCMMultiRateResponse {
  rates: NCMRateResponse[];
  currency: 'NPR';
  markup_applied: number;
  original_total: number;
  final_total: number;
  cache_used: boolean;
}

// NCM configuration
const NCM_CONFIG = {
  api_token: '009d25035b2da1b4533b0f2cbfe1877d510aaa7e', // Demo token from docs
  base_url: 'https://demo.nepalcanmove.com',
  markup_percentage: 15, // 15% markup on NCM rates
  fallback_rates: {
    pickup: 250, // NPR 250 base for pickup
    collect: 150 // NPR 150 base for collect
  }
};

// Cache for rates (in-memory, resets on function restart)
const rateCache = new Map<string, { data: NCMMultiRateResponse; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🏔️ [NCM Edge Function] Processing rate request');
    
    const { creation, destination, type, weight } = await req.json() as NCMRateRequest;
    
    // Validate input
    if (!creation || !destination || !type) {
      throw new Error('Missing required parameters: creation, destination, type');
    }

    // Check cache
    const cacheKey = `ncm_rates_${creation}_${destination}`;
    const cached = getCachedRates(cacheKey);
    if (cached) {
      console.log('📦 [NCM] Returning cached rates');
      return new Response(
        JSON.stringify({ ...cached, cache_used: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get rates for both service types
    const [pickupResult, collectResult] = await Promise.allSettled([
      fetchNCMRate(creation, destination, 'Pickup'),
      fetchNCMRate(creation, destination, 'Collect')
    ]);

    const rates: NCMRateResponse[] = [];

    // Process pickup rate
    if (pickupResult.status === 'fulfilled' && pickupResult.value) {
      const originalRate = pickupResult.value.deliveryCharge;
      const markedUpRate = Math.round(originalRate * (1 + NCM_CONFIG.markup_percentage / 100));
      
      rates.push({
        service_type: 'pickup',
        rate: markedUpRate,
        estimated_days: estimateDeliveryDays(creation, destination, 'pickup'),
        service_name: 'NCM Pickup Service',
        available: true
      });
    }

    // Process collect rate
    if (collectResult.status === 'fulfilled' && collectResult.value) {
      const originalRate = collectResult.value.deliveryCharge;
      const markedUpRate = Math.round(originalRate * (1 + NCM_CONFIG.markup_percentage / 100));
      
      rates.push({
        service_type: 'collect',
        rate: markedUpRate,
        estimated_days: estimateDeliveryDays(creation, destination, 'collect'),
        service_name: 'NCM Collect Service',
        available: true
      });
    }

    // If no rates available, use fallback
    if (rates.length === 0) {
      const fallbackRates = getFallbackRates();
      setCachedRates(cacheKey, fallbackRates);
      
      console.log('🔄 [NCM] Using fallback rates');
      return new Response(
        JSON.stringify(fallbackRates),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalTotal = rates.reduce((sum, rate) => sum + (rate.rate / (1 + NCM_CONFIG.markup_percentage / 100)), 0);
    const finalTotal = rates.reduce((sum, rate) => sum + rate.rate, 0);

    const response: NCMMultiRateResponse = {
      rates,
      currency: 'NPR',
      markup_applied: NCM_CONFIG.markup_percentage,
      original_total: Math.round(originalTotal),
      final_total: Math.round(finalTotal),
      cache_used: false
    };

    // Cache the response
    setCachedRates(cacheKey, response);

    console.log('✅ [NCM] Successfully calculated rates');
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [NCM Edge Function] Error:', error);
    
    // Return fallback rates on error
    const fallbackRates = getFallbackRates();
    return new Response(
      JSON.stringify(fallbackRates),
      { 
        status: 200, // Don't return error status, return fallback instead
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

// Helper function to fetch NCM rate
async function fetchNCMRate(creation: string, destination: string, type: 'Pickup' | 'Collect') {
  const url = `${NCM_CONFIG.base_url}/api/v1/shipping-rate?creation=${encodeURIComponent(creation)}&destination=${encodeURIComponent(destination)}&type=${encodeURIComponent(type)}`;
  
  console.log(`🚚 [NCM] Fetching ${type} rate: ${creation} → ${destination}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${NCM_CONFIG.api_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`❌ [NCM] API error for ${type}:`, response.status);
    return null;
  }

  return await response.json();
}

// Helper function to estimate delivery days
function estimateDeliveryDays(fromBranch: string, toBranch: string, serviceType: 'pickup' | 'collect'): number {
  // Pickup service is faster
  const basePickupDays = 2;
  const baseCollectDays = 4;
  
  // Same branch/district - faster delivery
  if (fromBranch === toBranch) {
    return serviceType === 'pickup' ? 1 : 2;
  }
  
  // Kathmandu valley deliveries are faster
  const kathmanduBranches = ['TINKUNE', 'KATHMANDU', 'LALITPUR', 'BHAKTAPUR'];
  if (kathmanduBranches.includes(fromBranch.toUpperCase()) && 
      kathmanduBranches.includes(toBranch.toUpperCase())) {
    return serviceType === 'pickup' ? 1 : 2;
  }
  
  return serviceType === 'pickup' ? basePickupDays : baseCollectDays;
}

// Fallback rates when API fails
function getFallbackRates(): NCMMultiRateResponse {
  const pickupRate = NCM_CONFIG.fallback_rates.pickup;
  const collectRate = NCM_CONFIG.fallback_rates.collect;

  return {
    rates: [
      {
        service_type: 'pickup',
        rate: pickupRate,
        estimated_days: 3,
        service_name: 'NCM Pickup Service',
        available: false,
        error: 'Using fallback rate (API unavailable)'
      },
      {
        service_type: 'collect',
        rate: collectRate,
        estimated_days: 5,
        service_name: 'NCM Collect Service',
        available: false,
        error: 'Using fallback rate (API unavailable)'
      }
    ],
    currency: 'NPR',
    markup_applied: 0, // No markup on fallback
    original_total: pickupRate + collectRate,
    final_total: pickupRate + collectRate,
    cache_used: false
  };
}

// Cache management
function getCachedRates(key: string): NCMMultiRateResponse | null {
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedRates(key: string, data: NCMMultiRateResponse): void {
  rateCache.set(key, {
    data,
    timestamp: Date.now()
  });
}