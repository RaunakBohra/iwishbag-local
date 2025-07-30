import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface SmartSelectProps<T> {
  value?: string;
  onValueChange: (value: string) => void;
  options: T[];
  getOptionValue: (option: T) => string;
  getOptionLabel: (option: T) => string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  renderOption?: (option: T) => React.ReactNode;
  // Force re-render when these change
  dependencies?: any[];
}

/**
 * Smart Select component that handles timing issues automatically
 * - Waits for options to load before rendering
 * - Shows skeleton while loading
 * - Forces re-render when data changes
 * - Maintains selected value across re-renders
 */
export function SmartSelect<T>({
  value,
  onValueChange,
  options,
  getOptionValue,
  getOptionLabel,
  placeholder = "Select an option",
  disabled = false,
  loading = false,
  className,
  renderOption,
  dependencies = [],
}: SmartSelectProps<T>) {
  const [internalValue, setInternalValue] = useState(value);
  const [isReady, setIsReady] = useState(false);

  // Sync internal value with prop
  useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Check if component is ready to render
  useEffect(() => {
    if (!loading && options && options.length > 0) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [loading, options, ...dependencies]);

  // Handle value change
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange(newValue);
  };

  // Show skeleton while loading
  if (loading || !isReady) {
    return <Skeleton className={`h-10 w-full ${className || ''}`} />;
  }

  // Verify selected value exists in options
  const selectedValueExists = options.some(
    option => getOptionValue(option) === internalValue
  );

  // Generate unique key to force re-render when needed
  const selectKey = `select-${internalValue}-${options.length}-${dependencies.join('-')}`;

  return (
    <Select
      key={selectKey}
      value={selectedValueExists ? internalValue : undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const value = getOptionValue(option);
          const label = getOptionLabel(option);
          
          return (
            <SelectItem key={value} value={value}>
              {renderOption ? renderOption(option) : label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Country Select with smart loading
 */
export function SmartCountrySelect({
  value,
  onValueChange,
  countries,
  loading,
  disabled,
  placeholder = "Select a country",
  className,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  countries: Array<{ code: string; name: string }>;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <SmartSelect
      value={value}
      onValueChange={onValueChange}
      options={countries}
      getOptionValue={(country) => country.code}
      getOptionLabel={(country) => country.name}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      className={className}
      dependencies={[countries.length]}
    />
  );
}

/**
 * Currency Select with smart loading
 */
export function SmartCurrencySelect({
  value,
  onValueChange,
  currencies,
  loading,
  disabled,
  placeholder = "Select a currency",
  className,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  currencies: Array<{ code: string; name: string; symbol?: string }>;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <SmartSelect
      value={value}
      onValueChange={onValueChange}
      options={currencies}
      getOptionValue={(currency) => currency.code}
      getOptionLabel={(currency) => `${currency.name} (${currency.code})`}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      className={className}
      renderOption={(currency) => (
        <div className="flex items-center justify-between">
          <span>{currency.name}</span>
          <span className="text-muted-foreground">{currency.code}</span>
        </div>
      )}
      dependencies={[currencies.length]}
    />
  );
}