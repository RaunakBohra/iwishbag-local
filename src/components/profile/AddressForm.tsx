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
import { isValidPhone, isValidPhoneForCountry } from '@/lib/phoneUtils';
import { ipLocationService } from '@/services/IPLocationService';
import { Info, Search, ChevronDown } from 'lucide-react';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';

const addressSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company_name: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state_province_region: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().optional(),
  destination_country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
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
  postal_code?: string;
  destination_country: string;
  phone: string;
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
  const [fieldLabels, setFieldLabels] = useState({ state: 'State', postal: 'ZIP Code' });
  const [stateProvinces, setStateProvinces] = useState(StateProvinceService.getStatesForCountry(selectedCountry) || null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom validation states for real-time feedback
  const [phoneError, setPhoneError] = useState<string>('');


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
          destination_country: address.destination_country || address.country_code || address.country || 'US',
          phone: address.phone || '',
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
          is_default: false,
        },
  });

  // Custom validation functions

  const validatePostalCode = (postalCode: string): string => {
    if (!postalCode) return ''; // Optional field
    
    if (selectedCountry && selectedCountry.length === 2) {
      const result = InternationalAddressValidator.validatePostalCode(postalCode, selectedCountry);
      if (!result.isValid) {
        return `Please enter a valid ${fieldLabels.postal.toLowerCase()} for ${countries?.find(c => c.code === selectedCountry)?.name || selectedCountry}`;
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
      setFieldLabels(labels);
      
      const states = StateProvinceService.getStatesForCountry(selectedCountry);
      setStateProvinces(states);
    }
  }, [selectedCountry]);

  // Auto-detect country on component mount (only for new addresses)
  useEffect(() => {
    if (!address && countries && countries.length > 0) {
      autoDetectCountry();
    }
  }, [countries]);


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
      const location = await ipLocationService.detectCountry();
      
      if (location.countryCode && location.countryCode !== selectedCountry) {
        const countryExists = countries?.some(c => c.code === location.countryCode);
        
        if (countryExists) {
          setSelectedCountry(location.countryCode);
          form.setValue('destination_country', location.countryCode);
          
          if (location.confidence === 'high' || location.confidence === 'medium') {
            toast({
              title: 'Location detected',
              description: `We've set your country to ${location.countryName || location.countryCode} based on your location.`,
              duration: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to auto-detect country:', error);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const addressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!user) throw new Error('User not authenticated');

      // Combine first and last name
      const recipient_name = `${values.first_name} ${values.last_name}`.trim();

      const payload = {
        recipient_name,
        company_name: values.company_name || null,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        state_province_region: values.state_province_region,
        postal_code: values.postal_code || null,
        destination_country: values.destination_country,
        phone: values.phone,
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
                <FormLabel className="text-sm text-gray-600">Country/Region</FormLabel>
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
          
          {/* Company */}
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
          
          {/* Address */}
          <FormField
            control={form.control}
            name="address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">Address</FormLabel>
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
          
          {/* City, State, and Postal Code Row */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-600">City</FormLabel>
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
                    {fieldLabels.postal} (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={selectedCountry ? InternationalAddressValidator.getPostalCodeExample(selectedCountry) : ''}
                      {...field}
                      value={field.value || ''}
                      className="h-11 bg-white border-gray-300 rounded text-base"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        
                        // Real-time validation
                        const error = validatePostalCode(e.target.value);
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
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
                    onChange={field.onChange}
                    onValidationChange={(isValid, error) => {
                      setPhoneError(error || '');
                      if (error) {
                        form.setError('phone', { message: error });
                      } else {
                        form.clearErrors('phone');
                      }
                    }}
                    initialCountry={selectedCountry}
                    className="w-full"
                    // Don't pass error prop to avoid duplicate display
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
                      Set as default shipping address
                    </FormLabel>
                    <p className="text-xs text-gray-500 mt-1">
                      This address will be automatically selected for future orders
                    </p>
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
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-3 text-base rounded-lg shadow-sm border border-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addressMutation.isPending ? 'Saving...' : address ? 'Update address' : 'Save address'}
          </Button>
        </form>
      </Form>
    </div>
  );
}