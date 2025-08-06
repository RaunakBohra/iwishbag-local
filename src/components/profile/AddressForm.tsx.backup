import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { unifiedConfigService } from '@/services/UnifiedConfigurationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tables } from '@/integrations/supabase/types';
import { useMemo, useEffect, useState, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { InternationalAddressValidator } from '@/services/InternationalAddressValidator';
import { StateProvinceService } from '@/services/StateProvinceService';
import { NepalAddressService } from '@/services/NepalAddressService';
import { isValidPhone, isValidPhoneForCountry } from '@/lib/phoneUtils';
import { ipLocationService } from '@/services/IPLocationService';
import { Info, Search, ChevronDown, ChevronUp, Truck, Loader2 } from 'lucide-react';
import { ValidatedInput, ValidationStatus } from '@/components/ui/ValidatedInput';
import { ValidatedSelectTrigger } from '@/components/ui/ValidatedSelect';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';

const addressSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company_name: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state_province_region: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().optional().nullable(), // Allow null for countries where postal codes are optional
  destination_country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
  delivery_instructions: z.string().optional(),
  is_default: z.boolean().default(false),
});

type AddressFormValues = {
  first_name: string;
  last_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province_region: string;
  postal_code?: string | null; // Optional and nullable
  destination_country: string;
  phone: string;
  delivery_instructions?: string;
  is_default: boolean;
};

