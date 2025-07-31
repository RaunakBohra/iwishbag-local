import React from 'react';
import { Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@radix-ui/react-select';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidatedSelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  validationStatus?: ValidationStatus;
  validationError?: string;
  showValidationIcon?: boolean;
}

const ValidatedSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  ValidatedSelectTriggerProps
>(({ className, children, validationStatus = 'idle', validationError, showValidationIcon = true, ...props }, ref) => {
  const showSuccess = validationStatus === 'valid' && showValidationIcon;
  const showError = validationStatus === 'invalid' && showValidationIcon;
  const showLoading = validationStatus === 'validating' && showValidationIcon;

  return (
    <div className="relative">
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          // Base styles matching phone input pattern
          'flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-base transition-all duration-200',
          'placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          '[&>span]:line-clamp-1',
          
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
        {...props}
      >
        {children}
        <div className="flex items-center gap-2">
          {/* Validation Icon */}
          {showValidationIcon && (
            <div className="flex items-center">
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
          
          {/* Chevron Icon */}
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </SelectPrimitive.Trigger>
    </div>
  );
});

ValidatedSelectTrigger.displayName = 'ValidatedSelectTrigger';

export { ValidatedSelectTrigger };