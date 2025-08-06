/**
 * Standard Address Section
 * Handles standard international address fields (city, state/province, postal code)
 * Used for all countries except Nepal
 * Extracted from AddressForm for better maintainability
 */

import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ValidatedInput, ValidationStatus } from '@/components/ui/ValidatedInput';
import { ValidatedSelectTrigger } from '@/components/ui/ValidatedSelect';

interface AddressFormValues {
  first_name: string;
  last_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province_region: string;
  postal_code?: string | null;
  destination_country: string;
  phone: string;
  delivery_instructions?: string;
  is_default: boolean;
}

interface StateProvince {
  code: string;
  name: string;
}

interface StandardAddressSectionProps {
  control: Control<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  fieldLabels: {
    state: string;
    postal: string;
    city: string;
    address: string;
  };
  stateProvinces: StateProvince[] | null;
  cityStatus: ValidationStatus;
  provinceStatus: ValidationStatus;
  postalCodeStatus: ValidationStatus;
  isPending: boolean;
  onCityChange: (status: ValidationStatus) => void;
  onProvinceChange: (status: ValidationStatus) => void;
  onPostalCodeChange: (status: ValidationStatus) => void;
  getPostalCodeError: () => string;
}

export const StandardAddressSection: React.FC<StandardAddressSectionProps> = ({
  control,
  errors,
  fieldLabels,
  stateProvinces,
  cityStatus,
  provinceStatus,
  postalCodeStatus,
  isPending,
  onCityChange,
  onProvinceChange,
  onPostalCodeChange,
  getPostalCodeError,
}) => {
  return (
    <>
      {/* City and State/Province Row */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-gray-600">
                {fieldLabels.city}
              </FormLabel>
              <FormControl>
                <ValidatedInput
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    const value = e.target.value.trim();
                    if (value.length === 0) {
                      onCityChange('idle');
                    } else if (value.length >= 2) {
                      onCityChange('valid');
                    } else {
                      onCityChange('invalid');
                    }
                  }}
                  validationStatus={cityStatus}
                  validationError={errors.city?.message}
                  placeholder="e.g., New York, London, Toronto"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="state_province_region"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-gray-600">
                {fieldLabels.state}
              </FormLabel>
              {stateProvinces ? (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    onProvinceChange('valid'); // Mark as valid when selected
                  }}
                  value={field.value || ''}
                  disabled={isPending}
                >
                  <FormControl>
                    <ValidatedSelectTrigger 
                      validationStatus={provinceStatus}
                      validationError={errors.state_province_region?.message}
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
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      const value = e.target.value.trim();
                      if (value.length === 0) {
                        onProvinceChange('idle');
                      } else if (value.length >= 2) {
                        onProvinceChange('valid');
                      } else {
                        onProvinceChange('invalid');
                      }
                    }}
                    validationStatus={provinceStatus}
                    validationError={errors.state_province_region?.message}
                    placeholder={`e.g., California, Ontario, ${fieldLabels.state}`}
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Postal Code */}
      <FormField
        control={control}
        name="postal_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-gray-600">
              {fieldLabels.postal}
            </FormLabel>
            <FormControl>
              <ValidatedInput
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  const value = e.target.value.trim();
                  if (value.length === 0) {
                    onPostalCodeChange('idle');
                  } else {
                    // Validation will be handled by parent component
                    const error = getPostalCodeError();
                    onPostalCodeChange(error ? 'invalid' : 'valid');
                  }
                }}
                validationStatus={postalCodeStatus}
                validationError={getPostalCodeError()}
                placeholder="e.g., 12345 or SW1A 1AA"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};