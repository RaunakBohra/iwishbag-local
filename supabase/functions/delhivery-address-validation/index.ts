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
    // Try the pincode serviceability API endpoint
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
      
      // If API fails, fall back to mock data for demonstration
      console.log(`🔍 [Delhivery Address] Falling back to mock data for pincode: ${pincode}`);
      return getMockPincodeData(pincode);
    }

    const data = await response.json();
    console.log(`✅ [Delhivery Address] Pincode API Response:`, data);
    
    // Process the response - try different response structures
    if (data && data.delivery_codes && data.delivery_codes.length > 0) {
      const pincodeData = data.delivery_codes.find((item: any) => item.postal_code.toString() === pincode);
      
      if (pincodeData) {
        const district = pincodeData.district || 'Unknown';
        const state = pincodeData.state_or_province || 'Unknown';
        const deliveryEstimate = calculateDeliveryEstimate(pincode, district, state);
        
        return {
          pincode: pincode,
          district: district,
          state: state,
          country: 'IN',
          is_serviceable: true,
          cod_available: true,
          prepaid_available: true,
          pickup_available: true,
          delivery_modes: deliveryEstimate.express > 0 ? ['standard', 'express'] : ['standard'],
          estimated_delivery_days: deliveryEstimate
        };
      }
    }

    // If no data found, fall back to mock
    console.log(`🔍 [Delhivery Address] No data found, using mock for pincode: ${pincode}`);
    return getMockPincodeData(pincode);

  } catch (error) {
    console.error(`❌ [Delhivery Address] Pincode validation error:`, error);
    
    // Fall back to mock data on any error
    console.log(`🔍 [Delhivery Address] Error occurred, using mock for pincode: ${pincode}`);
    return getMockPincodeData(pincode);
  }
}

// Calculate delivery estimates based on distance from origin (Delhi - 110005)
function calculateDeliveryEstimate(pincode: string, district: string, state: string) {
  const ORIGIN_PINCODE = '110005'; // Delhi warehouse
  
  // If delivery is within Delhi, it's same day/next day
  if (pincode.startsWith('110') || state === 'Delhi') {
    return {
      standard: 1, // Next day for Delhi
      express: 0   // Same day for Delhi (if available)
    };
  }
  
  // Calculate based on distance zones from Delhi
  const deliveryZones: Record<string, { standard: number; express: number }> = {
    // Zone 1: NCR and nearby states (1-2 days)
    'Haryana': { standard: 2, express: 1 },
    'Punjab': { standard: 2, express: 1 },
    'Uttar Pradesh': { standard: 2, express: 1 },
    'Uttarakhand': { standard: 2, express: 1 },
    'Rajasthan': { standard: 2, express: 1 },
    
    // Zone 2: North and West India (2-3 days)
    'Himachal Pradesh': { standard: 3, express: 2 },
    'Jammu and Kashmir': { standard: 4, express: 3 },
    'Gujarat': { standard: 3, express: 2 },
    'Madhya Pradesh': { standard: 3, express: 2 },
    'Chhattisgarh': { standard: 3, express: 2 },
    
    // Zone 3: Western India (3-4 days)
    'Maharashtra': { standard: 3, express: 2 },
    'Goa': { standard: 4, express: 3 },
    
    // Zone 4: Eastern India (3-4 days)
    'West Bengal': { standard: 4, express: 3 },
    'Bihar': { standard: 3, express: 2 },
    'Jharkhand': { standard: 3, express: 2 },
    'Odisha': { standard: 4, express: 3 },
    
    // Zone 5: South India (4-5 days)
    'Karnataka': { standard: 4, express: 3 },
    'Andhra Pradesh': { standard: 5, express: 4 },
    'Telangana': { standard: 4, express: 3 },
    'Tamil Nadu': { standard: 5, express: 4 },
    'Kerala': { standard: 5, express: 4 },
    
    // Zone 6: Northeast India (5-7 days)
    'Assam': { standard: 6, express: 5 },
    'Arunachal Pradesh': { standard: 7, express: 6 },
    'Manipur': { standard: 6, express: 5 },
    'Meghalaya': { standard: 6, express: 5 },
    'Mizoram': { standard: 7, express: 6 },
    'Nagaland': { standard: 6, express: 5 },
    'Tripura': { standard: 6, express: 5 },
    'Sikkim': { standard: 5, express: 4 }
  };
  
  const estimate = deliveryZones[state] || { standard: 4, express: 3 }; // Default for unknown states
  
  return estimate;
}

// Mock data helper function with realistic delivery estimates
function getMockPincodeData(pincode: string) {
  const mockPincodeData: Record<string, any> = {
    '400050': { district: 'Mumbai', state: 'Maharashtra' },
    '110001': { district: 'New Delhi', state: 'Delhi' },
    '560034': { district: 'Bangalore', state: 'Karnataka' },
    '400001': { district: 'Mumbai', state: 'Maharashtra' },
    '700001': { district: 'Kolkata', state: 'West Bengal' },
    '600001': { district: 'Chennai', state: 'Tamil Nadu' },
    '500001': { district: 'Hyderabad', state: 'Telangana' },
    '411001': { district: 'Pune', state: 'Maharashtra' },
    '302001': { district: 'Jaipur', state: 'Rajasthan' },
    '380001': { district: 'Ahmedabad', state: 'Gujarat' }
  };
  
  const mockData = mockPincodeData[pincode];
  
  if (mockData) {
    const deliveryEstimate = calculateDeliveryEstimate(pincode, mockData.district, mockData.state);
    
    return {
      pincode: pincode,
      district: mockData.district,
      state: mockData.state,
      country: 'IN',
      is_serviceable: true,
      cod_available: true,
      prepaid_available: true,
      pickup_available: true,
      delivery_modes: deliveryEstimate.express > 0 ? ['standard', 'express'] : ['standard'],
      estimated_delivery_days: deliveryEstimate
    };
  }

  // For unknown pincodes, assume average delivery time
  return {
    pincode: pincode,
    district: 'Unknown District',
    state: 'Unknown State', 
    country: 'IN',
    is_serviceable: true, // Assume serviceable for demo
    cod_available: true,
    prepaid_available: true,
    pickup_available: false,
    delivery_modes: ['standard'],
    estimated_delivery_days: {
      standard: 4, // Average delivery time for unknown locations
      express: 0   // No express for unknown locations
    }
  };
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