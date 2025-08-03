/**
 * React Hook for Delhivery Address Validation
 * Provides real-time address validation for Indian addresses
 */

import { useState, useEffect, useCallback } from 'react';
import { delhiveryAddressValidationService } from '@/services/DelhiveryAddressValidationService';
import { useDebounce } from '@/hooks/useDebounce';

interface AddressValidationState {
  isValidating: boolean;
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
  deliveryInfo?: {
    serviceable: boolean;
    estimated_days: number;
  };
  pincodeInfo?: {
    district: string;
    state: string;
    serviceable: boolean;
  };
}

interface UseDelhiveryAddressValidationProps {
  country: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  debounceMs?: number;
  enableValidation?: boolean;
}

export function useDelhiveryAddressValidation({
  country,
  address_line1,
  city,
  state,
  pincode,
  debounceMs = 800,
  enableValidation = true
}: UseDelhiveryAddressValidationProps) {
  const [validationState, setValidationState] = useState<AddressValidationState>({
    isValidating: false,
    isValid: false,
    confidence: 0,
    issues: [],
    suggestions: []
  });

  // Debounce the validation inputs to avoid excessive API calls
  const debouncedInputs = useDebounce({
    address_line1,
    city,
    state,
    pincode
  }, debounceMs);

  const validateAddress = useCallback(async () => {
    // Only validate Indian addresses
    if (country !== 'IN' || !enableValidation) {
      setValidationState({
        isValidating: false,
        isValid: true,
        confidence: 100,
        issues: [],
        suggestions: []
      });
      return;
    }

    // Check if we have minimum required fields
    const hasMinimumData = debouncedInputs.pincode && 
                          debouncedInputs.address_line1 && 
                          debouncedInputs.city && 
                          debouncedInputs.state;

    if (!hasMinimumData) {
      setValidationState({
        isValidating: false,
        isValid: false,
        confidence: 0,
        issues: [],
        suggestions: []
      });
      return;
    }

    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      console.log('🔍 [Address Validation Hook] Starting validation...');
      
      // Get comprehensive validation status
      const result = await delhiveryAddressValidationService.getAddressValidationStatus(
        debouncedInputs.address_line1,
        debouncedInputs.city,
        debouncedInputs.state,
        debouncedInputs.pincode
      );

      // Also get pincode info separately for additional details
      let pincodeInfo;
      if (delhiveryAddressValidationService.isValidIndianPincode(debouncedInputs.pincode)) {
        const pincodeData = await delhiveryAddressValidationService.validatePincode(debouncedInputs.pincode);
        if (pincodeData) {
          pincodeInfo = {
            district: pincodeData.district,
            state: pincodeData.state,
            serviceable: pincodeData.is_serviceable
          };
        }
      }

      setValidationState({
        isValidating: false,
        isValid: result.is_valid,
        confidence: result.confidence,
        issues: result.issues,
        suggestions: result.suggestions,
        deliveryInfo: result.delivery_info,
        pincodeInfo
      });

      console.log('✅ [Address Validation Hook] Validation completed:', result);

    } catch (error) {
      console.error('❌ [Address Validation Hook] Validation failed:', error);
      
      setValidationState({
        isValidating: false,
        isValid: false,
        confidence: 0,
        issues: ['Validation service temporarily unavailable'],
        suggestions: ['Please try again later']
      });
    }
  }, [country, enableValidation, debouncedInputs]);

  // Trigger validation when debounced inputs change
  useEffect(() => {
    validateAddress();
  }, [validateAddress]);

  // Manual validation trigger
  const revalidate = useCallback(() => {
    validateAddress();
  }, [validateAddress]);

  // Pincode-only validation for faster feedback
  const validatePincodeOnly = useCallback(async (pincodeValue: string) => {
    if (country !== 'IN' || !enableValidation) {
      return null;
    }

    if (!delhiveryAddressValidationService.isValidIndianPincode(pincodeValue)) {
      return {
        isValid: false,
        serviceable: false,
        message: 'Invalid pincode format'
      };
    }

    try {
      const result = await delhiveryAddressValidationService.validatePincode(pincodeValue);
      
      if (result) {
        return {
          isValid: true,
          serviceable: result.is_serviceable,
          district: result.district,
          state: result.state,
          message: result.is_serviceable 
            ? `Serviceable in ${result.district}, ${result.state}` 
            : 'This pincode may not be serviceable'
        };
      }
      
      return {
        isValid: false,
        serviceable: false,
        message: 'Unable to verify pincode'
      };

    } catch (error) {
      console.error('❌ [Address Validation Hook] Pincode validation failed:', error);
      return {
        isValid: false,
        serviceable: false,
        message: 'Validation service unavailable'
      };
    }
  }, [country, enableValidation]);

  // Get address suggestions
  const getAddressSuggestions = useCallback(async (query: string, pincodeValue?: string) => {
    if (country !== 'IN' || !enableValidation || query.length < 3) {
      return [];
    }

    try {
      return await delhiveryAddressValidationService.getAddressSuggestions(query, pincodeValue);
    } catch (error) {
      console.error('❌ [Address Validation Hook] Suggestions failed:', error);
      return [];
    }
  }, [country, enableValidation]);

  return {
    ...validationState,
    revalidate,
    validatePincodeOnly,
    getAddressSuggestions,
    isIndianAddress: country === 'IN',
    validationEnabled: enableValidation && country === 'IN'
  };
}