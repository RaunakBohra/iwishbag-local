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
import { CheckCircle } from 'lucide-react';
import { InternationalAddressValidator } from '@/services/InternationalAddressValidator';
import { StateProvinceService } from '@/services/StateProvinceService';
import { PhoneInput, PhoneInputRef } from '@/components/ui/phone-input';
import { isValidPhone } from '@/lib/phoneUtils';
import { ipLocationService } from '@/services/IPLocationService';

const createAddressSchema = (selectedCountry: string) => z.object({
  recipient_name: z.string().min(1, 'Recipient name is required'),
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

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const phoneInputRef = useRef<PhoneInputRef>(null);
  const [selectedCountry, setSelectedCountry] = useState(address?.destination_country || '');
  const [fieldLabels, setFieldLabels] = useState({ state: 'State / Province', postal: 'Postal Code' });
  const [stateProvinces, setStateProvinces] = useState(StateProvinceService.getStatesForCountry(selectedCountry) || null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  const { data: allCountries, isLoading: countriesLoading } = useQuery({
    queryKey: ['country-configurations'],
    queryFn: async () => {
      try {
        const allCountries = await unifiedConfigService.getAllCountries();

        if (!allCountries) {
          return [];
        }

        // Transform to match expected format
        const countryList = Object.entries(allCountries).map(([code, config]) => ({
          code,
          name: config.name,
          currency: config.currency,
          symbol: config.symbol,
          rate_from_usd: config.rate_from_usd,
          minimum_payment_amount: config.minimum_payment_amount,
          shipping_allowed: true, // Default to true since we don't have this field in unified config
        }));

        // Sort by name
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
          destination_country:
            address.destination_country || address.country_code || address.country || '',
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
          destination_country: '',
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
        destination_country: values.destination_country, // Store country code
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Country First - Like Amazon */}
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
                  <SelectTrigger className="w-full h-12 text-base border-gray-300 focus:border-teal-500 focus:ring-teal-500">
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
                  className="h-12 text-base border-gray-300 focus:border-teal-500 focus:ring-teal-500"
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
        
        {/* Address Fields */}
        <div className="space-y-4">
            <FormField
              control={form.control}
              name="recipient_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Recipient Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Company Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ABC Corporation (Optional)"
                      {...field}
                      value={field.value || ''}
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
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
                <BodySmall className="text-gray-500 mt-1">
                  For delivery updates and carrier contact
                </BodySmall>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Shipping Address */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Shipping Address</h3>
          
          <FormField
            control={form.control}
            name="destination_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
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
                    <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
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
          
          <FormField
            control={form.control}
            name="address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Street Address <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="123 Main St"
                    {...field}
                    className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
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
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Apartment, suite, etc.
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Apt 4B, Suite 100, etc. (Optional)"
                    {...field}
                    value={field.value ?? ''}
                    className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    City <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New York"
                      {...field}
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
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
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {fieldLabels.state} <span className="text-red-500">*</span>
                  </FormLabel>
                  {stateProvinces ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={addressMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
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
                        className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
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
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {fieldLabels.postal} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={selectedCountry ? InternationalAddressValidator.getPostalCodeExample(selectedCountry) : '10001'}
                      {...field}
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
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

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Additional Information</h3>
          
          <FormField
            control={form.control}
            name="tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Tax ID / VAT Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="For customs clearance (Optional)"
                    {...field}
                    value={field.value || ''}
                    className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </FormControl>
                <BodySmall className="text-gray-500 mt-1">
                  May be required for customs clearance in some countries
                </BodySmall>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="delivery_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Delivery Instructions</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Gate code, building entrance, special instructions... (Optional)"
                    {...field}
                    value={field.value || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </FormControl>
                <BodySmall className="text-gray-500 mt-1">
                  Any special delivery instructions (max 500 characters)
                </BodySmall>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                      Set as default shipping address
                    </FormLabel>
                    <BodySmall className="text-gray-500 mt-1">
                      This address will be automatically selected for future orders
                    </BodySmall>
                  </div>
                  {field.value && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={addressMutation.isPending}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={addressMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6"
          >
            {addressMutation.isPending ? 'Saving...' : address ? 'Update Address' : 'Save Address'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
