import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

// Delhivery API configuration
const DELHIVERY_CONFIG = {
  api_token: '60de581101a9fac9e8194662a7deecb2c71d0d09',
  base_url: 'https://track.delhivery.com/api',
  client_name: '8cf872-iWBnterprises-do',
  pickup_pincode: '110005'
};

const SERVICE_TYPE_MAPPING = {
  standard: 'S', // Surface
  express: 'E',  // Express
  same_day: 'X'  // Same day (if available)
};

interface DelhiveryRateRequest {
  destination_pincode: string;
  weight: number; // in kg
  cod: boolean;
  service_type?: 'standard' | 'express' | 'same_day';
}

interface DelhiveryRateResponse {
  service_type: string;
  rate: number; // in INR
  estimated_days: number;
  service_name: string;
  available: boolean;
  error?: string;
}

interface DelhiveryMultiRateResponse {
  rates: DelhiveryRateResponse[];
  currency: 'INR';
  markup_applied: number;
  original_total: number;
  final_total: number;
  cache_used: boolean;
}

function createErrorResponse(message: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      error: message, 
      timestamp: new Date().toISOString() 
    }),
    {
      status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    }
  );
}

async function getSingleDelhiveryRate(request: DelhiveryRateRequest): Promise<DelhiveryRateResponse | null> {
  const serviceCode = SERVICE_TYPE_MAPPING[request.service_type || 'standard'];
  
  console.log(`🚚 [Delhivery Edge] Getting rate for ${request.service_type} service`);
  
  // Delhivery Rate API call (official format)
  const url = `${DELHIVERY_CONFIG.base_url}/kinko/v1/invoice/charges/.json`;
  const params = new URLSearchParams({
    cl: DELHIVERY_CONFIG.client_name,
    ss: 'Delivered',
    md: serviceCode,
    pt: request.cod ? 'COD' : 'Pre-paid',
    d_pin: request.destination_pincode,
    o_pin: DELHIVERY_CONFIG.pickup_pincode,
    cgm: (request.weight * 1000).toString() // Convert kg to grams as required by API
  });

  try {
    const fullUrl = `${url}?${params}`;
    console.log(`🚚 [Delhivery Edge] API Request: ${fullUrl}`);
    console.log(`🚚 [Delhivery Edge] Weight: ${request.weight}kg → ${request.weight * 1000}g`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${DELHIVERY_CONFIG.api_token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚚 [Delhivery Edge] API Error ${response.status}: ${errorText}`);
      throw new Error(`Delhivery API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`🚚 [Delhivery Edge] API Response:`, data);
    
    // Parse Delhivery response (format may vary)
    if (data && data[0] && data[0].total_amount) {
      const rate = parseFloat(data[0].total_amount);
      console.log(`✅ [Delhivery Edge] Rate for ${request.service_type}: ₹${rate}`);
      
      return {
        service_type: request.service_type || 'standard',
        rate: rate,
        estimated_days: request.service_type === 'express' ? 1 : 3,
        service_name: request.service_type === 'express' ? 'Express Delivery' : 'Standard Delivery',
        available: true
      };
    } else {
      console.error(`🚚 [Delhivery Edge] Invalid response format:`, data);
      throw new Error('Invalid response format from Delhivery');
    }

  } catch (error) {
    console.error(`🚚 [Delhivery Edge] Single rate error for ${request.service_type}:`, error);
    return null;
  }
}

function getFallbackRate(serviceType: string): number {
  // Base rates in INR (conservative estimates)
  const baseRates = {
    standard: 100, // ₹100 base
    express: 200   // ₹200 base
  };

  return baseRates[serviceType as keyof typeof baseRates] || baseRates.standard;
}

serve(async (req) => {
  console.log('🔵 === DELHIVERY RATES FUNCTION STARTED ===');
  console.log('🔍 Request details:', {
    method: req.method,
    url: req.url,
    origin: req.headers.get('origin'),
    allowedOrigins: Deno.env.get('ALLOWED_ORIGINS')
  });
  
  const corsHeaders = createCorsHeaders(req, ['GET', 'POST']);
  console.log('🔍 CORS Headers:', corsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight request');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405, corsHeaders);
    }

    const body = await req.json();
    const { destination_pincode, weight, cod = false, service_type = 'standard' }: DelhiveryRateRequest = body;

    console.log('🔵 Delhivery rate request:', {
      destination_pincode,
      weight,
      cod,
      service_type
    });

    // Validate required parameters
    if (!destination_pincode || !weight) {
      return createErrorResponse('Missing required parameters: destination_pincode, weight', 400, corsHeaders);
    }

    // Validate Indian pincode format
    if (!/^[1-9][0-9]{5}$/.test(destination_pincode)) {
      return createErrorResponse('Invalid Indian pincode format', 400, corsHeaders);
    }

    // Get rates for all available service types
    const serviceTypes = ['standard', 'express'] as const;
    const ratePromises = serviceTypes.map(type => 
      getSingleDelhiveryRate({ ...body, service_type: type })
    );

    const results = await Promise.allSettled(ratePromises);
    const rates: DelhiveryRateResponse[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        rates.push(result.value);
      } else {
        console.warn(`🚚 [Delhivery Edge] Failed to get ${serviceTypes[index]} rate:`, result);
        const fallbackRate = getFallbackRate(serviceTypes[index]);
        console.warn(`⚠️ [Delhivery Edge] Using fallback rate for ${serviceTypes[index]}: ₹${fallbackRate}`);
        
        // Add fallback rate
        rates.push({
          service_type: serviceTypes[index],
          rate: fallbackRate,
          estimated_days: serviceTypes[index] === 'express' ? 1 : 3,
          service_name: serviceTypes[index] === 'express' ? 'Express Delivery' : 'Standard Delivery',
          available: false,
          error: 'API unavailable, using fallback rate'
        });
      }
    });

    // Calculate markup (15% as configured)
    const markupPercentage = 15;
    const originalTotal = rates.reduce((sum, rate) => sum + rate.rate, 0);
    const markup = originalTotal * (markupPercentage / 100);
    const finalTotal = originalTotal + markup;

    // Apply markup to individual rates
    rates.forEach(rate => {
      const rateMarkup = rate.rate * (markupPercentage / 100);
      rate.rate = Math.round(rate.rate + rateMarkup);
    });

    const response: DelhiveryMultiRateResponse = {
      rates,
      currency: 'INR',
      markup_applied: markupPercentage,
      original_total: Math.round(originalTotal),
      final_total: Math.round(finalTotal),
      cache_used: false
    };

    console.log('✅ [Delhivery Edge] Rates calculated:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ [Delhivery Edge] Function error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      corsHeaders
    );
  }
});