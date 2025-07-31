import React from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidatedInputProps extends React.ComponentProps<'input'> {
  validationStatus?: ValidationStatus;
  validationError?: string;
  showValidationIcon?: boolean;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, validationStatus = 'idle', validationError, showValidationIcon = true, ...props }, ref) => {
    const showSuccess = validationStatus === 'valid' && showValidationIcon;
    const showError = validationStatus === 'invalid' && showValidationIcon;
    const showLoading = validationStatus === 'validating' && showValidationIcon;

    return (
      <div className="relative">
        <input
          className={cn(
            // Base styles matching phone input pattern
            'flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-base transition-all duration-200',
            'placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            
            // Validation-based border and ring styles
            showError 
              ? 'border-red-300 ring-1 ring-red-200' 
              : showSuccess 
                ? 'border-green-300 ring-1 ring-green-200'
                : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200',
            
            // Add padding for validation icon
            showValidationIcon ? 'pr-10' : '',
            
            className
          )}
          ref={ref}
          {...props}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {showLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
            {showSuccess && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {showError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export { ValidatedInput };