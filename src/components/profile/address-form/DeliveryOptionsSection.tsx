/**
 * Delivery Options Section
 * Handles phone number, delivery instructions, and default address settings
 * Extracted from AddressForm for better maintainability
 */

import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';

interface AddressFormValues {
  first_name: string;
  last_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_province_region: string;
  postal_code?: string | null;
  destination_country: string;
  phone: string;
  delivery_instructions?: string;
  is_default: boolean;
}

interface DeliveryOptionsSectionProps {
  control: Control<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  selectedCountry: string;
  showDeliveryInstructions: boolean;
  phoneError: string;
  onToggleDeliveryInstructions: (show: boolean) => void;
  onPhoneValidation: (phone: string, isValid: boolean, error: string) => void;
}

export const DeliveryOptionsSection: React.FC<DeliveryOptionsSectionProps> = ({
  control,
  errors,
  selectedCountry,
  showDeliveryInstructions,
  phoneError,
  onToggleDeliveryInstructions,
  onPhoneValidation,
}) => {
  return (
    <>
      {/* Phone Number */}
      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-gray-600">Phone number</FormLabel>
            <FormControl>
              <WorldClassPhoneInput
                {...field}
                defaultCountry={selectedCountry}
                onChange={(phone, isValid, error) => {
                  field.onChange(phone);
                  onPhoneValidation(phone, isValid, error);
                }}
                error={phoneError || errors.phone?.message}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Delivery Instructions (Collapsible) */}
      <Collapsible 
        open={showDeliveryInstructions} 
        onOpenChange={onToggleDeliveryInstructions}
        className="space-y-2"
      >
        <CollapsibleTrigger 
          type="button"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Truck className="h-4 w-4" />
          <span>Delivery instructions</span>
          {showDeliveryInstructions ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          <FormField
            control={control}
            name="delivery_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-gray-600">
                  Delivery instructions (optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder="e.g., Leave package at back door, Ring doorbell twice, etc."
                    className="min-h-[80px] bg-white border-gray-300 rounded text-base resize-none"
                    rows={3}
                  />
                </FormControl>
                <p className="text-xs text-gray-500 mt-1">
                  These instructions will be visible to the delivery person
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>
      
      {/* Default Address Checkbox */}
      <FormField
        control={control}
        name="is_default"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 bg-white">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                  Set Default Address
                </FormLabel>
                <p className="text-xs text-gray-500 mt-1">
                  This address will be used as your default delivery address
                </p>
              </div>
            </div>
          </FormItem>
        )}
      />
    </>
  );
};