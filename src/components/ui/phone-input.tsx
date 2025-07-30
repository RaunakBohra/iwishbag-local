import React, { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import { PhoneInput as ReactPhoneInput, PhoneInputRefType } from 'react-international-phone';
import { cn } from '@/lib/utils';
import 'react-international-phone/style.css';
import '@/styles/phone-input-override.css';

interface PhoneInputProps {
  value?: string;
  onChange?: (phone: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
  error?: boolean;
}

export interface PhoneInputRef {
  setCountry: (countryCode: string) => void;
}

const PhoneInput = forwardRef<PhoneInputRef, PhoneInputProps>(
  (
    {
      value = '',
      onChange,
      placeholder = 'Enter phone number',
      disabled = false,
      className,
      defaultCountry = 'us',
      error = false,
      ...props
    },
    ref,
  ) => {
    const phoneInputRef = useRef<PhoneInputRefType>(null);
    
    // Expose setCountry method through ref
    useImperativeHandle(ref, () => ({
      setCountry: (countryCode: string) => {
        const safeCountry = getSafeCountryCode(countryCode);
        phoneInputRef.current?.setCountry(safeCountry);
      },
    }));
    
    // Update country when defaultCountry prop changes
    useEffect(() => {
      if (defaultCountry && phoneInputRef.current) {
        const safeCountry = getSafeCountryCode(defaultCountry);
        // Small delay to ensure the phone input is fully rendered
        setTimeout(() => {
          phoneInputRef.current?.setCountry(safeCountry);
        }, 0);
      }
    }, [defaultCountry]);
    
    // Validate and fallback for unsupported countries
    const getSafeCountryCode = (country: string): string => {
      if (!country) return 'us';
      
      // react-international-phone expects lowercase ISO codes
      const countryLower = country.toLowerCase();
      
      // Map any non-standard country codes to their ISO equivalents
      const countryMappings: Record<string, string> = {
        'uk': 'gb', // United Kingdom
        'korea': 'kr', // South Korea
        'uae': 'ae', // United Arab Emirates
        'usa': 'us', // United States
      };
      
      // Return the mapped code or the lowercase original
      const finalCode = countryMappings[countryLower] || countryLower;
      
      // Log for debugging
      if (finalCode !== 'us' && finalCode !== 'in' && finalCode !== 'gb') {
        console.log(`PhoneInput: Setting country to ${finalCode} (original: ${country})`);
      }
      
      return finalCode;
    };
    
    const safeDefaultCountry = React.useMemo(() => {
      return getSafeCountryCode(defaultCountry);
    }, [defaultCountry]);
    return (
      <ReactPhoneInput
        ref={phoneInputRef}
        value={value || ''}
        onChange={(phone) => onChange?.(phone)}
        defaultCountry={safeDefaultCountry}
        disabled={disabled}
        placeholder={placeholder}
        forceCallingCode={true} // Always show country code
        hideFlags={false} // Show country flags with codes for better UX
        showDropdown={true} // Ensure dropdown is enabled
        dropdownContainer={document.body} // Render dropdown in body to avoid clipping
        className={cn(
          'react-international-phone',
          error && 'error',
          disabled && 'disabled',
          className,
        )}
        inputProps={{
          ...props,
        }}
      />
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
