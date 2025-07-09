import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAllCountries } from "@/hooks/useAllCountries";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Truck, AlertTriangle } from "lucide-react";
import { useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useStatusManagement } from "@/hooks/useStatusManagement";

export const QuoteDetailForm = ({ form, shippingAddress, detectedCustomsPercentage, detectedCustomsTier, isOrder = false }: {
  form: any;
  shippingAddress?: any;
  detectedCustomsPercentage?: number;
  detectedCustomsTier?: any;
  isOrder?: boolean;
}) => {
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Watch form values
  const watchedValues = useWatch({
    control: form.control,
    name: ["country_code", "items"]
  });

  const [countryCode, items] = watchedValues;

  // Get country currency and name from country settings
  const countryCurrency = useMemo(() => {
    if (!countryCode || !allCountries) return 'USD';
    const country = allCountries.find(c => c.code === countryCode);
    return country?.currency || 'USD';
  }, [countryCode, allCountries]);

  // Watch final currency for dynamic labels
  const finalCurrency = useWatch({
    control: form.control,
    name: "final_currency"
  }) || countryCurrency;

  // Auto-update currency field when country changes
  useEffect(() => {
    if (countryCurrency && form.setValue) {
      form.setValue('currency', countryCurrency);
    }
  }, [countryCurrency, form]);

  // Get currency symbol
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

  const currencySymbol = getCurrencySymbol(countryCurrency);

  const handleNumberInputWheel = (e: React.WheelEvent) => {
    (e.currentTarget as HTMLInputElement).blur();
  };

  // Get appropriate statuses based on whether this is an order or quote
  const availableStatuses = useMemo(() => {
    const statuses = isOrder ? orderStatuses : quoteStatuses;
    return (statuses || [])
      .filter(status => status.isActive)
      .sort((a, b) => a.order - b.order);
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
            <FormLabel className="text-xs font-medium text-muted-foreground">Customs Percentage (%)</FormLabel>
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
              {typeof detectedCustomsPercentage === 'number' && detectedCustomsPercentage !== Number(field.value) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => form.setValue('customs_percentage', detectedCustomsPercentage)}
                >
                  Apply
                </Button>
              )}
            </div>
            {/* Applied Customs Tier Box */}
            {detectedCustomsTier && (
              <div className="mt-2 p-2 rounded-md bg-blue-50 border border-blue-200 text-black text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{detectedCustomsTier.name || 'Customs Tier'} {detectedCustomsTier.customs_percentage}%</span>
                </div>
                {detectedCustomsTier.description && (
                  <div className="text-xs mt-1">
                    {detectedCustomsTier.description}
                  </div>
                )}
              </div>
            )}
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
              <FormLabel className="text-xs font-medium text-muted-foreground">Sales Tax ({currencySymbol})</FormLabel>
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
              <FormLabel className="text-xs font-medium text-muted-foreground">Merchant Shipping ({currencySymbol})</FormLabel>
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
          name="domestic_shipping"
          render={({ field }) => (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground">Domestic Shipping ({currencySymbol})</FormLabel>
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
              <FormLabel className="text-xs font-medium text-muted-foreground">Handling Charge ({currencySymbol})</FormLabel>
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
              <FormLabel className="text-xs font-medium text-muted-foreground">Discount ({currencySymbol})</FormLabel>
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
              <FormLabel className="text-xs font-medium text-muted-foreground">Insurance ({currencySymbol})</FormLabel>
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
            <FormLabel className="text-xs font-medium text-muted-foreground">Internal Notes</FormLabel>
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
