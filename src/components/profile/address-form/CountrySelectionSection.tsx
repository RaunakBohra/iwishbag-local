/**
 * Country Selection Section
 * Handles country dropdown with search, auto-detection, and validation
 * Extracted from AddressForm for better maintainability
 */

import React, { useRef, useEffect } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { FlagIcon } from '@/components/ui/FlagIcon';
import { ValidationStatus } from '@/components/ui/ValidatedInput';

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

interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  rate_from_usd: number;
  minimum_payment_amount: number;
  shipping_allowed: boolean;
}

interface CountrySelectionSectionProps {
  control: Control<AddressFormValues>;
  setValue: UseFormSetValue<AddressFormValues>;
  countries: Country[];
  countriesLoading: boolean;
  selectedCountry: string;
  showCountryDropdown: boolean;
  countrySearchQuery: string;
  filteredCountries: Country[];
  isAutoDetecting: boolean;
  countryStatus: ValidationStatus;
  isEditMode: boolean;
  onCountryChange: (countryCode: string) => void;
  onToggleDropdown: (show: boolean) => void;
  onSearchChange: (query: string) => void;
  onAutoDetect: () => void;
}

export const CountrySelectionSection: React.FC<CountrySelectionSectionProps> = ({
  control,
  setValue,
  countries,
  countriesLoading,
  selectedCountry,
  showCountryDropdown,
  countrySearchQuery,
  filteredCountries,
  isAutoDetecting,
  countryStatus,
  isEditMode,
  onCountryChange,
  onToggleDropdown,
  onSearchChange,
  onAutoDetect,
}) => {
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        onToggleDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown, onToggleDropdown]);

  return (
    <FormField
      control={control}
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
            {!isEditMode && process.env.NODE_ENV === 'development' && !isAutoDetecting && (
              <button
                type="button"
                onClick={onAutoDetect}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
              >
                (Detect)
              </button>
            )}
          </FormLabel>
          <div className="relative" ref={countryDropdownRef}>
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
                  onClick={() => onToggleDropdown(!showCountryDropdown)}
                  className={`w-full h-11 bg-white border rounded px-3 flex items-center justify-between cursor-pointer hover:border-gray-400 ${
                    countryStatus === 'valid' 
                      ? 'border-green-500' 
                      : countryStatus === 'invalid' 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {field.value && countries && (
                      <>
                        <FlagIcon countryCode={field.value} size="sm" />
                        <span className="text-gray-900">
                          {countries.find(c => c.code === field.value)?.name || 'Select country'}
                        </span>
                      </>
                    )}
                    {!field.value && (
                      <span className="text-gray-500">Select country</span>
                    )}
                  </div>
                  {showCountryDropdown ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              )}
            </FormControl>

            {/* Country Dropdown */}
            {showCountryDropdown && !countriesLoading && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                {/* Search Input */}
                <div className="p-3 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search countries..."
                      value={countrySearchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10 h-9 bg-white border-gray-300"
                    />
                  </div>
                </div>
                
                {/* Countries List */}
                <div className="max-h-44 overflow-y-auto">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <div
                        key={country.code}
                        onClick={() => {
                          field.onChange(country.code);
                          setValue('destination_country', country.code, { 
                            shouldValidate: true 
                          });
                          onCountryChange(country.code);
                          onToggleDropdown(false);
                          onSearchChange(''); // Clear search after selection
                        }}
                        className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                          field.value === country.code ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <FlagIcon countryCode={country.code} size="sm" />
                        <span className="flex-1 text-gray-900">{country.name}</span>
                        {field.value === country.code && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No countries found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};