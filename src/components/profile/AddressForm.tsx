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
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BodySmall } from '@/components/ui/typography';
import { CheckCircle } from 'lucide-react';

const addressSchema = z.object({
  recipient_name: z.string().min(1, 'Recipient name is required'),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state_province_region: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  destination_country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone number is required'),
  is_default: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  address?: Tables<'user_addresses'>;
  onSuccess?: (savedAddress?: Tables<'user_addresses'>) => void;
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    resolver: zodResolver(addressSchema),
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
          address_line1: '',
          address_line2: '',
          city: '',
          state_province_region: '',
          postal_code: '',
          destination_country: '',
          phone: '',
          is_default: false,
        },
  });

  const addressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!user) throw new Error('User not authenticated');

      const payload = {
        recipient_name: values.recipient_name,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        state_province_region: values.state_province_region,
        postal_code: values.postal_code,
        destination_country: values.destination_country, // Store country code
        phone: values.phone,
        is_default: values.is_default,
      };

      if (address) {
        const { data, error } = await supabase
          .from('user_addresses')
          .update(payload)
          .eq('id', address.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_addresses')
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
      queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="recipient_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Recipient Name</FormLabel>
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
            name="address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Street Address</FormLabel>
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
                  Apartment, suite, etc. (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Apt 4B, Suite 100, etc."
                    {...field}
                    value={field.value ?? ''}
                    className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Anytown"
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
                    State / Province
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="CA"
                      {...field}
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12345"
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
              name="destination_country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Country</FormLabel>
                  <Select
                    onValueChange={field.onChange}
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
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 (555) 123-4567"
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
            name="is_default"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                      Set as default address
                    </FormLabel>
                    <BodySmall className="text-gray-500 mt-1">
                      This address will be selected by default for future orders
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
