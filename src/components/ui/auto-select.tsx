import React from 'react';
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectItem as BaseSelectItem,
  SelectTrigger as BaseSelectTrigger,
  SelectValue as BaseSelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedSelectProps extends React.ComponentProps<typeof BaseSelect> {
  loading?: boolean;
  dataLength?: number;
}

/**
 * Enhanced Select that automatically handles timing issues
 * This replaces the standard Select component globally
 */
export const Select = React.forwardRef<
  React.ElementRef<typeof BaseSelect>,
  EnhancedSelectProps
>(({ children, loading, dataLength, value, ...props }, ref) => {
  const [mounted, setMounted] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Show skeleton during initial mount or loading
  if (!mounted || loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Force re-render key
  const selectKey = `select-${internalValue}-${dataLength || 0}-${mounted}`;

  return (
    <BaseSelect
      ref={ref}
      key={selectKey}
      value={internalValue}
      {...props}
    >
      {children}
    </BaseSelect>
  );
});

Select.displayName = 'Select';

// Re-export other components unchanged
export const SelectContent = BaseSelectContent;
export const SelectItem = BaseSelectItem;
export const SelectTrigger = BaseSelectTrigger;
export const SelectValue = BaseSelectValue;

/**
 * Hook to automatically track if data is ready
 */
export function useSelectReady(data: any[], minLength: number = 1): boolean {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (data && data.length >= minLength) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [data, minLength]);

  return isReady;
}