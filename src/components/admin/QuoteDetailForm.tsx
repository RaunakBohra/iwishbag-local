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
import { useWatch } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';
import type { ShippingOption } from '@/types/unified-quote';
import { BarChart3, Truck, CreditCard, Brain } from 'lucide-react';
import { currencyService } from '@/services/CurrencyService';

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
  detectedHandlingCharge?: number;
  detectedInsuranceAmount?: number;
  handlingExplanation?: string;
  insuranceExplanation?: string;
  isOrder?: boolean;
  onCalculateSmartCustoms?: () => void;
  isCalculatingCustoms?: boolean;
  shippingOptions?: ShippingOption[];
  recommendations?: any[];
  onSelectShippingOption?: (optionId: string) => Promise<void>;
  onShowShippingDetails?: () => void;
  isEditingRoute?: boolean;
}

export const QuoteDetailForm = ({
  form,
  shippingAddress: _shippingAddress,
  detectedCustomsPercentage,
  detectedCustomsTier,
  detectedHandlingCharge,
  detectedInsuranceAmount,
  handlingExplanation,
  insuranceExplanation,
  isOrder = false,
  onCalculateSmartCustoms,
  isCalculatingCustoms = false,
  shippingOptions = [],
  recommendations = [],
  onSelectShippingOption,
  onShowShippingDetails,
  isEditingRoute = false,
}: QuoteDetailFormProps) => {
  const { toast: _toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Auto-apply detected handling charge when available and field is empty
  useEffect(() => {
    const currentHandlingCharge = form.getValues('handling_charge');
    if (detectedHandlingCharge && detectedHandlingCharge > 0 && (!currentHandlingCharge || currentHandlingCharge === 0)) {
      console.log('🎯 [DEBUG] Auto-applying detected handling charge to form field:', {
        detectedHandlingCharge,
        currentHandlingCharge,
      });
      form.setValue('handling_charge', detectedHandlingCharge);
    }
  }, [detectedHandlingCharge, form]);

  // Auto-apply detected insurance amount when available and field is empty  
  useEffect(() => {
    const currentInsuranceAmount = form.getValues('insurance_amount');
    if (detectedInsuranceAmount && detectedInsuranceAmount > 0 && (!currentInsuranceAmount || currentInsuranceAmount === 0)) {
      console.log('🛡️ [DEBUG] Auto-applying detected insurance amount to form field:', {
        detectedInsuranceAmount,
        currentInsuranceAmount,
      });
      form.setValue('insurance_amount', detectedInsuranceAmount);
    }
  }, [detectedInsuranceAmount, form]);


  // Watch form values
  const watchedValues = useWatch({
    control: form.control,
    name: ['origin_country', 'destination_country', 'items'],
  });

  const [_originCountry, countryCode, _items] = watchedValues;

  // Get destination country currency and name from country settings
  const destinationCurrency = useMemo(() => {
    if (!countryCode || !allCountries) return 'USD';
    const country = allCountries.find((c) => c.code === countryCode);
    return country?.currency || 'USD';
  }, [countryCode, allCountries]);

  // Get origin country currency for input fields (all costs are in origin currency)
  const originCurrency = useMemo(() => {
    if (!_originCountry || !allCountries) return 'USD';
    const country = allCountries.find((c) => c.code === _originCountry);
    return country?.currency || 'USD';
  }, [_originCountry, allCountries]);

  const countryName = useMemo(() => {
    if (!countryCode || !allCountries) return '';
    const country = allCountries.find((c) => c.code === countryCode);
    return country?.name || '';
  }, [countryCode, allCountries]);

  // Watch final currency for dynamic labels
  const _destinationCurrency =
    useWatch({
      control: form.control,
      name: 'destination_currency',
    }) || destinationCurrency;

  // Auto-update currency field when country changes
  useEffect(() => {
    if (destinationCurrency && form.setValue) {
      form.setValue('currency', destinationCurrency);
    }
  }, [destinationCurrency, form]);

  // Get currency symbol for input fields (origin currency - all costs are entered in origin currency)
  const inputCurrencySymbol = currencyService.getCurrencySymbol(originCurrency);

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
              <Input {...field} value={field.value || destinationCurrency} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Customs & Taxes */}
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
                        {inputCurrencySymbol}
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

      {/* Shipping Costs */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
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
                        {inputCurrencySymbol}
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
              render={({ field }) => {
                // Find selected shipping option for display
                const selectedShippingOptionId = form.watch('selected_shipping_option');
                const selectedOption = shippingOptions.find(opt => opt.id === selectedShippingOptionId);
                
                return (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      Intl Ship
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {inputCurrencySymbol}
                        </span>
                        <Input
                          type="text"
                          value={field.value ? `${field.value}` : ''}
                          className="h-8 pl-6 bg-gray-50 text-gray-700"
                          readOnly
                          placeholder="Select shipping option →"
                        />
                      </div>
                    </FormControl>
                    {selectedOption && (
                      <div className="mt-1 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-800">
                            {selectedOption.carrier} - {selectedOption.name}
                          </span>
                          <span className="text-blue-600">
                            {selectedOption.days}
                          </span>
                        </div>
                      </div>
                    )}
                    {!selectedOption && shippingOptions.length > 0 && (
                      <div className="mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        → Select shipping option in sidebar to populate this field
                      </div>
                    )}
                  </FormItem>
                );
              }}
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
                        {inputCurrencySymbol}
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
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {inputCurrencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder={detectedInsuranceAmount ? `Default: ${detectedInsuranceAmount.toFixed(2)}` : "10.00"}
                        />
                      </div>
                    </FormControl>
                    {detectedInsuranceAmount !== undefined && 
                     detectedInsuranceAmount !== Number(field.value) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          form.setValue('insurance_amount', detectedInsuranceAmount)
                        }
                        className="h-8 px-2 text-xs"
                      >
                        Apply Default
                      </Button>
                    )}
                  </div>
                  {insuranceExplanation && (
                    <div className="mt-1">
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        {insuranceExplanation}
                      </span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* Fees & Adjustments */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
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
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {inputCurrencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onWheel={handleNumberInputWheel}
                          className="h-8 pl-6"
                          placeholder={detectedHandlingCharge ? `Default: ${detectedHandlingCharge.toFixed(2)}` : "15.00"}
                        />
                      </div>
                    </FormControl>
                    {detectedHandlingCharge && 
                     detectedHandlingCharge !== Number(field.value) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          form.setValue('handling_charge', detectedHandlingCharge)
                        }
                        className="h-8 px-2 text-xs"
                      >
                        Apply Default
                      </Button>
                    )}
                  </div>
                  {handlingExplanation && (
                    <div className="mt-1">
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {handlingExplanation}
                      </span>
                    </div>
                  )}
                  <FormMessage />
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
                        {inputCurrencySymbol}
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
