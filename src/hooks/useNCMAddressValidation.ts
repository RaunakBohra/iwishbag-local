/**
 * React Hook for NCM (Nepal Can Move) Address Validation
 * Provides real-time address validation for Nepal addresses
 */

import { useState, useEffect, useCallback } from 'react';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { useDebounce } from '@/hooks/useDebounce';
import type { NCMBranch, BranchMapping, AddressInput } from '@/services/NCMBranchMappingService';

interface AddressValidationState {
  isValidating: boolean;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low' | null;
  issues: string[];
  suggestions: string[];
  branchMapping?: BranchMapping;
  availableBranches: NCMBranch[];
}

interface UseNCMAddressValidationProps {
  country: string;
  address_line1: string;
  city: string;
  state: string;
  district: string;
  debounceMs?: number;
  enableValidation?: boolean;
}

export function useNCMAddressValidation({
  country,
  address_line1,
  city,
  state,
  district,
  debounceMs = 800,
  enableValidation = true
}: UseNCMAddressValidationProps) {
  const [validationState, setValidationState] = useState<AddressValidationState>({
    isValidating: false,
    isValid: false,
    confidence: null,
    issues: [],
    suggestions: [],
    availableBranches: []
  });

  // Debounce the validation inputs to avoid excessive API calls
  const debouncedInputs = useDebounce({
    address_line1,
    city,
    state,
    district
  }, debounceMs);

  const validateAddress = useCallback(async () => {
    // Only validate Nepal addresses
    if (country !== 'NP' || !enableValidation) {
      setValidationState({
        isValidating: false,
        isValid: true,
        confidence: 'high',
        issues: [],
        suggestions: [],
        availableBranches: []
      });
      return;
    }

    // Check if we have minimum required fields
    const hasMinimumData = debouncedInputs.city || debouncedInputs.district;

    if (!hasMinimumData) {
      setValidationState({
        isValidating: false,
        isValid: false,
        confidence: null,
        issues: [],
        suggestions: [],
        availableBranches: []
      });
      return;
    }

    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      console.log('🔍 [NCM Address Validation Hook] Starting validation...');
      
      // Get available branches first
      const branches = await ncmBranchMappingService.getBranches();
      
      // Find destination branch mapping
      const addressInput: AddressInput = {
        city: debouncedInputs.city,
        state: debouncedInputs.state,
        district: debouncedInputs.district,
        addressLine1: debouncedInputs.address_line1
      };

      const branchMapping = await ncmBranchMappingService.findDestinationBranch(addressInput);
      
      const issues: string[] = [];
      const suggestions: string[] = [];
      let isValid = false;

      if (branchMapping) {
        isValid = branchMapping.confidence === 'high' || branchMapping.confidence === 'medium';
        
        if (branchMapping.confidence === 'low') {
          issues.push('Unable to find exact branch match for this address');
          suggestions.push('Please verify the city/district name');
          suggestions.push('Consider selecting a branch manually from the dropdown');
        } else if (branchMapping.confidence === 'medium') {
          suggestions.push('Address partially matched - please verify details');
        }
      } else {
        issues.push('No NCM branch found for this location');
        suggestions.push('Please check if NCM delivers to this area');
        suggestions.push('Consider selecting the nearest major city');
      }

      setValidationState({
        isValidating: false,
        isValid,
        confidence: branchMapping?.confidence || null,
        issues,
        suggestions,
        branchMapping,
        availableBranches: branches
      });

      console.log('✅ [NCM Address Validation Hook] Validation completed:', {
        isValid,
        confidence: branchMapping?.confidence,
        branch: branchMapping?.branch?.name
      });

    } catch (error) {
      console.error('❌ [NCM Address Validation Hook] Validation failed:', error);
      
      // Try to get branches at least for fallback
      let branches: NCMBranch[] = [];
      try {
        branches = await ncmBranchMappingService.getBranches();
      } catch (branchError) {
        console.error('Failed to get fallback branches:', branchError);
      }

      setValidationState({
        isValidating: false,
        isValid: false,
        confidence: null,
        issues: ['Address validation service temporarily unavailable'],
        suggestions: ['Please select a branch manually from the dropdown'],
        availableBranches: branches
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

  // Load all branches for manual selection
  const loadAllBranches = useCallback(async () => {
    try {
      const branches = await ncmBranchMappingService.getBranches();
      setValidationState(prev => ({
        ...prev,
        availableBranches: branches
      }));
      return branches;
    } catch (error) {
      console.error('❌ [NCM Address Validation Hook] Failed to load branches:', error);
      return [];
    }
  }, []);

  // Check if address is serviceable
  const checkServiceability = useCallback(async (addressInput: AddressInput) => {
    if (country !== 'NP' || !enableValidation) {
      return { serviceable: true, confidence: 'high' as const };
    }

    try {
      const isServiceable = await ncmBranchMappingService.isServiceable(addressInput);
      const mapping = await ncmBranchMappingService.findDestinationBranch(addressInput);
      
      return {
        serviceable: isServiceable,
        confidence: mapping?.confidence || null,
        branch: mapping?.branch || null,
        matchReason: mapping?.matchReason || null
      };
    } catch (error) {
      console.error('❌ [NCM Address Validation Hook] Serviceability check failed:', error);
      return { serviceable: false, confidence: null };
    }
  }, [country, enableValidation]);

  // Format Nepal phone number
  const formatNepalPhone = useCallback((phone: string) => {
    return ncmBranchMappingService.formatNepalPhone(phone);
  }, []);

  return {
    ...validationState,
    revalidate,
    loadAllBranches,
    checkServiceability,
    formatNepalPhone,
    isNepalAddress: country === 'NP',
    validationEnabled: enableValidation && country === 'NP'
  };
}