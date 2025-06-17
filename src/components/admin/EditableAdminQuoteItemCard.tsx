import { useMemo } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Control } from "react-hook-form";
import { AdminQuoteFormValues } from "@/components/admin/admin-quote-form-validation";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type CountrySetting = Tables<'country_settings'>;

interface EditableAdminQuoteItemCardProps {
  index: number;
  control: Control<AdminQuoteFormValues>;
  allCountries?: CountrySetting[] | null;
  onDelete: () => void;
}

export const EditableAdminQuoteItemCard = ({ index, control, allCountries, onDelete }: EditableAdminQuoteItemCardProps) => {
  const handleNumberInputWheel = (e: React.WheelEvent) => {
    (e.currentTarget as HTMLInputElement).blur();
  };

  // Filter unique currencies from allCountries for the dropdown
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    allCountries?.forEach(country => {
      if (country.currency) currencies.add(country.currency);
    });
    return Array.from(currencies).sort();
  }, [allCountries]);

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
        
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={control}
            name={`items.${index}.item_price`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
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
            name={`items.${index}.item_currency`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'USD'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableCurrencies.map(currency => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`items.${index}.item_weight`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
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
