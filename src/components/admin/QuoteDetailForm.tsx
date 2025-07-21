import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Badge } from '@/components/ui/badge';
import { useWatch } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';
import type { ShippingOption } from '@/types/unified-quote';

interface CustomsTier {
  name?: string;
  customs_percentage: number;
  description?: string;
}

interface QuoteDetailFormProps {
  form: UseFormReturn<AdminQuoteFormValues>;
  shippingAddress?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    fullName?: string;
    phone?: string;
  };
  detectedCustomsPercentage?: number;
  detectedCustomsTier?: CustomsTier;
  isOrder?: boolean;
  onCalculateSmartCustoms?: () => void;
  isCalculatingCustoms?: boolean;
  shippingOptions?: ShippingOption[];
  onShowShippingDetails?: () => void;
}

export const QuoteDetailForm = ({
  form,
  shippingAddress: _shippingAddress,
  detectedCustomsPercentage,
  detectedCustomsTier,
  isOrder = false,
  onCalculateSmartCustoms,
  isCalculatingCustoms = false,
  shippingOptions = [],
  onShowShippingDetails,
}: QuoteDetailFormProps) => {
  const { toast: _toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Watch form values
  const watchedValues = useWatch({
    control: form.control,
    name: ['destination_country', 'items'],
  });

  const [countryCode, _items] = watchedValues;

  // Get country currency and name from country settings
  const countryCurrency = useMemo(() => {
    if (!countryCode || !allCountries) return 'USD';
    const country = allCountries.find((c) => c.code === countryCode);
    return country?.currency || 'USD';
  }, [countryCode, allCountries]);

  // Watch final currency for dynamic labels
  const _destinationCurrency =
    useWatch({
      control: form.control,
      name: 'destination_currency',
    }) || countryCurrency;

  // Auto-update currency field when country changes
  useEffect(() => {
    if (countryCurrency && form.setValue) {
      form.setValue('currency', countryCurrency);
    }
  }, [countryCurrency, form]);

  // Get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CNY: '¥',
      SGD: 'S$',
      AED: 'د.إ',
      SAR: 'ر.س',
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = getCurrencySymbol(countryCurrency);

  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Get appropriate statuses based on whether this is an order or quote
  const availableStatuses = useMemo(() => {
    const statuses = isOrder ? orderStatuses : quoteStatuses;
    return (statuses || []).filter((status) => status.isActive).sort((a, b) => a.order - b.order);
  }, [isOrder, quoteStatuses, orderStatuses]);

  return (
    <div className="space-y-6">
      {/* Hidden Currency Field */}
      <FormField
        control={form.control}
        name="currency"
        render={({ field }) => (
          <FormItem className="hidden">
            <FormControl>
              <Input {...field} value={field.value || countryCurrency} />
            </FormControl>
          </FormItem>
        )}
      />


      {/* Customs Percentage */}
      <FormField
        control={form.control}
        name="customs_percentage"
        render={({ field }) => (
          <FormItem className="m-0">
            <FormLabel className="text-xs font-medium text-muted-foreground">
              Customs Percentage (%)
            </FormLabel>
            <div className="flex items-center gap-2 mt-1">
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  placeholder="0.00"
                  className="h-9"
                />
              </FormControl>

              {/* Show Smart Apply button, or regular Apply if we have detected percentage but no smart function */}
              {onCalculateSmartCustoms ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCalculateSmartCustoms}
                  disabled={isCalculatingCustoms}
                  className="flex items-center"
                >
                  {isCalculatingCustoms ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1"></div>
                      Calculating...
                    </>
                  ) : (
                    <>🧠 Smart Apply</>
                  )}
                </Button>
              ) : (
                typeof detectedCustomsPercentage === 'number' &&
                detectedCustomsPercentage !== Number(field.value) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => form.setValue('customs_percentage', detectedCustomsPercentage)}
                  >
                    Apply
                  </Button>
                )
              )}

              {/* Inline tier information */}
              {detectedCustomsTier && (
                <div className="flex items-center">
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded border">
                    {detectedCustomsTier.name} ({detectedCustomsTier.customs_percentage}%)
                  </span>
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Taxes, Shipping, Charges, Discount, Insurance in grid */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="sales_tax_price"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Sales Tax ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="merchant_shipping_price"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Merchant Shipping ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="international_shipping"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                International Shipping ({currencySymbol})
                {shippingOptions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {shippingOptions.length} options available
                    </Badge>
                    {onShowShippingDetails && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onShowShippingDetails}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                  readOnly
                  placeholder="Auto-calculated from selected shipping option"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Shipping cost is automatically set when you select a shipping option in the Shipping
                Options section below.
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domestic_shipping"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Domestic Shipping ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="handling_charge"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Handling Charge ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discount"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Discount ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="insurance_amount"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Insurance ({currencySymbol})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  onWheel={handleNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Status Field */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem className="m-0">
            <FormLabel className="text-xs font-medium text-muted-foreground">Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status.name} value={status.name}>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.color} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes Field */}
      <FormField
        control={form.control}
        name="internal_notes"
        render={({ field }) => (
          <FormItem className="m-0">
            <FormLabel className="text-xs font-medium text-muted-foreground">
              Internal Notes
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Add internal notes about this quote..."
                className="min-h-[80px] h-20 mt-1 text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
