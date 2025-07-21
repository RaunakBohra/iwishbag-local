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
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';
import type { ShippingOption } from '@/types/unified-quote';
import { Ship, BarChart3, Truck, CreditCard, Brain } from 'lucide-react';
import { ShippingSelectionModal } from '@/components/admin/modals/ShippingSelectionModal';

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
  recommendations?: any[];
  onSelectShippingOption?: (optionId: string) => Promise<void>;
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
  recommendations = [],
  onSelectShippingOption,
  onShowShippingDetails,
}: QuoteDetailFormProps) => {
  const { toast: _toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();
  const [showShippingModal, setShowShippingModal] = useState(false);

  // Handle shipping option selection from modal
  const handleShippingSelection = async (optionId: string) => {
    const selectedOption = shippingOptions.find(option => option.id === optionId);
    if (selectedOption && onSelectShippingOption) {
      // Update the international shipping field with the selected option's cost
      form.setValue('international_shipping', selectedOption.cost_usd);
      form.setValue('selected_shipping_option', optionId);
      
      // Call the parent's shipping selection handler
      await onSelectShippingOption(optionId);
    }
    setShowShippingModal(false);
  };

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

      {/* Shipping & Costs Configuration - World Class Design */}
      <div className="space-y-4">

        {/* Section 1: Customs & Taxes */}
        <div className="border border-gray-200 rounded-lg">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Customs & Taxes
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customs_percentage"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Customs %
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onWheel={handleNumberInputWheel}
                            placeholder="15.00"
                            className="h-8 pr-8"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            %
                          </span>
                        </div>
                      </FormControl>
                      {onCalculateSmartCustoms ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={onCalculateSmartCustoms}
                          disabled={isCalculatingCustoms}
                          className="h-8 px-2 text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          {isCalculatingCustoms ? (
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Brain className="w-3 h-3" />
                          )}
                        </Button>
                      ) : (
                        typeof detectedCustomsPercentage === 'number' &&
                        detectedCustomsPercentage !== Number(field.value) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              form.setValue('customs_percentage', detectedCustomsPercentage)
                            }
                            className="h-8 px-2 text-xs"
                          >
                            Apply
                          </Button>
                        )
                      )}
                    </div>
                    {detectedCustomsTier && (
                      <div className="mt-1">
                        <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          {detectedCustomsTier.name} ({detectedCustomsTier.customs_percentage}%)
                        </span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales_tax_price"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Sales Tax
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="0.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Shipping Costs */}
        <div className="border border-gray-200 rounded-lg">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              Shipping Costs
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="merchant_shipping_price"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Merchant
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="50.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="international_shipping"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block flex items-center justify-between">
                      <span>Intl Ship</span>
                      {shippingOptions.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {shippingOptions.length}
                          </Badge>
                          {shippingOptions.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowShippingModal(true)}
                              className="h-4 px-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              [Auto]
                            </Button>
                          )}
                        </div>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6 bg-blue-50"
                          readOnly
                          placeholder="100.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domestic_shipping"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Domestic
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="25.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insurance_amount"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Insurance
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="10.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Fees & Adjustments */}
        <div className="border border-gray-200 rounded-lg">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Fees & Adjustments
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="handling_charge"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Handling
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="15.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Discount
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder="0.00"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
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

      {/* Shipping Selection Modal */}
      <ShippingSelectionModal
        isOpen={showShippingModal}
        onClose={() => setShowShippingModal(false)}
        quote={{
          id: form.getValues('id'),
          items: form.getValues('items')?.map((item, index) => ({
            id: item.id || `item-${index}`,
            name: item.product_name || '',
            price_usd: Number(item.item_price) || 0,
            weight_kg: Number(item.item_weight) || 0,
            quantity: Number(item.quantity) || 1,
            url: item.product_url || '',
            image: item.image_url || '',
            options: item.options || '',
          })) || [],
          origin_country: form.getValues('origin_country') || '',
          destination_country: form.getValues('destination_country') || '',
          final_total_usd: 0,
          operational_data: {
            shipping: {
              selected_option: form.getValues('selected_shipping_option'),
            },
          },
        } as any}
        shippingOptions={shippingOptions}
        recommendations={recommendations}
        selectedOptionId={form.getValues('selected_shipping_option')}
        onSelectOption={handleShippingSelection}
      />
    </div>
  );
};
