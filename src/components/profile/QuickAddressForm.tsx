import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { addressValidationService } from '@/services/AddressValidationService';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { unifiedConfigService } from '@/services/UnifiedConfigurationService';
import { useQuery } from '@tanstack/react-query';

const quickAddressSchema = z.object({
  recipient_name: z.string().min(2, 'Name must be at least 2 characters'),
  address_line1: z.string().min(5, 'Address must be at least 5 characters'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state_province_region: z.string().optional(),
  postal_code: z.string().min(1, 'Postal code is required'),
  country_code: z.string().min(2, 'Country is required'),
  phone: z.string().min(10, 'Phone number is required'),
});

type QuickAddressFormValues = z.infer<typeof quickAddressSchema>;

interface QuickAddressFormProps {
  onSubmit: (address: QuickAddressFormValues) => void;
  defaultCountry?: string;
  className?: string;
}

export function QuickAddressForm({ 
  onSubmit, 
  defaultCountry = 'US',
  className = '' 
}: QuickAddressFormProps) {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: countries } = useQuery({
    queryKey: ['supported-countries'],
    queryFn: async () => {
      const allCountries = await unifiedConfigService.getAllCountries();
      return Object.entries(allCountries || {}).map(([code, config]) => ({
        code,
        name: config.name,
      }));
    },
  });

  const form = useForm<QuickAddressFormValues>({
    resolver: zodResolver(quickAddressSchema),
    defaultValues: {
      recipient_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province_region: '',
      postal_code: '',
      country_code: defaultCountry,
      phone: '',
    },
  });

  const selectedCountry = form.watch('country_code');
  const countryFormat = addressValidationService.getCountryFormat(selectedCountry);

  // Real-time validation as user types
  const validateAddressDebounced = async () => {
    const values = form.getValues();
    if (values.address_line1 && values.city && values.postal_code) {
      setIsValidating(true);
      try {
        const result = await addressValidationService.validateAddress({
          ...values,
          state_province_region: values.state_province_region || '',
        });
        setValidationResult(result);
      } catch (error) {
        console.error('Address validation error:', error);
      } finally {
        setIsValidating(false);
      }
    }
  };

  // Watch for changes and validate
  useEffect(() => {
    const timeout = setTimeout(() => {
      validateAddressDebounced();
    }, 500);
    return () => clearTimeout(timeout);
  }, [
    form.watch('address_line1'),
    form.watch('city'),
    form.watch('postal_code'),
    form.watch('country_code'),
  ]);

  const handleSubmit = async (data: QuickAddressFormValues) => {
    // Final validation before submit
    const result = await addressValidationService.validateAddress({
      ...data,
      state_province_region: data.state_province_region || '',
    });

    if (result.isValid) {
      onSubmit(data);
    } else {
      // Show validation errors
      result.issues.forEach((issue) => {
        if (issue.severity === 'error') {
          form.setError(issue.field as any, { message: issue.message });
        }
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={`space-y-4 ${className}`}>
        {/* Validation feedback */}
        {validationResult && !isValidating && (
          <Alert className={validationResult.isValid ? 'border-green-200' : 'border-yellow-200'}>
            {validationResult.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <AlertDescription>
              {validationResult.isValid
                ? 'Address format looks good!'
                : validationResult.issues[0]?.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Recipient Name */}
        <FormField
          control={form.control}
          name="recipient_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="John Doe" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Country Selection */}
        <FormField
          control={form.control}
          name="country_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
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

        {/* Address Lines */}
        <FormField
          control={form.control}
          name="address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="123 Main Street" />
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
              <FormLabel>Apartment, Suite, etc. (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Apt 4B" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City and State */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="New York" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {countryFormat.stateRequired && (
            <FormField
              control={form.control}
              name="state_province_region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{countryFormat.stateLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="NY" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Postal Code and Phone */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{countryFormat.postalCodeLabel}</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={countryFormat.postalCodeFormat || '12345'} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+1 (555) 123-4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full"
          disabled={form.formState.isSubmitting || isValidating}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {form.formState.isSubmitting ? 'Validating...' : 'Use This Address'}
        </Button>
      </form>
    </Form>
  );
}