interface AddressFormProps {
  address?: Tables<'delivery_addresses'>;
  onSuccess?: (savedAddress?: Tables<'delivery_addresses'>) => void;
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState(address?.destination_country || 'US');
  const [fieldLabels, setFieldLabels] = useState({ state: 'State', postal: 'ZIP Code', city: 'City', address: 'Address' });
  const [stateProvinces, setStateProvinces] = useState(StateProvinceService.getStatesForCountry(selectedCountry) || null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [showDeliveryInstructions, setShowDeliveryInstructions] = useState(
    !!(address?.delivery_instructions && address.delivery_instructions.trim())
  );
  
  // Nepal-specific state
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [districts, setDistricts] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [municipalities, setMunicipalities] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [wardNumber, setWardNumber] = useState<string>('');
  const [area, setArea] = useState<string>('');
  
  // Custom validation states for real-time feedback
  const [phoneError, setPhoneError] = useState<string>('');
  
  // Validation states for real-time indicators
  const [firstNameStatus, setFirstNameStatus] = useState<ValidationStatus>('idle');
  const [lastNameStatus, setLastNameStatus] = useState<ValidationStatus>('idle');
  const [countryStatus, setCountryStatus] = useState<ValidationStatus>(() => {
    // Initialize with valid state if address already exists and has country
    return address && address.destination_country ? 'valid' : 'idle';
  });
  const [addressStatus, setAddressStatus] = useState<ValidationStatus>(() => {
    // Initialize with valid state if address already exists and has address
    return address && address.address_line1 && address.address_line1.length >= 5 ? 'valid' : 'idle';
  });
  const [postalCodeStatus, setPostalCodeStatus] = useState<ValidationStatus>(() => {
    // Initialize based on existing postal code validity
    if (address && address.postal_code && address.destination_country) {
      const result = InternationalAddressValidator.validatePostalCode(address.postal_code, address.destination_country);
      return result.isValid ? 'valid' : 'invalid';
    }
    return 'idle';
  });
  const [cityStatus, setCityStatus] = useState<ValidationStatus>(() => {
    // Initialize with valid state if address already exists and has city
    return address && address.city && address.city.length >= 2 ? 'valid' : 'idle';
  });
  const [provinceStatus, setProvinceStatus] = useState<ValidationStatus>(() => {
    // Initialize with valid state if address already exists and has state/province
    return address && address.state_province_region ? 'valid' : 'idle';
  });
  const [districtStatus, setDistrictStatus] = useState<ValidationStatus>(() => {
    // For Nepal, district is stored in city field
    return address && selectedCountry === 'NP' && address.city ? 'valid' : 'idle';
  });
  const [municipalityStatus, setMunicipalityStatus] = useState<ValidationStatus>('idle');
  const [wardStatus, setWardStatus] = useState<ValidationStatus>('idle');
  const [landmarkStatus, setLandmarkStatus] = useState<ValidationStatus>(() => {
    // Address line 2 is optional, so it's valid if empty or has content
    return address && address.address_line2 && address.address_line2.length > 0 ? 'valid' : 'idle';
  });
  
  // Check if Nepal is selected
  const isNepal = selectedCountry === 'NP';


  const { data: allCountries, isLoading: countriesLoading } = useQuery({
    queryKey: ['country-configurations'],
    queryFn: async () => {
      try {
        const allCountries = await unifiedConfigService.getAllCountries();
        if (!allCountries) return [];
        
        const countryList = Object.entries(allCountries).map(([code, config]) => ({
          code,
          name: config.name,
          currency: config.currency,
          symbol: config.symbol,
          rate_from_usd: config.rate_from_usd,
          minimum_payment_amount: config.minimum_payment_amount,
          shipping_allowed: true,
        }));
        
        return countryList.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        throw new Error('Failed to fetch country configurations');
      }
    },
  });

  const countries = useMemo(() => {
    if (!allCountries) return [];
    return allCountries.filter((c) => c.shipping_allowed);
  }, [allCountries]);


  // Filter countries for country dropdown based on search
  const filteredCountries = useMemo(() => {
    if (!countries || !countrySearchQuery) return countries;
    
    const query = countrySearchQuery.toLowerCase();
    return countries.filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [countries, countrySearchQuery]);


  // Parse recipient name from address
  const parsedNames = useMemo(() => {
    if (address?.recipient_name) {
      const parts = address.recipient_name.split(' ');
      if (parts.length >= 2) {
        const lastName = parts.pop() || '';
        const firstName = parts.join(' ');
        return { firstName, lastName };
      }
      return { firstName: address.recipient_name, lastName: '' };
    }
    return { firstName: '', lastName: '' };
  }, [address]);

  // Initialize validation states when editing existing address
  useEffect(() => {
    if (address) {
      // Initialize first name status
      if (parsedNames.firstName.length >= 2) {
        setFirstNameStatus('valid');
      }
      
      // Initialize last name status
      if (parsedNames.lastName.length >= 2) {
        setLastNameStatus('valid');
      }
      
      // Initialize address status
      if (address.address_line1 && address.address_line1.length >= 5) {
        setAddressStatus('valid');
      }
      
      // Initialize city status
      if (address.city && address.city.length >= 2) {
        setCityStatus('valid');
      }
      
      // Initialize province status
      if (address.state_province_region) {
        setProvinceStatus('valid');
      }
      
      // Initialize postal code status
      if (address.postal_code && address.destination_country) {
        const result = InternationalAddressValidator.validatePostalCode(address.postal_code, address.destination_country);
        setPostalCodeStatus(result.isValid ? 'valid' : 'invalid');
      }
      
      // Initialize landmark status (optional field)
      if (address.address_line2 && address.address_line2.length > 0) {
        setLandmarkStatus('valid');
      }
    }
  }, [address, parsedNames]);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange', // Enable real-time validation
    reValidateMode: 'onChange', // Re-validate on every change
    defaultValues: address
      ? {
          first_name: parsedNames.firstName,
          last_name: parsedNames.lastName,
          company_name: address.company_name || '',
          address_line1: address.address_line1,
          address_line2: address.address_line2 || '',
          city: address.city,
          state_province_region: address.state_province_region || '',
          postal_code: address.postal_code || '',
          destination_country: address.destination_country || 'US',
          phone: address.phone || '',
          delivery_instructions: address.delivery_instructions || '',
          is_default: address.is_default,
        }
      : {
          first_name: '',
          last_name: '',
          company_name: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state_province_region: '',
          postal_code: '',
          destination_country: 'US',
          phone: '',
          delivery_instructions: '',
          is_default: false,
        },
  });

  // Custom validation functions

