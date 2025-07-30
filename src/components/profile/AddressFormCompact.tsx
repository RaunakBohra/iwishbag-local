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
import { BodySmall } from '@/components/ui/typography';
import { InternationalAddressValidator } from '@/services/InternationalAddressValidator';
import { StateProvinceService } from '@/services/StateProvinceService';
import { PhoneInput, PhoneInputRef } from '@/components/ui/phone-input';
import { isValidPhone } from '@/lib/phoneUtils';
import { ipLocationService } from '@/services/IPLocationService';

const createAddressSchema = (selectedCountry: string) => z.object({
  recipient_name: z.string().min(1, 'Full name is required'),
  company_name: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state_province_region: z.string().min(1, 'State/Province is required'),
  postal_code: z.string()
    .min(1, 'Postal code is required')
    .refine((val) => {
      if (!selectedCountry) return true;
      const result = InternationalAddressValidator.validatePostalCode(val, selectedCountry);
      return result.isValid;
    }, {
      message: 'Invalid postal code format for selected country'
    }),
  destination_country: z.string().min(1, 'Country is required'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .refine((val) => isValidPhone(val), {
      message: 'Please enter a valid phone number with country code'
    }),
  tax_id: z.string().optional(),
  delivery_instructions: z.string().max(500).optional(),
  is_default: z.boolean().default(false),
});

type AddressFormValues = {
  recipient_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province_region: string;
  postal_code: string;
  destination_country: string;
  phone: string;
  tax_id?: string;
  delivery_instructions?: string;
  is_default: boolean;
};

interface AddressFormProps {
  address?: Tables<'delivery_addresses'>;
  onSuccess?: (savedAddress?: Tables<'delivery_addresses'>) => void;
}

export function AddressFormCompact({ address, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const phoneInputRef = useRef<PhoneInputRef>(null);
  const [selectedCountry, setSelectedCountry] = useState(address?.destination_country || 'US');
  const [fieldLabels, setFieldLabels] = useState({ state: 'State', postal: 'ZIP Code' });
  const [stateProvinces, setStateProvinces] = useState(StateProvinceService.getStatesForCountry(selectedCountry) || null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

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

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(createAddressSchema(selectedCountry)),
    defaultValues: address
      ? {
          ...address,
          destination_country: address.destination_country || address.country_code || address.country || 'US',
          address_line2: address.address_line2 || '',
          phone: address.phone || '',
          recipient_name: address.recipient_name || '',
        }
      : {
          recipient_name: '',
          company_name: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state_province_region: '',
          postal_code: '',
          destination_country: 'US',
          phone: '',
          tax_id: '',
          delivery_instructions: '',
          is_default: false,
        },
  });

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

  const autoDetectCountry = async () => {
    try {
      setIsAutoDetecting(true);
      const location = await ipLocationService.detectCountry();
      
      if (location.countryCode && location.countryCode !== selectedCountry) {
        // Check if the detected country is in our supported list
        const countryExists = countries?.some(c => c.code === location.countryCode);
        
        if (countryExists) {
          setSelectedCountry(location.countryCode);
          form.setValue('destination_country', location.countryCode);
          
          // Show a subtle notification
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

      const payload = {
        recipient_name: values.recipient_name,
        company_name: values.company_name || null,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        state_province_region: values.state_province_region,
        postal_code: values.postal_code,
        destination_country: values.destination_country,
        phone: values.phone,
        tax_id: values.tax_id || null,
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

  const onSubmit = (data: AddressFormValues) => {
    addressMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-3">
        {/* Autofill banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">Save time. Autofill your current location.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-sm"
            onClick={autoDetectCountry}
            disabled={isAutoDetecting || addressMutation.isPending}
          >
            {isAutoDetecting ? 'Detecting...' : 'Autofill'}
          </Button>
        </div>
        
        {/* Country/Region - First like Amazon */}
        <FormField
          control={form.control}
          name="destination_country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-900">
                Country/Region
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedCountry(value);
                }}
                value={field.value || ''}
                disabled={addressMutation.isPending || countriesLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full h-9 text-sm border-gray-300 rounded">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {countries?.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Full Name */}
        <FormField
          control={form.control}
          name="recipient_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-900">
                Full name (First and Last name)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-9 text-sm border-gray-300 rounded"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Phone Number */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-900">
                Phone number
              </FormLabel>
              <FormControl>
                <PhoneInput
                  ref={phoneInputRef}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Enter phone number"
                  defaultCountry={selectedCountry?.toLowerCase() || 'us'}
                  disabled={addressMutation.isPending}
                  error={!!form.formState.errors.phone}
                />
              </FormControl>
              <BodySmall className="text-gray-600 mt-1">
                May be used to assist delivery
              </BodySmall>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Address */}
        <div className="space-y-0">
          <FormField
            control={form.control}
            name="address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-900">
                  Address
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Street address or P.O. Box"
                    {...field}
                    className="h-9 text-sm border-gray-300 rounded"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address_line2"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormControl>
                  <Input
                    placeholder="Apt, suite, unit, building, floor, etc."
                    {...field}
                    value={field.value ?? ''}
                    className="h-9 text-sm border-gray-300 rounded"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* City, State, PIN Code Row */}
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3 lg:col-span-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-900">
                    City
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-9 text-sm border-gray-300 rounded"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="col-span-3 lg:col-span-2">
            <FormField
              control={form.control}
              name="state_province_region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-900">
                    {fieldLabels.state}
                  </FormLabel>
                  {stateProvinces ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={addressMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm border-gray-300 rounded">
                          <SelectValue placeholder={`Select`} />
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
                        {...field}
                        className="h-9 text-sm border-gray-300 rounded"
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="col-span-6 lg:col-span-2">
            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-900">
                    {fieldLabels.postal}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={selectedCountry ? InternationalAddressValidator.getPostalCodeExample(selectedCountry) : ''}
                      {...field}
                      className="h-9 text-sm border-gray-300 rounded"
                      onBlur={(e) => {
                        field.onBlur();
                        if (selectedCountry && e.target.value) {
                          const formatted = InternationalAddressValidator.formatPostalCode(e.target.value, selectedCountry);
                          if (formatted !== e.target.value) {
                            field.onChange(formatted);
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
        </div>
        
        {/* Additional Options */}
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            onClick={() => {/* Add logic for additional fields */}}
          >
            Add delivery instructions, access codes, etc.
          </button>
          
          {/* Default Address Checkbox */}
          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal text-gray-700 cursor-pointer">
                    Make this my default address
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        {/* Submit Button */}
        <Button
          type="submit"
          disabled={addressMutation.isPending}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-8 py-2 h-auto rounded shadow-sm border border-yellow-600"
        >
          {addressMutation.isPending ? 'Saving...' : address ? 'Update address' : 'Add address'}
        </Button>
      </form>
    </Form>
  );
}