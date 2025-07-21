import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/phone-input';

interface PhoneFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  defaultCountry?: string;
  className?: string;
}

export function PhoneFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label = 'Phone Number',
  placeholder = 'Enter phone number',
  disabled = false,
  defaultCountry = 'US',
  className,
}: PhoneFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <PhoneInput
              value={field.value || ''}
              onChange={(phone) => field.onChange(phone)}
              placeholder={placeholder}
              disabled={disabled}
              defaultCountry={defaultCountry}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
