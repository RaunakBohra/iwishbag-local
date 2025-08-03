/**
 * Delhivery Address Validation Service
 * Provides real-time address validation, standardization, and serviceability checking
 * for Indian addresses using Delhivery APIs
 */

import { supabase } from '@/integrations/supabase/client';

interface DelhiveryPincodeResponse {
  pincode: string;
  district: string;
  state: string;
  country: string;
  is_serviceable: boolean;
  cod_available: boolean;
  prepaid_available: boolean;
  pickup_available: boolean;
  delivery_modes: string[];
  estimated_delivery_days: {
    standard: number;
    express: number;
  };
}

interface DelhiveryAddressValidationRequest {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

interface DelhiveryAddressValidationResponse {
  is_valid: boolean;
  confidence_score: number; // 0-100
  standardized_address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    district?: string;
    locality?: string;
    sub_locality?: string;
  };
  suggestions?: string[];
  validation_details: {
    pincode_valid: boolean;
    city_valid: boolean;
    state_valid: boolean;
    address_complete: boolean;
    deliverable: boolean;
  };
  geocoding?: {
    latitude: number;
    longitude: number;
    accuracy: 'exact' | 'approximate' | 'low';
  };
  delivery_info?: {
    serviceable: boolean;
    cod_available: boolean;
    estimated_days: number;
    delivery_center?: string;
  };
}

interface DelhiveryAddressStandardizationResponse {
  original_address: DelhiveryAddressValidationRequest;
  standardized_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    district?: string;
    locality?: string;
    formatted_address: string;
  };
  improvements: string[];
  confidence: number;
}

class DelhiveryAddressValidationService {
  private static instance: DelhiveryAddressValidationService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  static getInstance(): DelhiveryAddressValidationService {
    if (!DelhiveryAddressValidationService.instance) {
      DelhiveryAddressValidationService.instance = new DelhiveryAddressValidationService();
    }
    return DelhiveryAddressValidationService.instance;
  }

