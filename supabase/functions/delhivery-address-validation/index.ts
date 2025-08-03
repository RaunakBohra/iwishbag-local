import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

// Delhivery API configuration for address validation
const DELHIVERY_CONFIG = {
  api_token: '60de581101a9fac9e8194662a7deecb2c71d0d09',
  base_url: 'https://track.delhivery.com/api',
  staging_url: 'https://staging-express.delhivery.com/api',
  client_name: '8cf872-iWBnterprises-do'
};

interface DelhiveryAddressRequest {
  action: 'validate_pincode' | 'validate_address' | 'standardize_address' | 'get_suggestions' | 'geocode';
  pincode?: string;
  address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  query?: string;
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

async function validatePincode(pincode: string): Promise<any> {
  console.log(`🔍 [Delhivery Address] Validating pincode: ${pincode}`);
  
  // Validate pincode format
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    throw new Error('Invalid pincode format');
  }

  try {
    // Use pincode serviceability API
    const url = `${DELHIVERY_CONFIG.base_url}/c/api/pin-codes/json/`;
    const params = new URLSearchParams({
      'filter_codes': pincode
    });

    console.log(`🔍 [Delhivery Address] API Request: ${url}?${params}`);
    
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${DELHIVERY_CONFIG.api_token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Delhivery Address] API Error ${response.status}: ${errorText}`);
      throw new Error(`Delhivery API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [Delhivery Address] Pincode API Response:`, data);
    
    // Process the response
    if (data && data.delivery_codes && data.delivery_codes.length > 0) {
      const pincodeData = data.delivery_codes.find((item: any) => item.postal_code.toString() === pincode);
      
      if (pincodeData) {
        return {
          pincode: pincode,
          district: pincodeData.district || 'Unknown',
          state: pincodeData.state_or_province || 'Unknown',
          country: 'IN',
          is_serviceable: true,
          cod_available: true, // Delhivery generally supports COD
          prepaid_available: true,
          pickup_available: true,
          delivery_modes: ['standard', 'express'],
          estimated_delivery_days: {
            standard: 3,
            express: 1
          }
        };
      }
    }

    // If pincode not found in serviceable list, it's likely not serviceable
    return {
      pincode: pincode,
      district: 'Unknown',
      state: 'Unknown', 
      country: 'IN',
      is_serviceable: false,
      cod_available: false,
      prepaid_available: false,
      pickup_available: false,
      delivery_modes: [],
      estimated_delivery_days: {
        standard: 0,
        express: 0
      }
    };

  } catch (error) {
    console.error(`❌ [Delhivery Address] Pincode validation error:`, error);
    throw error;
  }
}

async function validateAddress(addressRequest: any): Promise<any> {
  console.log(`🔍 [Delhivery Address] Validating address:`, addressRequest);
  
  try {
    // First validate the pincode
    const pincodeResult = await validatePincode(addressRequest.pincode);
    
    // Basic address validation logic
    const confidence = calculateAddressConfidence(addressRequest, pincodeResult);
    
    const response = {
      is_valid: confidence >= 70,
      confidence_score: confidence,
      standardized_address: {
        address_line1: addressRequest.address_line1.trim(),
        address_line2: addressRequest.address_line2?.trim() || '',
        city: addressRequest.city.trim(),
        state: addressRequest.state.trim(),
        pincode: addressRequest.pincode,
        district: pincodeResult.district,
        locality: '', // Would come from full address validation API
        sub_locality: ''
      },
      suggestions: generateAddressSuggestions(addressRequest, pincodeResult, confidence),
      validation_details: {
        pincode_valid: pincodeResult.is_serviceable,
        city_valid: confidence >= 60,
        state_valid: confidence >= 70,
        address_complete: addressRequest.address_line1.length >= 10,
        deliverable: pincodeResult.is_serviceable
      },
      delivery_info: {
        serviceable: pincodeResult.is_serviceable,
        cod_available: pincodeResult.cod_available,
        estimated_days: pincodeResult.estimated_delivery_days.standard,
        delivery_center: `${pincodeResult.district} Hub`
      }
    };

    console.log(`✅ [Delhivery Address] Address validation response:`, response);
    return response;

  } catch (error) {
    console.error(`❌ [Delhivery Address] Address validation error:`, error);
    throw error;
  }
}

function calculateAddressConfidence(address: any, pincodeResult: any): number {
  let confidence = 0;
  
  // Pincode validity (40% weight)
  if (pincodeResult.is_serviceable) {
    confidence += 40;
  }
  
  // Address completeness (30% weight)
  if (address.address_line1 && address.address_line1.length >= 10) {
    confidence += 20;
  }
  if (address.address_line1 && address.address_line1.length >= 5) {
    confidence += 10;
  }
  
  // City validity (20% weight)
  if (address.city && address.city.length >= 2) {
    confidence += 15;
  }
  if (address.city && address.city.toLowerCase().includes(pincodeResult.district.toLowerCase())) {
    confidence += 5;
  }
  
  // State validity (10% weight)
  if (address.state && address.state.length >= 2) {
    confidence += 10;
  }
  
  return Math.min(confidence, 100);
}

function generateAddressSuggestions(address: any, pincodeResult: any, confidence: number): string[] {
  const suggestions: string[] = [];
  
  if (confidence >= 90) {
    suggestions.push('Address looks excellent!');
  } else if (confidence >= 70) {
    suggestions.push('Address is valid and deliverable');
  } else if (confidence >= 50) {
    suggestions.push('Address needs minor corrections');
    if (!pincodeResult.is_serviceable) {
      suggestions.push('Please verify the pincode');
    }
    if (address.address_line1.length < 10) {
      suggestions.push('Consider adding more details to the address');
    }
  } else {
    suggestions.push('Address requires attention');
    if (!pincodeResult.is_serviceable) {
      suggestions.push('This pincode may not be serviceable');
    }
    if (!address.city || address.city.length < 2) {
      suggestions.push('Please provide a valid city name');
    }
    if (address.address_line1.length < 5) {
      suggestions.push('Please provide a more detailed address');
    }
  }
  
  return suggestions;
}

async function standardizeAddress(addressRequest: any): Promise<any> {
  console.log(`🔍 [Delhivery Address] Standardizing address:`, addressRequest);
  
  try {
    const pincodeResult = await validatePincode(addressRequest.pincode);
    
    // Create standardized version
    const standardized = {
      address_line1: addressRequest.address_line1.trim(),
      address_line2: addressRequest.address_line2?.trim() || '',
      city: addressRequest.city.trim(),
      state: addressRequest.state.trim(),
      pincode: addressRequest.pincode,
      district: pincodeResult.district,
      locality: '',
      formatted_address: `${addressRequest.address_line1.trim()}, ${addressRequest.city.trim()}, ${addressRequest.state.trim()} ${addressRequest.pincode}`
    };
    
    const improvements = [];
    if (!pincodeResult.is_serviceable) {
      improvements.push('Pincode verification needed');
    }
    if (addressRequest.address_line1.length < 10) {
      improvements.push('Consider adding more specific location details');
    }
    
    return {
      original_address: addressRequest,
      standardized_address: standardized,
      improvements,
      confidence: calculateAddressConfidence(addressRequest, pincodeResult)
    };

  } catch (error) {
    console.error(`❌ [Delhivery Address] Address standardization error:`, error);
    throw error;
  }
}

async function getAddressSuggestions(query: string, pincode?: string): Promise<string[]> {
  console.log(`🔍 [Delhivery Address] Getting suggestions for query: ${query}, pincode: ${pincode}`);
  
  // For now, return basic suggestions based on common patterns
  // In a full implementation, this would call Delhivery's address suggestion API
  const suggestions: string[] = [];
  
  if (query.length >= 3) {
    // Common area patterns
    const commonAreas = [
      'Main Road', 'Market Road', 'Station Road', 'Bus Stand',
      'Near Hospital', 'Near School', 'Near Bank', 'Near Mall'
    ];
    
    for (const area of commonAreas) {
      if (area.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(area.toLowerCase())) {
        suggestions.push(`${query}, ${area}`);
      }
    }
  }
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

serve(async (req) => {
  console.log('🔵 === DELHIVERY ADDRESS VALIDATION FUNCTION STARTED ===');
  
  const corsHeaders = createCorsHeaders(req, ['GET', 'POST']);

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
    const { action }: DelhiveryAddressRequest = body;

    console.log('🔵 Delhivery address validation request:', { action, body });

    let result;

    switch (action) {
      case 'validate_pincode':
        if (!body.pincode) {
          return createErrorResponse('Pincode is required', 400, corsHeaders);
        }
        result = await validatePincode(body.pincode);
        break;

      case 'validate_address':
        if (!body.address) {
          return createErrorResponse('Address is required', 400, corsHeaders);
        }
        result = await validateAddress(body.address);
        break;

      case 'standardize_address':
        if (!body.address) {
          return createErrorResponse('Address is required', 400, corsHeaders);
        }
        result = await standardizeAddress(body.address);
        break;

      case 'get_suggestions':
        if (!body.query) {
          return createErrorResponse('Query is required', 400, corsHeaders);
        }
        const suggestions = await getAddressSuggestions(body.query, body.pincode);
        result = { suggestions };
        break;

      case 'geocode':
        // Geocoding would require additional Delhivery API integration
        result = {
          geocoding: null,
          error: 'Geocoding not implemented yet'
        };
        break;

      default:
        return createErrorResponse('Invalid action', 400, corsHeaders);
    }

    console.log('✅ [Delhivery Address] Operation completed successfully:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ [Delhivery Address] Function error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      corsHeaders
    );
  }
});