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
    <Card className="relative group border border-gray-200 shadow-sm rounded-xl p-0">
      {/* Delete icon button top-right */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-10 text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        tabIndex={-1}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center gap-4">
        {/* Image upload */}
        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
          <FormField
            control={control}
            name={`items.${index}.image_url`}
            render={({ field }) => (
              <FormItem className="m-0">
                <FormControl>
                  <ImageUpload
                    currentImageUrl={field.value}
                    onImageUpload={field.onChange}
                    onImageRemove={() => field.onChange(null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        {/* Product name */}
        <div className="flex-1">
          <CardTitle className="text-base font-semibold mb-1">Item {index + 1}</CardTitle>
          <FormField
            control={control}
            name={`items.${index}.product_name`}
            render={({ field }) => (
              <FormItem className="m-0">
                <FormLabel className="text-xs font-medium text-muted-foreground">Product Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Product Name" className="h-9 mt-1" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 px-4 pb-4">
        {/* Product URL and Customer Notes block layout */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-end gap-2 w-full">
            <FormField
              control={control}
              name={`items.${index}.product_url`}
              render={({ field }) => (
                <FormItem className="m-0 flex-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Product URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="https://..." className="h-9 mt-1 w-full" />
                  </FormControl>
                </FormItem>
              )}
            />
            {control._formValues?.items?.[index]?.product_url && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => window.open(control._formValues.items[index].product_url, '_blank')}
                className="h-9 w-9 mt-5"
                tabIndex={-1}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {/* Price, Weight, Quantity row */}
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={control}
            name={`items.${index}.item_price`}
            render={({ field }) => (
              <FormItem className="m-0">
                <FormLabel className="text-xs font-medium text-muted-foreground">Price ({currencySymbolFinal})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    onWheel={handleNumberInputWheel}
                    className="h-9 mt-1"
                  />
                </FormControl>
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
                <FormItem className="m-0">
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    Weight ({displayWeightUnitFinal})
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
                      className="h-9 mt-1"
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="m-0">
                <FormLabel className="text-xs font-medium text-muted-foreground">Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                    onWheel={handleNumberInputWheel}
                    className="h-9 mt-1"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="mt-3">
          <FormField
            control={control}
            name={`items.${index}.options`}
            render={({ field }) => {
              // Parse the options JSON to get notes
              let notes = '';
              try {
                if (field.value) {
                  const options = JSON.parse(field.value);
                  notes = options.notes || '';
                }
              } catch {
                // If parsing fails, treat as plain text
                notes = field.value || '';
              }
              return (
                <FormItem className="m-0 w-full">
                  <FormLabel className="text-xs font-medium text-muted-foreground">Customer Notes</FormLabel>
                  <FormControl>
                    <Input
                      value={notes}
                      placeholder="Customer notes..."
                      className="h-9 mt-1 w-full"
                      onChange={(e) => {
                        // Update the field with JSON structure
                        const newNotes = e.target.value;
                        if (newNotes) {
                          field.onChange(JSON.stringify({ notes: newNotes }));
                        } else {
                          field.onChange(null);
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
