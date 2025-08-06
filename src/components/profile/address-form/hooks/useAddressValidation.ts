/**
 * Address Validation Hook
 * Manages all real-time validation logic for address forms
 * Extracted from AddressForm for better maintainability
 */

import { useState, useCallback, useMemo } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { InternationalAddressValidator } from '@/services/InternationalAddressValidator';
import { ValidationStatus } from '@/components/ui/ValidatedInput';

interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  rate_from_usd: number;
  minimum_payment_amount: number;
  shipping_allowed: boolean;
}

interface UseAddressValidationProps {
  address?: Tables<'delivery_addresses'>;
  selectedCountry: string;
  countries?: Country[];
}

export const useAddressValidation = ({ 
  address, 
  selectedCountry, 
  countries 
}: UseAddressValidationProps) => {
  // Basic field validation states
  const [firstNameStatus, setFirstNameStatus] = useState<ValidationStatus>(() => {
    if (address) {
      const parsedNames = parseRecipientName(address.recipient_name);
      return parsedNames.firstName.length >= 2 ? 'valid' : 'idle';
    }
    return 'idle';
  });

  const [lastNameStatus, setLastNameStatus] = useState<ValidationStatus>(() => {
    if (address) {
      const parsedNames = parseRecipientName(address.recipient_name);
      return parsedNames.lastName.length >= 2 ? 'valid' : 'idle';
    }
    return 'idle';
  });

  const [countryStatus, setCountryStatus] = useState<ValidationStatus>(() => {
    return address && address.destination_country ? 'valid' : 'idle';
  });

  const [addressStatus, setAddressStatus] = useState<ValidationStatus>(() => {
    return address && address.address_line1 && address.address_line1.length >= 5 ? 'valid' : 'idle';
  });

  const [postalCodeStatus, setPostalCodeStatus] = useState<ValidationStatus>(() => {
    if (address && address.postal_code && address.destination_country) {
      const result = InternationalAddressValidator.validatePostalCode(
        address.postal_code, 
        address.destination_country
      );
      return result.isValid ? 'valid' : 'invalid';
    }
    return 'idle';
  });

  const [cityStatus, setCityStatus] = useState<ValidationStatus>(() => {
    return address && address.city && address.city.length >= 2 ? 'valid' : 'idle';
  });

  const [provinceStatus, setProvinceStatus] = useState<ValidationStatus>(() => {
    return address && address.state_province_region ? 'valid' : 'idle';
  });

  const [landmarkStatus, setLandmarkStatus] = useState<ValidationStatus>(() => {
    return address && address.address_line2 && address.address_line2.length > 0 ? 'valid' : 'idle';
  });

  // Nepal-specific validation states
  const [districtStatus, setDistrictStatus] = useState<ValidationStatus>(() => {
    return address && selectedCountry === 'NP' && address.city ? 'valid' : 'idle';
  });

  const [municipalityStatus, setMunicipalityStatus] = useState<ValidationStatus>('idle');
  const [wardStatus, setWardStatus] = useState<ValidationStatus>('idle');

  // Phone validation
  const [phoneError, setPhoneError] = useState<string>('');

  // Helper function to parse recipient name
  function parseRecipientName(recipientName?: string) {
    if (recipientName) {
      const parts = recipientName.split(' ');
      if (parts.length >= 2) {
        const lastName = parts.pop() || '';
        const firstName = parts.join(' ');
        return { firstName, lastName };
      }
      return { firstName: recipientName, lastName: '' };
    }
    return { firstName: '', lastName: '' };
  }

  // Postal code validation
  const getPostalCodeError = useCallback(() => {
    if (!selectedCountry || !countries) return '';
    
    const countryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;
    
    // Check if postal code is required for this country
    const isRequired = InternationalAddressValidator.isPostalCodeRequired(selectedCountry);
    if (!isRequired) return '';
    
    // Get field labels for this country
    const fieldLabels = InternationalAddressValidator.getFieldLabels(selectedCountry);
    
    const result = InternationalAddressValidator.validatePostalCode('', selectedCountry);
    if (!result.isValid && result.error) {
      return result.error.replace('Invalid postal code format.', 
        `Invalid postal code format for ${countryName}.`);
    }
    
    return '';
  }, [selectedCountry, countries]);

  // Reset validation states when country changes
  const resetValidationStates = useCallback(() => {
    setCountryStatus('valid'); // Country is valid once selected
    setAddressStatus('idle');
    setPostalCodeStatus('idle');
    setCityStatus('idle');
    setProvinceStatus('idle');
    setDistrictStatus('idle');
    setMunicipalityStatus('idle');
    setWardStatus('idle');
    setLandmarkStatus('idle');
  }, []);

  // Validation handlers
  const handleFirstNameChange = useCallback((status: ValidationStatus) => {
    setFirstNameStatus(status);
  }, []);

  const handleLastNameChange = useCallback((status: ValidationStatus) => {
    setLastNameStatus(status);
  }, []);

  const handleCountryChange = useCallback((status: ValidationStatus) => {
    setCountryStatus(status);
  }, []);

  const handleAddressChange = useCallback((status: ValidationStatus) => {
    setAddressStatus(status);
  }, []);

  const handlePostalCodeChange = useCallback((status: ValidationStatus) => {
    setPostalCodeStatus(status);
  }, []);

  const handleCityChange = useCallback((status: ValidationStatus) => {
    setCityStatus(status);
  }, []);

  const handleProvinceChange = useCallback((status: ValidationStatus) => {
    setProvinceStatus(status);
  }, []);

  const handleLandmarkChange = useCallback((status: ValidationStatus) => {
    setLandmarkStatus(status);
  }, []);

  const handleDistrictChange = useCallback((status: ValidationStatus) => {
    setDistrictStatus(status);
  }, []);

  const handleMunicipalityChange = useCallback((status: ValidationStatus) => {
    setMunicipalityStatus(status);
  }, []);

  const handleWardChange = useCallback((status: ValidationStatus) => {
    setWardStatus(status);
  }, []);

  const handlePhoneValidation = useCallback((phone: string, isValid: boolean, error: string) => {
    setPhoneError(error);
  }, []);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const basicFieldsValid = firstNameStatus === 'valid' && 
                           lastNameStatus === 'valid' && 
                           countryStatus === 'valid' && 
                           addressStatus === 'valid';

    const locationFieldsValid = selectedCountry === 'NP' 
      ? provinceStatus === 'valid' && districtStatus === 'valid'
      : cityStatus === 'valid' && provinceStatus === 'valid';

    const postalValid = selectedCountry === 'NP' || postalCodeStatus === 'valid' || postalCodeStatus === 'idle';
    
    const phoneValid = phoneError === '';

    return basicFieldsValid && locationFieldsValid && postalValid && phoneValid;
  }, [
    firstNameStatus, lastNameStatus, countryStatus, addressStatus,
    cityStatus, provinceStatus, postalCodeStatus, districtStatus,
    phoneError, selectedCountry
  ]);

  return {
    // Validation states
    firstNameStatus,
    lastNameStatus,
    countryStatus,
    addressStatus,
    postalCodeStatus,
    cityStatus,
    provinceStatus,
    landmarkStatus,
    districtStatus,
    municipalityStatus,
    wardStatus,
    phoneError,
    
    // Validation handlers
    handleFirstNameChange,
    handleLastNameChange,
    handleCountryChange,
    handleAddressChange,
    handlePostalCodeChange,
    handleCityChange,
    handleProvinceChange,
    handleLandmarkChange,
    handleDistrictChange,
    handleMunicipalityChange,
    handleWardChange,
    handlePhoneValidation,
    
    // Utility functions
    getPostalCodeError,
    resetValidationStates,
    isFormValid,
    parseRecipientName,
  };
};