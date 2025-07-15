import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateAndSanitize } from '@/lib/validation';

interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

interface UseValidationReturn<T> {
  validate: (data: unknown) => ValidationResult<T>;
  errors: string[];
  isValid: boolean;
  reset: () => void;
}

/**
 * Hook for form validation using Zod schemas
 * @param schema - Zod schema to validate against
 * @returns Validation utilities
 */
export function useValidation<T>(schema: z.ZodSchema<T>): UseValidationReturn<T> {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  const validate = useCallback((data: unknown): ValidationResult<T> => {
    const result = validateAndSanitize(data, schema);
    
    if (result.success) {
      setErrors([]);
      setIsValid(true);
      return {
        isValid: true,
        errors: [],
        data: result.data,
      };
    } else {
      setErrors(result.errors);
      setIsValid(false);
      return {
        isValid: false,
        errors: result.errors,
      };
    }
  }, [schema]);

  const reset = useCallback(() => {
    setErrors([]);
    setIsValid(true);
  }, []);

  return {
    validate,
    errors,
    isValid,
    reset,
  };
}

/**
 * Hook for real-time field validation
 * @param schema - Zod schema for the field
 * @returns Field validation utilities
 */
export function useFieldValidation(schema: z.ZodSchema) {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);

  const validateField = useCallback((value: unknown) => {
    try {
      schema.parse(value);
      setError('');
      setIsValid(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setError(firstError.message);
        setIsValid(false);
        return false;
      }
      setError('Validation failed');
      setIsValid(false);
      return false;
    }
  }, [schema]);

  const reset = useCallback(() => {
    setError('');
    setIsValid(true);
  }, []);

  return {
    validateField,
    error,
    isValid,
    reset,
  };
}

/**
 * Hook for validating multiple fields at once
 * @param schemas - Object with field names as keys and Zod schemas as values
 * @returns Multi-field validation utilities
 */
export function useMultiFieldValidation<T extends Record<string, z.ZodSchema>>(
  schemas: T
): {
  validate: (data: Record<keyof T, unknown>) => boolean;
  errors: Record<keyof T, string>;
  isValid: boolean;
  reset: () => void;
  validateField: (field: keyof T, value: unknown) => boolean;
} {
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [isValid, setIsValid] = useState<boolean>(true);

  const validateField = useCallback((field: keyof T, value: unknown): boolean => {
    const schema = schemas[field];
    try {
      schema.parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setErrors(prev => ({ ...prev, [field]: firstError.message }));
        return false;
      }
      setErrors(prev => ({ ...prev, [field]: 'Validation failed' }));
      return false;
    }
  }, [schemas]);

  const validate = useCallback((data: Record<keyof T, unknown>): boolean => {
    let allValid = true;
    const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>;

    for (const [field, schema] of Object.entries(schemas)) {
      try {
        schema.parse(data[field]);
        newErrors[field as keyof T] = '';
      } catch (error) {
        allValid = false;
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          newErrors[field as keyof T] = firstError.message;
        } else {
          newErrors[field as keyof T] = 'Validation failed';
        }
      }
    }

    setErrors(newErrors);
    setIsValid(allValid);
    return allValid;
  }, [schemas]);

  const reset = useCallback(() => {
    setErrors({} as Record<keyof T, string>);
    setIsValid(true);
  }, []);

  return {
    validate,
    errors,
    isValid,
    reset,
    validateField,
  };
}

export default {
  useValidation,
  useFieldValidation,
  useMultiFieldValidation,
};