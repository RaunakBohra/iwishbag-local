import { useState, useCallback, useEffect } from 'react';
import { 
  extractPhoneDigits, 
  formatPhoneNumber, 
  createCompletePhoneNumber, 
  validatePhoneForCountry,
  parsePhoneInput,
  getPhonePlaceholder,
  isPhoneComplete,
  sanitizePhoneDigits
} from '@/lib/phoneFormatUtils';

interface UsePhoneInputProps {
  initialCountry?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export function usePhoneInput({
  initialCountry = 'US',
  initialValue = '',
  onChange,
  onValidationChange
}: UsePhoneInputProps = {}) {
  
  // Parse initial value if provided, with country context
  const parsedInitial = parsePhoneInput(initialValue, initialCountry);
  const initialDigits = parsedInitial.digits || '';
  const detectedCountry = parsedInitial.countryCode || initialCountry;
  
  const [countryCode, setCountryCode] = useState<string>(detectedCountry);
  const [phoneDigits, setPhoneDigits] = useState<string>(initialDigits);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isTouched, setIsTouched] = useState<boolean>(false);
  
  // Validate phone number
  const validatePhone = useCallback((digits: string, country: string) => {
    if (!digits && !isTouched) {
      setIsValid(false);
      setError('');
      return;
    }
    
    const validation = validatePhoneForCountry(digits, country);
    setIsValid(validation.isValid);
    
    // Only show error if user has touched the field and stopped typing
    // or if the error is important (too long, format error)
    const shouldShowError = isTouched && validation.error && (
      validation.error.includes('too long') ||
      validation.error.includes('format') ||
      validation.error.includes('match') ||
      validation.error.includes('valid phone number')
    );
    
    setError(shouldShowError ? validation.error : '');
    
    // Always report the full validation state to parent
    onValidationChange?.(validation.isValid, validation.error);
  }, [isTouched, onValidationChange]);
  
  // Update validation when digits or country changes
  useEffect(() => {
    validatePhone(phoneDigits, countryCode);
  }, [phoneDigits, countryCode, validatePhone]);
  
  // Get expected phone length for country (import this function from phoneFormatUtils)
  const getExpectedPhoneLength = useCallback((countryCode: string): { min: number; max: number } => {
    // Country-specific phone number lengths (national number without country code)
    const lengths: Record<string, { min: number; max: number }> = {
      US: { min: 10, max: 10 },
      CA: { min: 10, max: 10 },
      GB: { min: 10, max: 11 },
      IN: { min: 10, max: 10 },
      AU: { min: 9, max: 9 },
      NZ: { min: 8, max: 9 },
      DE: { min: 10, max: 12 },
      FR: { min: 10, max: 10 },
      IT: { min: 10, max: 11 },
      ES: { min: 9, max: 9 },
      JP: { min: 10, max: 11 },
      CN: { min: 11, max: 11 },
      KR: { min: 10, max: 11 },
      SG: { min: 8, max: 8 },
      MY: { min: 9, max: 10 },
      TH: { min: 9, max: 9 },
      ID: { min: 10, max: 12 },
      PH: { min: 10, max: 10 },
      VN: { min: 9, max: 10 },
      BD: { min: 10, max: 10 },
      LK: { min: 9, max: 9 },
      PK: { min: 10, max: 11 },
      AE: { min: 9, max: 9 },
      SA: { min: 9, max: 9 },
      BR: { min: 10, max: 11 },
      MX: { min: 10, max: 10 },
      AR: { min: 10, max: 10 },
      CL: { min: 9, max: 9 },
      CO: { min: 10, max: 10 },
      PE: { min: 9, max: 9 },
      ZA: { min: 9, max: 9 },
      NG: { min: 10, max: 11 },
      EG: { min: 10, max: 11 },
      KE: { min: 9, max: 9 },
      IL: { min: 9, max: 9 },
      TR: { min: 10, max: 10 },
      RU: { min: 10, max: 10 },
      UA: { min: 9, max: 9 },
      PL: { min: 9, max: 9 },
      NL: { min: 9, max: 9 },
      BE: { min: 9, max: 9 },
      CH: { min: 9, max: 9 },
      AT: { min: 10, max: 11 },
      SE: { min: 9, max: 9 },
      NO: { min: 8, max: 8 },
      DK: { min: 8, max: 8 },
      FI: { min: 9, max: 10 },
      PT: { min: 9, max: 9 },
      GR: { min: 10, max: 10 },
      CZ: { min: 9, max: 9 },
      HU: { min: 9, max: 9 },
      RO: { min: 9, max: 9 },
      BG: { min: 8, max: 9 },
      HR: { min: 8, max: 9 },
      RS: { min: 8, max: 9 },
      SK: { min: 9, max: 9 },
      SI: { min: 8, max: 8 },
      LT: { min: 8, max: 8 },
      LV: { min: 8, max: 8 },
      EE: { min: 7, max: 8 },
      IS: { min: 7, max: 7 },
      IE: { min: 9, max: 9 },
      LU: { min: 9, max: 9 },
      MT: { min: 8, max: 8 },
      CY: { min: 8, max: 8 },
      NP: { min: 10, max: 10 }, // Nepal: 10 digits
    };
    
    return lengths[countryCode] || { min: 7, max: 15 }; // Default fallback
  }, []);

