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
import { Info, Search, ChevronDown, ChevronUp, Truck } from 'lucide-react';
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
      console.log(`[Postal Validation] Country: ${selectedCountry}, Code: "${postalCode}"`);
      const result = InternationalAddressValidator.validatePostalCode(postalCode || '', selectedCountry);
      console.log(`[Postal Validation] Result:`, result);
      
      if (!result.isValid) {
        // Use the error from validator, but enhance it with country name if available
        if (result.error?.includes('Invalid postal code format.')) {
          const countryName = countries?.find(c => c.code === selectedCountry)?.name || selectedCountry;
          const enhancedError = result.error.replace('Invalid postal code format.', `Invalid postal code format for ${countryName}.`);
          console.log(`[Postal Validation] Enhanced error: ${enhancedError}`);
          return enhancedError;
        }
        console.log(`[Postal Validation] Using original error: ${result.error}`);
        return result.error || `Please enter a valid ${fieldLabels.postal.toLowerCase()} for ${countries?.find(c => c.code === selectedCountry)?.name || selectedCountry}`;
      }
    }
    
    console.log(`[Postal Validation] No error, returning empty string`);
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
      
      // For Nepal, if we have street/area data (when municipalities dropdown is shown), append it
      if (isNepal && municipalities.length > 0 && area) {
        finalAddress1 = `${values.address_line1}, ${area}`;
      }
      
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
    <div className="bg-gray-50 p-6 rounded-lg">
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
                  {/* Dev button to test IP detection */}
                  {!address && process.env.NODE_ENV === 'development' && (
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
                        {field.value && (
                          <>
                            <FlagIcon countryCode={field.value} size="sm" />
                            <span className="text-base">
                              {countries?.find(c => c.code === field.value)?.name || field.value}
                            </span>
                          </>
                        )}
                        {!field.value && (
                          <span className="text-gray-500 text-base">Select a country</span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </div>
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
                    <Input
                      {...field}
                      className="h-11 bg-white border-gray-300 rounded text-base"
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
                    <Input
                      {...field}
                      className="h-11 bg-white border-gray-300 rounded text-base"
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
              {/* Nepal Address Hierarchy: Province → District → Municipality → Street/Ward → Landmark */}
              
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
                        }}
                        value={field.value || ''}
                        disabled={addressMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white border-gray-300 rounded text-base">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
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
                        }}
                        value={selectedDistrict}
                        disabled={addressMutation.isPending || !selectedProvince}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white border-gray-300 rounded text-base">
                            <SelectValue placeholder={selectedProvince ? "Select district" : "Select province first"} />
                          </SelectTrigger>
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
              
              {/* Municipality dropdown (when available) */}
              {municipalities.length > 0 && (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">Municipality/City</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      setSelectedMunicipality(value);
                      // Update address_line1 with municipality and ward
                      const currentWard = wardNumber || '';
                      form.setValue('address_line1', currentWard ? `${value}, Ward ${currentWard}` : value);
                    }}
                    value={selectedMunicipality}
                    disabled={addressMutation.isPending || !selectedDistrict}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-white border-gray-300 rounded text-base">
                        <SelectValue placeholder="Select municipality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {municipalities.map((municipality) => (
                        <SelectItem key={municipality.name} value={municipality.name}>
                          {municipality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
              
              {/* Street Address and Ward Number */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-600">
                        {municipalities.length > 0 ? "Street/Area" : "Municipality/City"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={municipalities.length > 0 ? area : selectedMunicipality}
                          onChange={(e) => {
                            if (municipalities.length > 0) {
                              // If municipalities dropdown exists, this is for street/area
                              setArea(e.target.value);
                            } else {
                              // If no dropdown, this is for municipality name
                              const municipality = e.target.value;
                              setSelectedMunicipality(municipality);
                              const currentWard = wardNumber || '';
                              field.onChange(currentWard ? `${municipality}, Ward ${currentWard}` : municipality);
                            }
                          }}
                          placeholder={municipalities.length > 0 ? "e.g., Baneshwor, Shankhamul" : "Enter municipality/city name"}
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
                    <Input
                      type="number"
                      min="1"
                      max="32"
                      value={wardNumber}
                      onChange={(e) => {
                        const ward = e.target.value;
                        setWardNumber(ward);
                        // Update address_line1 with municipality and ward
                        if (selectedMunicipality && ward) {
                          form.setValue('address_line1', `${selectedMunicipality}, Ward ${ward}`);
                        } else if (selectedMunicipality) {
                          form.setValue('address_line1', selectedMunicipality);
                        }
                      }}
                      placeholder="e.g., 16"
                      className="h-11 bg-white border-gray-300 rounded text-base"
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
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="e.g., Near Everest Bank, opposite Civil Mall"
                        className="h-11 bg-white border-gray-300 rounded text-base"
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
                          console.log(`[Form Error Setting] Error for postal_code: "${error}"`);
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
                      <Input
                        {...field}
                        className="h-11 bg-white border-gray-300 rounded text-base"
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
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        className="h-11 bg-white border-gray-300 rounded text-base"
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
                      <Input
                        {...field}
                        className="h-11 bg-white border-gray-300 rounded text-base"
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
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={addressMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white border-gray-300 rounded text-base">
                            <SelectValue placeholder={`Select ${fieldLabels.state.toLowerCase()}`} />
                          </SelectTrigger>
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
                        <Input
                          placeholder={selectedCountry === 'GB' ? 'e.g., Greater London' : 'e.g., NY'}
                          {...field}
                          value={field.value || ''}
                          className="h-11 bg-white border-gray-300 rounded text-base"
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
                          console.log(`[Form Error Setting Non-Nepal] Error for postal_code: "${error}"`);
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
              phoneError !== ''
            }
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold py-3.5 px-6 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {addressMutation.isPending ? 'Saving...' : address ? 'Update address' : 'Save address'}
          </Button>
        </form>
      </Form>
    </div>
  );
}