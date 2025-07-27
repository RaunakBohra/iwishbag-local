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
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';
import { SmartCalculationEngine } from '@/services/SmartCalculationEngine';

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
  onTriggerCalculation?: () => void; // ✅ NEW: For real-time calculations
  taxCalculationMethod?: 'manual' | 'hsn_only' | 'route_based'; // ✅ NEW: For customs input enable/disable
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
  onTriggerCalculation, // ✅ NEW: Extract calculation trigger
  taxCalculationMethod = 'hsn_only', // ✅ NEW: For customs input enable/disable
}: QuoteDetailFormProps) => {
  const { toast: _toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Auto-apply detected handling charge when available and field is empty
  useEffect(() => {
    const currentHandlingCharge = form.getValues('handling_charge');
    if (
      detectedHandlingCharge &&
      detectedHandlingCharge > 0 &&
      (!currentHandlingCharge || currentHandlingCharge === 0)
    ) {
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
    if (
      detectedInsuranceAmount &&
      detectedInsuranceAmount > 0 &&
      (!currentInsuranceAmount || currentInsuranceAmount === 0)
    ) {
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
  
  // Also watch items directly to ensure we have the latest data
  const watchedItems = useWatch({
    control: form.control,
    name: 'items'
  });
  

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
  const inputCurrencySymbol = optimizedCurrencyService.getCurrencySymbol(originCurrency);

  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Calculate customs for each valuation method
  const calculateCustomsForMethod = (method: string): number => {
    try {
      // Use watchedItems if _items is empty
      const items = (_items && _items.length > 0) ? _items : watchedItems;
      
      if (!items || items.length === 0) {
        return 0;
      }
      
      const customsPercentage = form.getValues('customs_percentage') || 0;
      if (customsPercentage === 0) {
        return 0;
      }
      
      const shippingCost = form.getValues('international_shipping') || 0;
      const insuranceAmount = form.getValues('insurance_amount') || 0;
      
      // Use item_price field (form uses item_price, not costprice_origin)
      const itemsTotal = items.reduce(
        (sum, item) => sum + ((item.item_price || item.costprice_origin || 0) * (item.quantity || 1)),
        0
      );
      
      
      // Determine customs calculation base based on method
      let customsCalculationBase = itemsTotal;
      
      if (method === 'minimum_valuation' || method === 'higher_of_both') {
        // For minimum valuation, we need to look at the actual HSN data
        // In the dropdown, we'll use a simple estimation since we don't have async access to HSN
        // The actual calculation during form submission will use the real HSN minimum values
        
        // Simple estimation: minimum valuation is typically 20-50% higher than product cost
        // This is just for display purposes in the dropdown
        const estimatedMinimumBase = itemsTotal * 1.3; // 30% higher as a reasonable estimate
        
        if (method === 'minimum_valuation') {
          customsCalculationBase = estimatedMinimumBase;
        } else if (method === 'higher_of_both') {
          customsCalculationBase = Math.max(itemsTotal, estimatedMinimumBase);
        }
      }
      
      // Calculate CIF and customs
      const cifValue = customsCalculationBase + shippingCost + insuranceAmount;
      const customsAmount = cifValue * (customsPercentage / 100);
      
      return customsAmount;
    } catch (error) {
      console.error('Error calculating customs for method:', method, error);
      return 0;
    }
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
          <div className="grid grid-cols-3 gap-4">
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
                          placeholder={taxCalculationMethod !== 'manual' ? 'Auto-calculated' : '15.00'}
                          className={`h-8 pr-8 ${
                            taxCalculationMethod !== 'manual'
                              ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                              : ''
                          }`}
                          readOnly={taxCalculationMethod !== 'manual'}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          %
                        </span>
                      </div>
                    </FormControl>
                    {taxCalculationMethod === 'manual' && (
                      onCalculateSmartCustoms ? (
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
                  {/* ✅ NEW: Data source indicator */}
                  <div className="mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded text-center ${
                        taxCalculationMethod === 'manual'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : taxCalculationMethod === 'hsn_only'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {taxCalculationMethod === 'manual'
                        ? '✏️ Manual Input - Editable'
                        : taxCalculationMethod === 'hsn_only'
                          ? '🔒 Auto: From HSN + Origin'
                          : '🔒 Auto: From Country Settings'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valuation_method_preference"
              render={({ field }) => (
                <FormItem className="m-0">
                  <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                    Valuation Basis
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || 'higher_of_both'}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Trigger recalculation when valuation method changes
                        if (onTriggerCalculation) {
                          setTimeout(onTriggerCalculation, 100);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select basis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_value" className="text-xs">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col">
                              <span>Product Value</span>
                              <span className="text-gray-500 text-xs">Use actual item cost</span>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-medium text-blue-600">
                                {(() => {
                                  const customs = calculateCustomsForMethod('product_value');
                                  return optimizedCurrencyService.formatAmount(customs, originCurrency);
                                })()}
                              </div>
                              <div className="text-gray-500">customs</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="minimum_valuation" className="text-xs">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col">
                              <span>Minimum Valuation</span>
                              <span className="text-gray-500 text-xs">Use customs minimum</span>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-medium text-amber-600">
                                {(() => {
                                  const customs = calculateCustomsForMethod('minimum_valuation');
                                  return optimizedCurrencyService.formatAmount(customs, originCurrency);
                                })()}
                              </div>
                              <div className="text-gray-500">customs</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="higher_of_both" className="text-xs">
                          <div className="flex justify-between items-center w-full">
                            <div className="flex flex-col">
                              <span>Auto (Recommended)</span>
                              <span className="text-gray-500 text-xs">Use higher customs amount</span>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-medium text-green-600">
                                {(() => {
                                  const productCustoms = calculateCustomsForMethod('product_value');
                                  const minimumCustoms = calculateCustomsForMethod('minimum_valuation');
                                  const higherCustoms = Math.max(productCustoms, minimumCustoms);
                                  return optimizedCurrencyService.formatAmount(higherCustoms, originCurrency);
                                })()}
                              </div>
                              <div className="text-gray-500">customs</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <div className="mt-1">
                    <div
                      className={`text-xs px-2 py-1 rounded border ${
                        field.value === 'minimum_valuation'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : field.value === 'higher_of_both'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {field.value === 'minimum_valuation'
                            ? 'Min Valuation Active'
                            : field.value === 'higher_of_both'
                              ? 'Auto Selection Active'
                              : 'Product Value Active'}
                        </span>
                        <span className="font-semibold">
                          {field.value === 'minimum_valuation'
                            ? `Est. ${optimizedCurrencyService.formatAmount(
                                (_items?.reduce(
                                  (sum, item) =>
                                    sum + (item.costprice_origin || 0) * (item.quantity || 1),
                                  0,
                                ) || 0) * 1.2,
                                originCurrency,
                              )}`
                            : field.value === 'higher_of_both'
                              ? `Auto ${optimizedCurrencyService.formatAmount(
                                  Math.max(
                                    _items?.reduce(
                                      (sum, item) =>
                                        sum + (item.costprice_origin || 0) * (item.quantity || 1),
                                      0,
                                    ) || 0,
                                    (_items?.reduce(
                                      (sum, item) =>
                                        sum + (item.costprice_origin || 0) * (item.quantity || 1),
                                      0,
                                    ) || 0) * 1.2,
                                  ),
                                  originCurrency,
                                )}`
                              : optimizedCurrencyService.formatAmount(
                                  _items?.reduce(
                                    (sum, item) =>
                                      sum + (item.costprice_origin || 0) * (item.quantity || 1),
                                    0,
                                  ) || 0,
                                  originCurrency,
                                )}
                        </span>
                      </div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {field.value === 'minimum_valuation'
                          ? 'Using minimum valuation from HSN database'
                          : field.value === 'higher_of_both'
                            ? 'Using higher of minimum valuation vs actual cost'
                            : 'Using actual product cost for customs calculation'}
                      </div>
                    </div>
                  </div>
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
                        className={`pl-8 h-8 ${
                          taxCalculationMethod !== 'manual'
                            ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                            : ''
                        }`}
                        readOnly={taxCalculationMethod !== 'manual'}
                        onChange={(e) => {
                          field.onChange(e);
                          // ✅ NEW: Trigger real-time calculation when sales tax changes
                          if (onTriggerCalculation) {
                            onTriggerCalculation();
                          }
                        }}
                        placeholder={taxCalculationMethod !== 'manual' ? 'Auto-calculated' : '0.00'}
                      />
                    </div>
                  </FormControl>
                  {/* ✅ NEW: Data source indicator */}
                  <div className="mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded text-center ${
                        taxCalculationMethod === 'manual'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : taxCalculationMethod === 'hsn_only'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {taxCalculationMethod === 'manual'
                        ? '✏️ Manual Input - Editable'
                        : taxCalculationMethod === 'hsn_only'
                          ? '🔒 Auto: From HSN + Origin'
                          : '🔒 Auto: From Country Settings'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination_tax"
              render={({ field }) => (
                <FormItem className="m-0">
                  <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                    {countryCode === 'IN' ? 'GST' : countryCode === 'US' ? 'Sales Tax' : 'VAT'} (
                    {countryCode})
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
                        className={`pl-8 h-8 ${
                          taxCalculationMethod !== 'manual'
                            ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                            : ''
                        }`}
                        readOnly={taxCalculationMethod !== 'manual'}
                        onChange={(e) => {
                          field.onChange(e);
                          // ✅ NEW: Trigger real-time calculation when destination tax changes
                          if (onTriggerCalculation) {
                            onTriggerCalculation();
                          }
                        }}
                        placeholder={taxCalculationMethod !== 'manual' ? 'Auto-calculated' : '0.00'}
                      />
                    </div>
                  </FormControl>
                  {/* ✅ NEW: Data source indicator */}
                  <div className="mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded text-center ${
                        taxCalculationMethod === 'manual'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : taxCalculationMethod === 'hsn_only'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                      }`}
                    >
                      {taxCalculationMethod === 'manual'
                        ? '✏️ Manual Input - Editable'
                        : taxCalculationMethod === 'hsn_only'
                          ? '🔒 Auto: From HSN + Origin'
                          : '🔒 Auto: From Country Settings'}
                    </span>
                  </div>
                  <FormMessage />
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
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="international_shipping"
              render={({ field }) => {
                // Find selected shipping option for display
                const selectedShippingOptionId = form.watch('selected_shipping_option');
                const selectedOption = shippingOptions.find(
                  (opt) => opt.id === selectedShippingOptionId,
                );

                return (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-semibold text-gray-700 mb-1 block">
                      iwishBag Shipping Cost
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
                          <span className="text-blue-600">{selectedOption.days}</span>
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
                          placeholder={
                            detectedInsuranceAmount
                              ? `Default: ${detectedInsuranceAmount.toFixed(2)}`
                              : '10.00'
                          }
                        />
                      </div>
                    </FormControl>
                    {detectedInsuranceAmount !== undefined &&
                      detectedInsuranceAmount !== Number(field.value) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => form.setValue('insurance_amount', detectedInsuranceAmount)}
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
                          placeholder={
                            detectedHandlingCharge
                              ? `Default: ${detectedHandlingCharge.toFixed(2)}`
                              : '15.00'
                          }
                        />
                      </div>
                    </FormControl>
                    {detectedHandlingCharge && detectedHandlingCharge !== Number(field.value) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => form.setValue('handling_charge', detectedHandlingCharge)}
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