  // Handle phone digits change
  const handlePhoneChange = useCallback((value: string) => {
    let digits = extractPhoneDigits(value);
    // Sanitize to prevent country code leakage
    digits = sanitizePhoneDigits(digits, countryCode);
    
    // Enforce maximum length for the country
    const expectedLength = getExpectedPhoneLength(countryCode);
    if (digits.length > expectedLength.max) {
      digits = digits.substring(0, expectedLength.max);
    }
    
    setPhoneDigits(digits);
    setIsTouched(true);
    
    // Create complete phone number and notify parent
    const completeNumber = createCompletePhoneNumber(countryCode, digits);
    onChange?.(completeNumber);
  }, [countryCode, onChange, getExpectedPhoneLength]);
  
  // Handle country change
  const handleCountryChange = useCallback((newCountry: string) => {
    setCountryCode(newCountry);
    
    // Preserve existing digits with new country, but trim if too long
    if (phoneDigits) {
      const expectedLength = getExpectedPhoneLength(newCountry);
      let adjustedDigits = phoneDigits;
      
      // If current digits are too long for new country, trim them
      if (phoneDigits.length > expectedLength.max) {
        adjustedDigits = phoneDigits.substring(0, expectedLength.max);
        setPhoneDigits(adjustedDigits);
      }
      
      const completeNumber = createCompletePhoneNumber(newCountry, adjustedDigits);
      onChange?.(completeNumber);
    }
  }, [phoneDigits, onChange, getExpectedPhoneLength]);
  
  // Handle blur event
  const handleBlur = useCallback(() => {
    setIsTouched(true);
    validatePhone(phoneDigits, countryCode);
  }, [phoneDigits, countryCode, validatePhone]);
  
  // Get formatted display value
  const formattedValue = formatPhoneNumber(phoneDigits, countryCode);
  
  // Get placeholder
  const placeholder = getPhonePlaceholder(countryCode);
  
  // Check if input is complete
  const isComplete = isPhoneComplete(phoneDigits, countryCode);
  
  // Get complete phone number
  const completePhoneNumber = createCompletePhoneNumber(countryCode, phoneDigits);
  
  return {
    // State
    countryCode,
    phoneDigits,
    formattedValue,
    isValid,
    isComplete,
    error,
    isTouched,
    placeholder,
    completePhoneNumber,
    
    // Actions
    setCountryCode: handleCountryChange,
    setPhoneDigits: setPhoneDigits,
    handlePhoneChange,
    handleCountryChange,
    handleBlur,
    
    // Utilities
    reset: () => {
      setPhoneDigits('');
      setIsTouched(false);
      setError('');
      setIsValid(false);
    },
    
    // Set external value (useful for form integration)
    setValue: (value: string, country?: string) => {
      // Use the provided country or current country for parsing context
      const parsingCountry = country || countryCode;
      const parsed = parsePhoneInput(value, parsingCountry);
      
      setPhoneDigits(parsed.digits);
      if (country) {
        setCountryCode(country);
      } else if (parsed.countryCode && parsed.countryCode !== countryCode) {
        setCountryCode(parsed.countryCode);
      }
      setIsTouched(true);
    }
  };
}