  /**
   * Validate if a pincode is serviceable by Delhivery
   */
  async validatePincode(pincode: string): Promise<DelhiveryPincodeResponse | null> {
    if (!this.isValidIndianPincode(pincode)) {
      return null;
    }

    const cacheKey = `pincode_${pincode}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 [Delhivery Address] Validating pincode:', pincode);

      const { data, error } = await supabase.functions.invoke('delhivery-address-validation', {
        body: {
          action: 'validate_pincode',
          pincode: pincode
        }
      });

      if (error) {
        console.error('❌ [Delhivery Address] Pincode validation failed:', error);
        return null;
      }

      console.log('✅ [Delhivery Address] Pincode validation response:', data);
      
      if (data && data.is_serviceable !== undefined) {
        this.setCache(cacheKey, data);
        return data;
      }

      return null;

    } catch (error) {
      console.error('❌ [Delhivery Address] Pincode validation error:', error);
      return null;
    }
  }

  /**
   * Validate and standardize a complete address
   */
  async validateAddress(request: DelhiveryAddressValidationRequest): Promise<DelhiveryAddressValidationResponse | null> {
    const cacheKey = `address_${JSON.stringify(request)}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 [Delhivery Address] Validating address:', request);

      const { data, error } = await supabase.functions.invoke('delhivery-address-validation', {
        body: {
          action: 'validate_address',
          address: request
        }
      });

      if (error) {
        console.error('❌ [Delhivery Address] Address validation failed:', error);
        return null;
      }

      console.log('✅ [Delhivery Address] Address validation response:', data);
      
      if (data && data.is_valid !== undefined) {
        this.setCache(cacheKey, data);
        return data;
      }

      return null;

    } catch (error) {
      console.error('❌ [Delhivery Address] Address validation error:', error);
      return null;
    }
  }

  /**
   * Get standardized/corrected version of an address
   */
  async standardizeAddress(request: DelhiveryAddressValidationRequest): Promise<DelhiveryAddressStandardizationResponse | null> {
    try {
      console.log('🔍 [Delhivery Address] Standardizing address:', request);

      const { data, error } = await supabase.functions.invoke('delhivery-address-validation', {
        body: {
          action: 'standardize_address',
          address: request
        }
      });

      if (error) {
        console.error('❌ [Delhivery Address] Address standardization failed:', error);
        return null;
      }

      console.log('✅ [Delhivery Address] Address standardization response:', data);
      return data;

    } catch (error) {
      console.error('❌ [Delhivery Address] Address standardization error:', error);
      return null;
    }
  }

  /**
   * Get address suggestions based on partial input
   */
  async getAddressSuggestions(query: string, pincode?: string): Promise<string[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      console.log('🔍 [Delhivery Address] Getting suggestions for:', query, pincode);

      const { data, error } = await supabase.functions.invoke('delhivery-address-validation', {
        body: {
          action: 'get_suggestions',
          query: query,
          pincode: pincode
        }
      });

      if (error || !data || !data.suggestions) {
        return [];
      }

      return data.suggestions || [];

    } catch (error) {
      console.error('❌ [Delhivery Address] Address suggestions error:', error);
      return [];
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number; accuracy: string } | null> {
    try {
      console.log('🔍 [Delhivery Address] Geocoding address:', address);

      const { data, error } = await supabase.functions.invoke('delhivery-address-validation', {
        body: {
          action: 'geocode',
          address: address
        }
      });

      if (error || !data || !data.geocoding) {
        return null;
      }

      return data.geocoding;

    } catch (error) {
      console.error('❌ [Delhivery Address] Geocoding error:', error);
      return null;
    }
  }

  /**
   * Check if address can be delivered to and get delivery estimates
   */
  async checkDeliverability(pincode: string): Promise<{
    serviceable: boolean;
    cod_available: boolean;
    prepaid_available: boolean;
    estimated_days: number;
    delivery_center?: string;
  } | null> {
    const pincodeData = await this.validatePincode(pincode);
    
    if (!pincodeData) {
      return null;
    }

    return {
      serviceable: pincodeData.is_serviceable,
      cod_available: pincodeData.cod_available,
      prepaid_available: pincodeData.prepaid_available,
      estimated_days: pincodeData.estimated_delivery_days.standard,
      delivery_center: undefined // Will be available if Delhivery provides it
    };
  }

  /**
   * Utility function to validate Indian pincode format
   */
  isValidIndianPincode(pincode: string): boolean {
    return /^[1-9][0-9]{5}$/.test(pincode);
  }

  /**
   * Get comprehensive address validation for forms
   */
  async getAddressValidationStatus(
    address_line1: string,
    city: string,
    state: string,
    pincode: string
  ): Promise<{
    is_valid: boolean;
    confidence: number;
    issues: string[];
    suggestions: string[];
    delivery_info?: {
      serviceable: boolean;
      estimated_days: number;
    };
  }> {
    // Input validation
    if (!address_line1 || !city || !state || !pincode) {
      return {
        is_valid: false,
        confidence: 0,
        issues: ['Incomplete address information'],
        suggestions: ['Please fill in all required fields']
      };
    }

    if (!this.isValidIndianPincode(pincode)) {
      return {
        is_valid: false,
        confidence: 0,
        issues: ['Invalid pincode format'],
        suggestions: ['Please enter a valid 6-digit Indian pincode']
      };
    }

    try {
      // Validate address with Delhivery
      const validationResult = await this.validateAddress({
        address_line1,
        city,
        state,
        pincode,
        country: 'IN'
      });

      if (!validationResult) {
        // Fallback to pincode validation only
        const pincodeResult = await this.validatePincode(pincode);
        
        if (pincodeResult) {
          return {
            is_valid: pincodeResult.is_serviceable,
            confidence: pincodeResult.is_serviceable ? 70 : 30,
            issues: pincodeResult.is_serviceable ? [] : ['Pincode may not be serviceable'],
            suggestions: pincodeResult.is_serviceable ? ['Address looks good!'] : ['Please verify the pincode'],
            delivery_info: {
              serviceable: pincodeResult.is_serviceable,
              estimated_days: pincodeResult.estimated_delivery_days.standard
            }
          };
        }

        return {
          is_valid: false,
          confidence: 0,
          issues: ['Unable to validate address'],
          suggestions: ['Please check your address details']
        };
      }

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (!validationResult.validation_details.pincode_valid) {
        issues.push('Pincode validation failed');
      }
      if (!validationResult.validation_details.city_valid) {
        issues.push('City may be incorrect');
      }
      if (!validationResult.validation_details.state_valid) {
        issues.push('State may be incorrect');
      }
      if (!validationResult.validation_details.deliverable) {
        issues.push('Address may not be deliverable');
      }

      if (validationResult.suggestions) {
        suggestions.push(...validationResult.suggestions);
      }

      return {
        is_valid: validationResult.is_valid && validationResult.confidence_score >= 70,
        confidence: validationResult.confidence_score,
        issues,
        suggestions,
        delivery_info: validationResult.delivery_info ? {
          serviceable: validationResult.delivery_info.serviceable,
          estimated_days: validationResult.delivery_info.estimated_days
        } : undefined
      };

    } catch (error) {
      console.error('❌ [Delhivery Address] Validation status error:', error);
      
      return {
        is_valid: false,
        confidence: 0,
        issues: ['Address validation service temporarily unavailable'],
        suggestions: ['Please try again later']
      };
    }
  }

  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const delhiveryAddressValidationService = DelhiveryAddressValidationService.getInstance();
export { DelhiveryAddressValidationService };
export type { 
  DelhiveryPincodeResponse, 
  DelhiveryAddressValidationRequest,
  DelhiveryAddressValidationResponse,
  DelhiveryAddressStandardizationResponse
};