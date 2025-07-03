import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, Edit, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { ShippingAddress, AddressFormData } from '@/types/address';
import { validateAddress, normalizeAddress } from '@/lib/addressValidation';
import { useAllCountries } from '@/hooks/useAllCountries';

// Validation schema for address form
const addressFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be no more than 100 characters'),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters').max(200, 'Street address must be no more than 200 characters'),
  city: z.string().min(2, 'City must be at least 2 characters').max(100, 'City must be no more than 100 characters'),
  state: z.string().max(100, 'State must be no more than 100 characters').optional(),
  postalCode: z.string().min(3, 'Postal code must be at least 3 characters').max(20, 'Postal code must be no more than 20 characters'),
  country: z.string().length(2, 'Country must be a 2-letter country code'),
  phone: z.string().regex(/^[+]?[1-9]\d{0,15}$/, 'Invalid phone number format').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

interface AddressEditFormProps {
  currentAddress?: ShippingAddress;
  onSave: (address: ShippingAddress, reason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  canChangeCountry?: boolean;
  isLocked?: boolean;
  lockReason?: string;
}

export const AddressEditForm: React.FC<AddressEditFormProps> = ({
  currentAddress,
  onSave,
  onCancel,
  isLoading = false,
  canChangeCountry = false,
  isLocked = false,
  lockReason,
}) => {
  const { data: countries } = useAllCountries();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const lastAddressRef = useRef<string | undefined>();

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      fullName: currentAddress?.fullName || '',
      streetAddress: currentAddress?.streetAddress || '',
      city: currentAddress?.city || '',
      state: currentAddress?.state || '',
      postalCode: currentAddress?.postalCode || '',
      country: currentAddress?.country || '',
      phone: currentAddress?.phone || '',
      email: currentAddress?.email || '',
    },
  });

  useEffect(() => {
    // Only reset if the address actually changed
    if (
      currentAddress &&
      countries &&
      countries.length > 0 &&
      lastAddressRef.current !== JSON.stringify(currentAddress)
    ) {
      let countryCode = currentAddress.country;
      if (!/^[A-Z]{2}$/.test(countryCode)) {
        const found = countries.find(
          (c) =>
            c.name.toLowerCase() === countryCode?.toLowerCase() ||
            c.code.toLowerCase() === countryCode?.toLowerCase()
        );
        countryCode = found ? found.code : '';
      }
      form.reset({
        fullName: currentAddress.fullName || '',
        streetAddress: currentAddress.streetAddress || '',
        city: currentAddress.city || '',
        state: currentAddress.state || '',
        postalCode: currentAddress.postalCode || '',
        country: countryCode,
        phone: currentAddress.phone || '',
        email: currentAddress.email || '',
      });
      lastAddressRef.current = JSON.stringify(currentAddress);
    }
  }, [currentAddress, countries, form]);

  const watchedCountry = form.watch('country');
  const selectedCountry = countries?.find(c => c.code === watchedCountry);

  const handleSubmit = (data: AddressFormData) => {
    // Clear previous validation messages
    setValidationErrors([]);
    setValidationWarnings([]);

    // Normalize and validate address
    const normalizedAddress = normalizeAddress(data);
    const validation = validateAddress(normalizedAddress);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    // Prepare reason for the change
    const reason = currentAddress ? 'Address updated by customer' : 'Initial address added by customer';

    // Call the save function
    onSave(normalizedAddress, reason);
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  // If address is locked, show read-only view
  if (isLocked) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Lock className="h-5 w-5" />
            Address Locked
          </CardTitle>
          <CardDescription className="text-orange-700">
            {lockReason || 'This address cannot be modified after payment completion'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAddress && (
            <div className="space-y-2 text-sm">
              <div><strong>Full Name:</strong> {currentAddress.fullName}</div>
              <div><strong>Street Address:</strong> {currentAddress.streetAddress}</div>
              <div><strong>City:</strong> {currentAddress.city}</div>
              {currentAddress.state && <div><strong>State:</strong> {currentAddress.state}</div>}
              <div><strong>Postal Code:</strong> {currentAddress.postalCode}</div>
              <div><strong>Country:</strong> {currentAddress.country}</div>
              {currentAddress.phone && <div><strong>Phone:</strong> {currentAddress.phone}</div>}
              {currentAddress.email && <div><strong>Email:</strong> {currentAddress.email}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          {currentAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
        </CardTitle>
        <CardDescription>
          {currentAddress 
            ? 'Update your shipping address details. You cannot change the country as it affects shipping costs.'
            : 'Enter your shipping address to receive your order.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Street Address */}
            <FormField
              control={form.control}
              name="streetAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City and State Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="State or Province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Postal Code and Country Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!canChangeCountry}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={field.value ? countries?.find(c => c.code === field.value)?.name || field.value : "Select country"} />
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
                    {!canChangeCountry && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Country cannot be changed as it affects shipping costs
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Country Information */}
            {selectedCountry && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Shipping to <strong>{selectedCountry.name}</strong> ({selectedCountry.currency})
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <ul className="list-disc list-inside space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : (currentAddress ? 'Update Address' : 'Save Address')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}; 