  const validatePostalCode = (postalCode: string | null | undefined): string => {
    if (selectedCountry && selectedCountry.length === 2) {
      const result = InternationalAddressValidator.validatePostalCode(postalCode || '', selectedCountry);
      
      if (!result.isValid) {
        // Use the error from validator, but enhance it with country name if available
        if (result.error?.includes('Invalid postal code format.')) {
          const countryName = countries?.find(c => c.code === selectedCountry)?.name || selectedCountry;
          return result.error.replace('Invalid postal code format.', `Invalid postal code format for ${countryName}.`);
        }
        return result.error || `Please enter a valid ${fieldLabels.postal.toLowerCase()} for ${countries?.find(c => c.code === selectedCountry)?.name || selectedCountry}`;
      }
    }
    
    return '';
  };

  // Clear custom errors when country changes
  useEffect(() => {
    // Re-validate existing values with new country
    const currentPostal = form.getValues('postal_code');
    
    if (currentPostal) {
      const postalErr = validatePostalCode(currentPostal);
      if (postalErr) {
        form.setError('postal_code', { message: postalErr });
      } else {
        form.clearErrors('postal_code');
      }
    }
  }, [selectedCountry, form, fieldLabels.postal, countries]);

  // Update field labels and states when country changes
  useEffect(() => {
    if (selectedCountry) {
      const labels = InternationalAddressValidator.getFieldLabels(selectedCountry);
      
      // Override labels for Nepal
      if (selectedCountry === 'NP') {
        setFieldLabels({
          state: 'Province',
          postal: 'Postal Code',
          city: 'District',
          address: 'Street Address'
        });
      } else {
        setFieldLabels(labels);
      }
      
      const states = StateProvinceService.getStatesForCountry(selectedCountry);
      setStateProvinces(states);
      
      // Reset Nepal-specific fields when country changes
      if (selectedCountry !== 'NP') {
        setSelectedProvince('');
        setDistricts([]);
        setSelectedDistrict('');
        setMunicipalities([]);
        setSelectedMunicipality('');
        setWardNumber('');
        setArea('');
      }
      
      // Reset validation states when country changes
      setCountryStatus('valid'); // Country is valid once selected
      setAddressStatus('idle');
      setPostalCodeStatus('idle');
      setCityStatus('idle');
      setProvinceStatus('idle');
      setDistrictStatus('idle');
      setMunicipalityStatus('idle');
      setWardStatus('idle');
      setLandmarkStatus('idle');
    }
  }, [selectedCountry]);
  
  // Load districts when province changes (Nepal)
  useEffect(() => {
    if (isNepal && selectedProvince) {
      const provinceDistricts = NepalAddressService.getDistrictsForProvince(selectedProvince);
      setDistricts(provinceDistricts);
      setSelectedDistrict(''); // Reset district selection
      setMunicipalities([]); // Reset municipalities
      setSelectedMunicipality(''); // Reset municipality selection
    }
  }, [selectedProvince, isNepal]);
  
  // Load municipalities when district changes (Nepal)
  useEffect(() => {
    if (isNepal && selectedDistrict) {
      const districtMunicipalities = NepalAddressService.getMunicipalitiesForDistrict(selectedDistrict);
      setMunicipalities(districtMunicipalities);
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
    }
  }, [address, selectedCountry]);

  // Initialize Nepal district selection from existing address (CRITICAL FIX)
  useEffect(() => {
    if (address && selectedCountry === 'NP' && address.city && districts.length > 0 && !selectedDistrict) {
      // For Nepal, district name is stored in the city field
      const districtCode = NepalAddressService.getDistrictCodeByName(address.city);
      console.log('🏔️ [AddressForm] Initializing district from existing address:', {
        storedInCityField: address.city,
        districtCode,
        availableDistricts: districts.length
      });
      
      if (districtCode) {
        setSelectedDistrict(districtCode);
      }
    }
  }, [address, selectedCountry, districts, selectedDistrict]);

