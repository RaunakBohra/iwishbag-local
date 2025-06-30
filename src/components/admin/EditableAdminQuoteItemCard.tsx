import { useMemo, useState, useEffect } from "react";
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Control, useWatch } from "react-hook-form";
import { AdminQuoteFormValues } from "@/components/admin/admin-quote-form-validation";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { convertWeight } from "@/lib/weightUtils";

type CountrySetting = Tables<'country_settings'>;

interface EditableAdminQuoteItemCardProps {
  index: number;
  control: Control<AdminQuoteFormValues>;
  allCountries?: CountrySetting[] | null;
  onDelete: () => void;
  routeWeightUnit?: string | null;
  smartWeightUnit?: 'kg' | 'lb';
  countryCurrency?: string;
}

export const EditableAdminQuoteItemCard = ({ 
  index, 
  control, 
  allCountries, 
  onDelete, 
  routeWeightUnit,
  smartWeightUnit = 'kg',
  countryCurrency = 'USD'
}: EditableAdminQuoteItemCardProps) => {
  const handleNumberInputWheel = (e: React.WheelEvent) => {
    (e.currentTarget as HTMLInputElement).blur();
  };

  const [weightInputValues, setWeightInputValues] = useState<Record<number, string>>({});
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [displayWeightUnit, setDisplayWeightUnit] = useState<'kg' | 'lb'>('kg');

  // Get the current field value for weight
  const weightField = useWatch({
    control,
    name: `items.${index}.item_weight`
  });

  // Update input value when field value changes externally (e.g., from form reset)
  useEffect(() => {
    const getDisplayValue = () => {
      if (!weightField) return '';
      let displayValue = weightField;
      if (displayWeightUnit && displayWeightUnit !== 'kg') {
        displayValue = convertWeight(weightField, 'kg', displayWeightUnit);
      }
      // Format to 2 decimal places, ensuring no floating point artifacts
      const formatted = parseFloat(displayValue.toFixed(2));
      return formatted.toString();
    };

    const expectedDisplayValue = getDisplayValue();
    setWeightInputValues(prev => ({
      ...prev,
      [index]: expectedDisplayValue
    }));
  }, [weightField, displayWeightUnit, index]);

  // Use smart weight unit if available, otherwise fall back to route unit or kg
  const displayWeightUnitFinal = smartWeightUnit || routeWeightUnit || 'kg';

  // Get currency symbol - using country currency
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CNY': '¥',
      'SGD': 'S$',
      'AED': 'د.إ',
      'SAR': 'ر.س',
    };
    return symbols[currency] || currency;
  };

  const currencySymbolFinal = getCurrencySymbol(countryCurrency);

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Item {index + 1}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name={`items.${index}.product_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Product Name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-4 items-start">
          <div className="w-16 flex-shrink-0">
            <FormField
              control={control}
              name={`items.${index}.image_url`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="w-16 h-16">
                      <ImageUpload
                        currentImageUrl={field.value}
                        onImageUpload={field.onChange}
                        onImageRemove={() => field.onChange(null)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex-grow space-y-4 text-sm">
            <FormField
              control={control}
              name={`items.${index}.product_url`}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Product URL</FormLabel>
                    {field.value && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(field.value, '_blank')}
                        className="h-6 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name={`items.${index}.options`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Options</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="e.g. Size, Color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={control}
            name={`items.${index}.item_price`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ({currencySymbolFinal})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    onWheel={handleNumberInputWheel}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`items.${index}.item_weight`}
            render={({ field }) => {
              // Get the display value - if field.value is null/undefined, show empty
              const getDisplayValue = () => {
                if (!field.value) return '';
                let displayValue = field.value;
                if (displayWeightUnit && displayWeightUnit !== 'kg') {
                  displayValue = convertWeight(field.value, 'kg', displayWeightUnit);
                }
                // Format to 2 decimal places, ensuring no floating point artifacts
                const formatted = parseFloat(displayValue.toFixed(2));
                return formatted.toString();
              };

              // Only allow up to 2 decimals
              const restrictTo2Decimals = (value: string) => {
                // Remove non-numeric except dot
                let sanitized = value.replace(/[^\d.]/g, '');
                // Only allow one dot
                const parts = sanitized.split('.');
                if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
                // Restrict decimals
                if (parts[1]?.length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
                return sanitized;
              };

              // Handle input change - just update the display, don't convert yet
              const handleChange = (value: string) => {
                const sanitized = restrictTo2Decimals(value);
                if (!sanitized) {
                  // Don't clear the field value immediately, let user finish typing
                  return;
                }
                // Don't convert or update field value during typing
              };

              // Convert and update field value on blur
              const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (!value) {
                  field.onChange(null);
                  return;
                }
                
                const sanitized = restrictTo2Decimals(value);
                const numValue = parseFloat(sanitized);
                if (isNaN(numValue)) return;
                
                // Format to 2 decimals
                const formattedValue = numValue.toFixed(2);
                e.target.value = formattedValue;
                
                // Now convert and update the field value
                if (displayWeightUnit && displayWeightUnit !== 'kg') {
                  // Convert from display unit to kg for storage
                  const kgWeight = convertWeight(numValue, displayWeightUnit, 'kg');
                  field.onChange(Number(kgWeight.toFixed(2)));
                } else {
                  field.onChange(Number(numValue.toFixed(2)));
                }
              };

              // Get current input value or initialize from field value
              const currentInputValue = weightInputValues[index] ?? getDisplayValue();

              return (
                <FormItem>
                  <FormLabel>
                    Weight ({displayWeightUnitFinal})
                    {smartWeightUnit && smartWeightUnit !== 'kg' && (
                      <span className="text-xs text-green-600 ml-1">(Auto-detected)</span>
                    )}
                    {routeWeightUnit && routeWeightUnit !== 'kg' && !smartWeightUnit && (
                      <span className="text-xs text-blue-600 ml-1">(Route Unit)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={currentInputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWeightInputValues(prev => ({
                          ...prev,
                          [index]: value
                        }));
                        handleChange(value);
                      }}
                      onBlur={handleBlur}
                      onWheel={handleNumberInputWheel}
                      placeholder={`Weight in ${displayWeightUnitFinal}`}
                      inputMode="decimal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                    onWheel={handleNumberInputWheel}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </CardContent>
    </Card>
  );
};
