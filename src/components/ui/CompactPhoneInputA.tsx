import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { getDialCode } from '@/lib/phoneFormatUtils';
import { usePhoneInput } from '@/hooks/usePhoneInput';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Country {
  code: string;
  name: string;
}

interface CompactPhoneInputAProps {
  countries: Country[];
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  initialCountry?: string;
  currentCountry?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string;
  placeholder?: string;
}

export function CompactPhoneInputA({
  countries,
  value = '',
  onChange,
  onValidationChange,
  initialCountry = 'US',
  currentCountry,
  disabled = false,
  required = false,
  className = '',
  error: externalError,
  placeholder: externalPlaceholder
}: CompactPhoneInputAProps) {
  
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    countryCode,
    formattedValue,
    isValid,
    isComplete,
    error: validationError,
    isTouched,
    placeholder: defaultPlaceholder,
    completePhoneNumber,
    handlePhoneChange,
    handleCountryChange,
    handleBlur,
    setValue
  } = usePhoneInput({
    initialCountry,
    initialValue: value,
    onChange,
    onValidationChange
  });
  
  const dialCode = getDialCode(countryCode);
  const selectedCountry = countries.find(c => c.code === countryCode);
  
  // Update internal state when external value changes
  useEffect(() => {
    if (value !== formattedValue && value !== completePhoneNumber) {
      setValue(value, countryCode);
    }
  }, [value, formattedValue, completePhoneNumber, setValue, countryCode]);
  
  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearchQuery('');
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);
  
  // Filter countries based on search
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    getDialCode(country.code).includes(countrySearchQuery)
  );
  
  // Determine validation state
  const errorMessage = externalError || (isTouched && !isValid ? validationError : '');
  const showError = Boolean(errorMessage);
  const showSuccess = isTouched && isValid && isComplete && !showError;
  
  return (
    <div className={`relative ${className}`}>
      <TooltipProvider>
        <div 
          className={`
            flex items-center h-11 bg-white border rounded-lg transition-all duration-200
            ${showError ? 'border-red-300 ring-1 ring-red-200' : 
              showSuccess ? 'border-green-300 ring-1 ring-green-200' : 
              'border-gray-300 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
          `}
        >
          {/* Compact Country Selector - Flag Only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => !disabled && setShowCountryDropdown(!showCountryDropdown)}
                disabled={disabled}
                className={`
                  flex items-center gap-1 px-2 py-2 border-r border-gray-200 hover:bg-gray-50 transition-colors rounded-l-lg
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
              >
                <FlagIcon countryCode={countryCode} size="sm" />
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{selectedCountry?.name} ({dialCode})</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Dial Code Prefix */}
          <div className="px-2 text-sm font-medium text-gray-600 border-r border-gray-200">
            {dialCode}
          </div>
          
          {/* Phone Input */}
          <input
            ref={inputRef}
            type="tel"
            value={formattedValue}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={externalPlaceholder || defaultPlaceholder}
            disabled={disabled}
            className={`
              flex-1 px-3 py-2 text-base bg-transparent outline-none
              ${disabled ? 'cursor-not-allowed' : ''}
              placeholder:text-gray-400
            `}
            autoComplete="tel"
          />
          
          {/* Success/Error Icons */}
          <div className="px-3">
            {showSuccess && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {showError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </TooltipProvider>
      
      {/* Country Dropdown */}
      {showCountryDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden min-w-[300px]"
        >
          {/* Search Input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <input
              type="text"
              value={countrySearchQuery}
              onChange={(e) => setCountrySearchQuery(e.target.value)}
              placeholder="Search country or dial code..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          {/* Countries List */}
          <div className="overflow-y-auto max-h-64">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    handleCountryChange(country.code);
                    setShowCountryDropdown(false);
                    setCountrySearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors
                    ${country.code === countryCode ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <FlagIcon countryCode={country.code} size="sm" />
                  <span className="flex-1 text-sm">{country.name}</span>
                  <span className="text-sm font-medium text-gray-500">
                    {getDialCode(country.code)}
                  </span>
                  {country.code === countryCode && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {showError && errorMessage && externalError && (
        <div className="mt-1 flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}