/**
 * Address Fields Section
 * Handles basic form fields (name, company, address, postal code)
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
import { Input } from '@/components/ui/input';
import { ValidatedInput, ValidationStatus } from '@/components/ui/ValidatedInput';

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

interface AddressFieldsSectionProps {
  control: Control<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  fieldLabels: {
    state: string;
    postal: string;
    city: string;
    address: string;
  };
  firstNameStatus: ValidationStatus;
  lastNameStatus: ValidationStatus;
  addressStatus: ValidationStatus;
  landmarkStatus: ValidationStatus;
  postalCodeStatus: ValidationStatus;
  onFirstNameChange: (status: ValidationStatus) => void;
  onLastNameChange: (status: ValidationStatus) => void;
  onAddressChange: (status: ValidationStatus) => void;
  onLandmarkChange: (status: ValidationStatus) => void;
  onPostalCodeChange: (status: ValidationStatus) => void;
  getPostalCodeError: () => string;
  isNepal: boolean;
}

export const AddressFieldsSection: React.FC<AddressFieldsSectionProps> = ({
  control,
  errors,
  fieldLabels,
  firstNameStatus,
  lastNameStatus,
  addressStatus,
  landmarkStatus,
  postalCodeStatus,
  onFirstNameChange,
  onLastNameChange,
  onAddressChange,
  onLandmarkChange,
  onPostalCodeChange,
  getPostalCodeError,
  isNepal,
}) => {
  return (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
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
                      onFirstNameChange('idle');
                    } else if (value.length >= 2) {
                      onFirstNameChange('valid');
                    } else {
                      onFirstNameChange('invalid');
                    }
                  }}
                  validationStatus={firstNameStatus}
                  validationError={errors.first_name?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
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
                      onLastNameChange('idle');
                    } else if (value.length >= 2) {
                      onLastNameChange('valid');
                    } else {
                      onLastNameChange('invalid');
                    }
                  }}
                  validationStatus={lastNameStatus}
                  validationError={errors.last_name?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Street Address */}
      <FormField
        control={control}
        name="address_line1"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-gray-600">
              {fieldLabels.address}
            </FormLabel>
            <FormControl>
              <ValidatedInput
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  const value = e.target.value.trim();
                  if (value.length === 0) {
                    onAddressChange('idle');
                  } else if (value.length >= 5) {
                    onAddressChange('valid');
                  } else {
                    onAddressChange('invalid');
                  }
                }}
                validationStatus={addressStatus}
                validationError={errors.address_line1?.message}
                placeholder={isNepal ? 
                  "e.g., Ward 5, Kalimati" : 
                  "e.g., 123 Main St, Apt 4B"
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Landmark/Address Line 2 */}
      <FormField
        control={control}
        name="address_line2"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-gray-600">
              {isNepal ? 'Landmark (optional)' : 'Apartment, suite, etc. (optional)'}
            </FormLabel>
            <FormControl>
              <ValidatedInput
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e);
                  const value = e.target.value.trim();
                  if (value.length === 0) {
                    onLandmarkChange('idle');
                  } else {
                    onLandmarkChange('valid');
                  }
                }}
                validationStatus={landmarkStatus}
                placeholder={isNepal ? 
                  "e.g., Near Kalimati Market" : 
                  "e.g., Apartment 4B, Building C"
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Postal Code (if not Nepal - Nepal doesn't require postal codes) */}
      {!isNepal && (
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
      )}
    </>
  );
};