  // Initialize Nepal city selection from existing address (CRITICAL FIX)
  useEffect(() => {
    if (address && selectedCountry === 'NP' && address.address_line1 && municipalities.length > 0 && !selectedMunicipality) {
      // Parse city from address_line1 (first part before comma)
      const parts = address.address_line1.split(',').map(p => p.trim());
      const cityName = parts[0];
      
      const cityExists = municipalities.find(m => m.name === cityName);
      console.log('🏔️ [AddressForm] Initializing city from existing address:', {
        addressLine1: address.address_line1,
        extractedCity: cityName,
        found: !!cityExists
      });
      
      if (cityExists) {
        setSelectedMunicipality(cityName);
      }
    }
  }, [address, selectedCountry, municipalities, selectedMunicipality]);

  // Auto-detect country on component mount (only for new addresses)
  useEffect(() => {
    if (!address && countries && countries.length > 0) {
      console.log('[AddressForm] Auto-detecting country for new address...');
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        autoDetectCountry();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [countries, address]); // Added address to deps to prevent re-running


  // Handle clicking outside country dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearchQuery('');
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);

  const autoDetectCountry = async () => {
    try {
      setIsAutoDetecting(true);
      console.log('[AddressForm] Starting country detection...');
      
      // Force refresh on first load to ensure fresh detection
      const isFirstDetection = !ipLocationService.getCachedLocation();
      const location = await ipLocationService.detectCountry(isFirstDetection);
      
      console.log('[AddressForm] Detected location:', location);
      
      if (location.countryCode && location.countryCode !== selectedCountry) {
        const countryExists = countries?.some(c => c.code === location.countryCode);
        
        if (countryExists) {
          console.log('[AddressForm] Setting country to:', location.countryCode);
          setSelectedCountry(location.countryCode);
          form.setValue('destination_country', location.countryCode);
          
          if (location.confidence === 'high' || location.confidence === 'medium') {
            toast({
              title: 'Location detected',
              description: `We've set your country to ${location.countryName || location.countryCode} based on your location.`,
              duration: 3000,
            });
          }
        } else {
          console.log('[AddressForm] Country not in allowed list:', location.countryCode);
        }
      }
    } catch (error) {
      console.error('[AddressForm] Failed to auto-detect country:', error);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const addressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!user) throw new Error('User not authenticated');

      // Combine first and last name
      const recipient_name = `${values.first_name} ${values.last_name}`.trim();

      // Build payload with special handling for Nepal
      let finalAddress1 = values.address_line1;
      
      // For Nepal, the address_line1 already contains the complete address 
      // (municipality + area + ward) from the input handlers, so no need to append area again
      // The triplication bug was here - we were double-appending the area!
      
      // Handle postal code based on country requirements
      let postalCodeValue: string | null;
      if (values.postal_code && values.postal_code.trim() !== '') {
        postalCodeValue = values.postal_code.trim();
      } else {
        // Use null for countries where postal codes are optional, empty string for others
        const isOptional = !InternationalAddressValidator.isPostalCodeRequired(values.destination_country);
        postalCodeValue = isOptional ? null : '';
      }

      const payload = {
        recipient_name,
        company_name: values.company_name || null,
        address_line1: finalAddress1,
        address_line2: values.address_line2 || null,
        city: values.city,
        state_province_region: values.state_province_region,
        postal_code: postalCodeValue,
        destination_country: values.destination_country,
        phone: values.phone,
        delivery_instructions: values.delivery_instructions || null,
        is_default: values.is_default,
      };

      // If setting this address as default, first unset all other defaults
      if (values.is_default) {
        await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (address) {
        const { data, error } = await supabase
          .from('delivery_addresses')
          .update(payload)
          .eq('id', address.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('delivery_addresses')
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (savedAddress) => {
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', user?.id] });
      toast({
        title: address ? 'Address updated' : 'Address added',
        description: `Your address has been successfully ${address ? 'updated' : 'added'}.`,
      });
      onSuccess?.(savedAddress);
    },
    onError: (error) => {
      toast({
        title: `Error ${address ? 'updating' : 'adding'} address`,
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: AddressFormValues) => {
    // Check if form has any errors from React Hook Form validation
    const formErrors = Object.keys(form.formState.errors).length > 0;
    
    // Perform final custom validation before submission
    const postalError = validatePostalCode(data.postal_code || '');
    
    // Set custom errors if they exist
    let hasCustomErrors = false;
    if (postalError) {
      form.setError('postal_code', { message: postalError });
      hasCustomErrors = true;
    }
    
    // Check for phone validation error from WorldClassPhoneInput
    const hasPhoneError = phoneError !== '';
    
    // Check if there are any validation errors (form errors, custom errors, or phone errors)
    if (formErrors || hasCustomErrors || hasPhoneError) {
      // Trigger validation to show all errors
      await form.trigger();
      
      // Show a toast to inform user about errors
      toast({
        title: 'Please fix form errors',
        description: 'Some fields contain invalid information. Please correct them before submitting.',
        variant: 'destructive',
      });
      
      return; // Prevent form submission
    }
    
    // If all validation passes, proceed with submission
    addressMutation.mutate(data);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg relative">
      {/* Loading Overlay */}
      {addressMutation.isPending && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <div className="text-sm font-medium text-gray-700">
              {address ? 'Updating address...' : 'Saving address...'}
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Country/Region */}
          <FormField
            control={form.control}
            name="destination_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">
                  Country/Region
                  {/* Auto-detect loading indicator */}
                  {isAutoDetecting && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Detecting...
                    </span>
                  )}
                  {/* Dev button to test IP detection */}
                  {!address && process.env.NODE_ENV === 'development' && !isAutoDetecting && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[AddressForm] Manually triggering IP detection...');
                        ipLocationService.clearCache();
                        autoDetectCountry();
                      }}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      (Detect)
                    </button>
                  )}
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    {countriesLoading ? (
                      /* Loading skeleton for country selector */
                      <div className="w-full h-11 bg-white border border-gray-300 rounded px-3 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setShowCountryDropdown(!showCountryDropdown);
                          if (!showCountryDropdown) {
                            setCountrySearchQuery(''); // Clear search when opening
                          }
                        }}
                        className="w-full h-11 bg-white border border-gray-300 rounded px-3 flex items-center justify-between cursor-pointer hover:border-gray-400"
                      >
                        <div className="flex items-center gap-2">
                          {field.value && countries && (
                            <>
                              <FlagIcon countryCode={field.value} size="sm" />
                              <span className="text-base">
                                {countries.find(c => c.code === field.value)?.name || field.value}
                              </span>
                            </>
                          )}
                          {(!field.value || !countries) && (
                            <span className="text-gray-500 text-base">
                              {countries ? 'Select a country' : 'Loading countries...'}
                            </span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </FormControl>
                  {showCountryDropdown && (
                    <div 
                      ref={countryDropdownRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50"
                    >
                      {/* Search input */}
                      <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                        <input
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder="Search country..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            e.stopPropagation(); // Prevent form submission on Enter
                          }}
                        />
                      </div>
                      
                      {/* Countries list */}
                      <div className="max-h-80 overflow-y-auto">
                        {filteredCountries?.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No countries found
                          </div>
                        ) : (
                          filteredCountries?.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                field.onChange(country.code);
                                setSelectedCountry(country.code);
                                setShowCountryDropdown(false);
                                setCountrySearchQuery(''); // Clear search
                                setCountryStatus('valid'); // Mark country as valid when selected
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <FlagIcon countryCode={country.code} size="sm" />
                              <span className="text-sm flex-1">{country.name}</span>
                              {country.code === field.value && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* First and Last Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">First name</FormLabel>
                  <FormControl>
                    <ValidatedInput
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const value = e.target.value.trim();
                        if (value.length === 0) {
                          setFirstNameStatus('idle');
                        } else if (value.length >= 2) {
                          setFirstNameStatus('valid');
                        } else {
                          setFirstNameStatus('invalid');
                        }
                      }}
                      validationStatus={firstNameStatus}
                      validationError={form.formState.errors.first_name?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">Last name</FormLabel>
                  <FormControl>
                    <ValidatedInput
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        const value = e.target.value.trim();
                        if (value.length === 0) {
                          setLastNameStatus('idle');
                        } else if (value.length >= 2) {
                          setLastNameStatus('valid');
                        } else {
                          setLastNameStatus('invalid');
                        }
                      }}
                      validationStatus={lastNameStatus}
                      validationError={form.formState.errors.last_name?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Company field hidden - uncomment to show
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Company (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    className="h-11 bg-white border-gray-300 rounded text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          */}
          
          {/* Address - Adaptive for Nepal */}
          {isNepal ? (
            <>
              {/* Nepal Address Hierarchy: Province → District → City → Street/Ward → Landmark */}
              
              {/* Province and District Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state_province_region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-600">Province</FormLabel>
                      <Select
                        key={`province-${selectedCountry}`}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedProvince(value);
                          setProvinceStatus('valid'); // Mark province as valid when selected
                        }}
                        value={field.value || ''}
                        disabled={addressMutation.isPending}
                      >
                        <FormControl>
                          <ValidatedSelectTrigger 
                            validationStatus={provinceStatus}
                            validationError={form.formState.errors.state_province_region?.message}
                          >
                            <SelectValue placeholder="Select province" />
                          </ValidatedSelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stateProvinces?.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-600">District</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(NepalAddressService.getDistrictName(value) || value);
                          setSelectedDistrict(value);
                          setDistrictStatus('valid'); // Mark district as valid when selected
                        }}
                        value={selectedDistrict}
                        disabled={addressMutation.isPending || !selectedProvince}
                      >
                        <FormControl>
                          <ValidatedSelectTrigger 
                            validationStatus={!selectedProvince ? 'idle' : districts.length === 0 ? 'validating' : districtStatus}
                            validationError={form.formState.errors.city?.message}
                          >
                            <SelectValue placeholder={
                              !selectedProvince 
                                ? "Select province first" 
                                : districts.length === 0 
                                  ? "Loading districts..." 
                                  : "Select district"
                            } />
                          </ValidatedSelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.code} value={district.code}>
                              {district.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* City dropdown (when available) OR Manual input when none */}
              {selectedDistrict && (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">City</FormLabel>
                  {municipalities.length > 0 ? (
                    /* Show dropdown when municipalities are available */
                    <Select
                      onValueChange={(value) => {
                        setSelectedMunicipality(value);
                        setMunicipalityStatus('valid'); // Mark municipality as valid when selected
                        // Update address_line1 with municipality and ward
                        const currentWard = wardNumber || '';
                        form.setValue('address_line1', currentWard ? `${value}, Ward ${currentWard}` : value);
                      }}
                      value={selectedMunicipality}
                      disabled={addressMutation.isPending}
                    >
                      <FormControl>
                        <ValidatedSelectTrigger 
                          validationStatus={municipalityStatus}
                        >
                          <SelectValue placeholder="Select city" />
                        </ValidatedSelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {municipalities.map((municipality) => (
                          <SelectItem key={municipality.name} value={municipality.name}>
                            {municipality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* Show manual input when no municipalities available */
                    <FormControl>
                      <ValidatedInput
                        value={selectedMunicipality}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedMunicipality(value);
                          // Update validation status
                          if (value.trim().length === 0) {
                            setMunicipalityStatus('idle');
                          } else if (value.trim().length >= 2) {
                            setMunicipalityStatus('valid');
                          } else {
                            setMunicipalityStatus('invalid');
                          }
                          // Update address_line1 with municipality and ward
                          const currentWard = wardNumber || '';
                          form.setValue('address_line1', currentWard ? `${value}, Ward ${currentWard}` : value);
                        }}
                        placeholder="Enter city name"
                        disabled={addressMutation.isPending}
                        validationStatus={municipalityStatus}
                      />
                    </FormControl>
                  )}
                </FormItem>
              )}
              
              {/* Street Address and Ward Number */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-600">Street/Area</FormLabel>
                      <FormControl>
                        <Input
                          value={area}
                          onChange={(e) => {
                            setArea(e.target.value);
                            // Update address_line1 with municipality and area
                            const currentWard = wardNumber || '';
                            const fullAddress = selectedMunicipality 
                              ? `${selectedMunicipality}${e.target.value ? ', ' + e.target.value : ''}${currentWard ? ', Ward ' + currentWard : ''}`
                              : e.target.value;
                            field.onChange(fullAddress);
                          }}
                          placeholder="e.g., Baneshwor, Shankhamul"
                          className="h-11 bg-white border-gray-300 rounded text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Ward Number */}
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">Ward Number</FormLabel>
                  <FormControl>
                    <ValidatedInput
                      type="number"
                      min="1"
                      max="32"
                      value={wardNumber}
                      onChange={(e) => {
                        const ward = e.target.value;
                        setWardNumber(ward);
                        // Update validation status
                        if (ward.trim().length === 0) {
                          setWardStatus('idle');
                        } else {
                          const wardNum = parseInt(ward);
                          if (wardNum >= 1 && wardNum <= 32) {
                            setWardStatus('valid');
                          } else {
                            setWardStatus('invalid');
                          }
                        }
                        // Update address_line1 with municipality, area, and ward
                        const fullAddress = selectedMunicipality 
                          ? `${selectedMunicipality}${area ? ', ' + area : ''}${ward ? ', Ward ' + ward : ''}`
                          : area;
                        form.setValue('address_line1', fullAddress);
                      }}
                      placeholder="e.g., 16"
                      validationStatus={wardStatus}
                    />
                  </FormControl>
                </FormItem>
              </div>
              
              {/* Landmark */}
              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">Landmark</FormLabel>
                    <FormControl>
                      <ValidatedInput
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value.trim();
                          // Landmark is optional, so it's valid when empty or when it has content
                          if (value.length === 0) {
                            setLandmarkStatus('idle');
                          } else {
                            setLandmarkStatus('valid');
                          }
                        }}
                        placeholder="e.g., Near Everest Bank, opposite Civil Mall"
                        validationStatus={landmarkStatus}
                        validationError={form.formState.errors.address_line2?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Postal Code */}
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">
                      {fieldLabels.postal}
                      {!InternationalAddressValidator.isPostalCodeRequired(selectedCountry) && ' (Optional)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.value || ''}
                        placeholder="e.g., 44700"
                        className="h-11 bg-white border-gray-300 rounded text-base"
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          // Real-time validation
                          const error = validatePostalCode(value);
                          if (error) {
                            form.setError('postal_code', { message: error });
                          } else {
                            form.clearErrors('postal_code');
                          }
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <>
              {/* Standard Address fields for other countries */}
              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">{fieldLabels.address}</FormLabel>
                    <FormControl>
                      <ValidatedInput
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value.trim();
                          if (value.length === 0) {
                            setAddressStatus('idle');
                          } else if (value.length >= 5) {
                            setAddressStatus('valid');
                          } else {
                            setAddressStatus('invalid');
                          }
                        }}
                        validationStatus={addressStatus}
                        validationError={form.formState.errors.address_line1?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Address Line 2 */}
              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">Address Line 2 (optional)</FormLabel>
                    <FormControl>
                      <ValidatedInput
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value.trim();
                          // Address line 2 is optional, so it's valid when empty or when it has content
                          if (value.length === 0) {
                            setLandmarkStatus('idle');
                          } else {
                            setLandmarkStatus('valid');
                          }
                        }}
                        validationStatus={landmarkStatus}
                        validationError={form.formState.errors.address_line2?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          
          {/* City, State, and Postal Code Row - Only show for non-Nepal countries */}
          {!isNepal && (
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">{fieldLabels.city}</FormLabel>
                    <FormControl>
                      <ValidatedInput
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value.trim();
                          if (value.length === 0) {
                            setCityStatus('idle');
                          } else if (value.length >= 2) {
                            setCityStatus('valid');
                          } else {
                            setCityStatus('invalid');
                          }
                        }}
                        validationStatus={cityStatus}
                        validationError={form.formState.errors.city?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state_province_region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">
                      {fieldLabels.state}
                    </FormLabel>
                    {stateProvinces ? (
                      <Select
                        key={`province-${selectedCountry}-${stateProvinces?.length}`}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setProvinceStatus('valid'); // Mark province as valid when selected
                        }}
                        value={field.value || ''}
                        disabled={addressMutation.isPending}
                      >
                        <FormControl>
                          <ValidatedSelectTrigger 
                            validationStatus={provinceStatus}
                            validationError={form.formState.errors.state_province_region?.message}
                          >
                            <SelectValue placeholder={`Select ${fieldLabels.state.toLowerCase()}`} />
                          </ValidatedSelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stateProvinces.map((state) => (
                            <SelectItem key={state.code} value={state.code}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <ValidatedInput
                          placeholder={selectedCountry === 'GB' ? 'e.g., Greater London' : 'e.g., NY'}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            field.onChange(e);
                            const value = e.target.value.trim();
                            if (value.length === 0) {
                              setProvinceStatus('idle');
                            } else if (value.length >= 2) {
                              setProvinceStatus('valid');
                            } else {
                              setProvinceStatus('invalid');
                            }
                          }}
                          validationStatus={provinceStatus}
                          validationError={form.formState.errors.state_province_region?.message}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">
                      {fieldLabels.postal}
                      {!InternationalAddressValidator.isPostalCodeRequired(selectedCountry) && ' (Optional)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={selectedCountry ? InternationalAddressValidator.getPostalCodeExample(selectedCountry) : ''}
                        value={field.value || ''}
                        className="h-11 bg-white border-gray-300 rounded text-base"
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          
                          // Real-time validation
                          const error = validatePostalCode(value);
                          if (error) {
                            form.setError('postal_code', { message: error });
                          } else {
                            form.clearErrors('postal_code');
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          if (selectedCountry && e.target.value) {
                            const formatted = InternationalAddressValidator.formatPostalCode(e.target.value, selectedCountry);
                            if (formatted !== e.target.value) {
                              field.onChange(formatted);
                              // Re-validate after formatting
                              const error = validatePostalCode(formatted);
                              if (error) {
                                form.setError('postal_code', { message: error });
                              } else {
                                form.clearErrors('postal_code');
                              }
                            }
                          }
                        }}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Phone</FormLabel>
                <FormControl>
                  <WorldClassPhoneInput
                    countries={countries || []}
                    value={field.value}
                    onChange={(newPhoneValue) => {
                      console.log('[Phone Change] New value:', newPhoneValue);
                      console.log('[Phone Change] Address country remains:', selectedCountry);
                      field.onChange(newPhoneValue);
                    }}
                    onValidationChange={(isValid, error) => {
                      setPhoneError(error || '');
                      if (error) {
                        form.setError('phone', { message: error });
                      } else {
                        form.clearErrors('phone');
                      }
                    }}
                    initialCountry={selectedCountry}
                    currentCountry={selectedCountry} // Add this to react to country changes
                    className="w-full"
                    // Don't pass error prop to avoid duplicate display
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Delivery Instructions - Collapsible */}
          <Collapsible open={showDeliveryInstructions} onOpenChange={setShowDeliveryInstructions}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-3 h-auto font-normal hover:bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="h-4 w-4" />
                  Add delivery instructions
                </div>
                {showDeliveryInstructions ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <FormField
                control={form.control}
                name="delivery_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-gray-600">
                      Delivery instructions (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="e.g., Leave package at back door, Ring doorbell twice, etc."
                        className="min-h-[80px] bg-white border-gray-300 rounded text-base resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      These instructions will be visible to the delivery person
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
          
          {/* Default Address Checkbox */}
          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 bg-white">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                      Set Default Address
                    </FormLabel>
                  </div>
                </div>
              </FormItem>
            )}
          />
          
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              addressMutation.isPending || 
              Object.keys(form.formState.errors).length > 0 ||
              phoneError !== '' ||
              countriesLoading
            }
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold py-3.5 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {addressMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {address ? 'Updating...' : 'Saving...'}
              </div>
            ) : countriesLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </div>
            ) : (
              address ? 'Update address' : 'Save address'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}