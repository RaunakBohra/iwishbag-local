import React, { forwardRef } from 'react';
import { PhoneInput as ReactPhoneInput } from 'react-international-phone';
import { cn } from '@/lib/utils';
import 'react-international-phone/style.css';

interface PhoneInputProps {
  value?: string;
  onChange?: (phone: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
  error?: boolean;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ 
    value = '', 
    onChange, 
    placeholder = 'Enter phone number',
    disabled = false,
    className,
    defaultCountry = 'us',
    error = false,
    ...props 
  }, ref) => {
    // Validate and fallback for unsupported countries
    const safeDefaultCountry = React.useMemo(() => {
      const supportedCountries = ['us', 'in', 'au', 'gb', 'jp', 'ca', 'de', 'fr', 'it', 'es', 'cn', 'br', 'mx'];
      const country = defaultCountry.toLowerCase();
      
      if (supportedCountries.includes(country)) {
        return country;
      }
      
      // Special handling for Nepal - use India as fallback since Nepal is not widely supported
      // Users can still manually select Nepal from the dropdown if needed
      if (country === 'np' || country === 'nepal') {
        return 'in'; // Use India as fallback for Nepal (+977 similar to +91 format)
      }
      
      // Default fallback
      return 'us';
    }, [defaultCountry]);
    return (
      <ReactPhoneInput
          inputRef={ref}
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
            className
          )}
          inputProps={{
            ...props,
            className: 'react-international-phone-input',
          }}
          countrySelectorStyleProps={{
            className: 'react-international-phone-country-selector',
          }}
          dialCodePreviewStyleProps={{
            className: 'text-muted-foreground',
          }}
          style={{
            '--react-international-phone-country-selector-background-color': 'hsl(var(--background))',
            '--react-international-phone-country-selector-background-color-hover': 'hsl(var(--accent))',
            '--react-international-phone-text-color': 'hsl(var(--foreground))',
            '--react-international-phone-border-color': 'hsl(var(--border))',
            '--react-international-phone-border-color-hover': 'hsl(var(--ring))',
            '--react-international-phone-dropdown-item-background-color': 'hsl(var(--popover))',
            '--react-international-phone-dropdown-item-background-color-hover': 'hsl(var(--accent))',
            '--react-international-phone-flag-display': 'inline-block', // Show flags
            '--react-international-phone-dropdown-z-index': '9999',
          } as React.CSSProperties}
        />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };