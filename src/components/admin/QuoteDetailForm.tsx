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

export const QuoteDetailForm = ({ form, shippingAddress, detectedCustomsPercentage, detectedCustomsTier }: {
  form: any;
  shippingAddress?: any;
  detectedCustomsPercentage?: number;
  detectedCustomsTier?: any;
}) => {
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();

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

  const countryName = useMemo(() => {
    if (!countryCode || !allCountries) return '';
    const country = allCountries.find(c => c.code === countryCode);
    return country?.name || '';
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

  return (
    <div className="space-y-6">
      {/* Purchase Country Selection */}
      <FormField
        control={form.control}
        name="country_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase Country</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {allCountries?.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center gap-2">
                      <span>{country.name}</span>
                      {!country.purchase_allowed && (
                        <Badge variant="secondary" className="text-xs">
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          No Purchase
                        </Badge>
                      )}
                      {!country.shipping_allowed && (
                        <Badge variant="secondary" className="text-xs">
                          <Truck className="w-3 h-3 mr-1" />
                          No Shipping
                        </Badge>
                      )}
                      {(!country.purchase_allowed || !country.shipping_allowed) && (
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

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

      {/* Currency Display */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Badge variant="outline" className="text-sm">
          Currency: {currencySymbol} {countryCurrency}
        </Badge>
        {countryName && (
          <span className="text-sm text-muted-foreground">
            ({countryName})
          </span>
        )}
      </div>

      {/* Customs Percentage */}
      <FormField
        control={form.control}
        name="customs_percentage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customs Percentage (%)</FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                  placeholder="0.00"
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
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Other Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="sales_tax_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales Tax ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="merchant_shipping_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant Shipping ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domestic_shipping"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domestic Shipping ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="handling_charge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Handling Charge ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="insurance_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Status Field */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="calculated">Calculated</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
          <FormItem>
            <FormLabel>Internal Notes</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="Add internal notes about this quote..."
                className="min-h-[100px]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
