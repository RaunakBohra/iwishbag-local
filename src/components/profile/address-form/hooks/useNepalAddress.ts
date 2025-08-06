/**
 * Nepal Address Management Hook
 * Manages Nepal's hierarchical address system state and logic
 * Extracted from AddressForm for better maintainability
 */

import { useState, useEffect, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { NepalAddressService } from '@/services/NepalAddressService';

interface UseNepalAddressProps {
  address?: Tables<'delivery_addresses'>;
  selectedCountry: string;
}

export const useNepalAddress = ({ address, selectedCountry }: UseNepalAddressProps) => {
  // Nepal-specific state
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [districts, setDistricts] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [municipalities, setMunicipalities] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [wardNumber, setWardNumber] = useState<string>('');
  const [area, setArea] = useState<string>('');

  const isNepal = selectedCountry === 'NP';

  // Load districts when province changes
  useEffect(() => {
    if (isNepal && selectedProvince) {
      const provinceDistricts = NepalAddressService.getDistrictsForProvince(selectedProvince);
      setDistricts(provinceDistricts);
      setSelectedDistrict(''); // Reset district selection
      setMunicipalities([]); // Reset municipalities
      setSelectedMunicipality(''); // Reset municipality selection
    }
  }, [selectedProvince, isNepal]);

  // Load municipalities when district changes
  useEffect(() => {
    if (isNepal && selectedDistrict) {
      const districtMunicipalities = NepalAddressService.getMunicipalitiesForDistrict(selectedDistrict);
      setMunicipalities(districtMunicipalities);
      setSelectedMunicipality(''); // Reset municipality selection
    }
  }, [selectedDistrict, isNepal]);

  // Initialize Nepal fields when editing an existing address
  useEffect(() => {
    if (address && selectedCountry === 'NP') {
      // Parse municipality, ward, and area from address_line1
      if (address.address_line1) {
        const parts = address.address_line1.split(',').map(p => p.trim());
        
        if (parts.length > 0) {
          setSelectedMunicipality(parts[0]);
        }
        
        // Parse ward number
        const wardMatch = address.address_line1.match(/Ward (\d+)/i);
        if (wardMatch) {
          setWardNumber(wardMatch[1]);
        }
        
        // Parse area/street (if exists after ward)
        if (parts.length > 2) {
          // Format: "Municipality, Ward X, Street/Area"
          const areaIndex = parts.findIndex(p => p.match(/Ward \d+/i)) + 1;
          if (areaIndex < parts.length) {
            setArea(parts.slice(areaIndex).join(', '));
          }
        }
      }
      
      // Province should already be set in state_province_region
      if (address.state_province_region) {
        setSelectedProvince(address.state_province_region);
      }
      
      // District should already be set in city field  
      if (address.city) {
        setSelectedDistrict(address.city);
      }
    }
  }, [address, selectedCountry]);

  // Reset Nepal fields when country changes away from Nepal
  useEffect(() => {
    if (selectedCountry !== 'NP') {
      setSelectedProvince('');
      setDistricts([]);
      setSelectedDistrict('');
      setMunicipalities([]);
      setSelectedMunicipality('');
      setWardNumber('');
      setArea('');
    }
  }, [selectedCountry]);

  // Handlers
  const handleProvinceChange = useCallback((province: string) => {
    setSelectedProvince(province);
  }, []);

  const handleDistrictChange = useCallback((district: string) => {
    setSelectedDistrict(district);
  }, []);

  const handleMunicipalityChange = useCallback((municipality: string) => {
    setSelectedMunicipality(municipality);
  }, []);

  const handleWardChange = useCallback((ward: string) => {
    setWardNumber(ward);
  }, []);

  const handleAreaChange = useCallback((newArea: string) => {
    setArea(newArea);
  }, []);

  // Construct address line 1 from Nepal components
  const constructNepalAddressLine1 = useCallback(() => {
    const parts: string[] = [];
    
    if (selectedMunicipality) {
      parts.push(selectedMunicipality);
    }
    
    if (wardNumber) {
      parts.push(`Ward ${wardNumber}`);
    }
    
    if (area) {
      parts.push(area);
    }
    
    return parts.join(', ');
  }, [selectedMunicipality, wardNumber, area]);

  // Check if Nepal address is complete
  const isNepalAddressComplete = useCallback(() => {
    return selectedProvince && 
           selectedDistrict && 
           selectedMunicipality && 
           wardNumber;
  }, [selectedProvince, selectedDistrict, selectedMunicipality, wardNumber]);

  return {
    // State
    isNepal,
    selectedProvince,
    districts,
    selectedDistrict,
    municipalities,
    selectedMunicipality,
    wardNumber,
    area,
    
    // Handlers
    handleProvinceChange,
    handleDistrictChange,
    handleMunicipalityChange,
    handleWardChange,
    handleAreaChange,
    
    // Utilities
    constructNepalAddressLine1,
    isNepalAddressComplete,
  };
};