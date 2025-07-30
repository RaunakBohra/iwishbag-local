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
  
  // Handle phone digits change
  const handlePhoneChange = useCallback((value: string) => {
    let digits = extractPhoneDigits(value);
    // Sanitize to prevent country code leakage
    digits = sanitizePhoneDigits(digits, countryCode);
    
    setPhoneDigits(digits);
    setIsTouched(true);
    
    // Create complete phone number and notify parent
    const completeNumber = createCompletePhoneNumber(countryCode, digits);
    onChange?.(completeNumber);
  }, [countryCode, onChange]);
  
  // Handle country change
  const handleCountryChange = useCallback((newCountry: string) => {
    setCountryCode(newCountry);
    
    // Preserve existing digits with new country
    if (phoneDigits) {
      const completeNumber = createCompletePhoneNumber(newCountry, phoneDigits);
      onChange?.(completeNumber);
    }
  }, [phoneDigits, onChange]);
  
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