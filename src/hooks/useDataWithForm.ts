import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseDataWithFormOptions<TData, TFormData> {
  data: TData | null | undefined;
  isLoading: boolean;
  form: UseFormReturn<TFormData>;
  dependencies?: any[];
  transformData: (data: TData) => Partial<TFormData>;
}

/**
 * Custom hook to safely sync external data with react-hook-form
 * Prevents timing issues by ensuring data is loaded before form reset
 */
export function useDataWithForm<TData, TFormData>({
  data,
  isLoading,
  form,
  dependencies = [],
  transformData,
}: UseDataWithFormOptions<TData, TFormData>) {
  const hasResetRef = useRef(false);
  const previousDataRef = useRef<TData | null | undefined>(undefined);

  useEffect(() => {
    // Skip if still loading or no data
    if (isLoading || !data) {
      return;
    }

    // Skip if data hasn't changed (prevents unnecessary resets)
    if (previousDataRef.current === data && hasResetRef.current) {
      return;
    }

    // Transform and reset form
    const formData = transformData(data);
    form.reset(formData as TFormData);
    
    // Update refs
    hasResetRef.current = true;
    previousDataRef.current = data;
    
    console.log('[useDataWithForm] Form reset with data:', formData);
  }, [data, isLoading, form, transformData, ...dependencies]);

  // Reset the flag when component unmounts or data becomes null
  useEffect(() => {
    return () => {
      hasResetRef.current = false;
      previousDataRef.current = undefined;
    };
  }, []);

  return {
    isReady: !isLoading && !!data && hasResetRef.current,
    hasLoaded: hasResetRef.current,
  };
}

/**
 * Hook to wait for multiple data sources before rendering
 * Prevents partial renders with missing data
 */
export function useWaitForData(
  dataSources: Array<{
    data: any;
    isLoading: boolean;
    minLength?: number;
  }>
): {
  isReady: boolean;
  isAnyLoading: boolean;
  allDataLoaded: boolean;
} {
  const isAnyLoading = dataSources.some(source => source.isLoading);
  
  const allDataLoaded = dataSources.every(source => {
    if (source.minLength !== undefined) {
      return !source.isLoading && source.data && source.data.length >= source.minLength;
    }
    return !source.isLoading && source.data !== null && source.data !== undefined;
  });

  return {
    isReady: allDataLoaded,
    isAnyLoading,
    allDataLoaded,
  };
}